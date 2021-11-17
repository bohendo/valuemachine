import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import { SyncTransactions, TransactionTable } from "@valuemachine/react";
import {
  AddressBook,
  CsvFiles,
  Transactions,
  TransactionsJson,
  TxTags,
} from "@valuemachine/types";
import React from "react";

type TransactionExplorerProps = {
  addressBook: AddressBook;
  csvFiles: CsvFiles,
  customTxns: TransactionsJson,
  setTransactionsJson: (val: TransactionsJson) => void;
  transactions: Transactions;
  setTxTags: (val: TxTags) => void;
  txTags?: TxTags;
};
export const TransactionExplorer: React.FC<TransactionExplorerProps> = ({
  addressBook,
  csvFiles,
  customTxns,
  setTransactionsJson,
  setTxTags,
  transactions,
  txTags,
}: TransactionExplorerProps) => (
  <React.Fragment>

    <Typography variant="h3">
      Transaction Explorer
    </Typography>

    <SyncTransactions
      addressBook={addressBook}
      csvFiles={csvFiles}
      customTxns={customTxns}
      setTransactionsJson={setTransactionsJson}
    />

    <Divider sx={{ my: 2 }} />

    <TransactionTable
      addressBook={addressBook}
      transactions={transactions}
      txTags={txTags}
      setTxTags={setTxTags}
    />

  </React.Fragment>
);
