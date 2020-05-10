import { AddressBookJson } from "./addressBook";

export type ProfileJson = {
  username: string;
  addressBook: AddressBookJson;
  etherscanKey: string;
}

export interface Profile {
  // TODO: add profile functions here
  json: ProfileJson;
}

export const emptyProfile = { addressBook: [] } as ProfileJson;
