import {
  AddressBook,
  AddressCategories,
  EvmMetadata,
  EvmTransaction,
  Logger,
  Transaction,
  TransferCategories,
} from "@valuemachine/types";
import {
  dedup,
  setAddressCategory,
} from "@valuemachine/utils";

const source = "UniswapV3";

////////////////////////////////////////
/// Addresses

const routerAddresses = [
  { name: "UniswapRouterV3", address: "Ethereum/0xe592427a0aece92de3edee1f18e0157c05861564" },
].map(setAddressCategory(AddressCategories.Defi));

const marketAddresses = [
  { name: "UniV3_MATIC_USDT", address: "Ethereum/0x972f43Bb94B76B9e2D036553d818879860b6A114" },
  { name: "UniV3_ETH_USDT", address: "Ethereum/0x11b815efB8f581194ae79006d24E0d814B7697F6" },
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
