import { Field, Forms } from './mappings';
export { Field, Forms }

export type DecimalString = string;
export type HexSting = string;

export const EventCategories = {
  "?": "?",
  "income": "income",
  "business": "business",
  "personal": "personal",
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
  date?: string;
  value?: DecimalString;
}

export type CommonEvent = {
  date: string;
  category?: EventCategory | string;
  tags?: string[];
  description?: string;
  hash?: string;
}

export type IncomeEvent = CommonEvent & {
  assetsIn: Asset[];
  prices?: { [key: string]: DecimalString };
  from: string;
  to: string;
}

export type SwapEvent = CommonEvent & {
  assetsIn: Asset[];
  assetsOut: Asset[];
  prices?: { [key: string]: DecimalString };
}

export type ExpenseEvent = CommonEvent & {
  assetsOut: Asset[];
  prices?: { [key: string]: DecimalString };
  from: string;
  to: string;
}

export type Event = CommonEvent | IncomeEvent | SwapEvent | ExpenseEvent;

export type State = {
  date: string;
  prices?: { [key: string]: DecimalString };
  assets: Asset[];
  liabilities: Asset[];
  events?: Event[];
}

export type InputData = {
  taxYear: string;
  forms: string[];
  events: Array<Event>;
  txHistory: string[];
  snapshots: State[];
  addresses: { [key: string]: string };
  formData: Forms
}
