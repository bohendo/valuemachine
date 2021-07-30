import { Static, Type } from "@sinclair/typebox";

import { PhysicalGuards, DigitalGuards } from "./guards";

// All physical security providers have an associated fiat currency
export const FiatCurrencies = { ...PhysicalGuards } as const;
export const FiatCurrency = Type.Enum(FiatCurrencies);
export type FiatCurrency = Static<typeof FiatCurrency>;

// All digital security providers have an associated native cryptocurrency
export const Cryptocurrencies = { ...DigitalGuards } as const;
export const Cryptocurrency = Type.Enum(Cryptocurrencies);
export type Cryptocurrency = Static<typeof Cryptocurrency>;

export const EthereumAssets = {
  [Cryptocurrencies.ETH]: Cryptocurrencies.ETH,
  _1INCH: "_1INCH",
  _3Crv: "_3Crv",
  aAAVE: "aAAVE",
  AAVE: "AAVE",
  aBAT: "aBAT",
  aDAI: "aDAI",
  aMATIC: "aMATIC",
  ankrCRV: "ankrCRV",
  aUSDC: "aUSDC",
  aUSDT: "aUSDT",
  aWBTC: "aWBTC",
  aWETH: "aWETH",
  BAT: "BAT",
  BUSD: "BUSD",
  cBAT: "cBAT",
  cCOMP: "cCOMP",
  cDAI: "cDAI",
  cETH: "cETH",
  CHERRY: "CHERRY",
  COMP: "COMP",
  cREP: "cREP",
  crvPlain3andSUSD: "crvPlain3andSUSD",
  cSAI: "cSAI",
  cUNI: "cUNI",
  cUSDC: "cUSDC",
  cUSDT: "cUSDT",
  cWBTC: "cWBTC",
  cWBTCv2: "cWBTCv2",
  cZRX: "cZRX",
  DAI: "DAI",
  dusd3CRV: "dusd3CRV",
  eursCRV: "eursCRV",
  GEN: "GEN",
  GNO: "GNO",
  GRT: "GRT",
  gusd3CRV: "gusd3CRV",
  GUSD: "GUSD",
  hCRV: "hCRV",
  HEGIC: "HEGIC",
  husd3CRV: "husd3CRV",
  IDLE: "IDLE",
  idleDAI: "idleDAI",
  idleDAISafe: "idleDAISafe",
  idleDAIYield: "idleDAIYield",
  idleRAIYield: "idleRAIYield",
  idleSUSDYield: "idleSUSDYield",
  idleTUSDYield: "idleTUSDYield",
  idleUSDCSafe: "idleUSDCSafe",
  idleUSDCYield: "idleUSDCYield",
  idleUSDTSafe: "idleUSDTSafe",
  idleUSDTYield: "idleUSDTYield",
  idleWBTCYield: "idleWBTCYield",
  idleWETHYield: "idleWETHYield",
  linkCRV: "linkCRV",
  MATIC: "MATIC",
  MKR: "MKR",
  musd3CRV: "musd3CRV",
  OMG: "OMG",
  PETH: "PETH",
  RAI: "RAI",
  REP: "REP",
  REPv2: "REPv2",
  SAI: "SAI",
  SNT: "SNT",
  SNX: "SNX",
  SPANK: "SPANK",
  stkAAVE: "stkAAVE",
  sUSD: "sUSD",
  sUSDT: "sUSDT",
  TORN: "TORN",
  TUSD: "TUSD",
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
  UniV2_ETH_cDAI: "UniV2_ETH_cDAI",
  UniV2_ETH_CHERRY: "UniV2_ETH_CHERRY",
  UniV2_ETH_CRV: "UniV2_ETH_CRV",
  UniV2_ETH_GEN: "UniV2_ETH_GEN",
  UniV2_ETH_GRT: "UniV2_ETH_GRT",
  UniV2_ETH_renBTC: "UniV2_ETH_renBTC",
  UniV2_ETH_TRU: "UniV2_ETH_TRU",
  UniV2_ETH_USDT: "UniV2_ETH_USDT",
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
  UniV2_sUSD_ETH: "UniV2_sUSD_ETH",
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
  USDC: "USDC",
  usdn3CRV: "usdn3CRV",
  usdp3CRV: "usdp3CRV",
  usdt3CRV: "usdt3CRV",
  USDT: "USDT",
  ust3CRV: "ust3CRV",
  WBTC: "WBTC",
  WETH: "WETH",
  y3Crv: "y3Crv",
  yBUSDv3: "yBUSDv3",
  yDAI: "yDAI",
  yDAI_yUSDC_yUSDT_yBUSD: "yDAI_yUSDC_yUSDT_yBUSD",
  yDAI_yUSDC_yUSDT_yTUSD: "yDAI_yUSDC_yUSDT_yTUSD",
  yDAIv2: "yDAIv2",
  yDAIv3: "yDAIv3",
  YFI: "YFI",
  yGUSD: "yGUSD",
  ysUSDTv2: "ysUSDTv2",
  yTUSD: "yTUSD",
  yTUSDv2: "yTUSDv2",
  yUSDC: "yUSDC",
  yUSDCv2: "yUSDCv2",
  yUSDCv3: "yUSDCv3",
  yUSDT: "yUSDT",
  yUSDTv2: "yUSDTv2",
  yUSDTv3: "yUSDTv3",
  yv1INCH: "yv1INCH",
  yvankrCRV: "yvankrCRV",
  yvBOOST: "yvBOOST",
  yvcrvPlain3andSUSD: "yvcrvPlain3andSUSD",
  yvCurve_BBTC: "yvCurve_BBTC",
  yvCurve_FRAX: "yvCurve_FRAX",
  yvCurve_IronBank: "yvCurve_IronBank",
  yvCurve_LUSD: "yvCurve_LUSD",
  yvCurve_oBTC: "yvCurve_oBTC",
  yvCurve_pBTC: "yvCurve_pBTC",
  yvCurve_renBTC: "yvCurve_renBTC",
  yvCurve_sAave: "yvCurve_sAave",
  yvCurve_sBTC: "yvCurve_sBTC",
  yvCurve_sETH: "yvCurve_sETH",
  yvCurve_stETH: "yvCurve_stETH",
  yvCurve_tBTC: "yvCurve_tBTC",
  yvdusd3CRV: "yvdusd3CRV",
  yveursCRV: "yveursCRV",
  yvgusd3CRV: "yvgusd3CRV",
  yvhCRV: "yvhCRV",
  yvhusd3CRV: "yvhusd3CRV",
  yvlinkCRV: "yvlinkCRV",
  yvmusd3CRV: "yvmusd3CRV",
  yvusdn3CRV: "yvusdn3CRV",
  yvusdp3CRV: "yvusdp3CRV",
  yvusdt3CRV: "yvusdt3CRV",
  yvUSDT: "yvUSDT",
  yvust3CRV: "yvust3CRV",
  yvWBTC: "yvWBTC",
  yvWETH: "yvWETH",
  yvYFI: "yvYFI",
  yWBTCv2: "yWBTCv2",
  yWETH: "yWETH",
  yyDAI_yUSDC_yUSDT_yBUSD: "yyDAI_yUSDC_yUSDT_yBUSD",
  yyDAI_yUSDC_yUSDT_yTUSD: "yyDAI_yUSDC_yUSDT_yTUSD",
  yYFI: "yYFI",
  ZRX: "ZRX",
} as const;
export const EthereumAsset = Type.Enum(EthereumAssets);
export type EthereumAsset = Static<typeof EthereumAsset>;

export const PolygonAssets = {
  [Cryptocurrencies.MATIC]: Cryptocurrencies.MATIC,
  amAAVE: "amAAVE",
  amDAI: "amDAI",
  amMATIC: "amMATIC",
  amUSDC: "amUSDC",
  amUSDT: "amUSDT",
  amWBTC: "amWBTC",
  amWETH: "amWETH",
  WMATIC: "WMATIC",
} as const;
export const PolygonAsset = Type.Enum(PolygonAssets);
export type PolygonAsset = Static<typeof PolygonAsset>;

export const Assets = {
  ...Cryptocurrencies,
  ...EthereumAssets,
  ...FiatCurrencies,
  ...PolygonAssets,
} as const;
export const Asset = Type.Union([
  Type.Enum(Assets),
  Type.String(), // Allow arbitrary assets in app-level code
]);
export type Asset = Static<typeof Asset>
