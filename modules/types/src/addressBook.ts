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

export type AddressEntry = {
  address: HexString;
  category: AddressCategories;
  name: string;
  tags?: string[];
}

export type AddressBookJson = Array<AddressEntry>;

export interface AddressBook {
  addresses: Address[];
  getName(address: Address): string;
  isCategory(category: AddressCategories): (address: Address) => boolean;
  isSelf(address: Address): boolean;
  isToken(address: Address): boolean;
}
