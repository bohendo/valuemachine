import { ValueMachineJson } from "@valuemachine/types";

export const getValueMachineError = (vmJson: ValueMachineJson) => 
  vmJson ? null : "Value Machine is falsy";
