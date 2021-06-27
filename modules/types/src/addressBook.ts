import { Static } from "@sinclair/typebox";

import { Logger } from "./logger";
import { SecurityProvider } from "./security";
import { Store } from "./store";
import { Address } from "./strings";
import { enumToSchema } from "./utils";

export const PrivateCategories = {
  Employee: "Employee",
  Employer: "Employer",
  Family: "Family",
  Friend: "Friend",
  Merchant: "Merchant",
  Private: "Private",
  Self: "Self", // User controlled
} as const;
export const PrivateCategorySchema = enumToSchema(PrivateCategories);
export type PrivateCategories = Static<typeof PrivateCategorySchema>;
export type PrivateCategory = (typeof PrivateCategories)[keyof typeof PrivateCategories];

export const PublicCategories = {
  Burn: "Burn",
  Defi: "Defi",
  Donation: "Donation",
  ERC20: "ERC20",
  Exchange: "Exchange",
  Proxy: "Proxy",
  Public: "Public",
} as const;
export const PublicCategorySchema = enumToSchema(PublicCategories);
export type PublicCategories = Static<typeof PublicCategorySchema>;
export type PublicCategory = (typeof PublicCategories)[keyof typeof PublicCategories];

export const AddressCategories = {
  ...PublicCategories,
  ...PrivateCategories,
} as const;
export const AddressCategorySchema = enumToSchema(AddressCategories);
export type AddressCategories = Static<typeof AddressCategorySchema>;
export type AddressCategory = (typeof AddressCategories)[keyof typeof AddressCategories];

export type AddressEntry = {
  address: Address;
  category: AddressCategory;
  decimals?: number; // for ERC20 token addresses
  name?: string;
  guardian?: SecurityProvider;
};

export type AddressBookJson = Array<AddressEntry>;

export type AddressBookParams = {
  json?: AddressBookJson; // for user-defined addresses saved eg in localstorage
  hardcoded?: AddressBookJson; // for addresess saved in app-level code
  logger?: Logger;
  store?: Store;
}

export interface AddressBook {
  addresses: Address[];
  getName(address: Address): string;
  getGuardian(address: Address): SecurityProvider;
  getDecimals(address: Address): number;
  isCategory(category: AddressCategory): (address: Address) => boolean;
  isPublic(address: Address): boolean;
  isPrivate(address: Address): boolean;
  isSelf(address: Address): boolean;
  isToken(address: Address): boolean;
  json: AddressBookJson;
}
