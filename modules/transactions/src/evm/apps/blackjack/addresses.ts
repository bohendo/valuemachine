import { AddressCategories } from "../../../enums";
import { setAddressCategory } from "../../../utils";
import { Apps, Evms } from "../../enums";

const { Ethereum } = Evms;

export const addresses = [{
  name: Apps.Blackjack, address: `${Ethereum}/0x13Ea3e8f20fdABb3996D7580DF50143b93E4ba27`,
}, {
  name: Apps.TipJar, address: `${Ethereum}/0x2610a8d6602d7744174181348104DafC2aD94b28`,
}].map(setAddressCategory(AddressCategories.Defi));

export const blackjackAddress = addresses.find(e => e.name === Apps.Blackjack).address;
export const tipjarAddress = addresses.find(e => e.name === Apps.TipJar).address;
