import { AddressCategories } from "@valuemachine/types";
import { setAddressCategory } from "@valuemachine/utils";

import { Apps, Evms } from "../../enums";

export const addresses = [
  { name: Apps.Airswap, address: `${Evms.Ethereum}/0x8fd3121013a07c57f0d69646e86e7a4880b467b7` },
].map(setAddressCategory(AddressCategories.Exchange));
