import { Logger } from "./logger";
import { SecurityProvider } from "./security";
import { Store } from "./store";
import { Address } from "./strings";
import { enumify } from "./utils";

export const PrivateCategories = enumify({
  Employee: "Employee",
  Employer: "Employer",
  Family: "Family",
  Friend: "Friend",
  Merchant: "Merchant",
  Private: "Private",
  Self: "Self", // User controlled
});
export type PrivateCategory = (typeof PrivateCategories)[keyof typeof PrivateCategories];

export const PublicCategories = enumify({
  Burn: "Burn",
  Defi: "Defi",
  Donation: "Donation",
  ERC20: "ERC20",
  Exchange: "Exchange",
  Proxy: "Proxy",
  Public: "Public",
});
export type PublicCategory = (typeof PublicCategories)[keyof typeof PublicCategories];

export const AddressCategories = enumify({
  ...PublicCategories,
  ...PrivateCategories,
});
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
