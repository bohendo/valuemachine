import { Mappings as Mappings2019, Forms as Forms2019 } from "./2019";
import { Mappings as Mappings2020, Forms as Forms2020 } from "./2020";

export const TaxYears = {
  ["2019"]: "2019",
  ["2020"]: "2020",
} as const;

export const FormArchive = {
  ["2019"]: Mappings2019,
  ["2020"]: Mappings2020,
};
export type FormArchive = {
  ["2019"]: Forms2019;
  ["2020"]: Forms2020;
};

export type Forms = any; // TODO: make it match any form from any year
