import Container from "@mui/material/Container";
import Box from "@mui/material/Box";
import {
  getPrices,
  getValueMachine,
} from "@valuemachine/core";
import {
  Assets,
  PhysicalGuards,
  getAddressBook,
  getTransactions,
} from "@valuemachine/transactions";
import {
  IncomeTypes,
  StoreKeys,
  Transaction,
} from "@valuemachine/types";
import {
  fmtAddressBook,
  getAddressBookError,
  getCsvFilesError,
  getEmptyAddressBook,
  getEmptyCsvFiles,
  getEmptyPrices,
  getEmptyTaxInput,
  getEmptyTaxRows,
  getEmptyTransactions,
  getEmptyTxTags,
  getEmptyValueMachine,
  getLocalStore,
  getLogger,
  getPricesError,
  getTaxInputError,
  getTaxRowsError,
  getTransactionsError,
  getTxTagsError,
  getValueMachineError,
} from "@valuemachine/utils";
import React, { useEffect, useState } from "react";
import { Route, Routes } from "react-router-dom";

import { InputDataManager } from "./components/InputData";
import { NetWorthExplorer } from "./components/NetWorth";
import { NavBar } from "./components/NavBar";
import { PriceManager } from "./components/Prices";
import { TaxesExplorer } from "./components/Taxes";
import { TransactionExplorer } from "./components/Transactions";
import { ValueMachineExplorer } from "./components/ValueMachine";

const logger = getLogger("warn");
const store = getLocalStore(localStorage);

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
const TaxInputStore = "TaxInput" as any;
const TxTagsStore = "TxTags" as any;
const TaxRowsStore = "TaxRows" as any;

