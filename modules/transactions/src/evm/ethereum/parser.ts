import { isAddress, getAddress } from "@ethersproject/address";
import { BigNumber } from "@ethersproject/bignumber";
import { formatEther } from "@ethersproject/units";
import {
  Address,
  AddressBook,
  Assets,
  EvmTransfer,
  EvmTransaction,
  Logger,
  Transaction,
  TransactionSources,
  TransferCategories,
  EvmParser,
  TransferCategory,
} from "@valuemachine/types";
import { gt, getNewContractAddress } from "@valuemachine/utils";

import { appParsers } from "../apps";

const { ETH } = Assets;
const { Expense, Income, Internal, Unknown } = TransferCategories;

export const parseEthTx = (
  ethTx: EvmTransaction,
  ethCalls: EvmTransfer[],
  addressBook: AddressBook,
  logger: Logger,
  extraParsers = [] as EvmParser[],
): Transaction => {
  const { isSelf } = addressBook;
  const log = logger.child({ module: `Eth${ethTx.hash?.substring(0, 8)}` });
  // log.debug(ethTx, `Parsing eth tx`);

  const getSimpleCategory = (to: Address, from: Address): TransferCategory =>
    (isSelf(to) && isSelf(from)) ? Internal
    : (isSelf(from) && !isSelf(to)) ? Expense
    : (isSelf(to) && !isSelf(from)) ? Income
    : Unknown;

  let tx = {
    date: (new Date(ethTx.timestamp)).toISOString(),
    hash: ethTx.hash,
    sources: [],
    transfers: [],
  } as Transaction;

  // Transaction Fee
  if (isSelf(ethTx.from)) {
    tx.transfers.push({
      asset: ETH,
      category: Expense,
      from: getAddress(ethTx.from),
      index: -1,
      quantity: formatEther(BigNumber.from(ethTx.gasUsed).mul(ethTx.gasPrice)),
      to: ETH,
    });
  }

  // Detect failed transactions
  if (ethTx.status !== 1) {
    tx.method = "Failure";
    log.info(`Detected a failed tx`);
    return tx;
  }

  // Transaction Value
  if (gt(ethTx.value, "0") && (isSelf(ethTx.to) || isSelf(ethTx.from))) {
    tx.transfers.push({
      asset: ETH,
      category: getSimpleCategory(ethTx.to, ethTx.from),
      from: getAddress(ethTx.from),
      index: 0,
      quantity: ethTx.value,
      to: getAddress(ethTx.to),
    });
  }

  // Detect contract creations
  if (ethTx.to === null) {
    // derived from: https://ethereum.stackexchange.com/a/46960
    const newContract = getNewContractAddress(ethTx.from, ethTx.nonce);
    ethTx.to = newContract; // overwrite to make later steps simpler
    tx.transfers[0].to = newContract;
    tx.method = "Create Contract";
    log.info(`Detected a newly created contract`);
  }

  // Add internal eth calls to the transfers array
  ethCalls.filter((call: EvmTransfer) => call.hash === ethTx.hash).forEach((call: EvmTransfer) => {
    if (
      // Calls that don't interact with self addresses don't matter
      (isSelf(call.to) || isSelf(call.from))
      // Calls with zero value don't matter
      && gt(call.value, "0")
    ) {
      tx.transfers.push({
        asset: ETH,
        category: getSimpleCategory(call.to, call.from),
        // Internal eth transfers have no index, put incoming transfers first & outgoing last
        // This makes underflows less likely during VM processesing
        index: isSelf(call.to) ? 1 : 10000,
        from: getAddress(call.from),
        quantity: call.value,
        to: getAddress(call.to),
      });
    }
  });

  // Pre-format tx log addresses so we don't need to do this inside each parser
  ethTx.logs.forEach(log => {
    log.address = getAddress(log.address);
  });

  // Activate pipeline of app-specific parsers
  appParsers.concat(extraParsers).forEach(parser => {
    try {
      tx = parser(tx, ethTx, addressBook, log);
    } catch (e) {
      // If one of them fails, log the error & move on
      log.error(e);
    }
  });

  // Give a default eth-related source if no app-specific parsers were triggered
  if (!tx.sources.length) {
    tx.sources.push(TransactionSources.Ethereum);
  }

  tx.transfers = tx.transfers
    // Filter out no-op transfers
    .filter(transfer => (
      !isAddress(transfer.from) || isSelf(transfer.from) ||
      !isAddress(transfer.to) || isSelf(transfer.to)
    ) && (
      gt(transfer.quantity, "0")
    ))
    // Make sure all eth addresses are checksummed
    .map(transfer => ({
      ...transfer,
      from: isAddress(transfer.from) ? getAddress(transfer.from) : transfer.from,
      to: isAddress(transfer.to) ? getAddress(transfer.to) : transfer.to,
    }))
    // sort by index
    .sort((t1, t2) => t1.index - t2.index);

  log.debug(tx, `Parsed eth tx`);
  return tx;
};
