import { Static, Type } from "@sinclair/typebox";

import { Mappings as MappingsUSA19 } from "./USA19";
import { Mappings as MappingsUSA20 } from "./USA20";

// Can't just be 2019 bc enums can't start with a number
export const TaxYears = {
  USA19: "USA19",
  USA20: "USA20",
} as const;
export const TaxYear = Type.Enum(TaxYears); // NOT Extensible
export type TaxYear = Static<typeof TaxYear>;

export const FormArchive = {
  [TaxYears.USA19]: MappingsUSA19,
  [TaxYears.USA20]: MappingsUSA20,
};

export type Form = {
  [field: string]: any; // TODO: string | boolean
};

export type Forms = {
  [form: string]: any; // TODO: Array<Form> | Form
};

/*
export type FormArchive = {
  [TaxYears.USA19]: MappingsUSA19;
  [TaxYears.USA20]: MappingsUSA20;
};
*/

export const getEmptyForms = (year: string): Forms =>
  Object.keys(FormArchive[year]).reduce((forms, form) => ({
    ...forms,
    [form]: {}
  }), {});
