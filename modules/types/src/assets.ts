import { DecimalString, TimestampString } from "./strings";
import { enumify } from "./utils";

export const FiatAssets = enumify({
  CZK: "CZK",
  EUR: "EUR",
  GBP: "GBP",
  INR: "INR",
  USD: "USD",
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
  cBAT: "cBAT",
  cCOMP: "cCOMP",
  cDAI: "cDAI",
  cETH: "cETH",
  CHERRY: "CHERRY",
  COMP: "COMP",
  cREP: "cREP",
  cSAI: "cSAI",
  cUNI: "cUNI",
  cUSDC: "cUSDC",
  cUSDT: "cUSDT",
  cWBTC: "cWBTC",
  cWBTCv2: "cWBTCv2",
  cZRX: "cZRX",
  DAI: "DAI",
  ETH: "ETH",
  GEN: "GEN",
  GNO: "GNO",
  GRT: "GRT",
  MKR: "MKR",
  OMG: "OMG",
  PETH: "PETH",
  REP: "REP",
  REPv1: "REPv1",
  SAI: "SAI",
  SNT: "SNT",
  SNX: "SNX",
  SNXv1: "SNXv1",
  SPANK: "SPANK",
  sUSD: "sUSD",
  sUSDv1: "sUSDv1",
  TORN: "TORN",
  UNI: "UNI",
  UniV2_1INCH_ETH: "UniV2_1INCH_ETH",
  UniV2_AAVE_ETH: "UniV2_AAVE_ETH",
  UniV2_COMP_ETH: "UniV2_COMP_ETH",
  UniV2_CREAM_ETH: "UniV2_CREAM_ETH",
  UniV2_DAI_ETH: "UniV2_DAI_ETH",
  UniV2_DAI_USDC: "UniV2_DAI_USDC",
  UniV2_DPI_ETH: "UniV2_DPI_ETH",
  UniV2_ESD_USDC: "UniV2_ESD_USDC",
  UniV2_ETH_AMPL: "UniV2_ETH_AMPL",
  UniV2_ETH_CHERRY: "UniV2_ETH_CHERRY",
  UniV2_ETH_CRV: "UniV2_ETH_CRV",
  UniV2_ETH_GEN: "UniV2_ETH_GEN",
  UniV2_ETH_GRT: "UniV2_ETH_GRT",
  UniV2_ETH_TRU: "UniV2_ETH_TRU",
  UniV2_ETH_USDT: "UniV2_ETH_USDT",
  UniV2_ETH_cDAI: "UniV2_ETH_cDAI",
  UniV2_ETH_renBTC: "UniV2_ETH_renBTC",
  UniV2_ETH_ycrvUSD: "UniV2_ETH_ycrvUSD",
  UniV2_FEI_ETH: "UniV2_FEI_ETH",
  UniV2_HEX_ETH: "UniV2_HEX_ETH",
  UniV2_LINK_ETH: "UniV2_LINK_ETH",
  UniV2_LRC_ETH: "UniV2_LRC_ETH",
  UniV2_LUSD_ETH: "UniV2_LUSD_ETH",
  UniV2_MATIC_ETH: "UniV2_MATIC_ETH",
  UniV2_MKR_ETH: "UniV2_MKR_ETH",
  UniV2_PICKLE_ETH: "UniV2_PICKLE_ETH",
  UniV2_RAI_ETH: "UniV2_RAI_ETH",
  UniV2_REN_ETH: "UniV2_REN_ETH",
  UniV2_SHIB_ETH: "UniV2_SHIB_ETH",
  UniV2_SNX_ETH: "UniV2_SNX_ETH",
  UniV2_SUSHI_ETH: "UniV2_SUSHI_ETH",
  UniV2_TORN_ETH: "UniV2_TORN_ETH",
  UniV2_UNI_ETH: "UniV2_UNI_ETH",
  UniV2_USDC_DSD: "UniV2_USDC_DSD",
  UniV2_USDC_ETH: "UniV2_USDC_ETH",
  UniV2_USDC_GRT: "UniV2_USDC_GRT",
  UniV2_USDC_USDT: "UniV2_USDC_USDT",
  UniV2_WBTC_ETH: "UniV2_WBTC_ETH",
  UniV2_WBTC_USDC: "UniV2_WBTC_USDC",
  UniV2_WDOGE_ETH: "UniV2_WDOGE_ETH",
  UniV2_YFI_ETH: "UniV2_YFI_ETH",
  UniV2_sUSD_ETH: "UniV2_sUSD_ETH",
  USDC: "USDC",
  USDT: "USDT",
  WBTC: "WBTC",
  WETH: "WETH",
  YFI: "YFI",
  yBUSDv3: "yBUSDv3",
  yDAIv2: "yDAIv2",
  yDAIv3: "yDAIv3",
  yTUSDv2: "yTUSDv2",
  yUSDCv2: "yUSDCv2",
  yUSDCv3: "yUSDCv3",
  yUSDTv2: "yUSDTv2",
  yUSDTv3: "yUSDTv3",
  yWBTCv2: "yWBTCv2",
  ycrvUSD: "ycrvUSD",
  ysUSDTv2: "ysUSDTv2",
  ZRX: "ZRX",
});
// eslint-disable-next-line @typescript-eslint/no-redeclare
export type EthereumAssets = (typeof EthereumAssets)[keyof typeof EthereumAssets];

export const Assets = enumify({
  ...FiatAssets,
  ...AltChainAssets,
  ...EthereumAssets,
});
// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Assets = (typeof Assets)[keyof typeof Assets];

export type AssetChunk = {
  asset: Assets;
  dateRecieved: TimestampString;
  purchasePrice: DecimalString; /* units of account (USD/DAI) per 1 asset */
  quantity: DecimalString;
};
