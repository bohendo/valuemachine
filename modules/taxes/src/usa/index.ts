import {
  Prices,
  ValueMachine,
} from "@valuemachine/types";

import { Forms } from "../mappings";

import { f1040 } from "./f1040";
import { f8949 } from "./f8949";

export const getEmptyForms = (): Forms => ({
  f1040: {},
  f1040s1: {},
  f1040s2: {},
  f1040s3: {},
  f2555: {},
  f8949: [],
});

export const getTaxReturn = (
  taxYear: string,
  vm: ValueMachine,
  prices: Prices,
  formData: Forms,
): Forms => ({
  ...getEmptyForms(),
  ...formData,
  f8949: f8949(vm, prices, taxYear),
  f1040: f1040({ ...getEmptyForms(), ...formData }).f1040, // TODO: keep side effects
});
