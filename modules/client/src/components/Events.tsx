import { getPrices, getState, getValueMachine } from "@finances/core";
import {
  AddressBook,
  emptyState,
  Events,
  EventTypes,
  PricesJson,
  Transactions,
} from "@finances/types";
import { math } from "@finances/utils";
import Button from "@material-ui/core/Button";
import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import CircularProgress from "@material-ui/core/CircularProgress";
import Divider from "@material-ui/core/Divider";
import FormControl from "@material-ui/core/FormControl";
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
import SyncIcon from "@material-ui/icons/Sync";
import React, { useEffect, useState } from "react";

import { store } from "../utils";

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

export const EventExplorer = ({
  addressBook,
  events,
  setEvents,
  pricesJson,
  transactions,
}: {
  addressBook: AddressBook;
  events: Events;
  setEvents: (events: any) => void;
  pricesJson: PricesJson;
  transactions: Transactions;
}) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(25);
  const [syncing, setSyncing] = useState({ transactions: false, prices: false });
  const [unitOfAccount, setUnitOfAccount] = useState("");
  const [filterAsset, setFilterAsset] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filteredEvents, setFilteredEvents] = useState([] as any);
  const classes = useStyles();

  useEffect(() => {
    console.log(`Filtering out all but ${filterAsset} assets`);
    setFilteredEvents(events.filter(event =>
      (!filterAsset || event.assetType === filterAsset)
      && (!filterType || event.type === filterType)
    ));
  }, [events, filterAsset, filterType]);

  const handleFilterAssetChange = (event: React.ChangeEvent<{ value: string }>) => {
    setFilterAsset(event.target.value);
  };

  const handleFilterTypeChange = (event: React.ChangeEvent<{ value: string }>) => {
    setFilterType(event.target.value);
  };

  const handleUnitChange = (event: React.ChangeEvent<{ value: boolean }>) => {
    console.log(`Setting unit bases on event target:`, event.target);
    setUnitOfAccount(event.target.value);
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
        const prices = getPrices({ pricesJson, store, unitOfAccount });
        const valueMachine = getValueMachine({ addressBook, prices });
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
          const chunk = 100;
          if (transaction.index % chunk === 0) {
            const diff = (Date.now() - start).toString();
            console.info(`Processed transactions ${transaction.index - chunk}-${
              transaction.index
            } in ${diff} ms`);
            // Give the UI a split sec to re-render & make the hang more bearable
            await new Promise(res => setTimeout(res, 100));
            start = Date.now();
          }
        }
        const finalState = getState({ stateJson: state, addressBook, prices });
        console.info(`\nNet Worth: ${JSON.stringify(finalState.getNetWorth(), null, 2)}`);
        console.info(`Final state: ${JSON.stringify(finalState.getAllBalances(), null, 2)}`);
        res(vmEvents.filter(e => (e.type !== EventTypes.NetWorth)));
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

      <FormControl className={classes.select}>
        <InputLabel id="select-unit-of-account-label">Unit of Account</InputLabel>
        <Select
          labelId="select-unit-of-account-label"
          id="select-unit-of-account"
          value={unitOfAccount || ""}
          onChange={handleUnitChange}
        >
          <MenuItem value={""}>-</MenuItem>
          <MenuItem value={"USD"}>USD</MenuItem>
          <MenuItem value={"INR"}>INR</MenuItem>
        </Select>
      </FormControl>

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
          {Array.from(new Set(events.map(e => e.assetType))).map((asset, i) => (
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
          {Array.from(new Set(events.map(e => e.type))).map((type, i) => (
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
                <TableCell><strong> Asset </strong></TableCell>
                <TableCell><strong> Amount </strong></TableCell>
                <TableCell><strong> Price </strong></TableCell>
                <TableCell><strong> Description </strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredEvents
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .sort((e1: Events, e2: Events) =>
                  // Sort by date, newest first
                  (e1.date > e2.date) ? -1
                    : (e1.date < e2.date) ? 1
                      // Then by purchase date, oldest first
                      : (e1.purchaseDate > e2.purchaseDate) ? 1
                        : (e1.purchaseDate < e2.purchaseDate) ? -1
                          : 0
                ).map((evt: Events, i: number) => (
                  <TableRow key={i}>
                    <TableCell> {evt.date.replace("T", " ")} </TableCell>
                    <TableCell> {evt.type} </TableCell>
                    <TableCell> {evt.assetType} </TableCell>
                    <TableCell> {math.round(evt.quantity, 4)} </TableCell>
                    <TableCell> {evt.assetPrice} </TableCell>
                    <TableCell> {evt.description} </TableCell>
                  </TableRow>
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
