import {
  AddressBook,
  AddressCategories,
  EvmTransaction,
  Logger,
  Transaction,
  TransactionSources,
  TransferCategories,
} from "@valuemachine/types";

import { setAddressCategory } from "./utils";

const source = TransactionSources.Quickswap;

const govAddresses = [
  { name: "QUICK", address: "0x831753dd7087cac61ab5644b308642cc1c33dc13" },
].map(setAddressCategory(AddressCategories.ERC20));

const routerAddresses = [
  { name: source, address: "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff" },
].map(setAddressCategory(AddressCategories.Defi));

const marketAddresses = [
  { name: "QUICKSWAP_DAI_USDC", address: "0xf04adBF75cDFc5eD26eeA4bbbb991DB002036Bdd" },
  { name: "QUICKSWAP_MATIC_USDC", address: "0x6e7a5FAFcec6BB1e78bAE2A1F0B612012BF14827" },
].map(setAddressCategory(AddressCategories.ERC20));

export const quickswapAddresses = [
  ...govAddresses,
  ...routerAddresses,
  ...marketAddresses,
];

export const quickswapParser = (
  tx: Transaction,
  _ethTx: EvmTransaction,
  _addressBook: AddressBook,
  _logger: Logger,
): Transaction => {
  tx.transfers.forEach(transfer => {
    if (quickswapAddresses.some(e => `MATIC-${e.address}` === transfer.from)) {
      transfer.category = TransferCategories.SwapIn;
      tx.method = source;
    }
    if (quickswapAddresses.some(e => `MATIC-${e.address}` === transfer.to)) {
      transfer.category = TransferCategories.SwapOut;
      tx.method = source;
    }
  });
  return tx;
};
