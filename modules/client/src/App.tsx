import { getAddressBook } from "@valuemachine/transactions";
import {
  Assets,
  StoreKeys,
} from "@valuemachine/types";
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

import { AddressBookManager } from "./components/AddressBook";
import { Dashboard } from "./components/Dashboard";
import { NavBar } from "./components/NavBar";
import { PriceManager } from "./components/Prices";
import { TaxesExplorer } from "./components/Taxes";
import { TransactionExplorer } from "./components/Transactions";
import { ValueMachineExplorer } from "./components/ValueMachine";
import { store } from "./store";

// localstorage keys
const {
  AddressBook: AddressBookStore,
  Transactions: TransactionsStore,
  ValueMachine: ValueMachineStore,
  Prices: PricesStore
} = StoreKeys;
const UnitStore = "Unit";
const ApiKeyStore = "ApiKey";

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

  // Core JSON data from localstorage
  const [addressBookJson, setAddressBookJson] = useState(store.load(AddressBookStore));
  const [transactions, setTransactions] = useState(store.load(TransactionsStore));
  const [vmJson, setVMJson] = useState(store.load(ValueMachineStore));
  const [pricesJson, setPricesJson] = useState(store.load(PricesStore));
  // Extra UI-specific data from localstorage
  const [unit, setUnit] = useState(store.load(UnitStore) || Assets.ETH);
  const [apiKey, setApiKey] = useState(store.load(ApiKeyStore) || "");

  // Utilities parsed from localstorage data
  const [addressBook, setAddressBook] = useState(getAddressBook(addressBookJson));

  const classes = useStyles();

  useEffect(() => {
    console.log(`Saving transactions`, transactions);
    store.save(TransactionsStore, transactions);
  }, [transactions]);

  useEffect(() => {
    console.log(`Saving value machine`, vmJson);
    store.save(ValueMachineStore, vmJson);
  }, [vmJson]);

  useEffect(() => {
    console.log(`Saving address book`, addressBookJson);
    store.save(AddressBookStore, addressBookJson);
    setAddressBook(getAddressBook(addressBookJson));
  }, [addressBookJson]);

  useEffect(() => {
    console.log(`Saving unit`, unit);
    store.save(UnitStore, unit);
  }, [unit]);

  useEffect(() => {
    if (!apiKey) {
      console.log(`No API key available`);
      return;
    }
    const authorization = `Basic ${btoa(`anon:${apiKey}`)}`;
    axios.get("/api/auth", { headers: { authorization } }).then((authRes) => {
      if (authRes.status === 200) {
        axios.defaults.headers.common.authorization = authorization;
        console.log(`Successfully authorized with server, saving api key`);
        store.save(ApiKeyStore, apiKey);
      } else {
        console.log(`Unsuccessful authorization`, authRes);
      }
    }).catch((err) => {
      console.warn(`Auth token "${apiKey}" is invalid: ${err.message}`);
    });
  }, [apiKey]);

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
                vmJson={vmJson}
              />
            </Route>

            <Route exact path="/taxes">
              <TaxesExplorer
                addressBook={addressBook}
                vmJson={vmJson}
                pricesJson={pricesJson}
              />
            </Route>

            <Route exact path="/value-machine">
              <ValueMachineExplorer
                addressBook={addressBook}
                vmJson={vmJson}
                pricesJson={pricesJson}
                setVMJson={setVMJson}
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

            <Route exact path="/address-book">
              <AddressBookManager
                apiKey={apiKey}
                setApiKey={setApiKey}
                addressBookJson={addressBookJson}
                setAddressBookJson={setAddressBookJson}
              />
            </Route>

          </Switch>
        </Container>
      </main>
    </ThemeProvider>
  );
};

export default App;
