import SyncIcon from "@mui/icons-material/Sync";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import {
  Transactions,
  TransactionsJson,
  ValueMachine,
} from "@valuemachine/types";
import React, { useEffect, useState } from "react";

import { processTxns } from "./utils";

type SyncValueMachineProps = {
  setVMJson: (vmJson: any) => void;
  transactions: Transactions;
  vm: ValueMachine;
};
export const SyncValueMachine: React.FC<SyncValueMachineProps> = ({
  setVMJson,
  transactions,
  vm,
}: SyncValueMachineProps) => {
  const [syncMsg, setSyncMsg] = useState("");
  const [newTransactions, setNewTransactions] = useState([] as TransactionsJson);

  useEffect(() => {
    setNewTransactions(transactions?.json?.filter(transaction =>
      new Date(transaction.date).getTime() > new Date(vm.json.date).getTime(),
    ));
  }, [transactions, vm]);

  const handleTxProcessing = async () => {
    if (syncMsg) return;
    await processTxns(vm, transactions.json, setVMJson, setSyncMsg);
  };

  return (
    <Button
      disabled={!!syncMsg || !newTransactions?.length}
      onClick={handleTxProcessing}
      startIcon={syncMsg ? <CircularProgress size={20} /> : <SyncIcon/>}
      sx={{ m: 3 }}
      variant="outlined"
    >
      {syncMsg || `Process ${newTransactions?.length} New Transactions`}
    </Button>
  );
};

