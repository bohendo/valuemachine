import RemoveIcon from "@mui/icons-material/Delete";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardHeader from "@mui/material/CardHeader";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import {
  AddressEditor,
  AddressPorter,
  AddressTable,
  Confirm,
  InputPorter,
  TransactionPorter,
  TransactionTable,
  CsvPorter,
  CsvTable,
  TransactionEditor,
} from "@valuemachine/react";
import {
  getTransactions,
} from "@valuemachine/transactions";
import {
  AddressBook,
  AddressBookJson,
  AddressEntry,
  CsvFiles,
  Transaction,
} from "@valuemachine/types";
import { getBlankAddressEntry, getBlankTransaction, getLogger } from "@valuemachine/utils";
import React, { useState } from "react";

const logger = getLogger("debug");

type PropTypes = {
  addressBook: AddressBook,
  setAddressBookJson: (val: AddressBookJson) => void,
  csvFiles: CsvFiles,
  setCsvFiles: (val: CsvFiles) => void,
  customTxns: Transaction[],
  setCustomTxns: (val: Transaction[]) => void,
};
export const AddressBookManager: React.FC<PropTypes> = ({
  addressBook,
  setAddressBookJson,
  csvFiles,
  setCsvFiles,
  customTxns,
  setCustomTxns,
}: PropTypes) => {
  const [confirmMsg, setConfirmMsg] = useState("");
  const [pendingDel, setPendingDel] = useState("");
  const [newEntry, setNewEntry] = useState(getBlankAddressEntry());
  const [newTransaction, setNewTransaction] = useState(getBlankTransaction());
  const [tab, setTab] = useState(0);

  const addNewEntry = (editedAddress: AddressEntry) => {
    // create new obj to ensure it re-renders
    setAddressBookJson({
      ...addressBook.json,
      [editedAddress.address]: editedAddress,
    });
    const blankEntry = getBlankAddressEntry();
    setNewEntry(blankEntry); // Reset new address editor
  };

  const deleteAddresses = () => {
    setPendingDel("addresses");
    setConfirmMsg("Are you sure you want to delete ALL address book entries?");
  };

  const deleteCsvFiles = () => {
    setPendingDel("csv");
    setConfirmMsg("Are you sure you want to delete ALL csv files?");
  };

  const deleteCustomTxns = () => {
    setPendingDel("txns");
    setConfirmMsg("Are you sure you want to delete ALL custom transactions?");
  };

  const handleDelete = () => {
    console.log(`Deleting ${pendingDel} for real this time`);
    if (!pendingDel) return;
    else if (pendingDel === "csv") setCsvFiles({});
    else if (pendingDel === "addresses") setAddressBookJson({});
    else if (pendingDel === "txns") setCustomTxns([]);
    setPendingDel("");
    setConfirmMsg("");
  };

  const addNewTransaction = (newTx: Transaction) => {
    const newCustomTxns = [...customTxns]; // create new array to ensure it re-renders
    if (newTx) newCustomTxns.push(newTx);
    newCustomTxns.sort((t1, t2) => new Date(t1.date).getTime() - new Date(t2.date).getTime());
    newCustomTxns.forEach((tx, index) => { tx.index = index; });
    setCustomTxns(newCustomTxns);
    setNewTransaction(getBlankTransaction()); // reset editor
  };

  const handleTabChange = (event: React.ChangeEvent<{}>, newValue: number) => {
    setTab(newValue);
  };

  return (<>
    <Box sx={{ m: 1 }}>

      <Typography variant="h4" sx={{ m: 2 }}>
        Manage Input Data
      </Typography>

      <Grid container justifyContent="center">
        <Grid item sm={8}>
          <InputPorter
            addressBook={addressBook.json}
            setAddressBook={setAddressBookJson}
            csvFiles={csvFiles}
            setCsvFiles={setCsvFiles}
            customTxns={customTxns}
            setCustomTxns={setCustomTxns}
          />
        </Grid>
      </Grid>

      <Tabs
        centered
        indicatorColor="secondary"
        onChange={handleTabChange}
        sx={{ m: 1 }}
        textColor="secondary"
        value={tab}
      >
        <Tab label="Evm Addresses"/>
        <Tab label="Csv Files"/>
        <Tab label="Custom Transactions"/>
      </Tabs>

      <Divider sx={{ mt: 2, mb: 1 }}/>

      <div hidden={tab !== 0}>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item md={9}>
            <Card>
              <CardHeader title={"Add new Address"} />
              <AddressEditor
                addresses={Object.values(addressBook.json).map(e => e.address)}
                entry={newEntry}
                setEntry={addNewEntry}
              />
            </Card>
          </Grid>
          <Grid item md={3}>
            <AddressPorter
              addressBook={addressBook}
              setAddressBookJson={setAddressBookJson}
            />
            <Button
              color="primary"
              disabled={!Object.keys(addressBook.json || {}).length}
              fullWidth
              onClick={deleteAddresses}
              size="medium"
              startIcon={<RemoveIcon/>}
              sx={{ mt: 1 }}
              variant="outlined"
            >
              Delete Address Book
            </Button>
          </Grid>
        </Grid>
        <AddressTable
          addressBook={addressBook}
          setAddressBookJson={setAddressBookJson}
        />
      </div>

      <div hidden={tab !== 1}>
        <Grid container spacing={2}sx={{ mb: 2 }}>
          <Grid item md={9}>
            <CsvTable csvFiles={csvFiles} setCsvFiles={setCsvFiles} />
          </Grid>
          <Grid item md={3}>
            <CsvPorter
              csvFiles={csvFiles}
              setCsvFiles={setCsvFiles}
            />
            <Button
              color="primary"
              disabled={!Object.keys(csvFiles || {}).length}
              fullWidth
              onClick={deleteCsvFiles}
              size="medium"
              startIcon={<RemoveIcon/>}
              sx={{ mt: 1 }}
              variant="outlined"
            >
              Delete Csv Files
            </Button>
          </Grid>
        </Grid>
      </div>

      <div hidden={tab !== 2}>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item md={9}>
            <Card sx={{ m: 0 }}>
              <CardHeader title={"Add new Transactions"} />
              <TransactionEditor
                setTx={addNewTransaction}
                tx={newTransaction}
              />
            </Card>
          </Grid>
          <Grid item md={3}>
            <TransactionPorter
              setTransactions={setCustomTxns}
              transactions={customTxns}
            />
            <Button
              color="primary"
              disabled={!customTxns?.length}
              fullWidth
              onClick={deleteCustomTxns}
              size="medium"
              startIcon={<RemoveIcon/>}
              sx={{ mt: 1 }}
              variant="outlined"
            >
              Delete Custom Transactions
            </Button>
          </Grid>
        </Grid>
        <TransactionTable
          addressBook={addressBook}
          setTransactions={setCustomTxns}
          transactions={getTransactions({ json: customTxns || [], logger })}
        />
      </div>

    </Box>

    <Confirm message={confirmMsg} setMessage={setConfirmMsg} action={handleDelete} />
  </>);
};
