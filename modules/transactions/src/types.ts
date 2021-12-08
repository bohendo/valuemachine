import { Static, Type } from "@sinclair/typebox";
import {
  Account,
  Amount,
  Asset,
  DateTimeString,
  DecString,
  Guard,
  Logger,
  Source,
  TxId,
} from "@valuemachine/types";

import {
  AddressCategories,
  BusinessExpenseTypes,
  ExpenseTypes,
  IncomeTypes,
  PrivateCategories,
  PublicCategories,
  TransferCategories,
} from "./enums";

////////////////////////////////////////
// AddressBook

// Addresses that only concern a single user eg EOAs & multisigs
export const PrivateCategory = Type.Enum(PrivateCategories); // NOT Extensible at run-time
export type PrivateCategory = Static<typeof PrivateCategory>;

// Addresses that interact with the entire crypto ecosystem eg tokens
export const PublicCategory = Type.Enum(PublicCategories); // NOT Extensible at run-time
export type PublicCategory = Static<typeof PublicCategory>;

export const AddressCategory = Type.Enum(AddressCategories); // NOT Extensible at run-time
export type AddressCategory = Static<typeof AddressCategory>;

export const AddressEntry = Type.Object({
  address: Account,
  category: AddressCategory,
  decimals: Type.Optional(Type.Number()), // for erc20 token addresses
  name: Type.String(),
  guard: Type.Optional(Guard), // EOAs should be secured by a physical guard too
});
export type AddressEntry = Static<typeof AddressEntry>;

export const AddressBookJson = Type.Record(Type.String(), AddressEntry);
export type AddressBookJson = Static<typeof AddressBookJson>;

export type AddressBookParams = {
  json?: AddressBookJson | AddressEntry[]; // for user-defined addresses saved eg in localstorage
  hardcoded?: AddressEntry[]; // for list of addresess saved in app-level code
  logger?: Logger;
  save?: (val: AddressBookJson) => void;
}

export interface AddressBook {
  addresses: Account[];
  selfAddresses: Account[];
  getCategory(address: Account): AddressCategory;
  getGuard(address: Account): Guard;
  getDecimals(address: Account): number;
  getName(address: Account, prefix?: boolean): string;
  isSelf(address: Account): boolean;
  isToken(address: Account): boolean;
  isNFT(address: Account): boolean;
  json: AddressBookJson;
}

////////////////////////////////////////
// Csv

export type CsvParser = (
  csvData: string,
  logger: Logger,
) => TransactionsJson;

////////////////////////////////////////
// Transaction JSON Schema

export const IncomeType = Type.Enum(IncomeTypes); // NOT Extensible at run-time
export type IncomeType = Static<typeof IncomeType>;

export const BusinessExpenseType = Type.Enum(BusinessExpenseTypes); // NOT Extensible at run-time
export type BusinessExpenseType = Static<typeof BusinessExpenseType>;

export const ExpenseType = Type.Enum(ExpenseTypes); // NOT Extensible at run-time
export type ExpenseType = Static<typeof ExpenseType>;

export const TxTag = Type.Object({
  description: Type.Optional(Type.String()),
  exempt: Type.Optional(Type.Boolean()),
  expenseType: Type.Optional(Type.String()),
  incomeType: Type.Optional(Type.String()),
  multiplier: Type.Optional(DecString),
  physicalGuard: Type.Optional(Guard),
});
export type TxTag = Static<typeof TxTag>;

export const TxTags = Type.Record(TxId, TxTag);
export type TxTags = Static<typeof TxTags>;

export const TxTagTypes = {
  description: "description",
  exempt: "exempt",
  expenseType: "expenseType",
  incomeType: "incomeType",
  multiplier: "multiplier",
  physicalGuard: "physicalGuard",
} as const;
export const TxTagType = Type.Enum(TxTagTypes); // NOT Extensible at run-time
export type TxTagType = Static<typeof TxTagType>;

export const TransferCategory = Type.Enum(TransferCategories); // NOT Extensible
export type TransferCategory = Static<typeof TransferCategory>;

export const Transfer = Type.Object({
  amount: Type.Optional(Amount), // undefined if atomic eg nfts
  asset: Asset,
  category: TransferCategory,
  from: Account,
  index: Type.Optional(Type.Number()), // we should require an index on all transfers
  to: Account,
});
export type Transfer = Static<typeof Transfer>;

export const Transaction = Type.Object({
  apps: Type.Array(Type.String()),
  date: DateTimeString,
  index: Type.Optional(Type.Number()), // required after merging txns together
  method: Type.String(),
  sources: Type.Array(Source),
  tag: TxTag,
  transfers: Type.Array(Transfer),
  uuid: TxId,
});
export type Transaction = Static<typeof Transaction>;

export const TransactionsJson = Type.Array(Transaction);
export type TransactionsJson = Static<typeof TransactionsJson>;

////////////////////////////////////////
// Function Interfaces

export type TransactionsParams = {
  json?: TransactionsJson;
  logger?: Logger;
  save?: (val: TransactionsJson) => void;
};

export type Transactions = {
  json: TransactionsJson;
  mergeCsv: (csvData: string, parser?: CsvParser) => void;
  merge: (transactions: TransactionsJson) => void;
};

