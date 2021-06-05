import { isAddress } from "@ethersproject/address";
import { isHexString } from "@ethersproject/bytes";
import { getPrices, getState, getValueMachine } from "@finances/core";
import {
  AddressBook,
  Assets,
  emptyState,
  Event,
  Events,
  EventTypes,
  PricesJson,
  StateJson,
  Transactions,
  TransferCategories,
} from "@finances/types";
import { math } from "@finances/utils";
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
import SyncIcon from "@material-ui/icons/Sync";
import React, { useEffect, useState } from "react";

import { store } from "../store";

import { HexString } from "./HexString";

const { Income, Expense, Deposit, Withdraw, Borrow, Repay } = TransferCategories;
const { add, mul, round, sub } = math;

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
    maxWidth: theme.spacing(8),
  },
}));

export const EventRow = ({
  addressBook,
  event,
  unit,
}: {
  addressBook: AddressBook;
  event: Event;
  unit: Assets;
}) => {
  const [open, setOpen] = useState(false);
  const classes = useStyles();

  useEffect(() => {
    if (event && open) console.log(event);
  }, [event, open]);

  const balToStr = (balances, account) =>
    Object.entries(balances?.[account] || {}).map(([asset, bal]) => `${bal} ${asset}`).join(" and ");

  const swapToStr = (swaps) =>
    Object.entries(swaps || {}).map(([key, val]) => `${val} ${key}`).join(" and ");

  const chunksToDisplay = (chunks, prices) => {
    const output = {};
    for (const i in chunks) {
      const chunk = chunks[i];
      const index = parseInt(i, 10) + 1;
      output[`Chunk ${index}`] = `${chunk.quantity} ${chunk.asset}`;
      output[`Chunk ${index} Receive Date`] = chunk.receiveDate;
      output[`Chunk ${index} Receive Price`] = chunk.receivePrice;
      if (prices && prices[chunk.asset]) {
        output[`Chunk ${index} Capital Change`] = `${mul(
          chunk.quantity,
          sub(prices[chunk.asset], chunk.receivePrice),
        ).substring(0, 20)} ${unit}`;
      }
    }
    return output;
  };

  const pricesToDisplay = (prices) => {
    const output = {};
    Object.entries(prices || {}).forEach(([asset, price]) => {
      output[`${asset} Price`] = output[`${asset} Price`] || [];
      output[`${asset} Price`].push(`${math.round(price, 4)} ${unit}`);
    });
    Object.keys(output).forEach(key => {
      output[key] = output[key].join(" or ");
    });
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
                  : <Typography> {value} </Typography>
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
        <TableCell> {event.category || event.type} </TableCell>
        <TableCell> {event.description} </TableCell>
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

                (event.type === EventTypes.Transfer && event.category === Expense) ? {
                  Account: event.from,
                  ["Value"]: `${event.quantity} ${event.asset}`,
                  ["New Balance"]: event.newBalances?.[event.from][event.asset],
                  Recipient: event.to,
                } : event.type === EventTypes.Transfer && event.category === Income ? {
                  Account: event.to,
                  ["Value"]: `${event.quantity} ${event.asset}`,
                  ["New Balance"]: event.newBalances?.[event.to][event.asset],
                  Sender: event.from,

                } : event.type === EventTypes.Transfer && event.category === Deposit ? {
                  ["Value"]: `${event.quantity} ${event.asset}`,
                  Account: event.to,
                  ["New Account Balance"]: event.newBalances?.[event.to]?.[event.asset],
                  Actor: event.from,
                  ["New Actor Balance"]: event.newBalances?.from,
                } : event.type === EventTypes.Transfer && event.category === Withdraw ? {
                  ["Value"]: `${event.quantity} ${event.asset}`,
                  Account: event.from,
                  ["New Account Balance"]: event.newBalances?.[event.from]?.[event.asset],
                  Actor: event.to,
                  ["New Actor Balance"]: event.newBalances?.to,

                } : event.type === EventTypes.Transfer && event.category === Repay ? {
                  ["Value"]: `${event.quantity} ${event.asset}`,
                  Account: event.to,
                  ["New Account Balance"]: event.newBalances?.[event.to]?.[event.asset],
                  Actor: event.from,
                  ["New Actor Balance"]: event.newBalances?.[event.from]?.[event.asset],
                } : event.type === EventTypes.Transfer && event.category === Borrow ? {
                  ["Value"]: `${event.quantity} ${event.asset}`,
                  Account: event.from,
                  ["New Account Balance"]: event.newBalances?.[event.from]?.[event.asset],
                  Actor: event.to,
                  ["New Actor Balance"]: event.newBalances?.[event.to]?.[event.asset],

                } : event.type === EventTypes.JurisdictionChange ? {
                  ["Asset"]: `${event.quantity} ${event.asset}`,
                  ["From"]: event.from,
                  ["From Jurisdiction"]: event.oldJurisdiction,
                  ["From Balance"]: balToStr(event.newBalances, event.from),
                  ["To"]: event.to,
                  ["To Jurisdiction"]: event.newJurisdiction,
                  ["To Balance"]: balToStr(event.newBalances, event.to),
                  ...chunksToDisplay(event.movedChunks, event.prices),

                } : event.type === EventTypes.Trade ? {
                  ["Giver"]: event.from,
                  ["Given"]: swapToStr(event.outputs),
                  ["Taker"]: event.to,
                  ["Taken"]: swapToStr(event.inputs),
                  [`New Taker Balances`]: balToStr(event.newBalances, event.from),
                  ["Total Capital Change"]: round(event.spentChunks?.reduce((sum, chunk) => add(
                    sum,
                    mul(chunk.quantity, sub(event?.prices?.[chunk.asset], chunk.receivePrice)),
                  ), "0")),
                  ...pricesToDisplay(event.prices),
                  ...chunksToDisplay(event.spentChunks, event.prices),
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
  events,
  pricesJson,
  setEvents,
  setState,
  state,
  transactions,
  unit,
}: {
  addressBook: AddressBook;
  events: Events;
  pricesJson: PricesJson;
  setEvents: (events: any) => void;
  setState: (state: any) => void;
  state: StateJson;
  transactions: Transactions;
  unit: Assets;
}) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(25);
  const [syncing, setSyncing] = useState({ transactions: false, prices: false });
  const [filterAccount, setFilterAccount] = useState("");
  const [filterAsset, setFilterAsset] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filteredEvents, setFilteredEvents] = useState([] as any);
  const classes = useStyles();

  useEffect(() => {
    setPage(0);
    setFilteredEvents(events.filter(event =>
      (!filterAsset
        || event.asset === filterAsset
        || Object.keys(event.prices || {}).includes(filterAsset)
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
    ));
  }, [events, filterAccount, filterAsset, filterType]);

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
    // Give sync state a chance to update
    await new Promise(res => setTimeout(res, 100));
    // Process async so maybe it'll be less likely to freeze the foreground
    console.log(`Processing ${transactions.length} transactions`);
    // eslint-disable-next-line no-async-promise-executor
    const res = await new Promise(async res => {
      try {
        const prices = getPrices({ pricesJson, store, unit });
        const valueMachine = getValueMachine({ addressBook, prices, unit });
        // stringify/parse to ensure we don't update the imported objects directly
        let state = JSON.parse(JSON.stringify(emptyState));
        let vmEvents = [];
        let start = Date.now();
        for (const transaction of transactions.filter(transaction =>
          new Date(transaction.date).getTime() > new Date(state.lastUpdated).getTime(),
        )) {
          const [newState, newEvents] = valueMachine(state, transaction);
          vmEvents = vmEvents.concat(...newEvents);
          state = newState;
          // Give the UI a split sec to re-render & make the hang more bearable
          await new Promise(res => setTimeout(res, 5));
          const chunk = 100;
          if (transaction.index % chunk === 0) {
            console.info(`Processed transactions ${transaction.index - chunk}-${
              transaction.index
            } at a rate of ${Math.round((100000*chunk)/(Date.now() - start))/100} tx/sec`);
            start = Date.now();
          }
        }
        const finalState = getState({ stateJson: state, addressBook, prices });
        console.info(`\nNet Worth: ${JSON.stringify(finalState.getNetWorth(), null, 2)}`);
        console.info(`Final state: ${JSON.stringify(finalState.getAllBalances(), null, 2)}`);
        res([finalState.toJson(), vmEvents]);
      } catch (e) {
        console.log(`Failed to process transactions`);
        console.error(e);
        res([]);
      }
    });
    setState(res[0]);
    setEvents(res[1]);
    setSyncing(old => ({ ...old, state: false }));
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
        disabled={syncing.state}
        onClick={processTxns}
        startIcon={syncing.state ? <CircularProgress size={20} /> : <SyncIcon/>}
        variant="outlined"
      >
        {`Process ${transactions.length} Transactions`}
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
          {Object.keys(state?.accounts || [])
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
          {Array.from(new Set(events.map(e => e.asset))).map((asset, i) => (
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
            EventTypes.Trade, EventTypes.JurisdictionChange,
          ].map((type, i) => (
            <MenuItem key={i} value={type}>{type}</MenuItem>
          ))}
        </Select>
      </FormControl>

      <Paper className={classes.paper}>

        <Typography align="center" variant="h4" className={classes.title} component="div">
          {filteredEvents.length === events.length
            ? `${filteredEvents.length} Events`
            : `${filteredEvents.length} of ${events.length} Events`
          }
        </Typography>

        <TableContainer>
          <TablePagination
            rowsPerPageOptions={[25, 50, 100, 250]}
            component="div"
            count={filteredEvents.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onChangePage={handleChangePage}
            onChangeRowsPerPage={handleChangeRowsPerPage}
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
                .map((event: Events, i: number) => (
                  <EventRow addressBook={addressBook} key={i} event={event} unit={unit} />
                ))}
            </TableBody>
          </Table>
          <TablePagination
            rowsPerPageOptions={[25, 50, 100, 250]}
            component="div"
            count={filteredEvents.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onChangePage={handleChangePage}
            onChangeRowsPerPage={handleChangeRowsPerPage}
          />
        </TableContainer>
      </Paper>

    </>
  );
};