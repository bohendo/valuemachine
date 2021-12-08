import { Static, Type } from "@sinclair/typebox";
import { TaxInput } from "@valuemachine/taxes";
import { TxTags } from "@valuemachine/transactions";
import {
  AddressBookJson,
  CsvFiles,
  TransactionsJson,
} from "@valuemachine/types";

// Consolidation of all user-supplied input
// Contains nothing that can be reproducibly downloaded from public chains/dbs
export const InputData = Type.Object({
  addressBook: AddressBookJson,
  csvFiles: CsvFiles,
  customTxns: TransactionsJson,
  taxInput: TaxInput,
  txTags: TxTags,
});
export type InputData = Static<typeof InputData>;
