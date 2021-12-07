import { BigNumber } from "@ethersproject/bignumber";
import { formatEther } from "@ethersproject/units";
import {
  AddressBook,
  EvmParsers,
  EvmTransaction,
  EvmTransfer,
  EvmMetadata,
  Logger,
  Transaction,
  TransferCategories,
} from "@valuemachine/types";
import { dedup, getNewContractAddress, math } from "@valuemachine/utils";

import { Methods } from "./enums";
import { getTransferCategory } from "./utils";

export const parseEvmTx = (
  evmTx: EvmTransaction,
  evmMetadata: EvmMetadata,
  addressBook: AddressBook,
  logger?: Logger,
  appParsers = [] as EvmParsers[],
): Transaction => {
  if (!evmTx?.hash) throw new Error(`Invalid evm tx: ${JSON.stringify(evmTx)}`);
  const { isSelf } = addressBook;
  const log = logger.child({ module: `EVM${evmTx.hash?.substring(0, 8)}` });
  // log.debug(evmTx, `Parsing evm tx`);

  let tx = {
    apps: [],
    date: (new Date(evmTx.timestamp)).toISOString(),
    method: "",
    sources: [evmMetadata.name],
    tag: {},
    transfers: [],
    uuid: `${evmMetadata.name}/${evmTx.hash}`,
  } as Transaction;

  // Transaction Fee
  if (isSelf(evmTx.from)) {
    tx.transfers.push({
      asset: evmMetadata.feeAsset,
      category: TransferCategories.Fee,
      from: evmTx.from,
      index: -1,
      amount: formatEther(BigNumber.from(evmTx.gasUsed).mul(evmTx.gasPrice)),
      to: evmMetadata.name,
    });
  }

  // Detect failed transactions
  if (evmTx.status !== 1) {
    tx.method = Methods.Failure;
    log.info(`Detected a failed tx`);
    return tx;
  }

  // Transaction Value
  if (math.gt(evmTx.value, "0") && (isSelf(evmTx.to) || isSelf(evmTx.from))) {
    tx.transfers.push({
      amount: evmTx.value,
      asset: evmMetadata.feeAsset,
      category: getTransferCategory(evmTx.from, evmTx.to, addressBook),
      from: evmTx.from,
      index: 0,
      to: evmTx.to,
    });
  }

  // Detect contract creations
  if (evmTx.to === null) {
    // derived from: https://evmereum.stackexchange.com/a/46960
    const newContract = getNewContractAddress(evmTx.from, evmTx.nonce);
    evmTx.to = newContract; // overwrite to make later steps simpler
    tx.method = Methods.Creation;
    log.info(`Detected a newly created contract`);
  }

  // Add internal evm transfers to the transfers array
  evmTx.transfers.forEach((evmTransfer: EvmTransfer) => {
    // Skip zero-value transfers
    if (evmTransfer.value && math.eq(evmTransfer.value, "0")) return;
    // Index is unknown for internal transfers, hopefully app parsers will be able to add one
    tx.transfers.push({
      amount: evmTransfer.value,
      asset: evmMetadata.feeAsset,
      category: getTransferCategory(evmTransfer.from, evmTransfer.to, addressBook),
      from: evmTransfer.from,
      to: evmTransfer.to,
    });
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
  tx.method = tx.method || Methods.Unknown;

  tx.transfers = tx.transfers
    // Filter out transfers that we don't need to parse
    .filter(transfer => transfer.category !== TransferCategories.Noop)
    // sort by index
    .sort((t1, t2) => t1.index - t2.index);

  log.debug(tx, `Parsed evm tx`);
  return tx;
};
