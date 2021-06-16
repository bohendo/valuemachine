import {
  Container,
  CssBaseline,
  Theme,
  ThemeProvider,
  createMuiTheme,
  createStyles,
  makeStyles,
} from "@material-ui/core";
import {
  getAddressBook,
  getPrices,
  getTransactions,
  getValueMachine,
} from "valuemachine";
import {
  Assets,
  StoreKeys,
} from "@valuemachine/types";
import { getLocalStore, getLogger } from "@valuemachine/utils";
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

const store = getLocalStore(localStorage);
const logger = getLogger("warn");

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
  const [transactionsJson, setTransactionsJson] = useState(store.load(TransactionsStore));
  const [vmJson, setVMJson] = useState(store.load(ValueMachineStore));
  const [pricesJson, setPricesJson] = useState(store.load(PricesStore));
  // Extra UI-specific data from localstorage
  const [unit, setUnit] = useState(store.load(UnitStore) || Assets.ETH);
  const [apiKey, setApiKey] = useState(store.load(ApiKeyStore) || "");

  // Utilities derived from localstorage data
  const [addressBook, setAddressBook] = useState(getAddressBook({
    json: addressBookJson,
    logger,
  }));
  const [transactions, setTransactions] = useState(getTransactions({
    addressBook,
    json: transactionsJson,
    store,
    logger,
  }));
  const [vm, setVM] = useState(getValueMachine({
    addressBook,
    json: vmJson,
    logger,
    store,
  }));
  const [prices, setPrices] = useState(getPrices({
    store,
    logger,
    json: pricesJson,
    unit
  }));

  const classes = useStyles();

  useEffect(() => {
    if (!addressBookJson) return;
    console.log(`Refreshing ${addressBookJson.length} address book entries`);
    store.save(AddressBookStore, addressBookJson);
    setAddressBook(getAddressBook({
      json: addressBookJson,
      logger
    }));
  }, [addressBookJson]);

  useEffect(() => {
    if (!addressBook || !transactionsJson) return;
    console.log(`Refreshing ${transactionsJson.length} transactions`);
    store.save(TransactionsStore, transactionsJson);
    setTransactions(getTransactions({
      addressBook,
      json: transactionsJson,
      store,
      logger,
    }));
  }, [addressBook, transactionsJson]);

  useEffect(() => {
    if (!addressBook || !vmJson) return;
    console.log(`Refreshing ${vmJson.events.length} value machine events`);
    console.log(`Refreshing ${vmJson.chunks.length} value machine chunks`);
    store.save(ValueMachineStore, vmJson);
    setVM(getValueMachine({
      addressBook,
      json: vmJson,
      logger,
      store,
    }));
  }, [addressBook, vmJson]);

  useEffect(() => {
    if (!pricesJson || !unit) return;
    console.log(`Refreshing ${Object.keys(pricesJson).length} price entries`);
    store.save(PricesStore, pricesJson);
    setPrices(getPrices({
      json: pricesJson,
      logger,
      store,
      unit
    }));
  }, [pricesJson, unit]);

  useEffect(() => {
    if (!unit) return;
    console.log(`Saving unit`, unit);
    store.save(UnitStore, unit);
  }, [unit]);

  useEffect(() => {
    if (!apiKey) return;
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
                vm={vm}
              />
            </Route>

            <Route exact path="/taxes">
              <TaxesExplorer
                addressBook={addressBook}
                vm={vm}
                prices={prices}
              />
            </Route>

            <Route exact path="/prices">
              <PriceManager
                prices={prices}
                setPricesJson={setPricesJson}
                vm={vm}
                unit={unit}
              />
            </Route>

            <Route exact path="/value-machine">
              <ValueMachineExplorer
                addressBook={addressBook}
                vm={vm}
                prices={prices}
                setVMJson={setVMJson}
                transactions={transactions}
                unit={unit}
              />
            </Route>

            <Route exact path="/transactions">
              <TransactionExplorer
                addressBook={addressBook}
                transactions={transactions}
                setTransactions={setTransactionsJson}
              />
            </Route>

            <Route exact path="/address-book">
              <AddressBookManager
                apiKey={apiKey}
                setApiKey={setApiKey}
                addressBook={addressBook}
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
