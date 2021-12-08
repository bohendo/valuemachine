import { ajv, formatErrors } from "@valuemachine/utils";

import { CsvFiles } from "./types";

export const getEmptyCsvFiles = (): CsvFiles => ({});

const validateCsvFiles = ajv.compile(CsvFiles);
export const getCsvFilesError = (csvFiles: CsvFiles): string =>
  validateCsvFiles(csvFiles)
    ? ""
    : validateCsvFiles.errors.length ? formatErrors(validateCsvFiles.errors)
    : `Invalid CsvFiles`;
