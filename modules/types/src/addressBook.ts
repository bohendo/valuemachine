import { Logger } from "./logger";
import { SecurityProvider } from "./security";
import { Address, HexString } from "./strings";
import { enumify } from "./utils";

const ExternalCategories = enumify({
  Family: "Family",
  Private: "Private", // private individuals eg steve
  Public: "Public", // public addresses eg gitcoin grants
  Self: "Self", // User controlled
});
const DeFiCategories = enumify({
  Defi: "Defi",
  ERC20: "ERC20",
  Exchange: "Exchange",
  Proxy: "Proxy",
});

export const AddressCategories = enumify({
  ...DeFiCategories,
  ...ExternalCategories,
});
export type AddressCategory = (typeof AddressCategories)[keyof typeof AddressCategories];

export type AddressEntry = {
  address: HexString;
  category: AddressCategory;
  decimals?: number; // for ERC20 token addresses
  name: string;
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
  isPresent(address: Address): boolean;
  isProxy(address: Address): boolean;
  isSelf(address: Address): boolean;
  isToken(address: Address): boolean;
  json: AddressBookJson;
  newAddress(name: string, category: AddressCategory, address: Address): void;
}
