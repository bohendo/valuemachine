import {
  AddressBook,
  AddressCategories,
  EvmMetadata,
  EvmTransaction,
  Logger,
  Transaction,
  TransferCategories,
} from "@valuemachine/types";
import { setAddressCategory } from "@valuemachine/utils";

export const appName = "Quickswap";

const govAddresses = [
  { name: "QUICK", address: "Polygon/0x831753dd7087cac61ab5644b308642cc1c33dc13" },
].map(setAddressCategory(AddressCategories.ERC20));

const routerAddresses = [
  { name: appName, address: "Polygon/0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff" },
].map(setAddressCategory(AddressCategories.Defi));

const marketAddresses = [
  { name: "Quickswap_DAI_USDC", address: "Polygon/0xf04adBF75cDFc5eD26eeA4bbbb991DB002036Bdd" },
  { name: "Quickswap_MATIC_USDC", address: "Polygon/0x6e7a5FAFcec6BB1e78bAE2A1F0B612012BF14827" },
].map(setAddressCategory(AddressCategories.ERC20));

export const quickswapAddresses = [
  ...govAddresses,
  ...routerAddresses,
  ...marketAddresses,
];

export const quickswapParser = (
  tx: Transaction,
  _evmTx: EvmTransaction,
  _evmMeta: EvmMetadata,
  _addressBook: AddressBook,
  _logger: Logger,
): Transaction => {
  tx.transfers.forEach(transfer => {
    if (quickswapAddresses.some(e => e.address === transfer.from)) {
      transfer.category = TransferCategories.SwapIn;
      tx.apps.push(appName);
      tx.method = appName;
    }
    if (quickswapAddresses.some(e => e.address === transfer.to)) {
      transfer.category = TransferCategories.SwapOut;
      tx.apps.push(appName);
      tx.method = appName;
    }
  });
  return tx;
};