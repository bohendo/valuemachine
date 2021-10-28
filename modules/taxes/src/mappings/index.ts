import { Static, Type } from "@sinclair/typebox";

import { Mappings_USA19, Forms_USA19 } from "./USA19";
import { Mappings_USA20, Forms_USA20 } from "./USA20";

export * from "./USA19";
export * from "./USA20";

// Can't just be 2019 bc enums can't start with a number
export const TaxYears = {
  USA19: "USA19",
  USA20: "USA20",
} as const;
export const TaxYear = Type.Enum(TaxYears); // NOT Extensible
export type TaxYear = Static<typeof TaxYear>;

export const MappingArchive = {
  [TaxYears.USA19]: Mappings_USA19,
  [TaxYears.USA20]: Mappings_USA20,
};

export type FormArchive = {
  [TaxYears.USA19]: Forms_USA19,
  [TaxYears.USA20]: Forms_USA20,
};

export type Form = {
  [field: string]: any; // TODO: string | boolean
};

export type Forms = {
  [form: string]: any; // TODO: Array<Form> | Form
};

const multipageForms = ["f8949"];

export const getEmptyForms = (year: TaxYear): Forms =>
  Object.keys(MappingArchive[year]).reduce((forms, form) => ({
    ...forms,
    [form]: multipageForms.includes(form) ? [] : {}
  }), {});
