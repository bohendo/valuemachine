import ClearIcon from "@mui/icons-material/Delete";
import SyncIcon from "@mui/icons-material/Sync";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import { ChunkTable, EventTable } from "@valuemachine/react";
import {
  AddressBook,
  Transactions,
  TransactionsJson,
  ValueMachine,
} from "@valuemachine/types";
import {
  getEmptyValueMachine,
  getValueMachineError,
} from "@valuemachine/utils";
import React, { useEffect, useState } from "react";

type ValueMachineExplorerProps = {
  addressBook: AddressBook;
  vm: ValueMachine;
  setVMJson: (vmJson: any) => void;
  transactions: Transactions;
};
export const ValueMachineExplorer: React.FC<ValueMachineExplorerProps> = ({
  addressBook,
  vm,
  setVMJson,
  transactions,
}: ValueMachineExplorerProps) => {
  const [tab, setTab] = useState(0);
  const [syncing, setSyncing] = useState({ transactions: false, state: false, prices: false });
  const [newTransactions, setNewTransactions] = useState([] as TransactionsJson);

  useEffect(() => {
    setNewTransactions(transactions?.json?.filter(transaction =>
      new Date(transaction.date).getTime() > new Date(vm.json.date).getTime(),
    ));
  }, [transactions, vm]);

  const processTxns = async () => {
    if (!addressBook) {
      console.warn("No address book", addressBook);
      return;
    }
    setSyncing(old => ({ ...old, state: true }));
    console.log(`Processing ${newTransactions?.length} new transactions`);
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
      await new Promise(res => setTimeout(res, 1)); // Yield to other pending operations
      const chunk = 100;
      if (transaction.index && transaction.index % chunk === 0) {
        console.info(`Processed transactions ${transaction.index - chunk}-${
          transaction.index
        } at a rate of ${Math.round((100000*chunk)/(Date.now() - start))/100} tx/sec`);
        vm.save();
        start = Date.now();
      }
    }
    console.info(`Net Worth: ${JSON.stringify(vm.getNetWorth(), null, 2)}`);
    console.info(`Generated ${vm.json.events.length} events and ${vm.json.chunks.length} chunks`);
    setVMJson({ ...vm.json });
    setSyncing(old => ({ ...old, state: false }));
  };

  const handleReset = () => {
    setVMJson(getEmptyValueMachine());
  };

  return (
    <>
      <Typography variant="h3">
        Financial Event Explorer
      </Typography>

      <Divider/>
      <Typography variant="h4" sx={{ m: 2 }}>
        Management
      </Typography>

      <Button
        disabled={syncing.state || !newTransactions?.length}
        onClick={processTxns}
        startIcon={syncing.state ? <CircularProgress size={20} /> : <SyncIcon/>}
        sx={{ m: 3 }}
        variant="outlined"
      >
        {`Process ${newTransactions?.length} New Transactions`}
      </Button>

      <Button
        disabled={!vm?.json?.events?.length}
        onClick={handleReset}
        startIcon={<ClearIcon/>}
        sx={{ m: 3 }}
        variant="outlined"
      >
        Clear VM Data
      </Button>

      <Divider/>

      <Tabs
        value={tab}
        onChange={(evt, newVal) => setTab(newVal)}
        sx={{ m: 1 }}
        centered
      >
        <Tab label="Events"/>
        <Tab label="Chunks"/>
      </Tabs>
      <div hidden={tab !== 0}>
        <EventTable addressBook={addressBook} vm={vm}/>
      </div>
      <div hidden={tab !== 1}>
        <ChunkTable addressBook={addressBook} vm={vm}/>
      </div>

    </>
  );
};
