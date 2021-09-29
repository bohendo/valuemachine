import {
  AddressBook,
  EvmMetadata,
  EvmTransaction,
  Logger,
  Transaction,
  TransferCategories,
  Transfer,
} from "@valuemachine/types";

import { Apps } from "../../enums";

import {
  v3MarketAddresses,
  routerAddresses,
} from "./addresses";

const appName = Apps.UniswapV3;

////////////////////////////////////////
/// Parser

export const v3Parser = (
  tx: Transaction,
  evmTx: EvmTransaction,
  evmMeta: EvmMetadata,
  addressBook: AddressBook,
  _logger: Logger,
): Transaction => {
  // const log = logger.child({ module: `${appName}:${evmTx.hash.substring(0, 6)}` });
  const { isSelf } = addressBook;

  const outAssets = [];
  tx.transfers.filter((transfer: Transfer): boolean =>
    isSelf(transfer.from)
    && !isSelf(transfer.to)
    && (
      routerAddresses.some(e => transfer.to === e.address) ||
      v3MarketAddresses.some(e => transfer.to === e.address)
    )
  ).forEach(swapOut => {
    tx.apps.push(appName);
    swapOut.category = TransferCategories.SwapOut;
    outAssets.push(swapOut.asset);
  });

  tx.transfers.filter((transfer: Transfer): boolean =>
    isSelf(transfer.to)
    && !isSelf(transfer.from)
    && (
      routerAddresses.some(e => transfer.from === e.address) ||
      v3MarketAddresses.some(e => transfer.from === e.address)
    )
  ).forEach(swapIn => {
    if (outAssets.length) tx.method = "Trade";
    tx.apps.push(appName);
    swapIn.category = outAssets.includes(swapIn.asset)
      ? TransferCategories.Refund
      : TransferCategories.SwapIn;
  });

  return tx;
};
