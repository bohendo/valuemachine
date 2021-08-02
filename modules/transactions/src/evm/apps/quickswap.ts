import {
  AddressBook,
  AddressCategories,
  EvmMetadata,
  EvmTransaction,
  Guards,
  Logger,
  Transaction,
  TransactionSources,
  TransferCategories,
} from "@valuemachine/types";
import { setAddressCategory } from "@valuemachine/utils";

const source = TransactionSources.Quickswap;

const govAddresses = [
  { name: "QUICK", address: "evm:137:0x831753dd7087cac61ab5644b308642cc1c33dc13" },
].map(setAddressCategory(AddressCategories.ERC20, Guards.Polygon));

const routerAddresses = [
  { name: source, address: "evm:137:0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff" },
].map(setAddressCategory(AddressCategories.Defi, Guards.Polygon));

const marketAddresses = [
  { name: "Quickswap_DAI_USDC", address: "evm:137:0xf04adBF75cDFc5eD26eeA4bbbb991DB002036Bdd" },
  { name: "Quickswap_MATIC_USDC", address: "evm:137:0x6e7a5FAFcec6BB1e78bAE2A1F0B612012BF14827" },
].map(setAddressCategory(AddressCategories.ERC20, Guards.Polygon));

export const quickswapAddresses = [
  ...govAddresses,
  ...routerAddresses,
  ...marketAddresses,
];

export const quickswapParser = (
  tx: Transaction,
  _evmTx: EvmTransaction,
  evmMeta: EvmMetadata,
  _addressBook: AddressBook,
  _logger: Logger,
): Transaction => {
  const prefix = `evm:${evmMeta.id}`;
  tx.transfers.forEach(transfer => {
    if (quickswapAddresses.some(e => `${prefix}:${e.address}` === transfer.from)) {
      transfer.category = TransferCategories.SwapIn;
      tx.method = source;
    }
    if (quickswapAddresses.some(e => `${prefix}:${e.address}` === transfer.to)) {
      transfer.category = TransferCategories.SwapOut;
      tx.method = source;
    }
  });
  return tx;
};
