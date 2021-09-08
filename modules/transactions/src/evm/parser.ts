import { isAddress } from "@ethersproject/address";
import { BigNumber } from "@ethersproject/bignumber";
import { formatEther } from "@ethersproject/units";
import {
  Account,
  AddressBook,
  EvmParsers,
  EvmTransaction,
  EvmTransfer,
  EvmMetadata,
  Logger,
  Transaction,
  TransferCategories,
  TransferCategory,
} from "@valuemachine/types";
import { dedup, gt, getNewContractAddress } from "@valuemachine/utils";

const { Expense, Fee, Income, Internal, Unknown } = TransferCategories;

export const parseEvmTx = (
  evmTx: EvmTransaction,
  evmMetadata: EvmMetadata,
  addressBook: AddressBook,
  logger?: Logger,
  appParsers = [] as EvmParsers[],
): Transaction => {
  if (!evmTx || !evmTx.hash) throw new Error(`Invalid evm tx: ${JSON.stringify(evmTx)}`);
  const { isSelf } = addressBook;
  const log = logger.child({ module: `EVM${evmTx.hash?.substring(0, 8)}` });
  // log.debug(evmTx, `Parsing evm tx`);

  const getSimpleCategory = (to: Account, from: Account): TransferCategory =>
    (isSelf(to) && isSelf(from)) ? Internal
    : (isSelf(from) && !isSelf(to)) ? Expense
    : (isSelf(to) && !isSelf(from)) ? Income
    : Unknown;

  let tx = {
    apps: [],
    date: (new Date(evmTx.timestamp)).toISOString(),
    hash: evmTx.hash,
    sources: [evmMetadata.name],
    transfers: [],
  } as Transaction;

  // Transaction Fee
  if (isSelf(evmTx.from)) {
    tx.transfers.push({
      asset: evmMetadata.feeAsset,
      category: Fee,
      from: evmTx.from,
      index: -1,
      quantity: formatEther(BigNumber.from(evmTx.gasUsed).mul(evmTx.gasPrice)),
      to: evmMetadata.name,
    });
  }

  // Detect failed transactions
  if (evmTx.status !== 1) {
    tx.method = "Failure";
    log.info(`Detected a failed tx`);
    return tx;
  }

  // Transaction Value
  if (gt(evmTx.value, "0") && (isSelf(evmTx.to) || isSelf(evmTx.from))) {
    tx.transfers.push({
      asset: evmMetadata.feeAsset,
      category: getSimpleCategory(evmTx.to, evmTx.from),
      from: evmTx.from,
      index: 0,
      quantity: evmTx.value,
      to: evmTx.to,
    });
  }

  // Detect contract creations
  if (evmTx.to === null) {
    // derived from: https://evmereum.stackexchange.com/a/46960
    const newContract = getNewContractAddress(evmTx.from, evmTx.nonce);
    evmTx.to = newContract; // overwrite to make later steps simpler
    tx.method = "Contract Creation";
    log.info(`Detected a newly created contract`);
  }

  // Add internal evm transfers to the transfers array
  evmTx.transfers.forEach((evmTransfer: EvmTransfer) => {
    if (
      // Calls that don't interact with self addresses don't matter
      (isSelf(evmTransfer.to) || isSelf(evmTransfer.from))
      // Calls with zero value don't matter
      && gt(evmTransfer.value, "0")
    ) {
      tx.transfers.push({
        asset: evmMetadata.feeAsset,
        category: getSimpleCategory(evmTransfer.to, evmTransfer.from),
        // index: 0, // Internal evm transfers have no index
        from: evmTransfer.from,
        quantity: evmTransfer.value,
        to: evmTransfer.to,
      });
    }
  });

  // Activate pipeline of app-specific inserters
  appParsers.forEach(app => { app?.insert?.forEach(parser => {
    try { tx = parser(tx, evmTx, evmMetadata, addressBook, log); }
    catch (e) { log.error(e); } // If one of them fails, log the error & move on
  }); });
  // Activate pipeline of app-specific modifiers
  appParsers.forEach(app => { app?.modify?.forEach(parser => {
    try { tx = parser(tx, evmTx, evmMetadata, addressBook, log); }
    catch (e) { log.error(e); } // If one of them fails, log the error & move on
  }); });
  tx.apps = dedup(tx.apps).sort();

  tx.transfers = tx.transfers
    // Filter out no-op transfers
    .filter(transfer => (
      !isAddress(transfer.from) || isSelf(transfer.from) ||
      !isAddress(transfer.to) || isSelf(transfer.to)
    ) && (
      gt(transfer.quantity, "0")
    ))
    // sort by index
    .sort((t1, t2) => t1.index - t2.index);

  log.debug(tx, `Parsed evm tx`);
  return tx;
};
