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

export const v3Parser = (
  tx: Transaction,
  evmTx: EvmTransaction,
  evmMeta: EvmMetadata,
  addressBook: AddressBook,
  logger: Logger,
): Transaction => {
  const log = logger.child({ module: `${appName}:${evmTx.hash.substring(0, 6)}` });
  tx.transfers.forEach(transfer => {
    const fromName = addressBook.getName(transfer.from);
    const toName = addressBook.getName(transfer.to);
    if (fromName.startsWith("Uni") && fromName.includes("V3")) {
      log.debug(`Found Uniswap v3 interaction on ${evmMeta.name} w ${fromName}`);
      transfer.category = TransferCategories.SwapIn;
      tx.method = appName;
      tx.apps.push(appName);
    }
    if (toName.startsWith("Uni") && toName.includes("V3")) {
      log.debug(`Found Uniswap v3 interaction on ${evmMeta.name} w ${toName}`);
      transfer.category = TransferCategories.SwapOut;
      tx.method = appName;
      tx.apps.push(appName);
    }
  });
  return tx;
};
