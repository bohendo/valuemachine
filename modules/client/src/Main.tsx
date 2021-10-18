import Container from "@mui/material/Container";
import { styled } from "@mui/material/styles";
import Box from "@mui/material/Box";
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
  Transaction,
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
import { NetWorthExplorer } from "./components/NetWorth";
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
const CustomTxnsStore = "CustomTransactions" as any;

const Offset = styled("div")(({ theme }) => (theme as any)?.mixins?.toolbar);

export type MainProps = {
  theme: string;
  setTheme: (val: string) => void;
};
export const Main: React.FC<MainProps> = ({
  theme,
  setTheme,
}: MainProps) => {

  // Core JSON data from localstorage
  const [addressBookJson, setAddressBookJson] = useState(store.load(AddressBookStore));
  const [transactionsJson, setTransactionsJson] = useState(store.load(TransactionsStore));
  const [vmJson, setVMJson] = useState(store.load(ValueMachineStore));
  const [pricesJson, setPricesJson] = useState(store.load(PricesStore));
  // Extra UI-specific data from localstorage
  const [csvFiles, setCsvFiles] = useState(store.load(CsvStore) || getEmptyCsvFiles());
  const [customTxns, setCustomTxns] = useState(store.load(CustomTxnsStore) || [] as Transaction[]);
  const [unit, setUnit] = useState(store.load(UnitStore) || Assets.ETH);

  // Utilities derived from localstorage data
  const [addressBook, setAddressBook] = useState(getAddressBook());
  const [transactions, setTransactions] = useState(getTransactions());
  const [vm, setVM] = useState(getValueMachine());
  const [prices, setPrices] = useState(getPrices());

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
    if (!customTxns?.length) return;
    console.log(`Saving ${customTxns.length} custom transactions`);
    store.save(CustomTxnsStore, customTxns);
  }, [customTxns]);

  useEffect(() => {
    if (!unit) return;
    console.log(`Saving unit`, unit);
    store.save(UnitStore, unit);
  }, [unit]);

  return (
    <Box>
      <NavBar unit={unit} setUnit={setUnit} theme={theme} setTheme={setTheme} />
      <Offset/>
      <Box sx={{ overflow: "auto", flexGrow: 1 }}>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Switch>

            <Route exact path="/">
              <AddressBookManager
                addressBook={addressBook}
                setAddressBookJson={setAddressBookJson}
                csvFiles={csvFiles}
                setCsvFiles={setCsvFiles}
                customTxns={customTxns}
                setCustomTxns={setCustomTxns}
              />
            </Route>

            <Route exact path="/transactions">
              <TransactionExplorer
                addressBook={addressBook}
                csvFiles={csvFiles}
                customTxns={customTxns}
                transactions={transactions}
                setTransactionsJson={setTransactionsJson}
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

            <Route exact path="/prices">
              <PriceManager
                prices={prices}
                setPricesJson={setPricesJson}
                vm={vm}
                unit={unit}
              />
            </Route>

            <Route exact path="/net-worth">
              <NetWorthExplorer
                addressBook={addressBook}
                prices={prices}
                unit={unit}
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

          </Switch>
        </Container>
      </Box>
    </Box>
  );
};
