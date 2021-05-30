import { getPrices, getState, getValueMachine } from "@finances/core";
import {
  AddressBook,
  Assets,
  emptyState,
  Event,
  Events,
  EventTypes,
  PricesJson,
  Transactions,
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

}));

const SimpleTable = ({
  data,
}: {
  data: any;
}) => {
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell><strong> Key </strong></TableCell>
          <TableCell><strong> Value </strong></TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {Object.entries(data).map(([key, value]: string[], i: number) => (
          <TableRow key={i}>
            <TableCell> {key} </TableCell>
            <TableCell> {value} </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

const EventRow = ({
  event,
}: {
  event: Event;
}) => {
  const [open, setOpen] = useState(false);
  const swapToStr = (swaps) =>
    Object.entries(swaps || {}).map(([key, val]) => `${val} ${key}`).join(" and ");
  const pricesToDisplay = (prices) => {
    const output = {};
    const targets = new Set();
    Object.entries(prices || {}).forEach(([unit, entry]) => {
      Object.entries(entry || {}).forEach(([asset, price]) => {
        targets.add(asset);
        output[`${asset} Price`] = output[`${asset} Price`] || [];
        output[`${asset} Price`].push(`${math.round(price, 4)} ${unit}`);
      });
    });
    Object.keys(output).forEach(key => {
      output[key] = output[key].join(" or ");
    });
    return output;
  };
  return (
    <React.Fragment>
      <TableRow>
        <TableCell> {event.date.replace("T", " ").replace(".000Z", "")} </TableCell>
        <TableCell> {event.type} </TableCell>
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
                {`${event.type} Details`}
              </Typography>
              <SimpleTable data={
                event.type === EventTypes.Expense ? {
                  Asset: event.asset,
                  Amount: math.round(event.quantity, 4),
                  Recipient: event.to,
                } : event.type === EventTypes.Income ? {
                  Asset: event.asset,
                  Amount: math.round(event.quantity, 4),
                  Source: event.from,
                } : [EventTypes.CapitalLoss, EventTypes.CapitalGains].includes(event.type) ? {
                  asset: event.asset,
                  amount: math.round(event.quantity, 4),
                  purchaseDate: event.purchaseDate.replace("T", " ").replace(".000Z", ""),
                  purchasePrice: event.purchasePrice,
                  saleDate: event.date.replace("T", " ").replace(".000Z", ""),
                  salePrice: event.assetPrice,
                } : event.type === EventTypes.Trade ? {
                  ["Exact Give"]: swapToStr(event.swapsOut),
                  ["Exact Take"]: swapToStr(event.swapsIn),
                  ...pricesToDisplay(event.prices),
                } : {}
              }/>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </React.Fragment>
  );
};

export const EventExplorer = ({
  addressBook,
  events,
  setEvents,
  pricesJson,
  transactions,
  unit,
}: {
  addressBook: AddressBook;
  events: Events;
  setEvents: (events: any) => void;
  pricesJson: PricesJson;
  transactions: Transactions;
  unit: Assets;
}) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(25);
  const [syncing, setSyncing] = useState({ transactions: false, prices: false });
  const [filterAsset, setFilterAsset] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filteredEvents, setFilteredEvents] = useState([] as any);
  const classes = useStyles();

  useEffect(() => {
    setFilteredEvents(events.filter(event =>
      (!filterAsset || event.asset === filterAsset)
      && (!filterType || event.type === filterType)
    ).sort((e1: Events, e2: Events) =>
      // Sort by date, newest first
      (e1.date > e2.date) ? -1
        : (e1.date < e2.date) ? 1
          // Then by purchase date, oldest first
          : (e1.purchaseDate > e2.purchaseDate) ? 1
            : (e1.purchaseDate < e2.purchaseDate) ? -1
              : 0

    ));
  }, [events, filterAsset, filterType]);

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
        res(vmEvents);
      } catch (e) {
        console.log(`Failed to process transactions`);
        console.error(e);
        res([]);
      }
    });
    setEvents(res);
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
          {Object.keys(EventTypes).map((type, i) => (
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
                  <EventRow key={i} event={event} />
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
