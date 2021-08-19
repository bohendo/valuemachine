import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import Button from "@material-ui/core/Button";
import CircularProgress from "@material-ui/core/CircularProgress";
import Divider from "@material-ui/core/Divider";
import FormControl from "@material-ui/core/FormControl";
import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import Paper from "@material-ui/core/Paper";
import Select from "@material-ui/core/Select";
import Typography from "@material-ui/core/Typography";
import SyncIcon from "@material-ui/icons/Sync";
import ClearIcon from "@material-ui/icons/Delete";
import { TransactionTable } from "@valuemachine/react";
import { getTransactions } from "@valuemachine/transactions";
import {
  AddressBook,
  AddressCategories,
  Asset,
  Assets,
  CsvSource,
  Transaction,
  Transactions,
  TransactionsJson,
  TransactionSource,
  TransactionSources,
} from "@valuemachine/types";
import { getLogger } from "@valuemachine/utils";
import React, { useEffect, useState } from "react";
import axios from "axios";

import { CsvFile } from "../types";

import { InputDate } from "./InputDate";
// import { TransactionTable } from "./TransactionTable";
//

const logger = getLogger("info");

const useStyles = makeStyles((theme: Theme) => createStyles({
  button: {
    margin: theme.spacing(3),
  },
  select: {
    margin: theme.spacing(3),
    minWidth: 160,
  },
  title: {
    marginBottom: theme.spacing(0),
  },
  subtitle: {
    margin: theme.spacing(2),
  },
  paper: {
    minWidth: "850px",
    padding: "4em",
  },
}));

