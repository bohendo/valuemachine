import {
  AddressBookJson,
  Transaction,
  ExpenseEvent,
} from "@valuemachine/types";

import { FormArchive } from "../../mappings";

export const Mappings = FormArchive["2019"];
export type Forms = FormArchive["2019"];

export const Modes = {
  example: "example",
  profile: "profile",
  test: "test",
} as const;

export type Env = {
  etherscanKey: string;
  logLevel: number;
  mode: string;
  outputFolder: string;
  taxYear: string;
  username: string;
}

export type InputData = {
  addressBook?: AddressBookJson;
  dividends: Array<{ source: string; assetType: string; tags: string[]; quantity: string }>;
  expenses: Array<Partial<ExpenseEvent>>;
  env: Partial<Env>;
  transactions: Array<Transaction | string>;
  formData: Forms;
  forms: string[];
}
