import {
  AddressBook,
  AddressCategories,
  ChainData,
  Transaction,
  TransactionSources,
  Logger,
  EthTransaction,
  Transfer,
  TransferCategories,
} from "@finances/types";
import { math, sm } from "@finances/utils";
import { BigNumber, constants, utils } from "ethers";

import { getTokenInterface } from "../../abi";
import { chrono, mergeTransaction } from "../utils";

import { categorizeTransfer } from "./categorize";

const { hexlify, formatEther, formatUnits, keccak256, Interface: { getEventTopic }, RLP } = utils;
const { AddressZero } = constants;

export const mergeEthTxTransactions = (
  transactions: Transaction[],
  addressBook: AddressBook,
  chainData: ChainData,
  lastUpdated: number,
  logger: Logger,
): Transaction[] => {
  const log = logger.child({ module: "EthTx" });
  const start = Date.now();

  const newEthTxs = chainData.getEthTransactions(ethTx =>
    new Date(ethTx.timestamp).getTime() > lastUpdated &&
    !transactions.some(tx => tx.hash === ethTx.hash),
  );

  if (newEthTxs.length === 0) {
    log.info(`Done processing ${newEthTxs.length} new eth txs`);
    return transactions;
  }

  log.info(`Processing ${newEthTxs.length} new eth txs..`);
  newEthTxs.sort(chrono).forEach((tx: EthTransaction): void => {
    if (new Date(tx.timestamp).getTime() <= lastUpdated) {
      return;
    }
    const { getName, isToken } = addressBook;
    const log = logger.child({ module: `EthTx ${tx.hash.substring(0, 8)}` });

    if (!tx.logs) {
      throw new Error(`Missing logs for tx ${tx.hash}, did fetchChainData get interrupted?`);
    }

    if (tx.to === null) {
      // derived from: https://ethereum.stackexchange.com/a/46960
      tx.to = `0x${keccak256(RLP.encode([tx.from, hexlify(tx.nonce)])).substring(26)}`;
      log.debug(`new contract deployed to ${tx.to}`);
    }

    const transaction = {
      date: tx.timestamp.split(".")[0],
      hash: tx.hash,
      sources: [TransactionSources.EthTx],
      tags: [],
      transfers: [{
        assetType: "ETH",
        category: TransferCategories.Transfer,
        fee: formatEther(BigNumber.from(tx.gasUsed).mul(tx.gasPrice)),
        from: tx.from.toLowerCase(),
        index: 0,
        quantity: tx.value,
        to: tx.to.toLowerCase(),
      }],
    } as Transaction;

    if (tx.status !== 1) {
      log.debug(`setting reverted tx to have zero quantity`);
      transaction.transfers[0].quantity = "0";
      transaction.description = `${getName(tx.from)} sent failed tx`;
      if (addressBook.isSelf(transaction.transfers[0].from)) {
        transactions = mergeTransaction(transactions, transaction, log);
        return;
      }
      return;
    }

    transaction.transfers[0] = categorizeTransfer(
      transaction.transfers[0],
      [],
      tx.to,
      addressBook,
      logger,
    );

    log.debug(`${tx.value} ETH from ${tx.from} to ${
      tx.to
    }: ${transaction.transfers[0].category}`);

    for (const txLog of tx.logs) {
      const address = sm(txLog.address);
      if (isToken(address)) {

        const assetType = getName(address).toUpperCase();

        const iface = getTokenInterface(address);

        const event = Object.values(iface.events).find(e => getEventTopic(e) === txLog.topics[0]);

        if (!event) {
          log.warn(`Unable to identify ${assetType} event w topic: ${
            txLog.topics[0]
          }. Got events: ${Object.keys(iface.events)}`);
          continue;
        } else if (["AccrueInterest", "Approval"].includes(event.name)) {
          log.debug(`Skipping ${event.name} event`);
          continue;
        }

        const args = iface.parseLog(txLog).args;
        const quantityStr = args.amount
          || args.borrowAmount
          || args.burnAmount
          || args.mintAmount
          || args.redeemAmount
          || args.repayAmount
          || args.value
          || args.wad;
        let quantity = "0";

        if (quantityStr) {
          quantity = formatUnits(quantityStr, chainData.getTokenData(address).decimals);
        } else {
          log.warn(`Couldn't find quantity in args: [${Object.keys(args)}]`);
        }

        const index = txLog.index;
        const transfer = { assetType, category: "Transfer", index, quantity } as Transfer;

        if (event.name === "Transfer") {
          log.debug(`${quantity} ${assetType} was transfered to ${args.to}`);
          transfer.from = args.from || args.src;
          transfer.to = args.to || args.dst;
          transfer.category = TransferCategories.Transfer;
          transaction.transfers.push(categorizeTransfer(
            transfer,
            tx.logs,
            tx.to,
            addressBook,
            logger,
          ));

        // WETH
        } else if (assetType === "WETH" && event.name === "Deposit") {
          log.debug(`Deposit by ${args.dst} minted ${quantity} ${assetType}`);
          transfer.category = TransferCategories.SwapIn;
          transaction.transfers.push({ ...transfer, from: address, to: args.dst });
        } else if (assetType === "WETH" && event.name === "Withdrawal") {
          log.debug(`Withdraw by ${args.dst} burnt ${quantity} ${assetType}`);
          transfer.category = TransferCategories.SwapOut;
          transaction.transfers.push({ ...transfer, from: args.src, to: address });

        // MakerDAO SAI
        } else if (assetType === "SAI" && event.name === "Mint") {
          log.debug(`Minted ${quantity} ${assetType}`);
          transfer.category = TransferCategories.Borrow;
          transaction.transfers.push({ ...transfer, from: AddressZero, to: args.guy });
        } else if (assetType === "SAI" && event.name === "Burn") {
          log.debug(`Burnt ${quantity} ${assetType}`);
          transfer.category = TransferCategories.Repay;
          transaction.transfers.push({ ...transfer, from: args.guy, to: AddressZero });

        // Compound V2 cETH
        } else if (
          addressBook.isCategory(AddressCategories.Compound)(address)
        ) {
          if (addressBook.getName(address) === "cETH") {
            quantity = formatUnits(quantityStr, 18); // cETH decimals != ETH decimals
            if (event.name === "Borrow") {
              log.info(`Compound - Borrowed ${quantity} ETH`);
              transaction.transfers.push({
                ...transfer,
                assetType: "ETH",
                category: TransferCategories.Borrow,
                from: address,
                to: args.borrower,
                quantity,
              });
            } else if (addressBook.getName(address) === "cETH" && event.name === "RepayBorrow") {
              log.info(`Compound - Repaid ${quantity} ETH`);
              transaction.transfers.push({
                ...transfer,
                assetType: "ETH",
                category: TransferCategories.Repay,
                from: args.borrower,
                to: address,
                quantity,
              });
            }
          } else {
            log.debug(`Compound - Ignoring ${event.name} ${quantity} ${assetType}`);
          }

        } else if (event) {
          log.warn(`Unknown ${assetType} event: ${event.format()}`);
        }
      }
    }

    if (transaction.transfers.length === 0) {
      throw new Error(`No transfers for EthTx: ${JSON.stringify(transaction, null, 2)}`);
    } else if (transaction.transfers.length === 1) {
      const { assetType, from, quantity, to } = transaction.transfers[0];
      transaction.description = `${getName(from)} sent ${quantity} ${assetType} to ${
        getName(to)
      }`;
    } else {
      transaction.description = `${getName(transaction.transfers[0].to)} made ${
        transaction.transfers.length
      } transfers`;
    }

    log.debug(transaction.description);

    transaction.transfers = transaction.transfers
      .filter(transfer => addressBook.isSelf(transfer.to) || addressBook.isSelf(transfer.from))
      // Make sure all addresses are lower-case
      .map(transfer => ({ ...transfer, to: transfer.to.toLowerCase() }))
      .map(transfer => ({ ...transfer, from: transfer.from.toLowerCase() }))
      // sort by index
      .sort((t1, t2) => t1.index - t2.index);

    if (transaction.transfers.length === 0) {
      return;
    }

    mergeTransaction(transactions, transaction, log);
  });

  const diff = (Date.now() - start).toString();
  log.info(`Done processing eth txs in ${diff} ms (avg ${
    math.round(math.div(diff, newEthTxs.length.toString()))
  } ms/ethTx)`);
  return transactions;
};
