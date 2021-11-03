import {
  Asset,
  DecString,
  Transaction,
  TransactionsJson,
  Transfer,
  TransferCategories,
  TxTags,
} from "@valuemachine/types";

import { diff, lt } from "./math";
import { ajv, formatErrors } from "./validate";

export const getEmptyTransactions = (): TransactionsJson => [];

export const getEmptyTxTags = (): TxTags => ({});

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

const validateTxTags = ajv.compile(TxTags);
export const getTxTagsError = (txTags: TxTags): string => validateTxTags(txTags) ? ""
  : validateTxTags.errors.length ? formatErrors(validateTxTags.errors)
  : `Invalid TxTags: ${JSON.stringify(txTags)}`;

export const dedup = <T>(array: T[]): T[] =>
  Array.from(new Set([...array]));

// Ignores "W" prefix so that wrapped assets (eg WETH) are close to the underlying (eg ETH)
export const assetsAreClose = (asset1: Asset, asset2: Asset): boolean =>
  asset1 === asset2 || (
    asset1.startsWith("W") && asset1.substring(1) === asset2
  ) || (
    asset2.startsWith("W") && asset2.substring(1) === asset1
  );

export const valuesAreClose = (q1: DecString, q2: DecString, wiggleRoom = "0.000001") =>
  lt(diff(q1, q2), wiggleRoom);

export const chrono = (e1: Transaction, e2: Transaction): number =>
  new Date(e1.date).getTime() - new Date(e2.date).getTime();
