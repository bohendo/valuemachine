import {
  AddressBookJson,
  Transaction,
  ExpenseEvent,
  enumify,
} from "@finances/types";

import { Field, Forms } from "./mappings";
export { Field, Forms };

export const Modes = enumify({
  example: "example",
  profile: "profile",
  test: "test",
});
export type Modes = (typeof Modes)[keyof typeof Modes];

export type Env = {
  etherscanKey: string;
  logLevel: string;
  mode: Modes;
  outputFolder: string;
  taxYear?: string;
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
