import {
  getAddressBook,
  getState,
  getValueMachine,
} from "@finances/core";
import {
  StoreKeys,
} from "@finances/types";
import {
  Button,
  CircularProgress,
  Divider,
  createStyles,
  makeStyles,
  Theme,
} from "@material-ui/core";
import {
  Sync as SyncIcon,
} from "@material-ui/icons";
import React, { useState } from "react";
import axios from "axios";

import { store } from "../utils";

const useStyles = makeStyles((theme: Theme) => createStyles({
  button: {
    margin: theme.spacing(1),
  },
  spinner: {
    padding: "0",
  }
}));

export const Taxes = ({
  profile,
}: {
  profile: any;
}) => {
  const [syncing, setSyncing] = useState({ transactions: false, prices: false });
  const [transactions, setTransactions] = useState([] as any);
  const classes = useStyles();

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
    });
  };

  const processTxns = () => {
    setSyncing(old => ({ ...old, state: true }));
    console.log(`Started processing ${transactions.length} transactions`);

    try {
      const addressBook = getAddressBook(profile.addressBook);
      const valueMachine = getValueMachine(addressBook);
      let state = store.load(StoreKeys.State);
      let vmEvents = store.load(StoreKeys.Events);
      let start = Date.now();
      for (const transaction of transactions.filter(
        transaction => new Date(transaction.date).getTime() > new Date(state.lastUpdated).getTime(),
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
          start = Date.now();
        }
      }
      store.save(StoreKeys.State, state);
      store.save(StoreKeys.Events, vmEvents);

      const finalState = getState(state, addressBook);

      console.debug(`Final state: ${JSON.stringify(finalState.getAllBalances(), null, 2)}`);
      console.info(`\nNet Worth: ${JSON.stringify(finalState.getNetWorth(), null, 2)}`);
      console.info(`\nAccount balances: ${JSON.stringify(finalState.getAllBalances(), null, 2)}`);

      console.log(`Done processing transactions`);

    } catch (e) {
      console.log(`Failed to process transactions`);
      console.error(e);
    }

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

      <pre>
        {JSON.stringify(transactions[0], null, 2)}
      </pre>

      <Divider/>

      <pre>
        {JSON.stringify(transactions[1], null, 2)}
      </pre>
    </>
  );
};
