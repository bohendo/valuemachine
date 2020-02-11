import { Field, Forms } from "./mappings";
export { Field, Forms };

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

export type DecimalString = string;
export type DateString = string;
export type HexSting = string;

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
  hash?: HexSting;
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
  txHistory: string[];
  taxableTrades: TaxableTrade[];
  snapshots: State[];
  addresses: { [key: string]: string };
}
