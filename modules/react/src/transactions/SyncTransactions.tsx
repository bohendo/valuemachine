import SyncIcon from "@mui/icons-material/Sync";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import {
  AddressBook,
  CsvFiles,
  TransactionsJson,
} from "@valuemachine/transactions";
import React, { useState } from "react";

import { syncTxns } from "./utils";

type SyncTransactionsProps = {
  addressBook: AddressBook;
  csvFiles: CsvFiles,
  customTxns: TransactionsJson,
  disabled?: boolean;
  setTransactionsJson: (val: TransactionsJson) => void;
};
export const SyncTransactions: React.FC<SyncTransactionsProps> = ({
  addressBook,
  csvFiles,
  customTxns,
  disabled,
  setTransactionsJson,
}: SyncTransactionsProps) => {
  const [syncMsg, setSyncMsg] = useState("");

  const handleSyncTxns = async () => {
    if (syncMsg) return;
    await syncTxns({
      addressBook,
      csvFiles,
      customTxns,
      setSyncMsg,
      setTransactionsJson,
    });
  };

  return (
    <Button
      disabled={disabled || !!syncMsg}
      onClick={handleSyncTxns}
      startIcon={syncMsg ? <CircularProgress size={20} /> : <SyncIcon/>}
      sx={{ m: 2, maxWidth: 0.95  }}
      variant="outlined"
    >
      {syncMsg || "Sync Transactions"}
    </Button>
  );
};
