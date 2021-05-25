import { Assets } from "./assets";
import { AddressBookJson } from "./addressBook";

// TODO: move this into client bc nothing else needs it
export type ProfileJson = {
  unit: Assets;
  addressBook: AddressBookJson;
  authToken: string;
}

export const emptyProfile = { unit: Assets.ETH, addressBook: [], authToken: "" } as ProfileJson;
