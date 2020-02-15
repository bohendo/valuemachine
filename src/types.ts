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
  gasLimit?: HexString;
  gasPrice?: HexString;
  gasUsed?: HexString;
  hash: HexString;
  index: number;
  logs?: Array<any>;
  nonce: number;
  timestamp: DateString;
  to: HexString | null;
  value: DecimalString;
};

export type AddressData = {
  block: number;
  nonce: number;
  hasCode?: boolean;
  transactions: Array<string>;
};

export type ChainData = {
  block: number;
  addresses: {
    [address: string]: AddressData;
  };
  transactions: {
    [hash: string]: TransactionData;
  };
};

export type InputData = {
  addresses: { [key: string]: string };
  events: Array<Event>;
  formData: Forms
  forms: string[];
  logLevel?: number;
  snapshots: State[];
  taxYear: string;
  txHistory: string[];
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
  type: AssetType;
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

export type State = {
  assets: Asset[];
  date: DateString;
  events?: Event[];
  liabilities: Asset[];
  prices?: { [key: string]: DecimalString };
}

export type FinancialData = {
  addresses: { [key: string]: string };
  chainData: ChainData;
  events: Array<Event>;
  expenses: Array<Event>,
  income: Array<Event>,
  input: InputData;
  snapshots: State[];
  taxableTrades: TaxableTrade[];
  txHistory: string[];
}
