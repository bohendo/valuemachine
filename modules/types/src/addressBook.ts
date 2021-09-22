import { Static, Type } from "@sinclair/typebox";

import { Logger } from "./logger";
import { Store } from "./store";
import { Account, Guard } from "./strings";

////////////////////////////////////////
// JSON Schema

// Addresses that only concern a single user
export const PrivateCategories = {
  Employee: "Employee",
  Employer: "Employer",
  Family: "Family",
  Friend: "Friend",
  Merchant: "Merchant",
  Private: "Private",
  Self: "Self", // User controlled
} as const;
export const PrivateCategory = Type.String(); // Extensible
export type PrivateCategory = Static<typeof PrivateCategory>;

// Addresses that concern the entire ecosystem
export const PublicCategories = {
  Burn: "Burn",
  Defi: "Defi",
  Donation: "Donation",
  ERC20: "ERC20",
  Exchange: "Exchange",
  Proxy: "Proxy",
  Public: "Public",
} as const;
export const PublicCategory = Type.String(); // Extensible
export type PublicCategory = Static<typeof PublicCategory>;

export const AddressCategories = {
  ...PublicCategories,
  ...PrivateCategories,
} as const;
export const AddressCategory = Type.String(); // Extensible
export type AddressCategory = Static<typeof AddressCategory>;

export const AddressEntry = Type.Object({
  address: Account,
  category: AddressCategory,
  decimals: Type.Optional(Type.Number()), // for ERC20 token addresses
  name: Type.String(),
  guard: Type.Optional(Guard), // EOAs should be secured by a physical guard too
});
export type AddressEntry = Static<typeof AddressEntry>;

export const AddressBookJson = Type.Record(Type.String(), AddressEntry);
export type AddressBookJson = Static<typeof AddressBookJson>;

////////////////////////////////////////
// Function Interfaces

export type AddressBookParams = {
  json?: AddressBookJson | AddressEntry[]; // for user-defined addresses saved eg in localstorage
  hardcoded?: AddressEntry[]; // for list of addresess saved in app-level code
  logger?: Logger;
  store?: Store;
}

export interface AddressBook {
  addresses: Account[];
  selfAddresses: Account[];
  getCategory(address: Account): AddressCategory;
  getDecimals(address: Account): number;
  getName(address: Account): string;
  isSelf(address: Account): boolean;
  isToken(address: Account): boolean;
  json: AddressBookJson;
}
