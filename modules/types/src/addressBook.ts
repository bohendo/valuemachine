import { SecurityProvider } from "./security";
import { Address, HexString } from "./strings";
import { enumify } from "./utils";

export const ExternalCategories = enumify({
  Family: "Family",
  Friend: "Friend",
  Ignore: "Ignore",
  Private: "Private",
  Public: "Public",
  Self: "Self",
});
export type ExternalCategory = (typeof ExternalCategories)[keyof typeof ExternalCategories];

export const DeFiCategories = enumify({
  Defi: "Defi",
  ERC20: "ERC20",
  Exchange: "Exchange",
  Proxy: "Proxy",
});
export type DeFiCategory = (typeof DeFiCategories)[keyof typeof DeFiCategories];

export const AddressCategories = enumify({
  ...DeFiCategories,
  ...ExternalCategories,
});
export type AddressCategory = (typeof AddressCategories)[keyof typeof AddressCategories];

export type AddressEntry = {
  address: HexString;
  category: AddressCategory;
  name: string;
  guardian?: SecurityProvider;
  tags?: string[];
};

export type AddressBookJson = Array<AddressEntry>;

export interface AddressBook {
  addresses: Address[];
  getName(address: Address): string;
  getGuardian(address: Address): SecurityProvider;
  isCategory(category: AddressCategory): (address: Address) => boolean;
  isPresent(address: Address): boolean;
  isProxy(address: Address): boolean;
  isSelf(address: Address): boolean;
  isToken(address: Address): boolean;
  json: AddressBookJson;
  newAddress(name: string, category: AddressCategory, address: Address): void;
}
