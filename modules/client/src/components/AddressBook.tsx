import { isAddress } from "@ethersproject/address";
import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import Box from "@material-ui/core/Box";
import Button from "@material-ui/core/Button";
import Card from "@material-ui/core/Card";
import CardHeader from "@material-ui/core/CardHeader";
import Collapse from "@material-ui/core/Collapse";
import Divider from "@material-ui/core/Divider";
import FormControl from "@material-ui/core/FormControl";
import Grid from "@material-ui/core/Grid";
import IconButton from "@material-ui/core/IconButton";
import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import Paper from "@material-ui/core/Paper";
import Select from "@material-ui/core/Select";
import Snackbar from "@material-ui/core/Snackbar";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableContainer from "@material-ui/core/TableContainer";
import TableHead from "@material-ui/core/TableHead";
import TablePagination from "@material-ui/core/TablePagination";
import TableRow from "@material-ui/core/TableRow";
import TextField from "@material-ui/core/TextField";
import Typography from "@material-ui/core/Typography";
import AddIcon from "@material-ui/icons/AddCircle";
import DownloadIcon from "@material-ui/icons/GetApp";
import RemoveIcon from "@material-ui/icons/Delete";
import EditIcon from "@material-ui/icons/Edit";
import { Alert } from "@material-ui/lab";
import {
  AddressCategories,
  AddressEntry,
  AddressBookJson,
  CsvSources,
  Guards,
} from "@valuemachine/types";
import React, { useEffect, useState } from "react";

import { CsvFile } from "../types";

import { HexString } from "./HexString";

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

