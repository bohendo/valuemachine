import { CsvSource } from "@valuemachine/types";

export type CsvFile = {
  name: string; // eg coinbase.csv
  type: CsvSource | string; // eg Coinbase (custom parsers not supported yet)
  data: string; // raw csv data eg "col1,col2\nrow1,row2\n"
};

export const getEmptyCsv = (): CsvFile[] => [];
