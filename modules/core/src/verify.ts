import { EthTransaction } from "@finances/types";

export const getEthTransactionError = (transaction: EthTransaction): string | null => {
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
    { key: "nonce", type: "number" },
    { key: "status", type: "number" },
    { key: "timestamp", type: "string" },
    { key: "to", type: ["string", "object"] },
    { key: "value", type: "string" },
  ]) {
    if (typeof type === "string") {
      if (typeof transaction[key] !== type) {
        return `${key} is a ${typeof transaction[key]}, expected a ${type}: ${
          JSON.stringify(transaction, null, 2)
        }`;
      }
    } else if (typeof type === "object" && typeof type.length === "number") {
      if (!type.includes(typeof transaction[key])) {
        return `${key} is a ${typeof transaction[key]}, expected one of ${type}: ${
          JSON.stringify(transaction, null, 2)
        }`;
      }
    }
  }
  return null;
};
