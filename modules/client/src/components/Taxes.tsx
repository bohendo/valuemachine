import { getAddressBook, getState, getValueMachine } from "@finances/core";
import { CapitalGainsEvent, emptyState, emptyEvents, EventTypes } from "@finances/types";
import {
  Button,
  CircularProgress,
  createStyles,
  Divider,
  FormControl,
  InputLabel,
  makeStyles,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Theme,
} from "@material-ui/core";
import {
  Sync as SyncIcon,
} from "@material-ui/icons";
import React, { useState } from "react";
import axios from "axios";

const useStyles = makeStyles((theme: Theme) => createStyles({
  button: {
    margin: theme.spacing(3),
  },
  spinner: {
    padding: "0",
  },
  selectUoA: {
    margin: theme.spacing(1),
    marginLeft: theme.spacing(3),
    minWidth: 160,
  },

}));

export const Taxes = ({
  profile,
}: {
  profile: any;
}) => {
  const [syncing, setSyncing] = useState({ transactions: false, prices: false });
  const [transactions, setTransactions] = useState([] as any);
  const [unitOfAccount, setUnitOfAccount] = useState("");
  const [capGainEvents, setCapGainEvents] = useState([] as any);
  const classes = useStyles();

  const handleUnitChange = (event: React.ChangeEvent<{ value: boolean }>) => {
    console.log(`Setting unit base on event target:`, event.target);
    setUnitOfAccount(event.target.value);
  };

  const syncTxns = () => {
    if (!axios.defaults.headers.common.authorization) {
      console.warn(`Auth header not set yet..`);
      return;
    }
    setSyncing(old => ({ ...old, transactions: true }));
    axios.get("/api/transactions").then((res) => {
      console.log(`Successfully fetched transactions`, res.data);
      setTransactions(res.data);
      setSyncing(old => ({ ...old, transactions: false }));
    }).catch(e => {
      console.log(`Failed to fetch transactions`, e);
      setSyncing(old => ({ ...old, transactions: false }));
    });
  };

  const syncPrices = () => {
    if (!axios.defaults.headers.common.authorization) {
      console.warn(`Auth header not set yet..`);
      return;
    }
    setSyncing(old => ({ ...old, prices: true }));
    axios.get("/api/prices").then((res) => {
      console.log(`Successfully fetched prices`, res.data);
      setSyncing(old => ({ ...old, prices: false }));
    }).catch(e => {
      console.log(`Failed to fetch prices`, e);
      setSyncing(old => ({ ...old, transactions: false }));
    });
  };

  const processTxns = async () => {
    setSyncing(old => ({ ...old, state: true }));
    // Give sync state a chance to update
    await new Promise(res => setTimeout(res, 200));

    // Process async so maybe it'll be less likely to freeze the foreground
    console.log(`Processing ${transactions.length} transactions`);
    // eslint-disable-next-line no-async-promise-executor
    const res = await new Promise(async res => {
      try {
        const addressBook = getAddressBook(profile.addressBook);
        const valueMachine = getValueMachine(addressBook);
        // stringify/parse to ensure we don't update the imported objects directly
        let state = JSON.parse(JSON.stringify(emptyState));
        let vmEvents = JSON.parse(JSON.stringify(emptyEvents));
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
            await new Promise(res => setTimeout(res, 200));
            start = Date.now();
          }
        }
        const finalState = getState(state, addressBook);
        console.info(`\nNet Worth: ${JSON.stringify(finalState.getNetWorth(), null, 2)}`);
        console.info(`Final state: ${JSON.stringify(finalState.getAllBalances(), null, 2)}`);
        const capGains = vmEvents.filter(e => (e.type === EventTypes.CapitalGains));
        console.log(`Found ${capGains.length} cap gains events`, capGains);
        console.log(`Done processing transactions`);
        res(capGains);
      } catch (e) {
        console.log(`Failed to process transactions`);
        console.error(e);
        res([]);
      }
    });

    setCapGainEvents(res);
    setSyncing(old => ({ ...old, state: false }));
  };

  return (
    <>
      <p>Welcome to the Taxes Page</p>

      <Divider/>

      <Button
        className={classes.button}
        disabled={syncing.prices}
        onClick={syncPrices}
        startIcon={syncing.prices ? <CircularProgress size={20} /> : <SyncIcon/>}
        variant="outlined"
      >
        Sync Prices
      </Button>

      <Button
        className={classes.button}
        disabled={syncing.transactions}
        onClick={syncTxns}
        startIcon={syncing.transactions ? <CircularProgress size={20} /> : <SyncIcon/>}
        variant="outlined"
      >
        Sync Transactions
      </Button>

      <Button
        className={classes.button}
        disabled={syncing.state}
        onClick={processTxns}
        startIcon={syncing.state ? <CircularProgress size={20} /> : <SyncIcon/>}
        variant="outlined"
      >
        Process Data
      </Button>

      <Divider/>

      <FormControl className={classes.selectUoA}>
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

      <Divider/>

      <Table>
        <TableHead>
          <TableRow>
            <TableCell> Date </TableCell>
            <TableCell> Asset </TableCell>
            <TableCell> Amount </TableCell>
            <TableCell> Purchase Date </TableCell>
            <TableCell> Purchase Price </TableCell>
            <TableCell> Sale Price </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {capGainEvents
            .filter((evt: CapitalGainsEvent) =>
              !unitOfAccount || evt.soldFor === unitOfAccount
            ).sort((e1: CapitalGainsEvent, e2: CapitalGainsEvent) =>
              // Sort by date, newest first
              (e1.date > e2.date) ? -1
                : (e1.date < e2.date) ? 1
                  // Then by purchase date, oldest first
                  : (e1.purchaseDate > e2.purchaseDate) ? 1
                    : (e1.purchaseDate < e2.purchaseDate) ? -1
                      : 0
            ).map((evt: CapitalGainsEvent, i: number) => (
              <TableRow key={i}>
                <TableCell> {evt.date} </TableCell>
                <TableCell> {evt.assetType} </TableCell>
                <TableCell> {evt.quantity} </TableCell>
                <TableCell> {evt.purchaseDate} </TableCell>
                <TableCell> {evt.purchasePrice} </TableCell>
                <TableCell> {evt.assetPrice} </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>

    </>
  );
};
