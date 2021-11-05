import {
  Transaction,
  TransactionsJson,
  Transfer,
  TransferCategories,
} from "@valuemachine/types";

import { ajv, formatErrors } from "./validate";

export const getEmptyTransactions = (): TransactionsJson => [];

export const getBlankTransaction = (): Transaction => JSON.parse(JSON.stringify({
  apps: [],
  date: "",
  index: 0,
  method: "",
  sources: [],
  transfers: [{
    amount: "",
    asset: "",
    category: TransferCategories.Noop,
    from: "",
    to: "",
  }],
  uuid: "",
}));


const validateTransfer = ajv.compile(Transfer);
export const getTransferError = (tx: Transfer): string => {
  if (!validateTransfer(tx)) {
    return validateTransfer.errors.length
      ? formatErrors(validateTransfer.errors)
      : `Invalid Transfer`;
  } else {
    return "";
  }
};

const validateTransaction = ajv.compile(Transaction);
export const getTransactionError = (tx: Transaction): string => {
  if (!validateTransaction(tx)) {
    return validateTransaction.errors.length
      ? formatErrors(validateTransaction.errors)
      : `Invalid Transaction`;
  } else {
    return "";
  }
};

const validateTransactions = ajv.compile(TransactionsJson);
export const getTransactionsError = (transactionsJson: TransactionsJson): string => {
  if (!validateTransactions(transactionsJson)) {
    return validateTransactions.errors.length
      ? formatErrors(validateTransactions.errors)
      : `Invalid Transactions`;
  }
  const indexErrors = transactionsJson.map((tx, index) =>
    tx.index !== index ? `Invalid tx index, expected ${index} but got ${tx.index}` : ""
  ).filter(e => !!e);
  if (indexErrors.length) {
    return indexErrors.length < 3
      ? indexErrors.join(", ")
      : `${indexErrors[0]} (plus ${indexErrors.length - 1} more index errors)`;
  } else {
    return "";
  }
};
