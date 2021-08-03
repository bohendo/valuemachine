import { Static, Type } from "@sinclair/typebox";

import { Logger } from "./logger";
import { Guard } from "./guards";
import { Store } from "./store";
import { Address } from "./strings";

////////////////////////////////////////
// JSON Schema

export const PrivateCategories = {
  Employee: "Employee",
  Employer: "Employer",
  Family: "Family",
  Friend: "Friend",
  Merchant: "Merchant",
  Private: "Private",
  Self: "Self", // User controlled
} as const;
export const PrivateCategory = Type.Enum(PrivateCategories);
export type PrivateCategory = Static<typeof PrivateCategory>;

export const PublicCategories = {
  Burn: "Burn",
  Defi: "Defi",
  Donation: "Donation",
  ERC20: "ERC20",
  Exchange: "Exchange",
  Proxy: "Proxy",
  Public: "Public",
} as const;
export const PublicCategory = Type.Enum(PublicCategories);
export type PublicCategory = Static<typeof PublicCategory>;

export const AddressCategories = {
  ...PublicCategories,
  ...PrivateCategories,
} as const;
export const AddressCategory = Type.Enum(AddressCategories);
export type AddressCategory = Static<typeof AddressCategory>;

export const AddressEntry = Type.Object({
  address: Address,
  category: AddressCategory,
  decimals: Type.Optional(Type.Number()), // for ERC20 token addresses
  name: Type.String(),
  guard: Type.Optional(Guard),
});
export type AddressEntry = Static<typeof AddressEntry>;

export const AddressBookJson = Type.Dict(AddressEntry);
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
  addresses: Address[];
  getName(address: Address): string;
  getGuard(address: Address): Guard;
  getDecimals(address: Address): number;
  isCategory(category: AddressCategory): (address: Address) => boolean;
  isPublic(address: Address): boolean;
  isPrivate(address: Address): boolean;
  isSelf(address: Address): boolean;
  isToken(address: Address): boolean;
  json: AddressBookJson;
}
