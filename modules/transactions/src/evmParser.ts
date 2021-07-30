import { isAddress, getAddress } from "@ethersproject/address";
import { BigNumber } from "@ethersproject/bignumber";
import { formatEther } from "@ethersproject/units";
import {
  Address,
  Asset,
  Assets,
  AddressBook,
  EvmTransaction,
  EvmParser,
  Logger,
  Transaction,
  TransferCategories,
  TransferCategory,
} from "@valuemachine/types";
import { gt } from "@valuemachine/utils";

const { Expense, Income, Internal, Unknown } = TransferCategories;

export const parseEvmTx = (
  evmTx: EvmTransaction,
  addressBook: AddressBook,
  logger: Logger,
  nativeAsset = Assets.ETH as Asset,
  appParsers = [] as EvmParser[],
): Transaction => {
  const { isSelf } = addressBook;
  const log = logger.child({ module: `EVM${evmTx.hash?.substring(0, 8)}` });
  // log.debug(evmTx, `Parsing evm tx`);

  const getAccount = (address: string): string => {
    if (nativeAsset === Assets.ETH) return getAddress(address);
    if (nativeAsset === Assets.MATIC) return `${nativeAsset}-${getAddress(address)}`;
    // if (nativeAsset === Assets.ONE) return address; // use "oneAbC.." format instead of "0xabc.."
    return isAddress(address) ? getAddress(address) : address;
  };

  const getSimpleCategory = (to: Address, from: Address): TransferCategory =>
    (isSelf(to) && isSelf(from)) ? Internal
    : (isSelf(from) && !isSelf(to)) ? Expense
    : (isSelf(to) && !isSelf(from)) ? Income
    : Unknown;

  let tx = {
    date: (new Date(evmTx.timestamp)).toISOString(),
    hash: evmTx.hash,
    sources: [nativeAsset],
    transfers: [],
  } as Transaction;

  // Transaction Fee
  if (isSelf(evmTx.from)) {
    tx.transfers.push({
      asset: nativeAsset,
      category: Expense,
      from: getAccount(evmTx.from),
      index: -1,
      quantity: formatEther(BigNumber.from(evmTx.gasUsed).mul(evmTx.gasPrice)),
      to: nativeAsset,
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
      from: getAccount(evmTx.from),
      index: 0,
      quantity: evmTx.value,
      to: getAccount(evmTx.to),
    });
  }

  // Activate app-specific parsers
  for (const appParser of appParsers) {
    tx = appParser(tx, evmTx, addressBook, log);
  }

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
      from: isAddress(transfer.from) ? getAccount(transfer.from) : transfer.from,
      to: isAddress(transfer.to) ? getAccount(transfer.to) : transfer.to,
    }))
    // sort by index
    .sort((t1, t2) => t1.index - t2.index);

  log.debug(tx, `Parsed evm tx`);
  return tx;
};
