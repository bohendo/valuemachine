import { Address } from "./strings";
import { AddressBookJson } from "./addressBook";

export type ProfileJson = {
  username: string;
  addressBook: AddressBookJson;
  authToken: string;
}

export interface Profile {
  // TODO: add profile functions here
  json: ProfileJson;
  getAddresses(): Address[];
}

export const emptyProfile = { username: "", addressBook: [], authToken: "" } as ProfileJson;