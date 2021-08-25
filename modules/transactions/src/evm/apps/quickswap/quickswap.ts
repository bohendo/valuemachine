import {
  AddressBook,
  EvmMetadata,
  EvmTransaction,
  Logger,
  Transaction,
  TransferCategories,
} from "@valuemachine/types";

import { addresses } from "./addresses";

export const appName = "Quickswap";

export const parser = (
  tx: Transaction,
  _evmTx: EvmTransaction,
  _evmMeta: EvmMetadata,
  _addressBook: AddressBook,
  _logger: Logger,
): Transaction => {
  tx.transfers.forEach(transfer => {
    if (addresses.some(e => e.address === transfer.from)) {
      transfer.category = TransferCategories.SwapIn;
      tx.apps.push(appName);
      tx.method = appName;
    }
    if (addresses.some(e => e.address === transfer.to)) {
      transfer.category = TransferCategories.SwapOut;
      tx.apps.push(appName);
      tx.method = appName;
    }
  });
  return tx;
};
