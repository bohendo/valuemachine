import { CsvFiles } from "@valuemachine/types";

import { ajv, formatErrors } from "./validate";

export const getEmptyCsvFiles = (): CsvFiles => [];

const validateCsvFiles = ajv.compile(CsvFiles);
export const getCsvFilesError = (csvFiles: CsvFiles): string | null =>
  validateCsvFiles(csvFiles)
    ? null
    : validateCsvFiles.errors.length ? formatErrors(validateCsvFiles.errors)
    : `Invalid CsvFiles`;
