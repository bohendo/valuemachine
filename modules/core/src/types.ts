import { DecimalString, HexString, TimestampString, Address } from "@finances/types";

import { Field, Forms } from "./mappings";
import {
  AddressCategories,
  AddressTags,
  AssetTypes,
  CapitalGainsMethods,
  EventSources,
  TransferTags,
  LogTypes,
  Modes,
} from "./enums";

export { Field, Forms };
export {
  AddressCategories,
  AddressTags,
  AssetTypes,
  CapitalGainsMethods,
  EventSources,
  TransferTags,
  LogTypes,
  Modes,
};

export type FormDateString = string; // eg "02, 27, 2020" as required by form f8949 etc

////////////////////////////////////////
// Level 1: Only depends on simple utils

export type Checkpoint = {
  account: Address;
  assetType: AssetTypes;
  balance: DecimalString;
  date: TimestampString;
  hash: HexString;
}

export type AssetChunk = {
  assetType: AssetTypes;
  dateRecieved: TimestampString;
  purchasePrice: DecimalString; /* units of account (USD/DAI) per 1 assetType */
  quantity: DecimalString;
};

export type Transfer = {
  assetType: AssetTypes;
  index?: number;
  quantity: DecimalString;
  fee?: DecimalString;
  from: HexString;
  to: HexString;
  tags: Array<string>;
}

export interface AddressBook {
  addresses: Address[];
  getName(address: Address): string;
  isDefi(address: Address): boolean;
  isExchange(address: Address): boolean;
  isFamily(address: Address): boolean;
  isSelf(address: Address): boolean;
  isToken(address: Address): boolean;
  pretty(address: Address): string;
  shouldIgnore(address: Address): boolean;
}

export type Prices = {
  ids: { [assetType: string]: string };
  [date: string]: {
    [assetType: string]: DecimalString;
  };
}

export type Env = {
  capitalGainsMethod: CapitalGainsMethods;
  etherscanKey: string;
  logLevel: number;
  mode: Modes;
  outputFolder: string;
  taxYear: string;
}

export type StateBalances = {
  [account: string]: {
    [assetType: string]: DecimalString;
  };
}

export type NetWorth = { [assetType: string]: DecimalString };

// used to fill in a row of f8949
export type CapitalGainsLog = {
  cost: DecimalString;
  date: FormDateString;
  dateRecieved: FormDateString;
  description: string;
  gainOrLoss: DecimalString;
  proceeds: DecimalString;
  type: typeof LogTypes.CapitalGains;
}

export type IncomeLog = {
  assetPrice: DecimalString;
  assetType: AssetTypes;
  date: FormDateString;
  from: Address;
  description: string;
  quantity: DecimalString;
  type: typeof LogTypes.Income;
}

export type ExpenseLog = {
  assetPrice: DecimalString;
  assetType: AssetTypes;
  date: FormDateString;
  description: string;
  quantity: DecimalString;
  to: Address;
  type: typeof LogTypes.Expense;
}

////////////////////////////////////////
// Level 2+, depends on stuff above

export type Log = CapitalGainsLog | IncomeLog | ExpenseLog;
export type Logs = Log[];

export type Event = {
  date: TimestampString;
  description: string;
  hash?: HexString;
  index: number;
  prices: { [assetType: string]: DecimalString };
  sources: EventSources[];
  tags: string[];
  transfers: Transfer[];
}
export type Events = Event[];

export type StateJson = {
  lastUpdated: TimestampString;
  accounts: { [account: string]: AssetChunk[] };
}

export interface State {
  getAllBalances(): StateBalances;
  getBalance(account: string, assetType: AssetTypes): DecimalString;
  getChunks(
    account: Address,
    assetType: AssetTypes,
    quantity: DecimalString,
    event: Event,
  ): AssetChunk[];
  getNetWorth(): NetWorth;
  getRelevantBalances(event: Event): StateBalances;
  putChunk(account: string, chunk: AssetChunk): void;
  toJson(): StateJson;
  touch(lastUpdated: TimestampString): void;
}

export type InputData = {
  addressBook?: Array<{
    address: HexString;
    category: AddressCategories;
    name; string;
    tags: string[];
  }>;
  env: Partial<Env>;
  events: Array<Event | string>;
  formData: Forms;
  forms: string[];
}
