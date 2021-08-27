import {
  Container,
  CssBaseline,
  Theme,
  ThemeProvider,
  createTheme,
  createStyles,
  makeStyles,
} from "@material-ui/core";
import {
  getPrices,
  getValueMachine,
} from "@valuemachine/core";
import {
  Assets,
  getAddressBook,
  getTransactions,
} from "@valuemachine/transactions";
import {
  StoreKeys,
} from "@valuemachine/types";
import {
  fmtAddressBook,
  getAddressBookError,
  getTransactionsError,
  getValueMachineError,
  getPricesError,
  getEmptyCsvFiles,
  getEmptyAddressBook,
  getEmptyTransactions,
  getEmptyValueMachine,
  getEmptyPrices,
  getLocalStore,
  getLogger,
} from "@valuemachine/utils";
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
  CsvFiles: CsvStore,
  Prices: PricesStore,
  Transactions: TransactionsStore,
  ValueMachine: ValueMachineStore,
} = StoreKeys;
const UnitStore = "Unit" as any;
const ThemeStore = "Theme" as any;

const lightRed = "#e699a6";
const darkRed = "#801010";

const darkTheme = createTheme({
  palette: {
    primary: {
      main: darkRed,
    },
    secondary: {
      main: lightRed,
    },
    type: "dark",
  },
});

const lightTheme = createTheme({
  palette: {
    primary: {
      main: lightRed,
    },
    secondary: {
      main: darkRed,
    },
    type: "light",
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
  const [csvFiles, setCsvFiles] = useState(store.load(CsvStore) || getEmptyCsvFiles());
  const [unit, setUnit] = useState(store.load(UnitStore) || Assets.ETH);
  const [theme, setTheme] = useState(store.load(ThemeStore) || "dark");

  // Utilities derived from localstorage data
  const [addressBook, setAddressBook] = useState(getAddressBook());
  const [transactions, setTransactions] = useState(getTransactions());
  const [vm, setVM] = useState(getValueMachine());
  const [prices, setPrices] = useState(getPrices());

  const classes = useStyles();

  useEffect(() => {
    if (!addressBookJson) return;
    if (getAddressBookError(addressBookJson)) {
      console.log(`Removing invalid address book`);
      const newAddressBookJson = getEmptyAddressBook();
      store.save(AddressBookStore, newAddressBookJson);
      setAddressBookJson(newAddressBookJson);
    } else {
      const cleanAddressBook = fmtAddressBook(addressBookJson);
      console.log(`Refreshing ${Object.keys(cleanAddressBook).length} address book entries`);
      store.save(AddressBookStore, cleanAddressBook);
      setAddressBook(getAddressBook({
        json: cleanAddressBook,
        logger
      }));
    }
  }, [addressBookJson]);

  useEffect(() => {
    if (!addressBook || !transactionsJson) return;
    if (getTransactionsError(transactionsJson)) {
      console.log(`Removing ${transactionsJson?.length || "0"} invalid transactions`);
      const newTransactionsJson = getEmptyTransactions();
      store.save(TransactionsStore, newTransactionsJson);
      setTransactionsJson(newTransactionsJson);
    } else {
      console.log(`Refreshing ${transactionsJson.length} transactions`);
      store.save(TransactionsStore, transactionsJson);
      setTransactions(getTransactions({ json: transactionsJson, store, logger }));
    }
  }, [addressBook, transactionsJson]);

  useEffect(() => {
    if (!addressBook || !vmJson) return;
    if (getValueMachineError(vmJson)) {
      console.log(`Removing invalid vm`);
      const newVMJson = getEmptyValueMachine();
      store.save(ValueMachineStore, newVMJson);
      setVMJson(newVMJson);
    } else {
      console.log(`Refreshing vm w ${
        vmJson.events?.length || "0"
      } events & ${vmJson.chunks?.length || "0"} chunks`);
      store.save(ValueMachineStore, vmJson);
      setVM(getValueMachine({ json: vmJson, logger, store }));
    }

  }, [addressBook, vmJson]);

  useEffect(() => {
    if (!pricesJson || !unit) return;
    if (getPricesError(pricesJson)) {
      console.log(`Removing ${pricesJson?.length || "0"} invalid prices`);
      const newPricesJson = getEmptyPrices();
      store.save(PricesStore, newPricesJson);
      setPricesJson(newPricesJson);
    } else {
      console.log(`Refreshing ${Object.keys(pricesJson).length} price entries`);
      store.save(PricesStore, pricesJson);
      setPrices(getPrices({ json: pricesJson, logger, store, unit }));
    }
  }, [pricesJson, unit]);

  useEffect(() => {
    if (!csvFiles?.length) return;
    console.log(`Saving ${csvFiles.length} csv files`);
    store.save(CsvStore, csvFiles);
  }, [csvFiles]);

  useEffect(() => {
    if (!unit) return;
    console.log(`Saving unit`, unit);
    store.save(UnitStore, unit);
  }, [unit]);

  useEffect(() => {
    if (!theme) return;
    console.log(`Saving theme`, theme);
    store.save(ThemeStore, theme);
  }, [theme]);

  return (
    <ThemeProvider theme={theme === "light" ? lightTheme : darkTheme}>
      <CssBaseline />
      <NavBar unit={unit} setUnit={setUnit} theme={theme} setTheme={setTheme} />
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
                setVMJson={setVMJson}
                transactions={transactions}
              />
            </Route>

            <Route exact path="/transactions">
              <TransactionExplorer
                addressBook={addressBook}
                csvFiles={csvFiles}
                transactions={transactions}
                setTransactionsJson={setTransactionsJson}
              />
            </Route>

            <Route exact path="/address-book">
              <AddressBookManager
                addressBook={addressBook}
                setAddressBookJson={setAddressBookJson}
                csvFiles={csvFiles}
                setCsvFiles={setCsvFiles}
              />
            </Route>

          </Switch>
        </Container>
      </main>
    </ThemeProvider>
  );
};

export default App;
