import {
  AddressBook,
  ChainData,
  Transaction,
  TransactionSources,
  Logger,
  EthTransaction,
  Transfer,
  TransferCategories,
} from "@finances/types";
import { ContextLogger, math } from "@finances/utils";
import { BigNumber, constants, utils } from "ethers";

import { getTokenInterface } from "../abi";
import { getTransactionsError } from "../verify";

import { categorizeTransfer } from "./categorizeTransfer";
import { mergeFactory } from "./utils";

const { hexlify, formatEther, formatUnits, keccak256, Interface: { getEventTopic }, RLP } = utils;
const { AddressZero } = constants;

export const mergeEthTxTransactions = (
  oldTransactions: Transaction[],
  addressBook: AddressBook,
  chainData: ChainData,
  lastUpdated: number,
  logger?: Logger,
): Transaction[] => {
  let transactions = JSON.parse(JSON.stringify(oldTransactions));
  const log = new ContextLogger("EthTx", logger);
  const start = Date.now();

  const newEthTxs = chainData.getEthTransactions(ethTx =>
    new Date(ethTx.timestamp).getTime() > lastUpdated &&
    !transactions.some(tx => tx.hash === ethTx.hash),
  );

  if (newEthTxs.length === 0) {
    log.info(`Done processing ${newEthTxs.length} new eth txs`);
    return transactions;
  }

  const merge = mergeFactory({
    allowableTimeDiff: 0,
    log: new ContextLogger("MergeEthTx", logger),
    mergeTransactions: (): void => {
      throw new Error(`idk how to merge EthTxs`);
    },
    shouldMerge: (transaction: Transaction, txTransaction: Transaction): boolean =>
      transaction.hash === txTransaction.hash,
  });

  log.info(`Processing ${newEthTxs.length} new eth txs..`);
  newEthTxs
    .sort((tx1, tx2) =>
      (tx1.block * 10000 + tx1.index || 0) -
      (tx2.block * 10000 + tx2.index || 0),
    )
    .forEach((tx: EthTransaction): void => {
      if (new Date(tx.timestamp).getTime() <= lastUpdated) {
        return;
      }
      const { getName, isToken } = addressBook;
      const log = new ContextLogger(`EthTx ${tx.hash.substring(0, 8)}`, logger);

      if (!tx.logs) {
        throw new Error(`Missing logs for tx ${tx.hash}, did fetchChainData get interrupted?`);
      }

      if (tx.to === null) {
        // derived from: https://ethereum.stackexchange.com/a/46960
        tx.to = `0x${keccak256(RLP.encode([tx.from, hexlify(tx.nonce)])).substring(26)}`;
        log.debug(`new contract deployed to ${tx.to}`);
      }

      const transaction = {
        date: tx.timestamp,
        hash: tx.hash,
        prices: {},
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
          transactions = merge(transactions, transaction);
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

      log.debug(`${tx.value} ETH from ${tx.from} to ${tx.to}: ${transaction.transfers[0].category}`);

      for (const txLog of tx.logs) {
        if (isToken(txLog.address)) {

          const assetType = getName(txLog.address).toUpperCase();

          const iface = getTokenInterface(txLog.address);

          const event = Object.values(iface.events).find(e => getEventTopic(e) === txLog.topics[0]);

          if (!event) {
            log.debug(`Unable to identify ${assetType} event w topic: ${txLog.topics[0]}`);
            continue;
          }

          const args = iface.parseLog(txLog).args;
          // TODO: parseLog return type has changed, args is an array and needs more work
          log.info(`This is parseLog: ${JSON.stringify(iface.parseLog(txLog))}`);
          log.info(`These are the args received: ${JSON.stringify(args)}`);
          const quantity = formatUnits(
            args._value || args._wad || args.value || args.wad || "0",
            chainData.getTokenData(txLog.address).decimals,
          );

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

          } else if (assetType === "WETH" && event.name === "Deposit") {
            log.debug(`Deposit by ${args.dst} minted ${quantity} ${assetType}`);
            transfer.category = TransferCategories.SwapIn;
            transaction.transfers.push({ ...transfer, from: txLog.address, to: args.dst });

          } else if (assetType === "WETH" && event.name === "Withdrawal") {
            log.debug(`Withdraw by ${args.dst} burnt ${quantity} ${assetType}`);
            transfer.category = TransferCategories.SwapOut;
            transaction.transfers.push({ ...transfer, from: args.src, to: txLog.address });

          } else if (assetType === "SAI" && event.name === "Mint") {
            log.debug(`Minted ${quantity} ${assetType}`);
            transfer.category = TransferCategories.Borrow;
            transaction.transfers.push({ ...transfer, from: AddressZero, to: args.guy });

          } else if (assetType === "SAI" && event.name === "Burn") {
            log.debug(`Burnt ${quantity} ${assetType}`);
            transfer.category = TransferCategories.Repay;
            transaction.transfers.push({ ...transfer, from: args.guy, to: AddressZero });

          } else if (event.name === "Approval") {
            log.debug(`Skipping Approval event`);

          } else if (event) {
            log.warn(`Unknown ${assetType} event: ${JSON.stringify(event)}`);
          }
        }
      }

      if (transaction.transfers.length === 0) {
        throw new Error(`No transfers for EthTx: ${JSON.stringify(transaction, null, 2)}`);
      } else if (transaction.transfers.length === 1) {
        const { assetType, from, quantity, to } = transaction.transfers[0];
        transaction.description = `${getName(from)} sent ${quantity} ${assetType} to ${getName(to)}`;
      } else {
        transaction.description = `${getName(transaction.transfers[0].to)} made ${transaction.transfers.length} transfers`;
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

      transactions = merge(transactions, transaction);
      return;
    });

  const error = getTransactionsError(transactions);
  if (error) {
    throw new Error(error);
  }

  const diff = (Date.now() - start).toString();
  log.info(`Done processing eth txs in ${diff} ms (avg ${math.round(math.div(diff, newEthTxs.length.toString()))} ms/ethTx)`);
  return transactions;
};
