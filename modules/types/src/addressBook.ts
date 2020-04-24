import { Address, HexString } from "./strings";
import { enumify } from "./utils";

export const AddressCategories = enumify({
  CToken: "CToken",
  Cdp: "Cdp",
  Defi: "Defi",
  Erc20: "Erc20",
  Exchange: "Exchange",
  Family: "Family",
  Friend: "Friend",
  Ignore: "Ignore",
  Private: "Private",
  Public: "Public",
  Self: "Self",
});
export type AddressCategories = (typeof AddressCategories)[keyof typeof AddressCategories];

export type AddressBookJson = Array<{
  address: HexString;
  category: AddressCategories;
  name: string;
  tags?: string[];
}>;

export interface AddressBook {
  addresses: Address[];
  getName(address: Address): string;
  isCategory(category: AddressCategories): (address: Address) => boolean;
  isDefi(address: Address): boolean;
  isExchange(address: Address): boolean;
  isFamily(address: Address): boolean;
  isSelf(address: Address): boolean;
  isToken(address: Address): boolean;
}
