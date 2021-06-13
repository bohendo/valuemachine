import {
  AddressBookJson,
  Transaction,
  ExpenseEvent,
  enumify,
} from "@valuemachine/types";

import { Field, Forms } from "./mappings";
export { Field, Forms };

export const Modes = enumify({
  example: "example",
  profile: "profile",
  test: "test",
});
// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Modes = (typeof Modes)[keyof typeof Modes];

export type Env = {
  etherscanKey: string;
  logLevel: string;
  mode: Modes;
  outputFolder: string;
  taxYear?: string;
  username: string;
}

export type ProfileData = {
  addressBook?: AddressBookJson;
  dividends: Array<{ source: string; asset: string; tags: string[]; quantity: string }>;
  expenses: Array<Partial<ExpenseEvent>>;
  env: Partial<Env>;
  transactions: Array<Transaction | string>;
  forms: Forms;
}
