import { ValueMachineJson } from "@valuemachine/types";

import { ajv, formatErrors } from "./validate";

export const getEmptyValueMachine = (): ValueMachineJson => ({
  chunks: [],
  date: (new Date(0)).toISOString(),
  events: [],
});

const validateValueMachine = ajv.compile(ValueMachineJson);
export const getValueMachineError = (vmJson: ValueMachineJson): string | null =>
  validateValueMachine(vmJson)
    ? null
    : validateValueMachine.errors.length ? formatErrors(validateValueMachine.errors)
    : `Invalid ValueMachine`;
