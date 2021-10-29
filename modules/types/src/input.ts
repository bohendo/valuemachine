import { Static, Type } from "@sinclair/typebox";

import { TransactionsJson } from "./transactions";
import { AddressBookJson } from "./addressBook";
import { CsvFiles } from "./csv";
import { TaxInput } from "./taxes";

// Consolidation of all user-supplied input
// Contains nothing that can be reproducibly downloaded from public chains/dbs
export const InputData = Type.Object({
  addressBook: AddressBookJson,
  csvFiles: CsvFiles,
  customTxns: TransactionsJson,
  taxInput: TaxInput,
});
export type InputData = Static<typeof InputData>;
