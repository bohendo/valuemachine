import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import Button from "@material-ui/core/Button";
import Card from "@material-ui/core/Card";
import CardHeader from "@material-ui/core/CardHeader";
import Divider from "@material-ui/core/Divider";
import Grid from "@material-ui/core/Grid";
import Tab from "@material-ui/core/Tab";
import Tabs from "@material-ui/core/Tabs";
import Typography from "@material-ui/core/Typography";
import RemoveIcon from "@material-ui/icons/Delete";
import {
  AddressEditor,
  AddressPorter,
  AddressTable,
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

const useStyles = makeStyles((theme: Theme) => createStyles({
  root: {
    margin: theme.spacing(1),
  },
  card: {
    margin: theme.spacing(1),
  },
  grid: {
    marginBottom: theme.spacing(1),
  },
  divider: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(1),
  },
  title: {
    margin: theme.spacing(2),
  },
  button: {
    margin: theme.spacing(2),
  },
  tabs: {
    margin: theme.spacing(1),
  },
}));

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
  const [newEntry, setNewEntry] = useState(getBlankAddressEntry());
  const [newTransaction, setNewTransaction] = useState(getBlankTransaction());
  const [tab, setTab] = useState(0);
  const classes = useStyles();


  const addNewEntry = (editedAddress: AddressEntry) => {
    // create new obj to ensure it re-renders
    setAddressBookJson({
      ...addressBook.json,
      [editedAddress.address]: editedAddress,
    });
    const blankEntry = getBlankAddressEntry();
    setNewEntry(blankEntry); // Reset new address editor
  };

  const deleteAddresses = async () => {
    setAddressBookJson({});
  };

  const deleteCsvFiles = async () => {
    setCsvFiles([]);
  };

  const addNewTransaction = (newTx: Transaction) => {
    const newCustomTxns = [...customTxns]; // create new array to ensure it re-renders
    if (newTx) newCustomTxns.push(newTx);
    newCustomTxns.sort((t1, t2) => new Date(t1.date).getTime() - new Date(t2.date).getTime());
    newCustomTxns.forEach((tx, index) => { tx.index = index; });
    setCustomTxns(newCustomTxns);
    setNewTransaction(getBlankTransaction()); // reset editor
  };

  const deleteCustomTxns = async () => {
    setCustomTxns([]);
  };

  const handleTabChange = (event: React.ChangeEvent<{}>, newValue: number) => {
    setTab(newValue);
  };

  return (
    <div className={classes.root}>

      <Typography variant="h4" className={classes.title}>
        Manage Input Data
      </Typography>

      <Tabs value={tab} onChange={handleTabChange} className={classes.tabs} centered>
        <Tab label="Evm Addresses"/>
        <Tab label="Csv Files"/>
        <Tab label="Custom Transactions"/>
      </Tabs>

      <Divider className={classes.divider}/>

      <div hidden={tab !== 0}>
        <Grid
          alignContent="center"
          alignItems="center"
          justifyContent="center"
          container
          spacing={1}
          className={classes.grid}
        >
          <Grid item md={8}>
            <Card className={classes.card}>
              <CardHeader title={"Add new Address"} />
              <AddressEditor
                entry={newEntry}
                setEntry={addNewEntry}
                addresses={Object.values(addressBook.json).map(e => e.address)}
              />
            </Card>
          </Grid>
          <Grid item md={4}>
            <AddressPorter
              addressBook={addressBook}
              setAddressBookJson={setAddressBookJson}
            />
            <Button
              className={classes.button}
              color="primary"
              onClick={deleteAddresses}
              size="medium"
              disabled={!Object.keys(addressBook.json || {}).length}
              startIcon={<RemoveIcon/>}
              variant="contained"
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

        <Grid
          alignContent="center"
          justifyContent="center"
          container
          spacing={1}
          className={classes.grid}
        >
          <Grid item md={6}>
            <CsvPorter
              csvFiles={csvFiles}
              setCsvFiles={setCsvFiles}
            />
            <Button
              className={classes.button}
              color="primary"
              onClick={deleteCsvFiles}
              size="medium"
              disabled={!csvFiles?.length}
              startIcon={<RemoveIcon/>}
              variant="contained"
            >
              Delete Csv Files
            </Button>
          </Grid>
          <Grid item md={6}>
            <CsvTable csvFiles={csvFiles} setCsvFiles={setCsvFiles}/>
          </Grid>
        </Grid>

      </div>
      <div hidden={tab !== 2}>

        <Card className={classes.card}>
          <CardHeader title={"Add new Transaction"} />
          <TransactionEditor
            tx={newTransaction}
            setTx={addNewTransaction}
          />
        </Card>

        <Button
          className={classes.button}
          color="primary"
          onClick={deleteCustomTxns}
          size="medium"
          disabled={!customTxns?.length}
          startIcon={<RemoveIcon/>}
          variant="contained"
        >
          Delete Custom Txns
        </Button>

        <TransactionTable
          addressBook={addressBook}
          transactions={getTransactions({ json: customTxns || [], logger })}
          setTransactions={setCustomTxns}
        />

      </div>

    </div>
  );
};
