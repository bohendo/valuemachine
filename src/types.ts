import { Field, Forms } from "./mappings";
export { Field, Forms };

// DateString follows ISO 8601 format
export type DateString = string;
export type DecimalString = string;
export type HexString = string;

export type LogData = {
  address: HexString;
  data: HexString;
  index: number;
  topics: Array<HexString>;
}

export type TransactionLog = {
  address: HexString;
  data: HexString;
  index: number;
  topics: Array<HexString>;
};

export type TransactionData = {
  block: number;
  call?: boolean;
  data: HexString;
  from: HexString;
  gasLimit?: HexString;
  gasPrice?: HexString;
  gasUsed?: HexString;
  hash: HexString;
  index?: number;
  logs?: Array<TransactionLog>;
  nonce: number;
  timestamp: DateString;
  to: HexString | null;
  value: DecimalString;
};

export type AddressData = {
  block: number;
  nonce: number;
  hasCode?: boolean;
  transactions: Array<HexString>;
};

// format of chain-data.json
export type ChainData = {
  lastUpdated: DateString;
  addresses: {
    [address: string]: AddressData;
  };
  transactions: {
    [hash: string]: TransactionData;
  };
};

export type InputData = {
  addressBook?: { [address: string]: string };
  ethAddresses?: HexString[];
  etherscanKey?: string;
  events: Array<Event | string>;
  formData: Forms
  forms: string[];
  logLevel?: number;
  supportedERC20s?: { [address: string]: string };
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

export const EventCategories = {
  "?": "?",
  "expense": "expense",
  "income": "income",
  "swap": "swap",
};
export type EventCategory = keyof typeof EventCategories;

export const AssetTypes = {
  "DAI": "DAI",
  "ETH": "ETH",
  "INR": "INR",
  "MKR": "MKR",
  "USD": "USD",
};
export type AssetType = keyof typeof AssetTypes;

export type Asset = {
  amount: DecimalString;
  date?: DateString;
  price?: DecimalString;
  type: AssetType | string;
  value?: DecimalString;
}

export type CommonEvent = {
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

export type IncomeEvent = CommonEvent & {
  assetsIn: Asset[];
  from: string;
  to: string;
}

export type SwapEvent = CommonEvent & {
  assetsIn: Asset[];
  assetsOut: Asset[];
}

export type ExpenseEvent = CommonEvent & {
  assetsOut: Asset[];
  from: string;
  to: string;
}

export type Event = CommonEvent | IncomeEvent | SwapEvent | ExpenseEvent;

export type FinancialData = {
  expenses: Array<Event>;
  income: Array<Event>;
  trades: TaxableTrade[];
}
