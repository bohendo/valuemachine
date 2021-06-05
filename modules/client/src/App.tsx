import { getAddressBook } from "@finances/core";
import {
  Assets,
  StoreKeys,
  emptyAddressBook,
} from "@finances/types";
import {
  Container,
  CssBaseline,
  Theme,
  ThemeProvider,
  createMuiTheme,
  createStyles,
  makeStyles,
} from "@material-ui/core";
import axios from "axios";
import React, { useEffect, useState } from "react";
import { Route, Switch } from "react-router-dom";

import { AddressBook } from "./components/AddressBook";
import { Dashboard } from "./components/Dashboard";
import { NavBar } from "./components/NavBar";
import { PriceManager } from "./components/Prices";
import { TaxesExplorer } from "./components/Taxes";
import { TransactionExplorer } from "./components/Transactions";
import { ValueMachineExplorer } from "./components/ValueMachine";
import { store } from "./store";

const darkTheme = createMuiTheme({
  palette: {
    primary: {
      main: "#deaa56",
    },
    secondary: {
      main: "#e699a6",
    },
    type: "dark",
  },
});

const useStyles = makeStyles((theme: Theme) => createStyles({
  appBarSpacer: theme.mixins.toolbar,
  container: {
    paddingTop: theme.spacing(4),
    paddingBottom: theme.spacing(4),
  },
  main: {
    flexGrow: 1,
    overflow: "auto",
  },
}));

const App: React.FC = () => {

  const [profile, setProfile] = useState(store.load(StoreKeys.Profile));
  const [pricesJson, setPricesJson] = useState(store.load(StoreKeys.Prices));
  const [events, setEvents] = useState(store.load(StoreKeys.Events));
  const [transactions, setTransactions] = useState(store.load(StoreKeys.Transactions));
  const [addressBook, setAddressBook] = useState(emptyAddressBook);
  const [unit, setUnit] = useState(profile.unit || Assets.ETH);
  const [state, setState] = useState(store.load(StoreKeys.State));

  const classes = useStyles();

  useEffect(() => {
    store.save(StoreKeys.Transactions, transactions);
  }, [transactions]);

  useEffect(() => {
    store.save(StoreKeys.Events, events);
  }, [events]);

  useEffect(() => {
    store.save(StoreKeys.State, state);
  }, [state]);

  useEffect(() => {
    setAddressBook(getAddressBook(profile.addressBook));
  }, [profile]);

  useEffect(() => {
    const newProfile = { ...profile, unit };
    console.log(`Saving new profile w units of ${unit}`);
    setProfile(newProfile);
    store.save(StoreKeys.Profile, newProfile);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unit]);

  useEffect(() => {
    console.log(`Saving profile with ${profile.addressBook.length} address book entries`);
    store.save(StoreKeys.Profile, profile);
    const authorization = `Basic ${btoa(`${profile.username || "anon"}:${profile.authToken}`)}`;
    axios.get("/api/auth", { headers: { authorization } }).then((authRes) => {
      if (authRes.status === 200) {
        axios.defaults.headers.common.authorization = authorization;
        console.log(`Successfully authorized with server for user ${profile.username}`);
      } else {
        console.log(`Unsuccessful authorization for user ${profile.username}`, authRes);
      }
    }).catch((err) => {
      console.warn(`Auth token "${profile.authToken}" is invalid: ${err.message}`);
    });
  }, [profile]);

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <NavBar unit={unit} setUnit={setUnit} />
      <main className={classes.main}>
        <div className={classes.appBarSpacer} />
        <Container maxWidth="lg" className={classes.container}>
          <Switch>

            <Route exact path="/">
              <Dashboard
                addressBook={addressBook}
                state={state}
              />
            </Route>

            <Route exact path="/taxes">
              <TaxesExplorer
                events={events}
              />
            </Route>

            <Route exact path="/valuemachine">
              <ValueMachineExplorer
                addressBook={addressBook}
                state={state}
                events={events}
                pricesJson={pricesJson}
                setEvents={setEvents}
                setState={setState}
                transactions={transactions}
                unit={unit}
              />
            </Route>

            <Route exact path="/prices">
              <PriceManager
                pricesJson={pricesJson}
                setPricesJson={setPricesJson}
                transactions={transactions}
                unit={unit}
              />
            </Route>

            <Route exact path="/transactions">
              <TransactionExplorer
                addressBook={addressBook}
                transactions={transactions}
                setTransactions={setTransactions}
              />
            </Route>

            <Route exact path="/profile">
              <AddressBook
                profile={profile}
                setProfile={setProfile}
              />
            </Route>

          </Switch>
        </Container>
      </main>
    </ThemeProvider>
  );
};

export default App;
