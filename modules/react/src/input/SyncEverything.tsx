import SyncIcon from "@mui/icons-material/Sync";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import {
  AddressBook,
  CsvFiles,
  TransactionsJson,
} from "@valuemachine/types";
import React, { useState } from "react";

import { syncTxns } from "../transactions";

type SyncEverythingProps = {
  addressBook: AddressBook;
  csvFiles: CsvFiles,
  customTxns: TransactionsJson,
  setTransactionsJson: (val: TransactionsJson) => void;
};
export const SyncEverything: React.FC<SyncEverythingProps> = ({
  addressBook,
  csvFiles,
  customTxns,
  setTransactionsJson,
}: SyncEverythingProps) => {
  const [syncMsg, setSyncMsg] = useState("");

  const handleSync = async () => {
    if (syncMsg) return;
    await syncTxns(addressBook, customTxns, csvFiles, setSyncMsg, setTransactionsJson);
    // await processTxns()
    // await fetchPrices()
    // await getTaxRows()
  };

  return (
    <Button
      sx={{ mx: 2, mt: 2, mb: 1, maxWidth: 0.95  }}
      disabled={!!syncMsg}
      onClick={handleSync}
      startIcon={syncMsg ? <CircularProgress size={20} /> : <SyncIcon/>}
      variant="outlined"
    >
      {syncMsg || "Sync"}
    </Button>
  );
};
