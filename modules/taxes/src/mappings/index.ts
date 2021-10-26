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
/* TODO export this type
export type namespace FormArchive {
  export type USA19 = FormsUSA19;
  export type USA20 = FormsUSA20;
}
*/

export const getEmptyForms = (year: string): Forms =>
  Object.keys(FormArchive[year]).reduce((forms, form) => ({
    ...forms,
    [form]: Object.keys(FormArchive[year][form]).reduce((fields, field) => ({
      ...fields,
      [field]: "",
    }), {}),
  }), {});

export type Form = {
  [field: string]: any; // TODO: type as string | boolean according to mapping
};

export type Forms = {
  [form: string]: any; // TODO: type as Array<Form> | Form;
};
