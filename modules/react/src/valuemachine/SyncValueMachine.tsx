import SyncIcon from "@mui/icons-material/Sync";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import {
  Transactions,
  TransactionsJson,
  ValueMachine,
} from "@valuemachine/types";
import {
  getValueMachineError,
} from "@valuemachine/utils";
import React, { useEffect, useState } from "react";

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

  const processTxns = async () => {
    setSyncMsg("Starting..");
    let start = Date.now();
    for (const transaction of newTransactions) {
      if (!transaction) continue;
      vm.execute(transaction);
      const error = getValueMachineError(vm.json);
      if (error) {
        console.warn("chunks:", vm.json.chunks);
        console.warn("events:", vm.json.events);
        throw new Error(error);
      }
      const chunk = 100;
      const gauge = 10;
      if (transaction.index && transaction.index % chunk === 0) start = Date.now();
      if (transaction.index && transaction.index % chunk === gauge) {
        setSyncMsg(`Processing txns ${transaction.index - gauge}-${
          transaction.index + chunk - gauge
        } at a rate of ${Math.round((10 * 1000 * gauge)/(Date.now() - start))/10} tx/sec`);
        vm.save();
        start = Date.now();
      }
      await new Promise(res => setTimeout(res, 1)); // Yield to other pending operations
    }
    console.info(`Net Worth: ${JSON.stringify(vm.getNetWorth(), null, 2)}`);
    console.info(`Generated ${vm.json.events.length} events and ${vm.json.chunks.length} chunks`);
    setVMJson({ ...vm.json });
    setSyncMsg("");
  };

  return (
    <Button
      disabled={!!syncMsg || !newTransactions?.length}
      onClick={processTxns}
      startIcon={syncMsg ? <CircularProgress size={20} /> : <SyncIcon/>}
      sx={{ m: 3 }}
      variant="outlined"
    >
      {syncMsg || `Process ${newTransactions?.length} New Transactions`}
    </Button>
  );
};

