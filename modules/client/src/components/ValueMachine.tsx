import ClearIcon from "@mui/icons-material/Delete";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import {
  AddressBook,
  ChunkTable,
  EventTable,
  getEmptyValueMachine,
  SyncValueMachine,
  Transactions,
  TxTags,
  ValueMachine,
} from "valuemachine";
import React, { useState } from "react";

type ValueMachineExplorerProps = {
  addressBook: AddressBook;
  globalSyncMsg: string;
  setVMJson: (vmJson: any) => void;
  transactions: Transactions;
  txTags?: TxTags;
  setTxTags?: (val: TxTags) => void;
  vm: ValueMachine;
};
export const ValueMachineExplorer: React.FC<ValueMachineExplorerProps> = ({
  addressBook,
  globalSyncMsg,
  setVMJson,
  transactions,
  txTags,
  setTxTags,
  vm,
}: ValueMachineExplorerProps) => {
  const [tab, setTab] = useState(0);
  const handleClear = () => { setVMJson(getEmptyValueMachine()); };

  return (<>
    <Typography variant="h3">
      Core ValueMachine Data
    </Typography>

    <SyncValueMachine
      disabled={!!globalSyncMsg}
      setVMJson={setVMJson}
      transactions={transactions}
      vm={vm}
    />

    <Button
      disabled={!!globalSyncMsg || !vm?.json?.events?.length}
      onClick={handleClear}
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
