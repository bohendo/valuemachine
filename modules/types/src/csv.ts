import { Static, Type } from "@sinclair/typebox";

import { Source } from "./strings";
import { TransactionsJson } from "./transactions";

export const CsvFile = Type.Object({
  name: Type.String(), // file name eg coinbase.csv
  type: Source, // data type eg Coinbase
  data: Type.String(), // raw csv data eg "col1,col2\nrow1,row2\n"
  txns: Type.Optional(TransactionsJson), // parsed csv data
});
export type CsvFile = Static<typeof CsvFile>;

export const CsvFiles = Type.Array(CsvFile);
export type CsvFiles = Static<typeof CsvFiles>;
