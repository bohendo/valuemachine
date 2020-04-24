import {
  Address,
  AssetChunk,
  AssetTypes,
  DecimalString,
  Event,
  HexString,
  StateJson,
  TimestampString,
} from "@finances/types";

import {
  AddressCategories,
  AddressTags,
  Modes,
} from "./enums";

export {
  AddressCategories,
  AddressTags,
  Modes,
};

export interface ILogger {
  debug(message: string): void;
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

export type Checkpoint = {
  account: Address;
  assetType: AssetTypes;
  balance: DecimalString;
  date: TimestampString;
  hash: HexString;
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

export type AddressBookJson = Array<{
  address: HexString;
  category: AddressCategories;
  name; string;
  tags: string[];
}>;

export type Env = {
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

////////////////////////////////////////
// Level 2+, depends on stuff above

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
  addressBook?: AddressBookJson;
  env: Partial<Env>;
  events: Array<Event | string>;
  forms: string[];
}
