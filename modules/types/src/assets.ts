import { DecimalString, TimestampString } from "./strings";
import { enumify } from "./utils";

export const FiatAssets = enumify({
  USD: "USD",
  INR: "INR",
});
// eslint-disable-next-line @typescript-eslint/no-redeclare
export type FiatAssets = (typeof FiatAssets)[keyof typeof FiatAssets];

export const AltChainAssets = enumify({
  BCH: "BCH",
  BTC: "BTC",
  LTC: "LTC",
});
// eslint-disable-next-line @typescript-eslint/no-redeclare
export type AltChainAssets = (typeof AltChainAssets)[keyof typeof AltChainAssets];

export const EthereumAssets = enumify({
  BAT: "BAT",
  cDAI: "cDAI",
  COMP: "COMP",
  DAI: "DAI",
  ETH: "ETH",
  GEN: "GEN",
  MKR: "MKR",
  REP: "REP",
  SAI: "SAI",
  SNT: "SNT",
  SNX: "SNX",
  UNI: "UNI",
  USDT: "USDT",
  WETH: "WETH",
  WBTC: "WBTC",
});
// eslint-disable-next-line @typescript-eslint/no-redeclare
export type EthereumAssets = (typeof EthereumAssets)[keyof typeof EthereumAssets];

export const AssetTypes = enumify({
  ...FiatAssets,
  ...AltChainAssets,
  ...EthereumAssets,
});
// eslint-disable-next-line @typescript-eslint/no-redeclare
export type AssetTypes = (typeof AssetTypes)[keyof typeof AssetTypes];

export type AssetChunk = {
  assetType: AssetTypes;
  dateRecieved: TimestampString;
  purchasePrice: DecimalString; /* units of account (USD/DAI) per 1 assetType */
  quantity: DecimalString;
};
