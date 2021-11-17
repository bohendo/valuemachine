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
  globalSyncMsg: string;
  setTransactionsJson: (val: TransactionsJson) => void;
  transactions: Transactions;
  setTxTags: (val: TxTags) => void;
  txTags?: TxTags;
};
export const TransactionExplorer: React.FC<TransactionExplorerProps> = ({
  addressBook,
  csvFiles,
  customTxns,
  globalSyncMsg,
  setTransactionsJson,
  setTxTags,
  transactions,
  txTags,
}: TransactionExplorerProps) => (<>

  <Typography variant="h3">
    Transaction Explorer
  </Typography>

  <SyncTransactions
    addressBook={addressBook}
    csvFiles={csvFiles}
    customTxns={customTxns}
    disabled={!!globalSyncMsg}
    setTransactionsJson={setTransactionsJson}
  />

  <Divider sx={{ my: 2 }} />

  <TransactionTable
    addressBook={addressBook}
    transactions={transactions}
    txTags={txTags}
    setTxTags={setTxTags}
  />

</>);
