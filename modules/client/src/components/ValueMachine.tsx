import { isAddress } from "@ethersproject/address";
import { isHexString } from "@ethersproject/bytes";
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
import Typography from "@material-ui/core/Typography";
import KeyboardArrowDownIcon from "@material-ui/icons/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@material-ui/icons/KeyboardArrowUp";
import ClearIcon from "@material-ui/icons/Delete";
import SyncIcon from "@material-ui/icons/Sync";
import { describeChunk, describeEvent } from "valuemachine";
import {
  AddressBook,
  Assets,
  Event,
  Events,
  HydratedEvents,
  EventTypes,
  Prices,
  Transactions,
  TransferCategories,
  ValueMachine,
} from "@valuemachine/types";
import {
  round as defaultRound,
  getEmptyValueMachine,
} from "@valuemachine/utils";
import React, { useEffect, useState } from "react";

import { HexString } from "./HexString";

const { Income, Expense, Deposit, Withdraw, Borrow, Repay } = TransferCategories;
const round = num => defaultRound(num, 4);

const useStyles = makeStyles((theme: Theme) => createStyles({
  button: {
    margin: theme.spacing(3),
  },
  paper: {
    minWidth: "500px",
    padding: theme.spacing(2),
  },
  spinner: {
    padding: "0",
  },
  importer: {
    margin: theme.spacing(4),
  },
  select: {
    margin: theme.spacing(3),
    minWidth: 160,
  },
  title: {
    margin: theme.spacing(2),
  },
  subtitle: {
    margin: theme.spacing(2),
  },
  subtable: {
    maxWidth: theme.spacing(12),
  },
}));

