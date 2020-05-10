import { AddressBookJson, } from "./addressBook";

export type ProfileJson = {
  profileName: string;
  addressBook: AddressBookJson
}

export interface Profile {
  // TODO: add profile functions here
  json: ProfileJson;
}

export const emptyProfile = { addressBook: {} } as ProfileJson;

