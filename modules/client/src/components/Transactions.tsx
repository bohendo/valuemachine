import { getTransactions } from "@finances/core";
import {
  AddressBook,
  AddressCategories,
  Transaction,
  Transactions,
  TransactionsJson,
  TransactionSources,
  Transfer,
} from "@finances/types";
import { getLogger, math, sm, smeq } from "@finances/utils";
import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import Box from "@material-ui/core/Box";
import Button from "@material-ui/core/Button";
import CircularProgress from "@material-ui/core/CircularProgress";
import Collapse from "@material-ui/core/Collapse";
import Divider from "@material-ui/core/Divider";
import FormControl from "@material-ui/core/FormControl";
import IconButton from "@material-ui/core/IconButton";
import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import Paper from "@material-ui/core/Paper";
import Select from "@material-ui/core/Select";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableContainer from "@material-ui/core/TableContainer";
import TableHead from "@material-ui/core/TableHead";
import TablePagination from "@material-ui/core/TablePagination";
import TableRow from "@material-ui/core/TableRow";
import TextField from "@material-ui/core/TextField";
import Typography from "@material-ui/core/Typography";
import KeyboardArrowDownIcon from "@material-ui/icons/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@material-ui/icons/KeyboardArrowUp";
import SyncIcon from "@material-ui/icons/Sync";
import ClearIcon from "@material-ui/icons/Delete";
import React, { useEffect, useState } from "react";
import axios from "axios";

import { HexString } from "./HexString";

const useStyles = makeStyles((theme: Theme) => createStyles({
  row: {
    "& > *": {
      borderBottom: "unset",
    },
  },
  button: {
    margin: theme.spacing(3),
  },
  spinner: {
    padding: "0",
  },
  importer: {
    margin: theme.spacing(4),
  },
  selectUoA: {
    margin: theme.spacing(3),
    minWidth: 160,
  },
  title: {
    marginBottom: theme.spacing(0),
  },
  subtitle: {
    margin: theme.spacing(2),
  },
  paper: {
    minWidth: "850px",
    padding: theme.spacing(2),
  },
  dateFilter: {
    margin: theme.spacing(2),
  },
}));

type DateInput = {
  value: string;
  display: string;
  error: string;
};
const emptyDateInput = { value: "", display: "", error: "" } as DateInput;