const EditEntry = ({
  entry,
  setEntry,
  addresses,
}: {
  entry: AddressEntry;
  setEntry: (entry: AddressEntry) => void;
  addresses: string[];
}) => {
  const [newEntry, setNewEntry] = useState({});
  const [entryModified, setEntryModified] = useState(false);
  const [newEntryError, setNewEntryError] = useState("");
  const classes = useStyles();

  useEffect(() => {
    if (!entry) return;
    setNewEntry(JSON.parse(JSON.stringify(entry)));
  }, [entry]);

  useEffect(() => {
    if (!entryModified) {
      setNewEntryError("");
    }
  }, [entryModified]);

  const getErrors = (candidate: AddressEntry): string => {
    console.log(`Checking ${addresses.length} addresses for dups.. first few: ${addresses.slice(0, 2)}`);
    if (!candidate?.address) {
      return "Address is required";
    } else if (!isAddress(candidate.address)) {
      return "Invalid address";
    } else if (addresses?.includes(candidate.address)) {
      return `Address ${
        candidate.address.substring(0,6)
      }..${
        candidate.address.substring(candidate.address.length-4)
      } already exists at index ${
        addresses?.findIndex(a => a ===candidate.address)
      }`;
    } else {
      return "";
    }
  };

  const handleEntryChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    const newNewEntry = { ...newEntry, [event.target.name]: event.target.value };
    setNewEntry(newNewEntry);
    setNewEntryError(getErrors(newNewEntry));
  };

  useEffect(() => {
    if (!addresses?.length || !entryModified) return;
    setNewEntryError(getErrors(newEntry) || "");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addresses]);

  useEffect(() => {
    if (!entry || !newEntry) {
      setEntryModified(false);
    } else if (
      newEntry.address !== entry.address ||
      newEntry.category !== entry.category ||
      newEntry.guard !== entry.guard ||
      newEntry.name !== entry.name
    ) {
      setEntryModified(true);
    } else {
      setEntryModified(false);
    }
  }, [newEntry, entry]);

  const handleSave = () => {
    if (!newEntry) return;
    const errors = getErrors(newEntry);
    if (!errors) {
      setEntry(newEntry);
    } else {
      setNewEntryError(errors);
    }
  };

  return (
    <>

      <Grid
        alignContent="center"
        alignItems="center"
        container
        spacing={1}
        className={classes.root}
      >

        <Grid item md={4}>
          <TextField
            autoComplete="off"
            value={newEntry?.name || ""}
            helperText="Give your account a nickname"
            id="name"
            fullWidth
            label="Account Name"
            margin="normal"
            name="name"
            onChange={handleEntryChange}
            variant="outlined"
          />
        </Grid>

        <Grid item md={4}>
          <FormControl className={classes.select}>
            <InputLabel id="select-new-category">Category</InputLabel>
            <Select
              labelId={`select-${entry?.address}-category`}
              id={`select-${entry?.address}-category`}
              name="category"
              value={newEntry?.category || ""}
              onChange={handleEntryChange}
            >
              <MenuItem value={""}>-</MenuItem>
              {Object.keys(AddressCategories).map((cat, i) => (
                <MenuItem key={i} value={cat}>{cat}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item md={4}>
          <FormControl className={classes.select}>
            <InputLabel id="select-new-guard">Guard</InputLabel>
            <Select
              labelId={`select-${entry?.address}-guard`}
              id={`select-${entry?.address}-guard`}
              name="guard"
              value={newEntry?.guard || Guards.Ethereum}
              onChange={handleEntryChange}
            >
              {Object.keys(Guards).map((cat, i) => (
                <MenuItem key={i} value={cat}>{cat}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item md={6}>
          <TextField
            autoComplete="off"
            value={newEntry?.address || ""}
            error={!!newEntryError}
            helperText={newEntryError || "Add your ethereum address to fetch info"}
            id="address"
            fullWidth
            label="Eth Address"
            margin="normal"
            name="address"
            onChange={handleEntryChange}
            variant="outlined"
          />
        </Grid>

        <Grid item md={6}>
          {entryModified ?
            <Grid item>
              <Button
                className={classes.button}
                color="primary"
                onClick={handleSave}
                size="small"
                startIcon={<AddIcon />}
                variant="contained"
              >
                Save Address
              </Button>
            </Grid>
            : undefined
          }
        </Grid>
      </Grid>

    </>
  );
};

const AddressRow = ({
  index,
  editEntry,
  entry,
  otherAddresses,
}: {
  index: number;
  editEntry: any;
  entry: AddressEntry;
  otherAddresses: string;
}) => {
  const [editMode, setEditMode] = useState(false);
  const [newEntry, setNewEntry] = useState({});
  const classes = useStyles();

  const toggleEditMode = () => {
    setEditMode(!editMode);
    if (editMode) {
      setNewEntry({});
    } else {
      setNewEntry(JSON.parse(JSON.stringify(entry)));
    }
  };

  const handleDelete = () => {
    editEntry(index, undefined);
    setEditMode(false);
  };

  const handleEdit = (editedEntry) => {
    editEntry(index, editedEntry);
    setEditMode(false);
  };

  return (
    <React.Fragment>
      <TableRow>
        <TableCell> {entry.name} </TableCell>
        <TableCell> {entry.category} </TableCell>
        <TableCell> {entry.guard || Guards.None} </TableCell>
        <TableCell> <HexString value={entry.address}/> </TableCell>
        <TableCell>
          <IconButton color="secondary" onClick={toggleEditMode}>
            <EditIcon />
          </IconButton>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
          <Collapse in={editMode} timeout="auto" unmountOnExit>
            <Box py={2} px={4} >
              <Typography variant="h6" gutterBottom component="div">
                Edit Address
              </Typography>

              <EditEntry
                entry={newEntry}
                setEntry={handleEdit}
                addresses={otherAddresses}
              />

              <Grid item>
                <Button
                  className={classes.button}
                  color="primary"
                  onClick={handleDelete}
                  size="small"
                  startIcon={<RemoveIcon />}
                  variant="contained"
                >
                  Delete Address
                </Button>
              </Grid>

            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </React.Fragment>
  );
};

const getEmptyEntry = (): AddressEntry => ({
  address: "",
  category: AddressCategories.Self,
  guard: Guards.Ethereum,
  name: "",
});

export const AddressBookManager = ({
  addressBook,
  setAddressBookJson,
  csvFiles,
  setCsvFiles,
}: {
  addressBook: AddressBookJson,
  setAddressBookJson: (val: AddressBookJson) => void,
  csvFiles: CsvFile[],
  setCsvFiles: (val: CsvFile[]) => void,
}) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(25);

  const [importFileType, setImportFileType] = useState("");

  const [filteredAddresses, setFilteredAddresses] = useState([]);
  const [filterCategory, setFilterCategory] = useState("");

  const [statusAlert, setStatusAlert] = useState({
    open: false,
    message: "",
    severity: "info" as "info" | "error" | "warning" | "success"
  });
  const [allAddresses, setAllAddresses] = useState([]);
  const [newEntry, setNewEntry] = useState(getEmptyEntry);
  const classes = useStyles();

  useEffect(() => {
    setAllAddresses(addressBook.addresses);
  }, [addressBook]);

  useEffect(() => {
    setFilteredAddresses(Object.values(
      addressBook.json
    ).filter(entry =>
      !filterCategory || entry.category === filterCategory
    ).sort((e1, e2) =>
      // put self addresses first
      (
        e1.category !== AddressCategories.Self &&
        e2.category === AddressCategories.Self
      ) ? 1
        : (
          e1.category === AddressCategories.Self &&
          e2.category !== AddressCategories.Self
        ) ? -1
          // sort by category
          : (e1.category.toLowerCase() > e2.category.toLowerCase()) ? 1
          : (e1.category.toLowerCase() < e2.category.toLowerCase()) ? -1
          // then sort by name
          : (e1.name.toLowerCase() > e2.name.toLowerCase()) ? 1
          : (e1.name.toLowerCase() < e2.name.toLowerCase()) ? -1
          // then sort by address
          : (e1.address.toLowerCase() > e2.address.toLowerCase()) ? 1
          : (e1.address.toLowerCase() < e2.address.toLowerCase()) ? -1
          : 0
    ));
  }, [addressBook, filterCategory]);

  const handleClose = () => {
    setStatusAlert({
      ...statusAlert,
      open: false,
    });
  };

  const handleAddressBookImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.readAsText(file);
    reader.onload = () => {
      try {
        const importedData = JSON.parse(reader.result) as any;
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

  const editEntry = (editedEntry?: AddressEntry) => {
    console.log(`Setting [${editedEntry.address}] = ${JSON.stringify(editedEntry)}`);
    const newAddressBook = { ...addressBook.json }; // create new array to ensure it re-renders
    if (editedEntry) {
      delete newAddressBook[editedEntry.address];
    } else {
      newAddressBook[editedEntry.address] = editedEntry;
    }
    setAddressBookJson(newAddressBook);
    // Don't reset new entry fields when we modify an existing one
    if (editedEntry) {
      setNewEntry(getEmptyEntry);
    }
  };

  const addNewAddress = (editedEntry: AddressEntry) => {
    editEntry(Object.keys(addressBook.json).length, editedEntry);
  };

  const deleteAddresses = async () => {
    setAddressBookJson([]);
  };

  const deleteCsvFiles = async () => {
    setCsvFiles([]);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  const handleFilterChange = (event: React.ChangeEvent<{ value: string }>) => {
    setFilterCategory(event.target.value);
    setPage(0);
  };

  const handleFileTypeChange = (event: React.ChangeEvent<{ value: boolean }>) => {
    console.log(`Setting file type based on event target:`, event.target);
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
        setCsvFiles(oldCsvFiles => oldCsvFiles.concat({
          name: file.name,
          data: importedFile,
          type: importFileType,
        }));
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
            <EditEntry
              entry={newEntry}
              setEntry={addNewAddress}
              addresses={allAddresses}
            />
          </Card>
        </Grid>

        <Grid item md={4}>
          <Card className={classes.root}>
            <CardHeader title={"Import Address Book"}/>
            <input
              className={classes.importer}
              id="profile-importer"
              accept="application/json"
              type="file"
              onChange={handleAddressBookImport}
            />
            <CardHeader title={"Export Address Book"}/>
            <Button
              className={classes.exporter}
              color="primary"
              onClick={handleExport}
              size="small"
              startIcon={<DownloadIcon />}
              variant="contained"
            >
              Download
            </Button>
          </Card>

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
      <Typography variant="h4" className={classes.subtitle}>
        Address Book Filters
      </Typography>

      <FormControl className={classes.select}>
        <InputLabel id="select-filter-category">Filter Category</InputLabel>
        <Select
          labelId="select-filter-category"
          id="select-filter-category"
          value={filterCategory || ""}
          onChange={handleFilterChange}
        >
          <MenuItem value={""}>-</MenuItem>
          {Array.from(new Set(Object.values(addressBook.json).map(e => e.category))).map(cat => (
            <MenuItem key={cat} value={cat}>{cat}</MenuItem>
          ))}
        </Select>
      </FormControl>

      <Paper className={classes.table}>

        <Typography align="center" variant="h4" className={classes.title} component="div">
          {filteredAddresses.length === Object.keys(addressBook.json).length
            ? `${filteredAddresses.length} Addresses`
            : `${filteredAddresses.length} of ${Object.keys(addressBook.json).length} Addresses`
          }
        </Typography>

        <TableContainer>
          <TablePagination
            rowsPerPageOptions={[25, 50, 100, 250]}
            component="div"
            count={filteredAddresses.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell><strong> Account name </strong></TableCell>
                <TableCell><strong> Category </strong></TableCell>
                <TableCell><strong> Guard </strong></TableCell>
                <TableCell><strong> Eth Address </strong></TableCell>
                <TableCell><strong> Edit </strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAddresses
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((entry: AddressEntry, i: number) => (
                  <AddressRow
                    otherAddresses={[...allAddresses.slice(0, i), ...allAddresses.slice(i + 1)]}
                    key={i}
                    editEntry={editEntry}
                    entry={entry}
                  />

                ))}
            </TableBody>
          </Table>
          <TablePagination
            rowsPerPageOptions={[25, 50, 100, 250]}
            component="div"
            count={filteredAddresses.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </TableContainer>
      </Paper>

      <Snackbar
        open={statusAlert.open}
        autoHideDuration={6000}j
        onClose={handleClose}
        message={statusAlert.message}
        className={classes.snackbar}
      >
        <Alert onClose={handleClose} severity={statusAlert.severity}>
          {statusAlert.message}
        </Alert>
      </Snackbar>
    </div>
  );
};
