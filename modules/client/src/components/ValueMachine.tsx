import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import Button from "@material-ui/core/Button";
import CircularProgress from "@material-ui/core/CircularProgress";
import Divider from "@material-ui/core/Divider";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";
import Typography from "@material-ui/core/Typography";
import ClearIcon from "@material-ui/icons/Delete";
import SyncIcon from "@material-ui/icons/Sync";
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

const useStyles = makeStyles((theme: Theme) => createStyles({
  title: {
    margin: theme.spacing(2),
  },
  button: {
    margin: theme.spacing(3),
  },
  tabs: {
    margin: theme.spacing(1),
  },
}));

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
  const classes = useStyles();

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

  const handleTabChange = (event: React.ChangeEvent<{}>, newValue: number) => {
    setTab(newValue);
  };

  return (
    <>
      <Typography variant="h3">
        Financial Event Explorer
      </Typography>

      <Divider/>
      <Typography variant="h4" className={classes.title}>
        Management
      </Typography>

      <Button
        className={classes.button}
        disabled={syncing.state || !newTransactions?.length}
        onClick={processTxns}
        startIcon={syncing.state ? <CircularProgress size={20} /> : <SyncIcon/>}
        variant="outlined"
      >
        {`Process ${newTransactions?.length} New Transactions`}
      </Button>

      <Button
        className={classes.button}
        disabled={!vm?.json?.events?.length}
        onClick={handleReset}
        startIcon={<ClearIcon/>}
        variant="outlined"
      >
        Clear VM Data
      </Button>

      <Divider/>

      <Tabs value={tab} onChange={handleTabChange} className={classes.tabs} centered>
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
