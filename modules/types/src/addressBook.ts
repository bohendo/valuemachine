import { Logger } from "./logger";
import { SecurityProvider } from "./security";
import { Address, HexString } from "./strings";
import { enumify } from "./utils";

export const PrivateCategories = enumify({
  Employee: "Employee",
  Employer: "Employer",
  Family: "Family",
  Friend: "Friend",
  Self: "Self", // User controlled
});
export type PrivateCategory = (typeof PrivateCategories)[keyof typeof PrivateCategories];

export const PublicCategories = enumify({
  Defi: "Defi",
  ERC20: "ERC20",
  Exchange: "Exchange",
  Proxy: "Proxy",
});
export type PublicCategory = (typeof PublicCategories)[keyof typeof PublicCategories];

export const AddressCategories = enumify({
  ...PublicCategories,
  ...PrivateCategories,
});
export type AddressCategory = (typeof AddressCategories)[keyof typeof AddressCategories];

export type AddressEntry = {
  address: HexString;
  category: AddressCategory;
  decimals?: number; // for ERC20 token addresses
  name?: string;
  guardian?: SecurityProvider;
};

export type AddressBookJson = Array<AddressEntry>;

export const emptyAddressBook = [] as AddressBookJson;

export type AddressBookParams = {
  json: AddressBookJson;
  logger: Logger;
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
