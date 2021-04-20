import { getAddressBook, getTransactions } from "@finances/core";
import {
  StoreKeys,
  emptyProfile,
  emptyPrices,
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
import { Taxes } from "./components/Taxes";
import { TransactionManager } from "./components/Transactions";
import { store } from "./utils/cache";

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

  const [profile, setProfile] = useState(store.load(StoreKeys.Profile) || emptyProfile);
  const [addressBook, setAddressBook] = useState(emptyAddressBook);
  const [prices, setPrices] = useState(store.load(StoreKeys.Prices) || emptyPrices);
  const [transactions, setTransactions] = useState(getTransactions(({ store })));

  const classes = useStyles();

  useEffect(() => {
    setAddressBook(getAddressBook(profile.addressBook));
  }, [profile]);

  useEffect(() => {
    console.log(`Saving profile with ${profile.addressBook.length} address book entries`);
    store.save(StoreKeys.Profile, profile);
    const authorization = `Basic ${btoa(`${profile.username}:${profile.authToken}`)}`;
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
      <NavBar />
      <main className={classes.main}>
        <div className={classes.appBarSpacer} />
        <Container maxWidth="lg" className={classes.container}>
          <Switch>

            <Route exact path="/">
              <Dashboard />
            </Route>

            <Route exact path="/profile">
              <AddressBook
                profile={profile}
                setProfile={setProfile}
              />
            </Route>

            <Route exact path="/prices">
              <PriceManager
                prices={prices}
                setPrices={setPrices}
              />
            </Route>

            <Route exact path="/transactions">
              <TransactionManager
                addressBook={addressBook}
                transactions={transactions}
                setTransactions={setTransactions}
              />
            </Route>

            <Route exact path="/taxes">
              <Taxes
                addressBook={addressBook}
                transactions={transactions}
              />
            </Route>

          </Switch>
        </Container>
      </main>
    </ThemeProvider>
  );
};

export default App;
