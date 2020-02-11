import { Field, Forms } from './mappings';
export { Field, Forms }

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

export type DecimalString = string;
export type DateString = string;
export type HexSting = string;

export const EventCategories = {
  "?": "?",
  "swap": "swap",
  "income": "income",
  "expense": "expense",
}
export type EventCategory = keyof typeof EventCategories;

export const AssetTypes = {
  "DAI": "DAI",
  "USD": "USD",
  "INR": "INR",
  "ETH": "ETH",
  "MKR": "MKR",
}
export type AssetType = keyof typeof AssetTypes;

export type Asset = {
  type: AssetType;
  amount: DecimalString;
  date?: DateString;
  value?: DecimalString;
}

export type CommonEvent = {
  date: DateString;
  category?: EventCategory | string;
  tags?: string[];
  description?: string;
  hash?: string;
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
  snapshots: State[];
  addresses: { [key: string]: string };
}
