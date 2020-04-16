import { TransactionData } from "@finances/types";

export const verifyTransactionData = (transaction: TransactionData): string | null => {
  if (!transaction) {
    return `Transaction is falsy: ${transaction}`;
  }

  for (const { key, type } of [
    { key: "block", type: "number" },
    { key: "data", type: "string" },
    { key: "from", type: "string" },
    { key: "gasLimit", type: "string" },
    { key: "gasPrice", type: "string" },
    { key: "gasUsed", type: "string" },
    { key: "hash", type: "string" },
    { key: "index", type: "number" },
    { key: "logs", type: "object" },
    { key: "nounce", type: "number" },
    { key: "status", type: "number" },
    { key: "timestamp", type: "string" },
    { key: "to", type: "string" },
    { key: "value", type: "string" },
  ]) {
    if (!transaction[key] || typeof transaction[key] !== type) {
      return `Transaction ${key} isn't a ${type}: ${JSON.stringify(transaction, null, 2)}`;
    }
  }

  return null;
};
