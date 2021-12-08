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

////////////////////////////////////////
// Tags

export const IncomeTypes = {
  Airdrop: "Airdrop", // f1040s1.L8
  Dividend: "Dividend", // f1040.L3b
  Interest: "Interest", // f1040.L2b
  Church: "Church", // f1040sse.L5a
  Prize: "Prize", // f1040s1.L8
  Business: "Business", // f1040sc.L1
  Wage: "Wage", // f1040.L1
  IRA: "IRA", // f1040.L4b
  Pension: "Pension", // f1040.L5b
  SocialSecurity: "SocialSecurity", // f1040.L6b
  TaxCredit: "TaxCredit", // f1040s1.L1
  Unemployment: "Unemployment", // f1040s1.L7
  Alimony: "Alimony", // f1040s1.L2a
} as const;

// Eg for filling in f1040sc part II
export const BusinessExpenseTypes = {
  Advertising: "Advertising", // f1040sc.L8
  Vehicle: "Vehicle", // f1040sc.L9
  Commission: "Commission", // f1040sc.L10
  Labor: "Labor", // f1040sc.L11
  Depletion: "Depletion", // f1040sc.L12
  Depreciation: "Depreciation", // f1040sc.L13
  EmployeeBenefits: "EmployeeBenefits", // f1040sc.L14
  Insurance: "Insurance", // f1040sc.L15
  Mortgage: "Mortgage", // f1040sc.L16a
  Interest: "Interest", // f1040sc.L16b
  Legal: "Legal", // f1040sc.L17
  Office: "Office", // f1040sc.L18
  Pension: "Pension", // f1040sc.L19
  EquipmentRental: "EquipmentRental", // f1040sc.L20a
  PropertyRental: "PropertyRentalOffice", // f1040sc.L20b
  Repairs: "Repairs", // f1040sc.L21
  Supplies: "Supplies", // f1040sc.L22
  Licenses: "Licenses", // f1040sc.L23
  Travel: "Travel", // f1040sc.L24a
  Meals: "Meals", // f1040sc.L24b
  Utilities: "Utilities", // f1040sc.L25
  Wages: "Wages", // f1040sc.L26
  Business: "Business", // f1040sc.L48
} as const;

export const ExpenseTypes = {
  ...BusinessExpenseTypes,
  Tax: "Tax",
  Fee: "Fee",
  Personal: "Personal",
} as const;
