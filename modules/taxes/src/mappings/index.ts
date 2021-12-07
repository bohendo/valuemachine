import { TaxYear } from "@valuemachine/types";

import { Mappings_USA2019, Forms_USA2019 } from "./USA2019";
import { Mappings_USA2020, Forms_USA2020 } from "./USA2020";

export {
  F1040_USA2019,
  F1040S1_USA2019,
  F1040S2_USA2019,
  F1040S3_USA2019,
  F1040SA_USA2019,
  F1040SB_USA2019,
  F1040SC_USA2019,
  F1040SD_USA2019,
  F1040SSE_USA2019,
  F2210_USA2019,
  F2555_USA2019,
  F8889_USA2019,
  F8949_USA2019,
  Forms_USA2019,
  Mappings_USA2019,
} from "./USA2019";
export {
  F1040_USA2020,
  F1040S1_USA2020,
  F1040S2_USA2020,
  F1040S3_USA2020,
  F1040SA_USA2020,
  F1040SB_USA2020,
  F1040SC_USA2020,
  F1040SD_USA2020,
  F1040SSE_USA2020,
  F2210_USA2020,
  F2555_USA2020,
  F8949_USA2020,
  Forms_USA2020,
  Mappings_USA2020,
} from "./USA2020";

// Can't just be 2019 bc enums can't start with a number
export const TaxYears = {
  USA2019: "USA2019",
  USA2020: "USA2020",
} as const;

export const MappingArchive = {
  [TaxYears.USA2019]: Mappings_USA2019,
  [TaxYears.USA2020]: Mappings_USA2020,
};

export type FormArchive = {
  [TaxYears.USA2019]: Forms_USA2019,
  [TaxYears.USA2020]: Forms_USA2020,
};

// Generic form types to use when we don't know the tax year
export type Form = { [field: string]: any; };
export type Forms = { [form: string]: any; };

const multipageForms = ["f8949"];

export const getEmptyForms = (year: TaxYear): Forms =>
  Object.keys(MappingArchive[year]).reduce((forms, form) => ({
    ...forms,
    [form]: multipageForms.includes(form) ? [] : {}
  }), {});
