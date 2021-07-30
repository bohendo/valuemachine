import {
  AddressBook,
  AddressCategories,
  EthTransaction,
  Logger,
  Transaction,
  TransactionSources,
  TransferCategories,
} from "@valuemachine/types";
import {
  rmDups,
  setAddressCategory,
} from "@valuemachine/utils";

const source = TransactionSources.Uniswap;

////////////////////////////////////////
/// Addresses

export const marketAddresses = [
  { name: "UniV3_MATIC_USDT", address: "0x972f43Bb94B76B9e2D036553d818879860b6A114" },
].map(setAddressCategory(AddressCategories.Defi));

export const uniswapAddresses = [
  ...marketAddresses,
];

////////////////////////////////////////
/// Parser

export const uniswapParser = (
  tx: Transaction,
  _ethTx: EthTransaction,
  addressBook: AddressBook,
  _logger: Logger,
): Transaction => {
  tx.transfers.forEach(transfer => {
    const fromName = addressBook.getName(transfer.from);
    const toName = addressBook.getName(transfer.to);
    if (fromName.startsWith("Uni")) {
      transfer.category = TransferCategories.SwapIn;
      tx.method = source;
      tx.sources = rmDups([...tx.sources, source]);
    }
    if (toName.startsWith("Uni")) {
      transfer.category = TransferCategories.SwapOut;
      tx.method = source;
      tx.sources = rmDups([...tx.sources, source]);
    }
  });
  return tx;
};
