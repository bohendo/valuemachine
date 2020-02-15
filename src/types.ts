import { Field, Forms } from "./mappings";
export { Field, Forms };

export type DecimalString = string;
export type DateString = string;
export type HexString = string;

export type LogData = {
  address: HexString;
  data: HexString;
  index: number;
  topics: Array<HexString>;
}

export type TransactionData = {
  block: number;
  data: HexString;
  from: HexString;
  gasLimit: HexString;
  gasPrice: HexString;
  gasUsed?: HexString;
  hash: HexString;
  index: number;
  logs?: Array<any>;
  nonce: number;
  timestamp: DateString;
  to: HexString;
  value: DecimalString;
};

export type AddressData = {
  nonce: number;
  isContract?: boolean;
  transactions?: Array<string>;
};

export type ChainData = {
  blockNumber: number;
  addresses: {
    [address: string]: AddressData;
  };
  transactions: {
    [hash: string]: TransactionData;
  };
};

export type InputData = {
  taxYear: string;
  logLevel?: number;
  forms: string[];
  events: Array<Event>;
  txHistory: string[];
  snapshots: State[];
  addresses: { [key: string]: string };
  formData: Forms
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
  type: AssetType;
  amount: DecimalString;
  date?: DateString;
  price?: DecimalString;
  value?: DecimalString;
}

export type CommonEvent = {
  date: DateString;
  category?: EventCategory | string;
  tags?: string[];
  description?: string;
  hash?: HexString;
  to?: string;
  from?: string;
  assetsIn?: Asset[];
  assetsOut?: Asset[];
  prices?: { [key: string]: DecimalString };
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

export type State = {
  date: DateString;
  prices?: { [key: string]: DecimalString };
  assets: Asset[];
  liabilities: Asset[];
  events?: Event[];
}

export type FinancialData = {
  input: InputData;
  events: Array<Event>;
  income: Array<Event>,
  expenses: Array<Event>,
  txHistory: string[];
  taxableTrades: TaxableTrade[];
  snapshots: State[];
  addresses: { [key: string]: string };
}
