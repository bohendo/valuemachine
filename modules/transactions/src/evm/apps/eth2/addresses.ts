import { AddressCategories } from "../../../enums";
import { setAddressCategory } from "../../../utils";
import { Apps, Evms } from "../../enums";

const { ETH2 } = Apps;
const { Ethereum } = Evms;

export const addresses = [{
  address: `${Ethereum}/0x00000000219ab540356cbb839cbe05303d7705fa`,
  name: ETH2,
}].map(setAddressCategory(AddressCategories.Defi));

export const eth2DepositAddress = addresses.find(e => e.name === ETH2)?.address;
