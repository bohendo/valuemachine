import { isAddress, getAddress } from "@ethersproject/address";
import { BigNumber } from "@ethersproject/bignumber";
import { formatEther } from "@ethersproject/units";
import {
  Address,
  AddressBook,
  Asset,
  Assets,
  EvmParser,
  Evm,
  Evms,
  EvmTransaction,
  EvmTransfer,
  Logger,
  Transaction,
  TransferCategories,
  TransferCategory,
} from "@valuemachine/types";
import { gt, getLogger, getNewContractAddress } from "@valuemachine/utils";

// import { addressToAccount } from "./utils";

const { Expense, Income, Internal, Unknown } = TransferCategories;

export const parseEvmTx = (
  evmTx: EvmTransaction,
  evmTransfers: EvmTransfer[],
  addressBook: AddressBook,
  logger?: Logger,
  chainId = 1 as number,
  evm = Evms.Ethereum as Evm,
  nativeAsset = Assets.ETH as Asset,
  appParsers = [] as EvmParser[],
  fmtAddress = getAddress as (address: string) => string,
): Transaction => {
  const { isSelf } = addressBook;
  const log = (logger || getLogger()).child({ module: `EVM${evmTx.hash?.substring(0, 8)}` });
  // log.debug(evmTx, `Parsing evm tx`);

  const addressToAccount = (address: string): string => {
    return `evm:${chainId}${fmtAddress(address)}`;
  };

  const getSimpleCategory = (to: Address, from: Address): TransferCategory =>
    (isSelf(to) && isSelf(from)) ? Internal
    : (isSelf(from) && !isSelf(to)) ? Expense
    : (isSelf(to) && !isSelf(from)) ? Income
    : Unknown;

  let tx = {
    date: (new Date(evmTx.timestamp)).toISOString(),
    hash: evmTx.hash,
    sources: [evm],
    transfers: [],
  } as Transaction;

  // Transaction Fee
  if (isSelf(evmTx.from)) {
    tx.transfers.push({
      asset: nativeAsset,
      category: Expense,
      from: addressToAccount(evmTx.from),
      index: -1,
      quantity: formatEther(BigNumber.from(evmTx.gasUsed).mul(evmTx.gasPrice)),
      to: evm,
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
      asset: nativeAsset,
      category: getSimpleCategory(evmTx.to, evmTx.from),
      from: addressToAccount(evmTx.from),
      index: 0,
      quantity: evmTx.value,
      to: addressToAccount(evmTx.to),
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
  evmTransfers?.filter((call: EvmTransfer) => call.hash === evmTx.hash)
    .forEach((call: EvmTransfer) => {
      if (
        // Calls that don't interact with self addresses don't matter
        (isSelf(call.to) || isSelf(call.from))
        // Calls with zero value don't matter
        && gt(call.value, "0")
      ) {
        tx.transfers.push({
          asset: nativeAsset,
          category: getSimpleCategory(call.to, call.from),
          // Internal evm transfers have no index, put incoming transfers first & outgoing last
          // This makes underflows less likely during VM processesing
          index: isSelf(call.to) ? 1 : 10000,
          from: getAddress(call.from),
          quantity: call.value,
          to: getAddress(call.to),
        });
      }
    });

  // Activate pipeline of app-specific parsers
  appParsers.forEach(parser => {
    try {
      tx = parser(tx, evmTx, addressBook, log);
    } catch (e) {
      // If one of them fails, log the error & move on
      log.error(e);
    }
  });

  tx.transfers = tx.transfers
    // Filter out no-op transfers
    .filter(transfer => (
      !isAddress(transfer.from) || isSelf(transfer.from) ||
      !isAddress(transfer.to) || isSelf(transfer.to)
    ) && (
      gt(transfer.quantity, "0")
    ))
    // Make sure all evm addresses are checksummed
    .map(transfer => ({
      ...transfer,
      from: isAddress(transfer.from) ? addressToAccount(transfer.from) : transfer.from,
      to: isAddress(transfer.to) ? addressToAccount(transfer.to) : transfer.to,
    }))
    // sort by index
    .sort((t1, t2) => t1.index - t2.index);

  log.debug(tx, `Parsed evm tx`);
  return tx;
};
