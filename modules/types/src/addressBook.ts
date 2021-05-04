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
// eslint-disable-next-line @typescript-eslint/no-redeclare
export type ExternalCategories = (typeof ExternalCategories)[keyof typeof ExternalCategories];

export const DeFiCategories = enumify({
  Compound: "Compound",
  Defi: "Defi",
  Erc20: "Erc20",
  Exchange: "Exchange",
  MakerDAO: "MakerDAO",
  Uniswap: "Uniswap",
  Yearn: "Yearn",
});
// eslint-disable-next-line @typescript-eslint/no-redeclare
export type DeFiCategories = (typeof DeFiCategories)[keyof typeof DeFiCategories];

export const AddressCategories = enumify({
  ...DeFiCategories,
  ...ExternalCategories,
});
// eslint-disable-next-line @typescript-eslint/no-redeclare
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
  json: AddressBookJson;
  isCategory(category: AddressCategories): (address: Address) => boolean;
  isSelf(address: Address): boolean;
  isToken(address: Address): boolean;
}
