import {
  CsvSources,
  CsvMethods,
} from "./csv/enums";
import {
  Apps as EvmApps,
  Methods as EvmMethods,
  Assets as EvmAssets,
  Tokens as EvmTokens,
  Evms as EvmNames,
} from "./evm/enums";

export { CsvSources } from "./csv/enums";
export {
  Apps as EvmApps,
  Methods as EvmMethods,
  Assets as EvmAssets,
  Tokens as EvmTokens,
  Evms as EvmNames,
} from "./evm/enums";

////////////////////////////////////////
// Utxo stuff

export const UtxoChains = {
  Bitcoin: "Bitcoin",
  BitcoinCash: "BitcoinCash",
  Litecoin: "Litecoin",
} as const;

export const UtxoAssets = {
  BCH: "BCH",
  BTC: "BTC",
  LTC: "LTC",
} as const;

////////////////////////////////////////
// Apps

export const Apps = {
  ...EvmApps,
} as const;

////////////////////////////////////////
// Methods

export const Methods = {
  ...CsvMethods,
  ...EvmMethods,
} as const;

////////////////////////////////////////
// Assets

export const Cryptocurrencies = {
  ...EvmAssets,
  ...EvmTokens,
  ...UtxoAssets,
} as const;

// Traditional central-bank controlled currencies
export const FiatCurrencies = {
  CZK: "CZK",
  EUR: "EUR",
  GBP: "GBP",
  INR: "INR",
  USD: "USD",
} as const;

export const Assets = {
  ...Cryptocurrencies,
  ...FiatCurrencies,
} as const;

////////////////////////////////////////
// Sources

export const Sources = {
  ...CsvSources,
  ...EvmNames,
  ...UtxoChains,
} as const;

////////////////////////////////////////
// Guards

// Security providers on the internet aka blockchains
export const DigitalGuards = {
  ...EvmNames,
  ...UtxoChains,
} as const;