const TransactionRow = ({
  addressBook,
  tx,
}: {
  addressBook: AddressBook;
  tx: Transaction;
}) => {
  const [open, setOpen] = useState(false);
  const classes = useStyles();
  return (
    <React.Fragment>
      <TableRow className={classes.row}>
        <TableCell> {tx.date.replace("T", " ").replace(".000Z", "")} </TableCell>
        <TableCell> {tx.description} </TableCell>
        <TableCell> {tx.hash ? <HexString value={tx.hash} /> : "N/A"} </TableCell>
        <TableCell> {tx.sources.join(", ")} </TableCell>
        <TableCell onClick={() => setOpen(!open)} style={{ minWidth: "140px" }}>
          {`${tx.transfers.length} transfer${tx.transfers.length === 1 ? "" : "s"}`}
          <IconButton aria-label="expand row" size="small" >
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box pb={2} px={4}>
              <Typography variant="h6" gutterBottom component="div">
                Transfers
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong> Category </strong></TableCell>
                    <TableCell><strong> Asset </strong></TableCell>
                    <TableCell><strong> Amount </strong></TableCell>
                    <TableCell><strong> From </strong></TableCell>
                    <TableCell><strong> To </strong></TableCell>
                    <TableCell><strong> Index </strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tx.transfers.map((transfer: Transfer, i: number) => (
                    <TableRow key={i}>
                      <TableCell> {transfer.category} </TableCell>
                      <TableCell> {transfer.assetType} </TableCell>
                      <TableCell> {math.round(transfer.quantity, 4)} </TableCell>
                      <TableCell>
                        <HexString
                          display={addressBook?.getName(transfer.from)}
                          value={transfer.from}
                        />
                      </TableCell>
                      <TableCell>
                        <HexString
                          display={addressBook?.getName(transfer.to)}
                          value={transfer.to}
                        />
                      </TableCell>
                      <TableCell> {transfer.index} </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </React.Fragment>
  );
};

export const TransactionExplorer = ({
  addressBook,
  transactions,
  setTransactions,
}: {
  addressBook: AddressBook;
  transactions: Transactions;
  setTransactions: (val: Transactions) => void;
}) => {
  const [syncing, setSyncing] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(25);

  const [filterAccount, setFilterAccount] = useState("");
  const [filterEndDate, setFilterEndDate] = useState(emptyDateInput);
  const [filterSource, setFilterSource] = useState("");
  const [filterStartDate, setFilterStartDate] = useState(emptyDateInput);

  const [filteredTxns, setFilteredTxns] = useState([] as TransactionsJson);

  const [importFileType, setImportFileType] = useState("");
  const classes = useStyles();

  useEffect(() => {
    if (filterEndDate.error || filterStartDate.error) return;
    const getDate = (timestamp: string): string =>
      (new Date(timestamp)).toISOString().split("T")[0];
    setFilteredTxns(transactions

      // Filter Start Date
      .filter(tx =>
        !filterStartDate.value
        || getDate(tx.date) >= getDate(filterStartDate.value)

      // Filter End Date
      ).filter(tx =>
        !filterEndDate.value
        || getDate(tx.date) <= getDate(filterEndDate.value)

      // Filter account
      ).filter(tx =>
        !filterAccount
        || tx.transfers.some(t => smeq(t.from, filterAccount))
        || tx.transfers.some(t => smeq(t.to, filterAccount))

      // Filter Source
      ).filter(tx =>
        !filterSource
        || (tx?.sources || []).map(sm).includes(sm(filterSource))
        || tx.transfers.some(t => sm(addressBook.getName(t.from)).startsWith(sm(filterSource)))
        || tx.transfers.some(t => sm(addressBook.getName(t.to)).startsWith(sm(filterSource)))

      // Sort by date w most recent first
      ).sort((e1: Transaction, e2: Transaction) =>
        (e1.date > e2.date) ? -1
          : (e1.date < e2.date) ? 1
            : 0

      )
    );
  }, [
    addressBook, transactions,
    filterAccount, filterSource, filterStartDate, filterEndDate,
  ]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  const changeFilterSource = (event: React.ChangeEvent<{ value: string }>) => {
    setFilterSource(event.target.value);
  };

  const changeFilterDate = (event: React.ChangeEvent<{ value: string }>) => {
    const display = event.target.value;
    let error, value;
    if (display.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/)) {
      value = display;
      error = "";
    } else if (display === "") {
      value = "";
      error = "";
    } else {
      value = "";
      error = "Format date as YYYY-MM-DD";
    }
    if (event.target.name === "filter-start-date") {
      setFilterStartDate({ display, value, error });
    } else {
      setFilterEndDate({ display, value, error });
    }
  };

  const changeFilterAccount = (event: React.ChangeEvent<{ value: string }>) => {
    setFilterAccount(event.target.value);
  };

  const handleFileTypeChange = (event: React.ChangeEvent<{ value: boolean }>) => {
    console.log(`Setting file type based on event target:`, event.target);
    setImportFileType(event.target.value);
  };

  const resetTxns = () => {
    setTransactions([]);
    console.log(`Successfully cleared tx data from localstorage`);
  };

  const syncTxns = () => {
    if (!axios.defaults.headers.common.authorization) {
      console.warn(`Auth header not set yet..`);
      return;
    }
    setSyncing(true);
    axios.post("/api/transactions", { addressBook: addressBook.json }).then((res) => {
      console.log(`Successfully fetched ${res.data?.length || 0} transactions`, res.data);
      const txMethods = getTransactions({
        addressBook,
        transactionsJson: transactions,
        logger: getLogger("info"),
      });
      txMethods.mergeTransactions(res.data);
      setTransactions([...txMethods.json]);
      setSyncing(false);
    }).catch((e) => {
      console.warn(`Failed to fetch transactions:`, e.response.data || e.message);
      setSyncing(false);
    });
  };

  const handleImport = (event: any) => {
    const file = event.target.files[0];
    console.log(`Importing file of type ${importFileType}`);
    if (!importFileType || !file) return;
    const reader = new FileReader();
    reader.readAsText(file);
    reader.onload = () => {
      try {
        const txMethods = getTransactions({
          addressBook,
          transactionsJson: transactions,
          logger: getLogger("info"),
        });
        const importedFile = reader.result as string;
        if (importFileType === "coinbase") {
          txMethods.mergeCoinbase(importedFile);
        } else if (importFileType === "digitalocean") {
          txMethods.mergeDigitalOcean(importedFile);
        } else if (importFileType === "wazirx") {
          txMethods.mergeWazirx(importedFile);
        } else if (importFileType === "wyre") {
          txMethods.mergeWyre(importedFile);
        }
        setTransactions([...txMethods.json]);
      } catch (e) {
        console.error(e);
      }
    };
  };

  return (
    <React.Fragment>

      <Typography variant="h3">
        Transaction Explorer
      </Typography>

      <Divider/>
      <Typography variant="h4" className={classes.subtitle}>
        Management
      </Typography>

      <Button
        className={classes.button}
        disabled={syncing}
        onClick={syncTxns}
        startIcon={syncing ? <CircularProgress size={20} /> : <SyncIcon/>}
        variant="outlined"
      >
        Sync Chain Data Transactions
      </Button>

      <Button
        className={classes.button}
        disabled={!transactions.length}
        onClick={resetTxns}
        startIcon={<ClearIcon/>}
        variant="outlined"
      >
        Clear Transactions
      </Button>

      <FormControl className={classes.selectUoA}>
        <InputLabel id="select-file-type-label">File Type</InputLabel>
        <Select
          labelId="select-file-type-label"
          id="select-file-type"
          value={importFileType || ""}
          onChange={handleFileTypeChange}
        >
          <MenuItem value={""}>-</MenuItem>
          <MenuItem value={"coinbase"}>Coinbase</MenuItem>
          <MenuItem value={"digitalocean"}>Digital Ocean</MenuItem>
          <MenuItem value={"wyre"}>Wyre</MenuItem>
          <MenuItem value={"wazirx"}>Wazirx</MenuItem>
        </Select>
      </FormControl>

      <input
        accept="text/csv"
        className={classes.importer}
        disabled={!importFileType}
        id="file-importer"
        onChange={handleImport}
        type="file"
      />

      <Divider/>
      <Typography variant="h4" className={classes.subtitle}>
        Filters
      </Typography>

      <FormControl className={classes.selectUoA}>
        <InputLabel id="select-filter-source">Filter Account</InputLabel>
        <Select
          labelId="select-filter-source"
          id="select-filter-source"
          value={filterAccount || ""}
          onChange={changeFilterAccount}
        >
          <MenuItem value={""}>-</MenuItem>
          {Object.values(addressBook?.json || [])
            .filter(account => account.category === AddressCategories.Self)
            .map(account => (
              <MenuItem key={account.address} value={account.address}>{account.name}</MenuItem>
            ))
          };
        </Select>
      </FormControl>

      <FormControl className={classes.selectUoA}>
        <InputLabel id="select-filter-source">Filter Source</InputLabel>
        <Select
          labelId="select-filter-source"
          id="select-filter-source"
          value={filterSource || ""}
          onChange={changeFilterSource}
        >
          <MenuItem value={""}>-</MenuItem>
          {Object.keys(TransactionSources).map(source => (
            <MenuItem key={source} value={source}>{source}</MenuItem>
          ))};
        </Select>
      </FormControl>

      <TextField
        autoComplete="off"
        className={classes.dateFilter}
        error={!!filterStartDate.error}
        helperText={filterStartDate.error || "YYYY-MM-DD"}
        id="filter-start-date"
        label="Filter Start Date"
        margin="normal"
        name="filter-start-date"
        onChange={changeFilterDate}
        value={filterStartDate.display || ""}
        variant="outlined"
      />

      <TextField
        autoComplete="off"
        className={classes.dateFilter}
        error={!!filterEndDate.error}
        helperText={filterEndDate.error || "YYYY-MM-DD"}
        id="filter-end-date"
        label="Filter End Date"
        margin="normal"
        name="filter-end-date"
        onChange={changeFilterDate}
        value={filterEndDate.display || ""}
        variant="outlined"
      />

      <Paper className={classes.paper}>

        <Typography align="center" variant="h4" className={classes.title} component="div">
          {filteredTxns.length === transactions.length
            ? `${filteredTxns.length} Transactions`
            : `${filteredTxns.length} of ${transactions.length} Transactions`
          }
        </Typography>

        <TableContainer>
          <TablePagination
            rowsPerPageOptions={[25, 50, 100, 250]}
            component="div"
            count={filteredTxns.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onChangePage={handleChangePage}
            onChangeRowsPerPage={handleChangeRowsPerPage}
          />
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell><strong> Date </strong></TableCell>
                <TableCell><strong> Description </strong></TableCell>
                <TableCell><strong> Hash </strong></TableCell>
                <TableCell><strong> Sources </strong></TableCell>
                <TableCell><strong> Transfers </strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredTxns
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((tx: Transaction, i: number) => (
                  <TransactionRow addressBook={addressBook} key={i} tx={tx} />
                ))
              }
            </TableBody>
          </Table>
          <TablePagination
            rowsPerPageOptions={[25, 50, 100, 250]}
            component="div"
            count={filteredTxns.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onChangePage={handleChangePage}
            onChangeRowsPerPage={handleChangeRowsPerPage}
          />
        </TableContainer>
      </Paper>

    </React.Fragment>
  );
};
