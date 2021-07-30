import {
  AddressBook,
  AddressCategories,
  EvmTransaction,
  Logger,
  Transaction,
  TransactionSources,
  TransferCategories,
} from "@valuemachine/types";
import {
  rmDups,
  setAddressCategory,
} from "@valuemachine/utils";

const source = TransactionSources.Uniswap + "V3";

////////////////////////////////////////
/// Addresses

const routerAddresses = [
  { name: "UniswapRouterV3", address: "0xe592427a0aece92de3edee1f18e0157c05861564" },
].map(setAddressCategory(AddressCategories.Defi));

const marketAddresses = [
  { name: "UniV3_MATIC_USDT", address: "0x972f43Bb94B76B9e2D036553d818879860b6A114" },
].map(setAddressCategory(AddressCategories.Defi));

export const uniswapv3Addresses = [
  ...marketAddresses,
  ...routerAddresses,
];

////////////////////////////////////////
/// Parser

export const uniswapv3Parser = (
  tx: Transaction,
  _ethTx: EvmTransaction,
  addressBook: AddressBook,
  _logger: Logger,
): Transaction => {
  tx.transfers.forEach(transfer => {
    const fromName = addressBook.getName(transfer.from);
    const toName = addressBook.getName(transfer.to);
    if (fromName.startsWith("Uni") && fromName.includes("V3")) {
      transfer.category = TransferCategories.SwapIn;
      tx.method = source;
      tx.sources = rmDups([...tx.sources, source]);
    }
    if (toName.startsWith("Uni") && toName.includes("V3")) {
      transfer.category = TransferCategories.SwapOut;
      tx.method = source;
      tx.sources = rmDups([...tx.sources, source]);
    }
  });
  return tx;
};
