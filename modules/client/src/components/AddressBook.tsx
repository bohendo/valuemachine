import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import Button from "@material-ui/core/Button";
import Card from "@material-ui/core/Card";
import CardHeader from "@material-ui/core/CardHeader";
import Divider from "@material-ui/core/Divider";
import FormControl from "@material-ui/core/FormControl";
import Grid from "@material-ui/core/Grid";
import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import Paper from "@material-ui/core/Paper";
import Select from "@material-ui/core/Select";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableContainer from "@material-ui/core/TableContainer";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import Typography from "@material-ui/core/Typography";
import DownloadIcon from "@material-ui/icons/GetApp";
import RemoveIcon from "@material-ui/icons/Delete";
import { AddressEditor, AddressPorter, AddressTable } from "@valuemachine/react";
import {
  AddressCategories,
  AddressEntry,
  AddressBook,
  AddressBookJson,
  CsvSources,
  Guards,
} from "@valuemachine/types";
import React, { useEffect, useState } from "react";

import { CsvFile } from "../types";

const useStyles = makeStyles((theme: Theme) => createStyles({
  root: {
    margin: theme.spacing(1),
    maxWidth: "98%",
  },
  divider: {
    marginBottom: theme.spacing(2),
    marginTop: theme.spacing(2),
  },
  select: {
    margin: theme.spacing(3),
    minWidth: 160,
  },
  input: {
    margin: theme.spacing(1),
    minWidth: 120,
    maxWidth: 300,
  },
  exporter: {
    marginBottom: theme.spacing(4),
    marginLeft: theme.spacing(4),
    marginRight: theme.spacing(4),
    marginTop: theme.spacing(0),
  },
  importer: {
    marginBottom: theme.spacing(1),
    marginLeft: theme.spacing(4),
    marginRight: theme.spacing(4),
    marginTop: theme.spacing(0),
  },
  syncing: {
    marginTop: theme.spacing(4),
    marginLeft: theme.spacing(4),
    marginRight: theme.spacing(4),
  },
  snackbar: {
    width: "100%"
  },
  button: {
    marginBottom: theme.spacing(1.5),
    marginLeft: theme.spacing(2),
    marginRight: theme.spacing(2),
  },
  title: {
    margin: theme.spacing(2),
  },
  subtitle: {
    margin: theme.spacing(2),
  },
  deleteAll: {
    margin: theme.spacing(2),
  },
  paper: {
    padding: theme.spacing(2),
  },
  table: {
    minWidth: "600px",
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
  const [importFileType, setImportFileType] = useState("");
  const [newEntry, setNewEntry] = useState(getEmptyEntry);
  const classes = useStyles();

  const handleAddressBookImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.readAsText(file);
    reader.onload = () => {
      try {
        if (!reader.result) return;
        const importedData = JSON.parse(reader.result as string) as any;
        const importedAddresses = importedData.addressBook
          ? importedData.addressBook
          : importedData;
        if (!importedAddresses?.length) {
          throw new Error("Imported file does not contain an address book");
        }
        console.log(`File with an address book has been loaded:`, importedAddresses);
        const newAddressBook = { ...addressBook.json }; // create new array to ensure it re-renders
        importedAddresses.forEach(entry => {
          newAddressBook[entry.address] = entry;
        });
        setAddressBookJson(newAddressBook);
      } catch (e) {
        console.error(e);
      }
    };
  };

  const handleExport = () => {
    const output = JSON.stringify({ addressBook: addressBook.json }, null, 2);
    const data = `text/json;charset=utf-8,${encodeURIComponent(output)}`;
    const a = document.createElement("a");
    a.href = "data:" + data;
    a.download = "addressBook.json";
    a.click();
  };

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

  const handleFileTypeChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    if (typeof event.target.value !== "string") return;
    console.log(`Setting file type based on event target:`, event.target.value);
    setImportFileType(event.target.value);
  };

  const handleCsvFileImport = (event: any) => {
    const file = event.target.files[0];
    console.log(`Importing ${importFileType} file`, file);
    if (!importFileType || !file) return;
    const reader = new FileReader();
    reader.readAsText(file);
    reader.onload = () => {
      try {
        const importedFile = reader.result as string;
        console.log(`Imported ${file.name}`);
        setCsvFiles([...csvFiles, {
          name: file.name,
          data: importedFile,
          type: importFileType,
        }] as CsvFile[]);
      } catch (e) {
        console.error(e);
      }
    };
  };

  return (
    <div className={classes.root}>

      <Typography variant="h4" className={classes.subtitle}>
        Manage Address Book
      </Typography>

      <Grid
        alignContent="center"
        alignItems="center"
        justifyContent="center"
        container
        spacing={1}
        className={classes.root}
      >

        <Grid item md={8}>
          <Card className={classes.root}>
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
            className={classes.deleteAll}
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
      <Typography variant="h4" className={classes.subtitle}>
        Manage CSV Files
      </Typography>

      <Grid
        alignContent="center"
        justifyContent="center"
        container
        spacing={1}
        className={classes.root}
      >

        <Grid item md={6}>
          <Card className={classes.root}>
            <CardHeader title={"Import CSV File"}/>
            <FormControl className={classes.select}>
              <InputLabel id="select-file-type-label">File Type</InputLabel>
              <Select
                labelId="select-file-type-label"
                id="select-file-type"
                value={importFileType || ""}
                onChange={handleFileTypeChange}
              >
                <MenuItem value={""}>-</MenuItem>
                <MenuItem value={CsvSources.Coinbase}>{CsvSources.Coinbase}</MenuItem>
                <MenuItem value={CsvSources.DigitalOcean}>{CsvSources.DigitalOcean}</MenuItem>
                <MenuItem value={CsvSources.Wyre}>{CsvSources.Wyre}</MenuItem>
                <MenuItem value={CsvSources.Wazirx}>{CsvSources.Wazirx}</MenuItem>
              </Select>
            </FormControl>
            <input
              accept="text/csv"
              className={classes.importer}
              disabled={!importFileType}
              id="file-importer"
              onChange={handleCsvFileImport}
              type="file"
            />
          </Card>

          <Button
            className={classes.deleteAll}
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

          <Paper className={classes.paper}>
            <Typography align="center" variant="h4" className={classes.title} component="div">
              {`${csvFiles.length} CSV Files`}
            </Typography>
            {csvFiles.length ? (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong> File Name </strong></TableCell>
                      <TableCell><strong> File Type </strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {csvFiles.map((csvFile: { name: string; type: string; data: string }, i) => (
                      <TableRow key={i}>
                        <TableCell><strong> {csvFile.name.toString()} </strong></TableCell>
                        <TableCell><strong> {csvFile.type.toString()} </strong></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : null}
          </Paper>

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
