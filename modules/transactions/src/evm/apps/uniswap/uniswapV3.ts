import {
  AddressBook,
  EvmMetadata,
  EvmTransaction,
  Logger,
  Transaction,
  TransferCategories,
} from "@valuemachine/types";

export const appName = "UniswapV3";

////////////////////////////////////////
/// Parser

export const uniswapV3Parser = (
  tx: Transaction,
  _evmTx: EvmTransaction,
  _evmMeta: EvmMetadata,
  addressBook: AddressBook,
  _logger: Logger,
): Transaction => {
  tx.transfers.forEach(transfer => {
    const fromName = addressBook.getName(transfer.from);
    const toName = addressBook.getName(transfer.to);
    if (fromName.startsWith("Uni") && fromName.includes("V3")) {
      transfer.category = TransferCategories.SwapIn;
      tx.method = appName;
      tx.apps.push(appName);
    }
    if (toName.startsWith("Uni") && toName.includes("V3")) {
      transfer.category = TransferCategories.SwapOut;
      tx.method = appName;
      tx.apps.push(appName);
    }
  });
  return tx;
};
