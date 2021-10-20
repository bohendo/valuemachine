import { Static, Type } from "@sinclair/typebox";

import { TransactionsJson } from "./transactions";
import { AddressBookJson } from "./addressBook";
import { CsvFiles } from "./csv";

// Consolidation of all user-supplied input
// Contains nothing that can be reproducibly downloaded from public chains/dbs
export const InputData = Type.Object({
  customTxns: TransactionsJson,
  addressBook: AddressBookJson,
  csvFiles: CsvFiles,
});
export type InputData = Static<typeof InputData>;
