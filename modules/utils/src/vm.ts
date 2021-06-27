import { ValueMachineJson } from "@valuemachine/types";

export const getEmptyValueMachine = (): ValueMachineJson => ({
  chunks: [],
  date: (new Date(0)).toISOString(),
  events: [],
});

export const getValueMachineError = (vmJson: ValueMachineJson) => 
  vmJson ? null : "Value Machine is falsy";