export const EventRow = ({
  addressBook,
  event,
}: {
  addressBook: AddressBook;
  event: Event;
}) => {
  const [open, setOpen] = useState(false);
  const classes = useStyles();

  useEffect(() => {
    if (event && open) console.log(event);
  }, [event, open]);

  const balToStr = (balances) =>
    Object.entries(balances || {}).map(([asset, bal]) => `${round(bal)} ${asset}`).join(" and ");

  const chunksToDisplay = (chunks, prefix) => {
    const output = {};
    for (const chunk of chunks) {
      const description = describeChunk(chunk);
      output[(prefix || "") + description.split(":")[0]] = description.split(":")[1];
    }
    return output;
  };

  const SimpleTable = ({
    data,
  }: {
    data: any;
  }) => {
    return (
      <Table size="small">
        <TableBody>
          {Object.entries(data).map(([key, value]: string[], i: number) => (
            <TableRow key={i}>
              <TableCell className={classes.subtable}> {key} </TableCell>
              <TableCell> {
                isHexString(value)
                  ? <HexString value={value} display={addressBook?.getName(value)}/>
                  : <Typography> {
                    typeof value === "string" ? value : JSON.stringify(value)
                  } </Typography>
              }</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <React.Fragment>
      <TableRow>
        <TableCell> {event.date.replace("T", " ").replace(".000Z", "")} </TableCell>
        <TableCell> {event.type} </TableCell>
        <TableCell> {describeEvent(event)} </TableCell>
        <TableCell onClick={() => setOpen(!open)} style={{ minWidth: "140px" }}>
          Details
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
                {`${event.category || event.type} Details`}
              </Typography>
              <SimpleTable data={

                (event.type === EventTypes.Expense) ? {
                  Account: event.account,
                  [`New Balances`]: balToStr(event.newBalances),
                  ...chunksToDisplay(event.outputs),

                } : event.type === EventTypes.Income ? {
                  Account: event.account,
                  [`New Balances`]: balToStr(event.newBalances),
                  ...chunksToDisplay(event.inputs),

                } : event.type === EventTypes.Debt ? {
                  Account: event.account,
                  [`New Balances`]: balToStr(event.newBalances),
                  ...chunksToDisplay(event.outputs, "Gave "),
                  ...chunksToDisplay(event.inputs, "Took "),

                } : event.type === EventTypes.GuardChange ? {
                  ["From"]: event.from,
                  ["From Guard"]: event.oldGuard,
                  ["To"]: event.to,
                  ["To Guard"]: event.newGuard,
                  [`New Balances`]: balToStr(event.newBalances),
                  ...chunksToDisplay(event.chunks),

                } : event.type === EventTypes.Trade ? {
                  Account: event.account,
                  [`New Balances`]: balToStr(event.newBalances),
                  ...chunksToDisplay(event.outputs, "Gave "),
                  ...chunksToDisplay(event.inputs, "Took "),
                } : {}
              }/>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </React.Fragment>
  );
};

export const ValueMachineExplorer = ({
  addressBook,
  vm,
  prices,
  setVMJson,
  transactions,
  unit,
}: {
  addressBook: AddressBook;
  vm: ValueMachine;
  prices: Prices;
  setVMJson: (vmJson: any) => void;
  transactions: Transactions;
  unit: Assets;
}) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(25);
  const [syncing, setSyncing] = useState({ transactions: false, prices: false });
  const [accounts, setAccounts] = useState([]);
  const [newTransactions, setNewTransactions] = useState([]);
  const [filterAccount, setFilterAccount] = useState("");
  const [filterAsset, setFilterAsset] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filteredEvents, setFilteredEvents] = useState([] as HydratedEvents);
  const classes = useStyles();

  useEffect(() => {
    setAccounts(vm.getAccounts());
  }, [addressBook, vm]);

  useEffect(() => {
    setNewTransactions(transactions?.json?.filter(transaction =>
      new Date(transaction.date).getTime() > new Date(vm.json.date).getTime(),
    ));

  }, [transactions, vm]);

  useEffect(() => {
    setPage(0);
    setFilteredEvents(vm.json?.events?.filter(event =>
      (!filterAsset
        || event.asset === filterAsset
        || Object.keys(event.inputs).includes(filterAsset)
        || Object.keys(event.outputs).includes(filterAsset)
        || event.newGuard === filterAsset || event.oldGuard === filterAsset
      )
      && (!filterType || event.category === filterType || event.type === filterType)
      && (!filterAccount || (event.to === filterAccount || event.from === filterAccount))
    ).sort((e1: Events, e2: Events) =>
      // Sort by date, newest first
      (e1.date > e2.date) ? -1
      : (e1.date < e2.date) ? 1
      // Then by purchase date, oldest first
      : (e1.purchaseDate > e2.purchaseDate) ? 1
      : (e1.purchaseDate < e2.purchaseDate) ? -1
      : 0
    ).map((e: Event) => vm.getEvent(e.index)) || []);
  }, [vm, filterAccount, filterAsset, filterType]);

  const handleFilterAccountChange = (event: React.ChangeEvent<{ value: string }>) => {
    setFilterAccount(event.target.value);
  };

  const handleFilterAssetChange = (event: React.ChangeEvent<{ value: string }>) => {
    setFilterAsset(event.target.value);
  };

  const handleFilterTypeChange = (event: React.ChangeEvent<{ value: string }>) => {
    setFilterType(event.target.value);
  };

  const processTxns = async () => {
    if (!addressBook) {
      console.warn("No address book", addressBook);
      return;
    }
    setSyncing(old => ({ ...old, state: true }));
    console.log(`Processing ${newTransactions?.length} new transactions`);
    let start = Date.now();
    for (const transaction of newTransactions) {
      vm.execute(transaction);
      await new Promise(res => setTimeout(res, 1)); // Yield to other pending operations
      const chunk = 100;
      if (transaction.index % chunk === 0) {
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

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  return (
    <>
      <Typography variant="h3">
        Financial Event Explorer
      </Typography>

      <Divider/>
      <Typography variant="h4" className={classes.subtitle}>
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
        Clear Events
      </Button>

      <Divider/>
      <Typography variant="h4" className={classes.subtitle}>
        Filters
      </Typography>

      <FormControl className={classes.select}>
        <InputLabel id="select-filter-account">Filter Account</InputLabel>
        <Select
          labelId="select-filter-account"
          id="select-filter-account"
          value={filterAccount || ""}
          onChange={handleFilterAccountChange}
        >
          <MenuItem value={""}>-</MenuItem>
          {accounts
            .sort((a1, a2) => a1 < a2 ? 1 : -1)
            .sort((a1, a2) => isAddress(a1) && !isAddress(a2) ? 1 : -1)
            .map((account, i) => (
              <MenuItem key={i} value={account}>
                {addressBook?.getName(account) || account}
              </MenuItem>
            ))
          }
        </Select>
      </FormControl>

      <FormControl className={classes.select}>
        <InputLabel id="select-filter-asset">Filter Asset</InputLabel>
        <Select
          labelId="select-filter-asset"
          id="select-filter-asset"
          value={filterAsset || ""}
          onChange={handleFilterAssetChange}
        >
          <MenuItem value={""}>-</MenuItem>
          {Array.from(new Set(vm.json?.events?.map(e => e.asset))).map((asset, i) => (
            <MenuItem key={i} value={asset}>{asset}</MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl className={classes.select}>
        <InputLabel id="select-filter-type">Filter Type</InputLabel>
        <Select
          labelId="select-filter-type"
          id="select-filter-type"
          value={filterType || ""}
          onChange={handleFilterTypeChange}
        >
          <MenuItem value={""}>-</MenuItem>
          {[
            Income, Expense, Deposit, Withdraw, Borrow, Repay,
            EventTypes.Trade, EventTypes.GuardChange,
          ].map((type, i) => (
            <MenuItem key={i} value={type}>{type}</MenuItem>
          ))}
        </Select>
      </FormControl>

      <Paper className={classes.paper}>

        <Typography align="center" variant="h4" className={classes.title} component="div">
          {filteredEvents.length === vm.json?.events?.length
            ? `${filteredEvents.length} Events`
            : `${filteredEvents.length} of ${vm.json?.events?.length || 0} Events`
          }
        </Typography>

        <TableContainer>
          <TablePagination
            rowsPerPageOptions={[25, 50, 100, 250]}
            component="div"
            count={filteredEvents.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong> Date </strong></TableCell>
                <TableCell><strong> Type </strong></TableCell>
                <TableCell><strong> Description </strong></TableCell>
                <TableCell><strong> Details </strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredEvents
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((event: HydratedEvents, i: number) => (
                  <EventRow
                    key={i}
                    prices={prices}
                    addressBook={addressBook}
                    event={event}
                    unit={unit}
                  />
                ))}
            </TableBody>
          </Table>
          <TablePagination
            rowsPerPageOptions={[25, 50, 100, 250]}
            component="div"
            count={filteredEvents.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </TableContainer>
      </Paper>

    </>
  );
};
