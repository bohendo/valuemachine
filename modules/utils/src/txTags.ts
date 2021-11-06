import { TxTags } from "@valuemachine/types";

import { ajv, formatErrors } from "./validate";

export const getEmptyTxTags = (): TxTags => ({});

const validateTxTags = ajv.compile(TxTags);
export const getTxTagsError = (txTags: TxTags): string => validateTxTags(txTags) ? ""
  : validateTxTags.errors.length ? formatErrors(validateTxTags.errors)
  : `Invalid TxTags: ${JSON.stringify(txTags)}`;