export type AppProps = {
  theme: string;
  setTheme: (val: string) => void;
};
export const App: React.FC<AppProps> = ({
  theme,
  setTheme,
}: AppProps) => {

  // Core JSON data from localstorage
  const [addressBookJson, setAddressBookJson] = useState(store.load(AddressBookStore));
  const [transactionsJson, setTransactionsJson] = useState(store.load(TransactionsStore));
  const [vmJson, setVMJson] = useState(store.load(ValueMachineStore));
  const [pricesJson, setPricesJson] = useState(store.load(PricesStore));
  // Extra UI-specific data from localstorage
  const [csvFiles, setCsvFiles] = useState(store.load(CsvStore) || getEmptyCsvFiles());
  const [customTxns, setCustomTxns] = useState(store.load(CustomTxnsStore) || [] as Transaction[]);
  const [unit, setUnit] = useState(store.load(UnitStore) || Assets.ETH);
  const [taxInput, setTaxInput] = useState(store.load(TaxInputStore) || getEmptyTaxInput());
  const [txTags, setTxTags] = useState(store.load(TxTagsStore) || getEmptyTxTags());
  const [taxRows, setTaxRows] = useState(store.load(TaxRowsStore) || getEmptyTaxRows());
  const [globalSyncMsg, setGlobalSyncMsg] = useState("");

  // Utilities derived from localstorage data
  const [addressBook, setAddressBook] = useState(getAddressBook());
  const [transactions, setTransactions] = useState(getTransactions());
  const [vm, setVM] = useState(getValueMachine());
  const [prices, setPrices] = useState(getPrices());

  useEffect(() => {
    if (!addressBookJson) return;
    const error = getAddressBookError(addressBookJson);
    if (error) {
      console.log(`Removing invalid address book: ${error}`);
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
    if (!transactionsJson) return;
    const error = getTransactionsError(transactionsJson);
    if (error) {
      console.log(`Removing ${transactionsJson?.length || "0"} invalid transactions: ${error}`);
      const newTransactionsJson = getEmptyTransactions();
      store.save(TransactionsStore, newTransactionsJson);
      setTransactionsJson(newTransactionsJson);
    } else {
      console.log(`Refreshing ${transactionsJson.length} transactions`);
      store.save(TransactionsStore, transactionsJson);
      setTransactions(getTransactions({ json: transactionsJson, store, logger }));
    }
  }, [transactionsJson]);

  useEffect(() => {
    if (!vmJson) return;
    const error = getValueMachineError(vmJson);
    if (error) {
      console.log(`Removing invalid vm: ${error}`);
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

  }, [vmJson]);

  useEffect(() => {
    if (!pricesJson || !unit) return;
    const error = getPricesError(pricesJson);
    if (error) {
      console.log(`Removing ${pricesJson?.length || "0"} invalid prices: ${error}`);
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
    if (!csvFiles) return;
    const error = getCsvFilesError(csvFiles);
    if (error) {
      console.log(`Removing invalid csv files: ${error}`);
      const newCsvFiles = getEmptyCsvFiles();
      store.save(CsvStore, newCsvFiles);
      setCsvFiles(newCsvFiles);
    } else {
      console.log(`Saving ${csvFiles.length} csv files`);
      store.save(CsvStore, csvFiles);
    }
  }, [csvFiles]);

  useEffect(() => {
    if (!customTxns) return;
    // Migrate old data types
    customTxns.forEach(tx => { if ("tags" in tx) delete tx.tags; });
    customTxns.forEach(tx => { tx.tag = "tag" in tx ? tx.tag : {}; });
    const error = getTransactionsError(customTxns);
    if (error) {
      console.log(`Removing ${customTxns?.length || "0"} invalid custom transactions: ${error}`);
      const newCustomTxns = getEmptyTransactions();
      store.save(CustomTxnsStore, newCustomTxns);
      setCustomTxns(newCustomTxns);
    } else {
      console.log(`Saving ${customTxns.length} custom transactions`);
      store.save(CustomTxnsStore, customTxns);
    }
  }, [customTxns]);

  useEffect(() => {
    if (!unit) return;
    console.log(`Saving unit`, unit);
    store.save(UnitStore, unit);
  }, [unit]);

  useEffect(() => {
    if (!taxInput) return;
    const error = getTaxInputError(taxInput);
    if (error) {
      console.log(`Removing invalid tax input: ${error}`);
      const newTaxInput = getEmptyTaxInput();
      store.save(TaxInputStore, newTaxInput);
      setTaxInput(newTaxInput);
    } else {
      console.log(`Saving valid tax input`);
      store.save(TaxInputStore, taxInput);
    }
  }, [taxInput]);

  useEffect(() => {
    if (!txTags) return;
    const error = getTxTagsError(txTags);
    if (error) {
      console.log(`Removing invalid tx tags: ${error}`);
      const newTxTags = getEmptyTxTags();
      store.save(TxTagsStore, newTxTags);
      setTxTags(newTxTags);
    } else {
      Object.keys(txTags).forEach(txId => {
        const tag = txTags[txId];
        // Convert depreciated values to the new ones
        if (tag.incomeType === "SelfEmployed") { tag.incomeType = IncomeTypes.Business; }
        if (tag.physicalGuard === "None") { tag.physicalGuard = PhysicalGuards.IDK; }
      });
      console.log(`Saving ${Object.keys(txTags).length} valid tx tags`);
      store.save(TxTagsStore, txTags);
    }
  }, [txTags]);

  useEffect(() => {
    if (!taxRows) return;
    const error = getTaxRowsError(taxRows);
    if (error) {
      console.log(`Removing invalid tax rows: ${error}`);
      const newTaxRows = getEmptyTaxRows();
      store.save(TaxRowsStore, newTaxRows);
      setTaxRows(newTaxRows);
    } else {
      console.log(`Saving ${taxRows.length} valid tax rows`);
      store.save(TaxRowsStore, taxRows);
    }
  }, [taxRows]);

  return (
    <Box>
      <NavBar
        addressBook={addressBook}
        csvFiles={csvFiles}
        customTxns={customTxns}
        prices={prices}
        setPricesJson={setPricesJson}
        setSyncMsg={setGlobalSyncMsg}
        setTaxRows={setTaxRows}
        setTheme={setTheme}
        setTransactionsJson={setTransactionsJson}
        setUnit={setUnit}
        setVMJson={setVMJson}
        syncMsg={globalSyncMsg}
        theme={theme}
        txTags={txTags}
        unit={unit}
        vm={vm}
      />
      <Box sx={{ overflow: "auto", flexGrow: 1 }}>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Routes>

            <Route path="/" element={
              <InputDataManager
                addressBook={addressBook}
                setAddressBookJson={setAddressBookJson}
                csvFiles={csvFiles}
                setCsvFiles={setCsvFiles}
                customTxns={customTxns}
                setCustomTxns={setCustomTxns}
                taxInput={taxInput}
                setTaxInput={setTaxInput}
                txTags={txTags}
                setTxTags={setTxTags}
              />
            } />

            <Route path="/transactions" element={
              <TransactionExplorer
                addressBook={addressBook}
                csvFiles={csvFiles}
                customTxns={customTxns}
                globalSyncMsg={globalSyncMsg}
                setTransactionsJson={setTransactionsJson}
                setTxTags={setTxTags}
                transactions={transactions}
                txTags={txTags}
              />
            } />

            <Route path="/value-machine" element={
              <ValueMachineExplorer
                addressBook={addressBook}
                globalSyncMsg={globalSyncMsg}
                setTxTags={setTxTags}
                setVMJson={setVMJson}
                transactions={transactions}
                txTags={txTags}
                vm={vm}
              />
            } />

            <Route path="/prices" element={
              <PriceManager
                globalSyncMsg={globalSyncMsg}
                prices={prices}
                setPricesJson={setPricesJson}
                unit={unit}
                vm={vm}
              />
            } />

            <Route path="/net-worth" element={
              <NetWorthExplorer
                addressBook={addressBook}
                prices={prices}
                unit={unit}
                vm={vm}
              />
            } />

            <Route path="/taxes" element={
              <TaxesExplorer
                addressBook={addressBook}
                globalSyncMsg={globalSyncMsg}
                prices={prices}
                setTaxRows={setTaxRows}
                setTxTags={setTxTags}
                taxInput={taxInput}
                taxRows={taxRows}
                txTags={txTags}
                unit={unit}
                vm={vm}
              />
            } />

          </Routes>
        </Container>
      </Box>
    </Box>
  );
};
