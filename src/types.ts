import { Field, Forms } from "./mappings";
export { Field, Forms };

// DateString follows ISO 8601 format
export type DateString = string;
export type DecimalString = string;
export type HexString = string;

export type AddressData = {
  address: HexString;
  block: number;
  hasCode: boolean;
  transactions: Array<HexString>;
};

export type TransactionLog = {
  address: HexString;
  data: HexString;
  index: number;
  topics: Array<HexString>;
};

export type TransactionData = {
  block: number;
  data: HexString;
  from: HexString;
  gasLimit: HexString;
  gasPrice: HexString;
  gasUsed?: HexString;
  hash: HexString;
  index?: number;
  logs?: Array<TransactionLog>;
  nonce: number;
  timestamp: DateString;
  to: HexString | null;
  value: DecimalString;
};

export type CallData = {
  block: number;
  from: HexString;
  hash: HexString;
  timestamp: DateString;
  to: HexString;
  value: DecimalString;
};

// format of chain-data.json
export type ChainData = {
  lastUpdated: DateString;
  addresses: { [address: string]: AddressData };
  transactions: { [hash: string]: TransactionData };
  calls: { [hash: string]: CallData };
};

export const AddressCategories = {
  "erc20": "erc20",
  "family": "family",
  "friend": "friend",
  "private": "private",
  "public": "public",
  "self": "self",
};
export type AddressCategory = keyof typeof AddressCategories;

export type AddressBook = Array<{
  address: HexString;
  category: AddressCategory;
  name; string;
  tags: string[];
}>

export const AssetTypes = {
  "DAI": "DAI",
  "ETH": "ETH",
  "INR": "INR",
  "MKR": "MKR",
  "SAI": "SAI",
  "SNT": "SNT",
  "SNX": "SNX",
  "USD": "USD",
  "WETH": "WETH",
};
export type AssetType = keyof typeof AssetTypes;

export type Asset = {
  amount: DecimalString;
  date?: DateString;
  price?: DecimalString;
  type: AssetType | string;
  value?: DecimalString;
}

export const EventCategories = {
  "borrow": "borrow",
  "expense": "expense",
  "income": "income",
  "repayment": "repayment",
  "swap": "swap",
};
export type EventCategory = keyof typeof EventCategories;

export type Event = {
  assetsIn?: Asset[];
  assetsOut?: Asset[];
  category?: EventCategory | string;
  date: DateString;
  description?: string;
  from?: string;
  hash?: HexString;
  prices?: { [key: string]: DecimalString };
  source: string;
  tags?: string[];
  to?: string;
}

export const CapitalGainsMethods = {
  "FIFO": "FIFO",
  "HIFO": "HIFO",
  "LIFO": "LIFO",
};
export type CapitalGainsMethod = keyof typeof CapitalGainsMethods;

export type InputData = {
  addressBook?: AddressBook;
  capitalGainsMethod: CapitalGainsMethod;
  etherscanKey?: string;
  events: Array<Event | string>;
  formData: Forms;
  forms: string[];
  logLevel?: number;
  taxYear: string;
}

// aka row of f8949
export type TaxableTrade = {
  Adjustment: string;
  Code: string;
  Cost: string;
  DateAcquired: string;
  DateSold: string;
  Description: string;
  GainOrLoss: string;
  Proceeds: string;
}

export type FinancialData = {
  expenses: Array<Event>;
  income: Array<Event>;
  input: InputData;
  trades: TaxableTrade[];
}
