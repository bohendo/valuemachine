import ClearIcon from "@mui/icons-material/Delete";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import { SyncValueMachine, ChunkTable, EventTable } from "@valuemachine/react";
import {
  AddressBook,
  Transactions,
  TxTags,
  ValueMachine,
} from "@valuemachine/types";
import {
  getEmptyValueMachine,
} from "@valuemachine/utils";
import React, { useState } from "react";

type ValueMachineExplorerProps = {
  addressBook: AddressBook;
  setVMJson: (vmJson: any) => void;
  transactions: Transactions;
  txTags?: TxTags;
  setTxTags?: (val: TxTags) => void;
  vm: ValueMachine;
};
export const ValueMachineExplorer: React.FC<ValueMachineExplorerProps> = ({
  addressBook,
  setVMJson,
  transactions,
  txTags,
  setTxTags,
  vm,
}: ValueMachineExplorerProps) => {
  const [tab, setTab] = useState(0);
  const handleReset = () => { setVMJson(getEmptyValueMachine()); };
  return (<>

    <Typography variant="h3">
      Core ValueMachine Data
    </Typography>

    <SyncValueMachine
      setVMJson={setVMJson}
      transactions={transactions}
      vm={vm}
    />

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
      <EventTable addressBook={addressBook} setTxTags={setTxTags} txTags={txTags} vm={vm} />
    </div>

    <div hidden={tab !== 1}>
      <ChunkTable addressBook={addressBook} vm={vm} />
    </div>

  </>);
};
