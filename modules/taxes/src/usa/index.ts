import {
  Prices,
  ValueMachine,
} from "@valuemachine/types";

import { FormArchive, Forms } from "../mappings";

import { f1040 } from "./2020/f1040";
import { f8949 } from "./2020/f8949";

export const getEmptyForms = (year: string): Forms =>
  Object.keys(FormArchive[year]).reduce((forms, form) => ({
    ...forms,
    [form]: Object.keys(FormArchive[year][form]).reduce((fields, field) => ({
      ...fields,
      [field]: "",
    }), {}),
  }), {});

// TODO: keep side effects between form filers
export const getTaxReturn = (
  year: string,
  vm: ValueMachine,
  prices: Prices,
  formData: Forms,
): Forms => ({
  ...getEmptyForms(year),
  ...formData,
  f8949: f8949(vm, prices, year),
  f1040: f1040({ ...getEmptyForms(year), ...formData }).f1040,
});
