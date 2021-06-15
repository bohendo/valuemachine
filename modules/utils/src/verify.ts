import { EthTransaction, Transaction } from "@valuemachine/types";

const isSameType = (actual: any, expected: string): boolean => {
  if (typeof actual === expected) {
    return true;
  }
  if (typeof actual === "object" && JSON.stringify(actual) === expected) {
    return true;
  }
  if (
    expected.endsWith("[]") &&
    typeof actual === "object" &&
    typeof actual.length === "number" &&
    actual.every(element => expected.startsWith(typeof element))
  ) {
    return true;
  }
  if (
    expected.endsWith("?") && (
      expected.startsWith(typeof actual) || typeof actual === "undefined"
    )
  ) {
    return true;
  }
  return false;
};

const getTypeError = (target: any, key: string, expected: string | string[]): string | null => {
  if (typeof expected === "string") {
    if (!isSameType(target[key], expected)) {
      return `${key} is a ${typeof target[key]}, expected a ${expected}: ${
        JSON.stringify(target, null, 2)
      }`;
    }
  } else if (typeof expected === "object" && typeof expected.length === "number") {
    if (!expected.some(expectedType => isSameType(target[key], expectedType))) {
      return `${key} is a ${typeof target[key]}, expected one of ${expected}: ${
        JSON.stringify(target, null, 2)
      }`;
    }
  }
  return null;
};

export const getEthTransactionError = (transaction: EthTransaction): string | null => {
  if (!transaction) {
    return `Transaction is falsy: (typeof=${typeof transaction}) ${transaction}`;
  }
  for (const { key, expected } of [
    { key: "block", expected: "number" },
    { key: "data", expected: "string" },
    { key: "from", expected: "string" },
    { key: "gasPrice", expected: "string" },
    { key: "gasUsed", expected: "string" },
    { key: "hash", expected: "string" },
    { key: "index", expected: "number" },
    { key: "logs", expected: "object" },
    { key: "nonce", expected: "number" },
    { key: "status", expected: "number" },
    { key: "timestamp", expected: "string" },
    { key: "to", expected: ["string", "null"] },
    { key: "value", expected: "string" },
  ]) {
    const typeError = getTypeError(transaction, key, expected);
    if (typeError) {
      return typeError;
    }
  }
  return null;
};

export const getTransactionsError = (transactions: Transaction[]): string | null => {
  for (const transaction of transactions) {
    for (const { key, expected } of [
      { key: "date", expected: "string" },
      { key: "method", expected: "string?" },
      { key: "hash", expected: "string?" },
      { key: "index", expected: "number?" },
      { key: "sources", expected: "string[]" },
      { key: "tags", expected: "string[]" },
      { key: "transfers", expected: "object[]" },
    ]) {
      const typeError = getTypeError(transaction, key, expected);
      if (typeError) {
        return typeError;
      }
    }

    for (const transfer of transaction.transfers) {
      for (const { key, expected } of [
        { key: "asset", expected: "string" },
        { key: "category", expected: "string" },
        { key: "from", expected: "string" },
        { key: "index", expected: "number?" },
        { key: "quantity", expected: "string" },
        { key: "to", expected: "string" },
      ]) {
        const typeError = getTypeError(transfer, key, expected);
        if (typeError) {
          return typeError;
        }
      }
    }
  }

  // Make sure events are in chronological order
  let prevTime = 0;
  for (const transaction of transactions) {
    const currTime = new Date(transaction.date).getTime();
    if (currTime < prevTime) {
      return `Transactions out of order: ${transaction.date} < ${new Date(prevTime).toISOString()}`;
    }
    prevTime = currTime;
  }

  return null;
};
