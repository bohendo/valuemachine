import { Static, Type } from "@sinclair/typebox";

import { CsvSource } from "./transactions";

export const CsvFile = Type.Object({
  name: Type.String(), // eg coinbase.csv
  type: Type.Union([CsvSource, Type.String()]), // eg Coinbase (custom parsers not supported yet)
  data: Type.String(), // raw csv data eg "col1,col2\nrow1,row2\n"
});
export type CsvFile = Static<typeof CsvFile>;

export const CsvFiles = Type.Array(CsvFile);
export type CsvFiles = Static<typeof CsvFiles>;

export const getEmptyCsv = (): CsvFiles => [];