type PropTypes = {
  addressBook: AddressBook;
  csvFiles: CsvFile[],
  transactions: Transactions;
  setTransactionsJson: (val: TransactionsJson) => void;
};
export const TransactionExplorer: React.FC<PropTypes> = ({
  addressBook,
  csvFiles,
  transactions,
  setTransactionsJson,
}: PropTypes) => {
  const [syncing, setSyncing] = useState("");
  const [filterAccount, setFilterAccount] = useState("");
  const [filterAsset, setFilterAsset] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filteredTxns, setFilteredTxns] = useState([] as TransactionsJson);
  const [ourAssets, setOurAssets] = useState([] as Asset[]);
  const classes = useStyles();

  const hasAccount = (account: string) => (tx: Transaction): boolean =>
    !account
    || tx.transfers.some(t => t.from === account)
    || tx.transfers.some(t => t.to === account);

  const hasAsset = (asset: Asset) => (tx: Transaction): boolean =>
    !asset || tx.transfers.some(t => t.asset === asset);

  const hasSource = (source: TransactionSource) => (tx: Transaction): boolean =>
    !source
    || (tx?.sources || []).includes(source)
    || tx.transfers.some(t => addressBook.getName(t.from).startsWith(source))
    || tx.transfers.some(t => addressBook.getName(t.to).startsWith(source));

  useEffect(() => {
    const getDate = (timestamp: string): string =>
      (new Date(timestamp)).toISOString().split("T")[0];
    setFilteredTxns(transactions?.json
      .filter(tx => !filterStartDate || getDate(tx.date) >= getDate(filterStartDate))
      .filter(tx => !filterEndDate || getDate(tx.date) <= getDate(filterEndDate))
      .filter(hasAsset(filterAsset))
      .filter(hasAccount(filterAccount))
      .filter(hasSource(filterSource))
      .sort((e1: Transaction, e2: Transaction) =>
        (e1.date > e2.date) ? -1 : (e1.date < e2.date) ? 1 : 0
      )
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    addressBook, transactions,
    filterAccount, filterAsset, filterSource, filterStartDate, filterEndDate,
  ]);

  useEffect(() => {
    if (!addressBook || !transactions) return;
    setOurAssets(
      Object.keys(Assets)
        // TODO: the following line crashes the page when txns are cleared
        .filter(asset => transactions?.json?.some(hasAsset(asset)))
    );
  }, [addressBook, transactions]);

  const changeFilterSource = (event: React.ChangeEvent<{ value: unknown }>) => {
    if (typeof event.target.value !== "string") return;
    setFilterSource(event.target.value);
  };

  const changeFilterAccount = (event: React.ChangeEvent<{ value: unknown }>) => {
    if (typeof event.target.value !== "string") return;
    setFilterAccount(event.target.value);
  };

  const changeFilterAsset = (event: React.ChangeEvent<{ value: unknown }>) => {
    if (typeof event.target.value !== "string") return;
    setFilterAsset(event.target.value);
  };

  const resetTxns = () => {
    setTransactionsJson([]);
    console.log(`Successfully cleared tx data from localstorage`);
  };

  const syncTxns = async () => {
    if (syncing) return;
    // Sync Chain Data
    const newTransactions = getTransactions({ logger });
    const selfAddresses = Object.values(addressBook.json).filter(e =>
      e.category === AddressCategories.Self
    );
    if (selfAddresses?.length) {
      let isEthSynced = false;
      let isPolygonSynced = false;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        try {
          if (!isEthSynced) {
            setSyncing(`Syncing Ethereum data for ${selfAddresses.length} addresses`);
            const resEth = await axios.post("/api/ethereum", { addressBook: addressBook.json });
            console.log(`Got ${resEth.data.length} Eth transactions`);
            if (resEth.status === 200 && typeof(resEth.data) === "object") {
              newTransactions.merge(resEth.data);
              isEthSynced = true;
            } else {
              await new Promise((res) => setTimeout(res, 10000));
              continue;
            }
          }
          if (!isPolygonSynced) {
            setSyncing(`Syncing Polygon data for ${selfAddresses.length} addresses`);
            const resPolygon = await axios.post("/api/polygon", { addressBook: addressBook.json });
            console.log(`Got ${resPolygon.data.length} Polygon transactions`);
            if (resPolygon.status === 200 && typeof(resPolygon.data) === "object") {
              newTransactions.merge(resPolygon.data);
              isPolygonSynced = true;
            } else {
              await new Promise((res) => setTimeout(res, 10000));
              continue;
            }
          }
          break;
        } catch (e) {
          console.warn(e);
          await new Promise((res) => setTimeout(res, 10000));
        }
      }
    }
    if (csvFiles?.length) {
      for (const csvFile of csvFiles) {
        setSyncing(`Parsing ${
          csvFile.data.split("\n").length
        } rows of ${csvFile.type} data from ${csvFile.name}`);
        await new Promise((res) => setTimeout(res, 200)); // let sync message re-render
        newTransactions.mergeCsv(csvFile.data, csvFile.type as CsvSource);
      }
    }
    setTransactionsJson(newTransactions.json);
    setSyncing("");
  };

  return (
    <React.Fragment>

      <Typography variant="h3">
        Transaction Explorer
      </Typography>

      <Divider/>

      <Button
        className={classes.button}
        disabled={!!syncing}
        onClick={syncTxns}
        startIcon={syncing ? <CircularProgress size={20} /> : <SyncIcon/>}
        variant="outlined"
      >
        Sync Transactions
      </Button>

      <Button
        className={classes.button}
        disabled={!transactions?.json.length}
        onClick={resetTxns}
        startIcon={<ClearIcon/>}
        variant="outlined"
      >
        Clear Transactions
      </Button>

      <Typography variant="overline" className={classes.subtitle}>
        {syncing}
      </Typography>

      <Divider/>
      <Typography variant="h4" className={classes.subtitle}>
        Filters
      </Typography>

      <FormControl className={classes.select}>
        <InputLabel id="select-filter-account">Filter Account</InputLabel>
        <Select
          labelId="select-filter-account"
          id="select-filter-account"
          value={filterAccount || ""}
          onChange={changeFilterAccount}
        >
          <MenuItem value={""}>-</MenuItem>
          {Object.values(addressBook?.json || [])
            .filter(account => account.category === AddressCategories.Self)
            // TODO: the following line crashes the page when txns are cleared
            // .filter(account => transactions?.some(hasAccount(account.address)))
            .map(account => (
              <MenuItem key={account.address} value={account.address}>{account.name}</MenuItem>
            ))
          };
        </Select>
      </FormControl>

      <FormControl className={classes.select}>
        <InputLabel id="select-filter-asset">Filter Asset</InputLabel>
        <Select
          labelId="select-filter-asset"
          id="select-filter-asset"
          value={filterAsset || ""}
          onChange={changeFilterAsset}
        >
          <MenuItem value={""}>-</MenuItem>
          {ourAssets.map(asset => (
            <MenuItem key={asset} value={asset}>{asset}</MenuItem>
          )) };
        </Select>
      </FormControl>

      <FormControl className={classes.select}>
        <InputLabel id="select-filter-source">Filter Source</InputLabel>
        <Select
          labelId="select-filter-source"
          id="select-filter-source"
          value={filterSource || ""}
          onChange={changeFilterSource}
        >
          <MenuItem value={""}>-</MenuItem>
          {Object.keys(TransactionSources)
            // TODO: the following line crashes the page when txns are cleared
            // .filter(source => transactions?.some(hasSource(source)))
            .map(source => (
              <MenuItem key={source} value={source}>{source}</MenuItem>
            ))
          };
        </Select>
      </FormControl>

      <InputDate
        id="filter-end-date"
        label="Filter End Date"
        setDate={setFilterEndDate}
      />

      <InputDate
        id="filter-start-date"
        label="Filter Start Date"
        setDate={setFilterStartDate}
      />

      <Typography align="center" variant="h4" className={classes.title} component="div">
        {filteredTxns.length === transactions?.json.length
          ? `${filteredTxns.length} Transactions`
          : `${filteredTxns.length} of ${transactions?.json?.length} Transactions`
        }
      </Typography>

      <Paper className={classes?.paper || ""}>
        <TransactionTable addressBook={addressBook} transactionsJson={filteredTxns} />
      </Paper>


    </React.Fragment>
  );
};
