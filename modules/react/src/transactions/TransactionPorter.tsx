import { TransactionsJson } from "@valuemachine/types";
import { getTransactionsError } from "@valuemachine/utils";
import React from "react";

import { Porter } from "../utils";

type TransactionPorterProps = {
  transactions: TransactionsJson,
  setTransactions: (val: TransactionsJson) => void,
};
export const TransactionPorter: React.FC<TransactionPorterProps> = ({
  transactions,
  setTransactions,
}: TransactionPorterProps) => (
  <Porter
    data={transactions}
    setData={setTransactions}
    name="transactions"
    title="Transactions"
    getError={getTransactionsError}
  />
);
