import {
  HexString,
  DateString,
  DecimalString,
  TimestampString,
} from "@finances/types";

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
  name: string;
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
  date?: TimestampString;
  price?: DecimalString;
  type: AssetType | string;
  value?: DecimalString;
}

export const EventCategories = {
  //"borrow": "borrow",
  //"deposit": "desposit",
  "expense": "expense",
  "income": "income",
  //"repayment": "repayment",
  //"swap": "swap",
  "swapIn": "swapIn",
  "swapOut": "swapOut",
  //"withdrawal": "withdrawal",
};
export type EventCategory = keyof typeof EventCategories;

export type Event = {
  amount: DecimalString;
  type: AssetType | string;
  category: EventCategory | string;
  date: TimestampString;
  description?: string;
  from?: string;
  hash?: HexString;
  price?: DecimalString;
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
  //formData: Forms;
  forms: string[];
  logLevel?: number;
  taxYear: string;
}

// aka row of f8949
export type CapitalGain = {
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
  trades: CapitalGain[];
}

export type AddressBookByCategory = {
  [category: string]: {
    [address: string]: {
      address: HexString;
      category: AddressCategory;
      name: string;
      tags: string[];
    }
  }
}

export type NetStandingPerAssetType = Array<{
  asset: string;
  total: number;
}>

export type NetStandingData = Array<{
  date: Date;
  networth: number;
  debt: number;
  investment: number;
}>

export type EventByCategoryPerAssetType = {
  [category: string]: {
    [assetType: string]: Array<Event>
  };
}
