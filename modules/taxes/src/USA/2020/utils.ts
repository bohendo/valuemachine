import { getLogger } from "@valuemachine/utils";

import { FormArchive, TaxYears } from "../../mappings";
import {
  daysInYear,
} from "../utils";

export * from "../utils";

export type Forms = FormArchive["USA2020"];

export const year = "2020";
export const taxYear = TaxYears.USA2020;
export const logger = getLogger("info", taxYear);
export const daysThisYear = daysInYear(year);

export const maxFeie = "107600";

export const thisYear = row => row.date.startsWith(year);
export const lastYear = row => row.date.startsWith("2019");
