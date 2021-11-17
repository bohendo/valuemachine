import { Static, Type } from "@sinclair/typebox";

import { Digest, Source } from "./strings";
import { Logger } from "./logger";
import { TransactionsJson } from "./transactions";

export const CsvFile = Type.Object({
  data: Type.String(), // raw csv data eg "col1,col2\nrow1,row2\n"
  digest: Digest,
  name: Type.Optional(Type.String()), // file name eg coinbase.csv
  source: Source, // data type eg Coinbase
});
export type CsvFile = Static<typeof CsvFile>;

export const CsvFiles = Type.Record(Digest, CsvFile);
export type CsvFiles = Static<typeof CsvFiles>;

export type CsvParser = (
  csvData: string,
  logger: Logger,
) => TransactionsJson;
