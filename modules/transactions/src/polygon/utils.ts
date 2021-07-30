import {
  AddressEntry,
  AddressCategory,
  Guards,
} from "@valuemachine/types";
import { fmtAddressEntry } from "@valuemachine/utils";

export const setAddressCategory = (category: AddressCategory) =>
  (entry: Partial<AddressEntry>): AddressEntry =>
    fmtAddressEntry({
      ...entry,
      category,
      guard: Guards.MATIC,
    } as AddressEntry);
