import { AddressCategories } from "@valuemachine/types";
import { setAddressCategory } from "@valuemachine/utils";

import { Apps, Evms } from "../../enums";

export const addresses = [
  { name: Apps.Idex, address: `${Evms.Ethereum}/0x2a0c0DBEcC7E4D658f48E01e3fA353F44050c208` },
].map(setAddressCategory(AddressCategories.Exchange));
