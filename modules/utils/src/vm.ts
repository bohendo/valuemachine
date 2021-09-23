import {
  ValueMachineJson,
  Asset,
  AssetChunk,
  Balances,
  DecimalString,
  Transfer,
} from "@valuemachine/types";

import { add, eq, round as defaultRound } from "./math";
import { ajv, formatErrors } from "./validate";

const round = n => defaultRound(n, 6).replace(/0+$/, "0");

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

type Value = {
  asset: Asset;
  amount: DecimalString;
};
const sumValue = (values: Array<Value>): Balances => {
  const totals = {} as Balances;
  if (!values?.length) return totals;
  values.forEach(value => {
    if (value?.amount && !eq(value.amount, "0")) {
      totals[value.asset] = add(totals[value.asset], value.amount);
    }
  });
  return totals;
};
export const sumTransfers = (transfers: Transfer[]): Balances => sumValue(transfers as Value[]);
export const sumChunks = (chunks: AssetChunk[]): Balances => sumValue(chunks as Value[]);

export const describeBalance = (balance: Balances): string =>
  Object.keys(balance).map(asset => `${round(balance[asset])} ${asset}`).join(" and ");
