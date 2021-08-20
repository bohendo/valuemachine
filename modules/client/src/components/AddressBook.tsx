import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import Button from "@material-ui/core/Button";
import Card from "@material-ui/core/Card";
import CardHeader from "@material-ui/core/CardHeader";
import Divider from "@material-ui/core/Divider";
import Grid from "@material-ui/core/Grid";
import Typography from "@material-ui/core/Typography";
import RemoveIcon from "@material-ui/icons/Delete";
import {
  AddressEditor,
  AddressPorter,
  AddressTable,
  CsvPorter,
  CsvTable,
} from "@valuemachine/react";
import {
  AddressCategories,
  AddressEntry,
  AddressBook,
  AddressBookJson,
  Guards,
} from "@valuemachine/types";
import React, { useState } from "react";

import { CsvFile } from "../types";

const useStyles = makeStyles((theme: Theme) => createStyles({
  root: {
    margin: theme.spacing(1),
  },
  card: {
    margin: theme.spacing(1),
  },
  grid: {
    margin: theme.spacing(1),
    maxWidth: "98%",
  },
  title: {
    margin: theme.spacing(2),
  },
  button: {
    margin: theme.spacing(2),
  },
  paper: {
    padding: theme.spacing(2),
  },
}));

const getEmptyEntry = (): AddressEntry => ({
  address: "",
  category: AddressCategories.Self,
  guard: Guards.Ethereum,
  name: "",
});

type PropTypes = {
  addressBook: AddressBook,
  setAddressBookJson: (val: AddressBookJson) => void,
  csvFiles: CsvFile[],
  setCsvFiles: (val: CsvFile[]) => void,
};
export const AddressBookManager: React.FC<PropTypes> = ({
  addressBook,
  setAddressBookJson,
  csvFiles,
  setCsvFiles,
}: PropTypes) => {
  const [newEntry, setNewEntry] = useState(getEmptyEntry);
  const classes = useStyles();

  const editEntry = (address: string, editedEntry?: AddressEntry): void => {
    const newAddressBook = { ...addressBook.json }; // create new array to ensure it re-renders
    if (editedEntry) {
      if (editedEntry.address !== address) {
        delete newAddressBook[address];
      }
      newAddressBook[editedEntry.address] = editedEntry;
    } else {
      delete newAddressBook[address];
    }
    setAddressBookJson(newAddressBook);
    // Don't reset new entry fields when we modify an existing one
    if (editedEntry) {
      setNewEntry(getEmptyEntry);
    }
  };

  const addNewAddress = (editedEntry: AddressEntry) => {
    editEntry(editedEntry.address, editedEntry);
  };

  const deleteAddresses = async () => {
    setAddressBookJson({});
  };

  const deleteCsvFiles = async () => {
    setCsvFiles([]);
  };

  return (
    <div className={classes.root}>

      <Typography variant="h4" className={classes.title}>
        Manage Address Book
      </Typography>

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
              setEntry={addNewAddress}
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

      <Divider/>
      <Typography variant="h4" className={classes.title}>
        Manage CSV Files
      </Typography>

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
          <CsvTable csvFiles={csvFiles}/>
        </Grid>

      </Grid>

      <Divider/>

      <AddressTable
        addressBook={addressBook}
        setAddressBookJson={setAddressBookJson}
      />

    </div>
  );
};
