import { getLogger } from "@valuemachine/utils";

import { FormArchive, TaxYears } from "../../mappings";
import {
  maxint,
  getGetIncomeTax,
  getGetTotalIncome,
  getGetTotalTaxableIncome,
  getGetForeignEarnedIncome,
  getGetForeignEarnedIncomeExclusion,
  daysInYear,
} from "../utils";

export * from "../utils";

export type Forms = FormArchive["USA20"];

export const year = "2020";
export const taxYear = TaxYears.USA20;
export const logger = getLogger("info", taxYear);
export const daysThisYear = daysInYear(year);

export const maxFeie = "107600";

export const thisYear = row => row.date.startsWith(year);
export const lastYear = row => row.date.startsWith("2019");

export const getForeignEarnedIncome = getGetForeignEarnedIncome(year);
export const getForeignEarnedIncomeExclusion = getGetForeignEarnedIncomeExclusion(year, maxFeie);
export const getTotalIncome = getGetTotalIncome(year, maxFeie);
export const getTotalTaxableIncome = getGetTotalTaxableIncome(year, maxFeie);

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
