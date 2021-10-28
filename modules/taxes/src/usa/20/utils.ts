import { getLogger } from "@valuemachine/utils";

import { FormArchive, TaxYears } from "../../mappings";
import { maxint, getGetIncomeTax } from "../utils";

export * from "../utils";

export type Forms = FormArchive["USA20"];

export const taxYear = TaxYears.USA20;
export const logger = getLogger("info", taxYear);

// brackets should match https://files.taxfoundation.org/20191114132604/2020-Tax-Brackets-PDF.pdf
export const getIncomeTax = getGetIncomeTax([
  { rate: "0.10", single: "9875",   joint: "19750",  head: "14100" },
  { rate: "0.12", single: "40125",  joint: "80250",  head: "53700" },
  { rate: "0.22", single: "85525",  joint: "171050", head: "85500" },
  { rate: "0.24", single: "160725", joint: "321450", head: "160700" },
  { rate: "0.32", single: "207350", joint: "414700", head: "207350" },
  { rate: "0.35", single: "518400", joint: "622050", head: "518400" },
  { rate: "0.37", single: maxint, joint: maxint, head: maxint },
]);
