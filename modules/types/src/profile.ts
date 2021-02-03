import { Address } from "./strings";
import { AddressBookJson } from "./addressBook";

export type ProfileJson = {
  username: string;
  addressBook: AddressBookJson;
  infuraKey: string;
}

export interface Profile {
  // TODO: add profile functions here
  json: ProfileJson;
  getAddresses(): Address[];
}

export const emptyProfile = { username: "", addressBook: [], infuraKey: "" } as ProfileJson;