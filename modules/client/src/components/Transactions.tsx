import { getAddressBook, getTransactions } from "@finances/core";
import {
  CapitalGainsEvent,
  emptyAddressBook,
} from "@finances/types";
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
  // GetApp as ImportIcon,
} from "@material-ui/icons";
import React, { useEffect, useState } from "react";
import axios from "axios";

import { store } from "../utils";

const useStyles = makeStyles((theme: Theme) => createStyles({
  button: {
    margin: theme.spacing(3),
  },
  spinner: {
    padding: "0",
  },
  importer: {
    margin: theme.spacing(4),
  },
  selectUoA: {
    margin: theme.spacing(3),
    minWidth: 160,
  },

}));

export const Transactions = ({
  profile,
}: {
  profile: any;
}) => {
  const [syncing, setSyncing] = useState({ transactions: false, prices: false });
  const [addressBook, setAddressBook] = useState(emptyAddressBook);
  const [transactions, setTransactions] = useState([] as any);
  const [importFileType, setImportFileType] = useState("");
  const classes = useStyles();

  useEffect(() => {
    setAddressBook(getAddressBook(profile.addressBook));
  }, [profile]);

  const handleFileTypeChange = (event: React.ChangeEvent<{ value: boolean }>) => {
    console.log(`Setting file type based on event target:`, event.target);
    setImportFileType(event.target.value);
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

  const handleImport = (event: any) => {
    const file = event.target.files[0];
    console.log(`Importing file of type ${importFileType}`);
    if (!importFileType || !file) return;
    const reader = new FileReader();
    reader.readAsText(file);
    reader.onload = () => {
      try {
        const importedFile = reader.result as string;
        const txns = getTransactions({ transactionsJson: transactions, addressBook, store });
        if (importFileType === "coinbase") {
          txns.mergeCoinbase(importedFile);
        } else if (importFileType === "digitalocean") {
          txns.mergeDigitalOcean(importedFile);
        } else if (importFileType === "wazrix") {
          txns.mergeWazrix(importedFile);
        } else if (importFileType === "wyre") {
          txns.mergeWyre(importedFile);
        }
        setTransactions(txns.getAll());
      } catch (e) {
        console.error(e);
      }
    };
  };

  return (
    <>
      <p>Welcome to the Transactions Page</p>

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

      <Divider/>

      <FormControl className={classes.selectUoA}>
        <InputLabel id="select-file-type-label">File Type</InputLabel>
        <Select
          labelId="select-file-type-label"
          id="select-file-type"
          value={importFileType || ""}
          onChange={handleFileTypeChange}
        >
          <MenuItem value={""}>-</MenuItem>
          <MenuItem value={"coinbase"}>Coinbase</MenuItem>
          <MenuItem value={"digitalocean"}>Digital Ocean</MenuItem>
          <MenuItem value={"wyre"}>Wyre</MenuItem>
          <MenuItem value={"wazrix"}>Wazrix</MenuItem>
        </Select>
      </FormControl>

      <input
        accept="text/csv"
        className={classes.importer}
        disabled={!importFileType}
        id="file-importer"
        onChange={handleImport}
        type="file"
      />

      <Divider/>

      <Divider/>

      <Table>
        <TableHead>
          <TableRow>
            <TableCell> Date </TableCell>
            <TableCell> Description </TableCell>
            <TableCell> Transfers </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {transactions
            .sort((e1: CapitalGainsEvent, e2: CapitalGainsEvent) =>
              // Sort by date, newest first
              (e1.date > e2.date) ? -1
                : (e1.date < e2.date) ? 1
                  : 0
            ).map((tx: CapitalGainsEvent, i: number) => (
              <TableRow key={i}>
                <TableCell> {tx.date} </TableCell>
                <TableCell> {tx.description} </TableCell>
                <TableCell> {tx.transfers.length} </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>

    </>
  );
};
