import {
  AddressBook,
  AddressCategories,
  ChainData,
  EthCall,
  EthTransaction,
  Logger,
  Transaction,
  TransactionSources,
  Transfer,
  TransferCategories,
} from "@finances/types";
import { math, sm } from "@finances/utils";
import { BigNumber, constants, utils } from "ethers";

import { getTokenInterface } from "../../abi";

import { categorizeTransfer } from "./categorize";

const { hexlify, formatEther, formatUnits, keccak256, Interface: { getEventTopic }, RLP } = utils;
const { AddressZero } = constants;

export const parseEthTx = (
  tx: EthTransaction,
  addressBook: AddressBook,
  chainData: ChainData,
  logger: Logger,
): Transaction => {

  const { getName, isToken } = addressBook;
  const log = logger.child({ module: `Eth${tx.hash.substring(0, 8)}` });

  if (!tx.logs) {
    throw new Error(`Missing logs for tx ${tx.hash}, did fetchChainData get interrupted?`);
  }

  if (tx.to === null) {
    // derived from: https://ethereum.stackexchange.com/a/46960
    tx.to = `0x${keccak256(RLP.encode([tx.from, hexlify(tx.nonce)])).substring(26)}`;
    log.debug(`new contract deployed to ${tx.to}`);
  }

  const transaction = {
    date: (new Date(tx.timestamp)).toISOString(),
    hash: tx.hash,
    sources: [TransactionSources.EthTx],
    tags: [],
    transfers: [{
      assetType: "ETH",
      category: TransferCategories.Transfer,
      fee: formatEther(BigNumber.from(tx.gasUsed).mul(tx.gasPrice)),
      from: sm(tx.from),
      index: 0,
      quantity: tx.value,
      to: sm(tx.to),
    }],
  } as Transaction;

  if (tx.status !== 1) {
    transaction.transfers[0].quantity = "0";
    transaction.description = `${getName(tx.from)} sent failed tx`;
    if (!addressBook.isSelf(transaction.transfers[0].from)) {
      transaction.transfers = [];
    }
    log.debug(transaction, `Parsed a reverted eth tx`);
    return transaction;
  }

  transaction.transfers[0] = categorizeTransfer(
    transaction.transfers[0],
    [],
    tx.to,
    addressBook,
  );

  // Add internal eth calls to the transfers array
  chainData.getEthCalls((call: EthCall) => call.hash === tx.hash).forEach((call: EthCall) => {
    if (
      // Ignore non-eth transfers, we'll get those by parsing logs instead
      call.contractAddress === constants.AddressZero
      // Calls that don't interact with self addresses don't matter
      && (addressBook.isSelf(call.to) || addressBook.isSelf(call.from))
      // Calls with zero value don't matter
      && math.gt(call.value, "0")
    ) {
      transaction.transfers.push(categorizeTransfer(
        {
          assetType: "ETH",
          category: TransferCategories.Transfer,
          index: -1, // index is unknown for internal eth transfers
          from: sm(call.from),
          quantity: call.value,
          to: sm(call.to),
        },
        [],
        call.to,
        addressBook,
      ));
    }
  });

  // Sort transfers so that eth calls are first and incoming are before outgoing ones
  // This makes underflows less likely during VM processesing
  transaction.transfers.sort((t1: Transfer, t2: Transfer): number => {
    if (t1.index !== t2.index) {
      return t2.index - t1.index;
    } else if (!addressBook.isSelf(t1.from) && addressBook.isSelf(t2.from)) {
      return -1;
    } else if (addressBook.isSelf(t1.from) && !addressBook.isSelf(t2.from)) {
      return 1;
    } else {
      return 0;
    }
  });

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

  transaction.transfers = transaction.transfers
    .filter(transfer => addressBook.isSelf(transfer.to) || addressBook.isSelf(transfer.from))
    // Make sure all addresses are lower-case
    .map(transfer => ({ ...transfer, to: sm(transfer.to) }))
    .map(transfer => ({ ...transfer, from: sm(transfer.from) }))
    // sort by index
    .sort((t1, t2) => t1.index - t2.index);

  if (transaction.transfers.length === 0) {
    log.warn(transaction, `Eth transaction has zero transfers`);
    return transaction;

  } else if (transaction.transfers.length === 1) {
    const { assetType, from, quantity, to } = transaction.transfers[0];
    transaction.description = `${getName(from)} sent ${quantity} ${assetType} to ${
      getName(to)
    }`;

  } else {
    transaction.description = `Tx to ${getName(transaction.transfers[0].to)} made ${
      transaction.transfers.length
    } transfers`;
  }

  log.debug(transaction, `Parsed eth tx`);
  return transaction;
};
