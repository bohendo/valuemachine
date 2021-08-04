import {
  AddressBook,
  AddressCategories,
  EvmMetadata,
  EvmTransaction,
  Logger,
  Transaction,
  TransactionSources,
  TransferCategories,
} from "@valuemachine/types";
import {
  dedup,
  setAddressCategory,
} from "@valuemachine/utils";

const source = TransactionSources.Uniswap + "V3";

////////////////////////////////////////
/// Addresses

const routerAddresses = [
  { name: "UniswapRouterV3", address: "evm:1:0xe592427a0aece92de3edee1f18e0157c05861564" },
].map(setAddressCategory(AddressCategories.Defi));

const marketAddresses = [
  { name: "UniV3_MATIC_USDT", address: "evm:1:0x972f43Bb94B76B9e2D036553d818879860b6A114" },
].map(setAddressCategory(AddressCategories.Defi));

export const uniswapv3Addresses = [
  ...marketAddresses,
  ...routerAddresses,
];

////////////////////////////////////////
/// Parser

export const uniswapv3Parser = (
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
      tx.method = source;
      tx.sources = dedup([...tx.sources, source]);
    }
    if (toName.startsWith("Uni") && toName.includes("V3")) {
      transfer.category = TransferCategories.SwapOut;
      tx.method = source;
      tx.sources = dedup([...tx.sources, source]);
    }
  });
  return tx;
};
