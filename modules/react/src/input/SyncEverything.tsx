import SyncIcon from "@mui/icons-material/Sync";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import {
  AddressBook,
  CsvFiles,
  TransactionsJson,
  ValueMachine,
  ValueMachineJson,
} from "@valuemachine/types";
import React, { useState } from "react";

import { syncTxns } from "../transactions";
import { processTxns } from "../valuemachine";

type SyncEverythingProps = {
  addressBook: AddressBook;
  csvFiles: CsvFiles,
  customTxns: TransactionsJson,
  setTransactionsJson: (val: TransactionsJson) => void;
  setVMJson: (val: ValueMachineJson) => void;
  vm: ValueMachine;
};
export const SyncEverything: React.FC<SyncEverythingProps> = ({
  addressBook,
  csvFiles,
  customTxns,
  setTransactionsJson,
  setVMJson,
  vm,
}: SyncEverythingProps) => {
  const [syncMsg, setSyncMsg] = useState("");

  const handleSync = async () => {
    if (syncMsg) return;
    const newTxns = await syncTxns(
      addressBook,
      customTxns,
      csvFiles,
      setTransactionsJson,
      setSyncMsg,
    );
    await processTxns(vm, newTxns, setVMJson, setSyncMsg);
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
