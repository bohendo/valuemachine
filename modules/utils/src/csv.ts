import { toUtf8Bytes } from "@ethersproject/strings";
import { keccak256 } from "@ethersproject/keccak256";
import { CsvFiles } from "@valuemachine/types";

import { ajv, formatErrors } from "./validate";

export const getEmptyCsvFiles = (): CsvFiles => ({});

// TODO: verify hash of data matches the file digests
const validateCsvFiles = ajv.compile(CsvFiles);
export const getCsvFilesError = (csvFiles: CsvFiles): string =>
  validateCsvFiles(csvFiles)
    ? ""
    : validateCsvFiles.errors.length ? formatErrors(validateCsvFiles.errors)
    : `Invalid CsvFiles`;

export const hashCsv = (csvData: string) => keccak256(toUtf8Bytes(csvData)).substring(2, 10);
