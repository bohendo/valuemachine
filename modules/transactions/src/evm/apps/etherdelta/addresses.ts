import { AddressCategories } from "../../../enums";
import { setAddressCategory } from "../../../utils";
import { Apps } from "../../enums";

// Simple, standalone tokens only. App-specific tokens can be found in that app's parser.
export const addresses = [
  { name: Apps.EtherDelta, address: "Ethereum/0x8d12a197cb00d4747a1fe03395095ce2a5cc6819" },
].map(setAddressCategory(AddressCategories.Defi));

export const etherdeltaAddress = addresses.find(e => e.name === Apps.EtherDelta).address;