// Security providers in the physical world aka countries
// https://en.wikipedia.org/wiki/ISO_3166-1_alpha-3
export const PhysicalGuards = {
  ABW: "ABW", AFG: "AFG", AGO: "AGO", AIA: "AIA", ALA: "ALA", ALB: "ALB", AND: "AND", ARE: "ARE",
  ARG: "ARG", ARM: "ARM", ASM: "ASM", ATA: "ATA", ATF: "ATF", ATG: "ATG", AUS: "AUS", AUT: "AUT",
  AZE: "AZE", BDI: "BDI", BEL: "BEL", BEN: "BEN", BES: "BES", BFA: "BFA", BGD: "BGD", BGR: "BGR",
  BHR: "BHR", BHS: "BHS", BIH: "BIH", BLM: "BLM", BLR: "BLR", BLZ: "BLZ", BMU: "BMU", BOL: "BOL",
  BRA: "BRA", BRB: "BRB", BRN: "BRN", BTN: "BTN", BVT: "BVT", BWA: "BWA", CAF: "CAF", CAN: "CAN",
  CCK: "CCK", CHE: "CHE", CHL: "CHL", CHN: "CHN", CIV: "CIV", CMR: "CMR", COD: "COD", COG: "COG",
  COK: "COK", COL: "COL", COM: "COM", CPV: "CPV", CRI: "CRI", CUB: "CUB", CUW: "CUW", CXR: "CXR",
  CYM: "CYM", CYP: "CYP", CZE: "CZE", DEU: "DEU", DJI: "DJI", DMA: "DMA", DNK: "DNK", DOM: "DOM",
  DZA: "DZA", ECU: "ECU", EGY: "EGY", ERI: "ERI", ESH: "ESH", ESP: "ESP", EST: "EST", ETH: "ETH",
  FIN: "FIN", FJI: "FJI", FLK: "FLK", FRA: "FRA", FRO: "FRO", FSM: "FSM", GAB: "GAB", GBR: "GBR",
  GEO: "GEO", GGY: "GGY", GHA: "GHA", GIB: "GIB", GIN: "GIN", GLP: "GLP", GMB: "GMB", GNB: "GNB",
  GNQ: "GNQ", GRC: "GRC", GRD: "GRD", GRL: "GRL", GTM: "GTM", GUF: "GUF", GUM: "GUM", GUY: "GUY",
  HKG: "HKG", HMD: "HMD", HND: "HND", HRV: "HRV", HTI: "HTI", HUN: "HUN", IDN: "IDN", IMN: "IMN",
  IND: "IND", IOT: "IOT", IRL: "IRL", IRN: "IRN", IRQ: "IRQ", ISL: "ISL", ISR: "ISR", ITA: "ITA",
  JAM: "JAM", JEY: "JEY", JOR: "JOR", JPN: "JPN", KAZ: "KAZ", KEN: "KEN", KGZ: "KGZ", KHM: "KHM",
  KIR: "KIR", KNA: "KNA", KOR: "KOR", KWT: "KWT", LAO: "LAO", LBN: "LBN", LBR: "LBR", LBY: "LBY",
  LCA: "LCA", LIE: "LIE", LKA: "LKA", LSO: "LSO", LTU: "LTU", LUX: "LUX", LVA: "LVA", MAC: "MAC",
  MAF: "MAF", MAR: "MAR", MCO: "MCO", MDA: "MDA", MDG: "MDG", MDV: "MDV", MEX: "MEX", MHL: "MHL",
  MKD: "MKD", MLI: "MLI", MLT: "MLT", MMR: "MMR", MNE: "MNE", MNG: "MNG", MNP: "MNP", MOZ: "MOZ",
  MRT: "MRT", MSR: "MSR", MTQ: "MTQ", MUS: "MUS", MWI: "MWI", MYS: "MYS", MYT: "MYT", NAM: "NAM",
  NCL: "NCL", NER: "NER", NFK: "NFK", NGA: "NGA", NIC: "NIC", NIU: "NIU", NLD: "NLD", NOR: "NOR",
  NPL: "NPL", NRU: "NRU", NZL: "NZL", OMN: "OMN", PAK: "PAK", PAN: "PAN", PCN: "PCN", PER: "PER",
  PHL: "PHL", PLW: "PLW", PNG: "PNG", POL: "POL", PRI: "PRI", PRK: "PRK", PRT: "PRT", PRY: "PRY",
  PSE: "PSE", PYF: "PYF", QAT: "QAT", REU: "REU", ROU: "ROU", RUS: "RUS", RWA: "RWA", SAU: "SAU",
  SDN: "SDN", SEN: "SEN", SGP: "SGP", SGS: "SGS", SHN: "SHN", SJM: "SJM", SLB: "SLB", SLE: "SLE",
  SLV: "SLV", SMR: "SMR", SOM: "SOM", SPM: "SPM", SRB: "SRB", SSD: "SSD", STP: "STP", SUR: "SUR",
  SVK: "SVK", SVN: "SVN", SWE: "SWE", SWZ: "SWZ", SXM: "SXM", SYC: "SYC", SYR: "SYR", TCA: "TCA",
  TCD: "TCD", TGO: "TGO", THA: "THA", TJK: "TJK", TKL: "TKL", TKM: "TKM", TLS: "TLS", TON: "TON",
  TTO: "TTO", TUN: "TUN", TUR: "TUR", TUV: "TUV", TWN: "TWN", TZA: "TZA", UGA: "UGA", UKR: "UKR",
  UMI: "UMI", URY: "URY", USA: "USA", UZB: "UZB", VAT: "VAT", VCT: "VCT", VEN: "VEN", VGB: "VGB",
  VIR: "VIR", VNM: "VNM", VUT: "VUT", WLF: "WLF", WSM: "WSM", YEM: "YEM", ZAF: "ZAF", ZMB: "ZMB",
  ZWE: "ZWE",
  IDK: "IDK", // Special value representing an unknown physical guard
} as const;

export const Guards = {
  ...DigitalGuards,
  ...PhysicalGuards,
  None: "None",
} as const;
