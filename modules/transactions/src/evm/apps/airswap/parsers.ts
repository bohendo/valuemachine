import {
  AddressBook,
  EvmMetadata,
  EvmTransaction,
  Logger,
  Transaction,
  TransferCategories,
} from "@valuemachine/types";

import { addresses } from "./addresses";
import { apps } from "./enums";

const appName = apps.Airswap;
const { Expense, Income, SwapIn, SwapOut } = TransferCategories;

export const coreParser = (
  tx: Transaction,
  evmTx: EvmTransaction,
  _evmMeta: EvmMetadata,
  addressBook: AddressBook,
  logger: Logger,
): Transaction => {
  const log = logger.child({ module: `${appName}:${evmTx.hash.substring(0, 6)}` });

  // If this eth tx is self->airswap then replace income/expense w swap in/out
  if (addressBook.isSelf(evmTx.from) && addresses.some(e => e.address === evmTx.to)) {
    log.info(`Found transaction from ${evmTx.from}`);
    tx.apps.push(appName);
    tx.transfers.forEach(transfer => {
      transfer.category = transfer.category === Expense ? SwapOut
        : transfer.category === Income ? SwapIn
        : transfer.category;
    });
  }

  return tx;
};

export const parsers = { insert: [], modify: [coreParser] };
