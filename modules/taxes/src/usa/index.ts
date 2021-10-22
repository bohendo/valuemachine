import {
  Prices,
  ValueMachine,
} from "@valuemachine/types";

import { Forms } from "./mappings";
import { f1040 } from "./f1040";
import { f8949 } from "./f8949";

export { mappings, Forms } from "./mappings";

export const getTaxReturn = (
  taxYear: string,
  vm: ValueMachine,
  prices: Prices,
  formData: Forms,
): Forms => ({
  f8949: f8949(vm, prices, taxYear),
  f1040: f1040(formData).f1040, // TODO: keep side effects
});
