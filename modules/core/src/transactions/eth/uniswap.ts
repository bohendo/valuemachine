import {
  AddressBook,
  AddressBookJson,
  AddressCategories,
  ChainData,
  EthTransaction,
  Logger,
  Transaction,
  TransactionSources,
} from "@finances/types";
import { math, smeq } from "@finances/utils";

import { getUnique } from "../utils";

const source = TransactionSources.Uniswap;

////////////////////////////////////////
/// Addresses

const machineAddresses = [
  { name: "UniV2-router", address: "0x7a250d5630b4cf539739df2c5dacb4c659f2488d" },
  { name: "UniV1-cDAI", address: "0x45a2fdfed7f7a2c791fb1bdf6075b83fad821dde" },
  { name: "UniV1-DAI", address: "0x2a1530c4c41db0b0b2bb646cb5eb1a67b7158667" },
  { name: "UniV1-GEN", address: "0x26cc0eab6cb650b0db4d0d0da8cb5bf69f4ad692" },
  { name: "UniV1-MKR", address: "0x2c4bd064b998838076fa341a83d007fc2fa50957" },
  { name: "UniV1-SAI", address: "0x09cabec1ead1c0ba254b09efb3ee13841712be14" },
  { name: "UniV1-SNX", address: "0x3958b4ec427f8fa24eb60f42821760e88d485f7f" },
  { name: "UniV1-sUSD", address: "0xb944d13b2f4047fc7bd3f7013bcf01b115fb260d" },
].map(row => ({ ...row, category: AddressCategories.Defi })) as AddressBookJson;

const tokenAddresses = [
  { name: "UniV2-ETH-AAVE", address: "0xdfc14d2af169b0d36c4eff567ada9b2e0cae044f" },
  { name: "UniV2-ETH-DAI", address: "0xa478c2975ab1ea89e8196811f51a7b7ade33eb11" },
  { name: "UniV2-ETH-FEI", address: "0x94b0a3d511b6ecdb17ebf877278ab030acb0a878" },
  { name: "UniV2-ETH-MKR", address: "0xc2adda861f89bbb333c90c492cb837741916a225" },
  { name: "UniV2-ETH-RAI", address: "0x8ae720a71622e824f576b4a8c03031066548a3b1" },
  { name: "UniV2-ETH-TORN", address: "0x0c722a487876989af8a05fffb6e32e45cc23fb3a" },
  { name: "UniV2-ETH-UNI", address: "0xd3d2e2692501a5c9ca623199d38826e513033a17" },
  { name: "UniV2-ETH-USDC", address: "0xb4e16d0168e52d35cacd2c6185b44281ec28c9dc" },
  { name: "UniV2-ETH-USDT", address: "0x0d4a11d5eeaac28ec3f61d100daf4d40471f1852" },
  { name: "UniV2-ETH-WBTC", address: "0xbb2b8038a1640196fbe3e38816f3e67cba72d940" },
  { name: "UniV2-ETH-YFI", address: "0x2fdbadf3c4d5a8666bc06645b8358ab803996e28" },
].map(row => ({ ...row, category: AddressCategories.ERC20 })) as AddressBookJson;

const govTokenAddresses = [
  { name: "UNI", address: "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984" },
].map(row => ({ ...row, category: AddressCategories.ERC20 })) as AddressBookJson;

export const uniswapAddresses = [
  ...machineAddresses,
  ...tokenAddresses,
  ...govTokenAddresses,
];

////////////////////////////////////////
/// Interfaces
////////////////////////////////////////
/// Parser

export const uniswapParser = (
  tx: Transaction,
  ethTx: EthTransaction,
  addressBook: AddressBook,
  chainData: ChainData,
  logger: Logger,
): Transaction => {
  const log = logger.child({ module: source });
  const { getName } = addressBook;

  if (machineAddresses.some(a => smeq(a.address, ethTx.to))) {
    log.info(`Uni tx detected!`);
    tx.sources = getUnique([source, ...tx.sources]) as TransactionSources[];
  }

  // Uniswap swaps & deposit/withdraw liquidity
  if (
    getName(ethTx.to).startsWith("uniswap-router")
  ) {
    if (tx.transfers.length === 3) {
      if (
        addressBook.isSelf(tx.transfers[1].to) &&
        !addressBook.isSelf(tx.transfers[2].to)
      ) {
        tx.description = `${getName(ethTx.from)} swapped ${
          math.round(tx.transfers[2].quantity, 4)
        } ${tx.transfers[2].assetType} for ${
          math.round(tx.transfers[1].quantity, 4)
        } ${tx.transfers[1].assetType}`;
      } else if (
        !addressBook.isSelf(tx.transfers[1].to) &&
        addressBook.isSelf(tx.transfers[2].to)
      ) {
        tx.description = `${getName(ethTx.from)} swapped ${
          math.round(tx.transfers[1].quantity, 4)
        } ${tx.transfers[1].assetType} for ${
          math.round(tx.transfers[2].quantity, 4)
        } ${tx.transfers[2].assetType}`;
      }
    } else if (tx.transfers.length === 4) {
      if (
        addressBook.isSelf(tx.transfers[1].to) &&
        addressBook.isSelf(tx.transfers[2].to)
      ) {
        tx.description = `${getName(ethTx.from)} withdrew ${
          math.round(tx.transfers[1].quantity, 4)
        } ${tx.transfers[1].assetType} and ${
          math.round(tx.transfers[2].quantity, 4)
        } ${tx.transfers[2].assetType} from Uniswap`;
      } else if (
        !addressBook.isSelf(tx.transfers[1].to) &&
        !addressBook.isSelf(tx.transfers[2].to)
      ) {
        tx.description = `${getName(ethTx.from)} deposited ${
          math.round(tx.transfers[1].quantity, 4)
        } ${tx.transfers[1].assetType} and ${
          math.round(tx.transfers[2].quantity, 4)
        } ${tx.transfers[2].assetType} into Uniswap`;
      }
    }
  }

  // log.debug(tx, `Done parsing ${source}`);
  return tx;
};
