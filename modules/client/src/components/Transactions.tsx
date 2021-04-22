import { getTransactions } from "@finances/core";
import {
  AddressBook,
  CapitalGainsEvent,
  Transactions,
  TransactionsJson,
  TransactionSources,
  Transfer,
} from "@finances/types";
import { getLogger, math, sm } from "@finances/utils";
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
  Typography,
} from "@material-ui/core";
import {
  Sync as SyncIcon,
  Delete as ClearIcon,
  // GetApp as ImportIcon,
} from "@material-ui/icons";
import React, { useEffect, useState } from "react";
import axios from "axios";

import { HexString } from "./HexString";

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

export const TransactionManager = ({
  addressBook,
  transactions,
  setTransactions,
}: {
  addressBook: AddressBook;
  transactions: Transactions;
  setTransactions: (val: Transactions) => void;
}) => {
  const [syncing, setSyncing] = useState(false);
  const [filterSource, setFilterSource] = useState("");
  const [filteredTxns, setFilteredTxns] = useState([] as TransactionsJson);
  const [importFileType, setImportFileType] = useState("");
  const classes = useStyles();

  useEffect(() => {
    setFilteredTxns(transactions
      .filter(tx =>
        !filterSource
        || (tx?.sources || []).map(s => s.toLowerCase()).includes(filterSource)
        || tx.transfers.some(t => sm(addressBook.getName(t.from)).startsWith(sm(filterSource)))
        || tx.transfers.some(t => sm(addressBook.getName(t.to)).startsWith(sm(filterSource)))
      ).sort((e1: CapitalGainsEvent, e2: CapitalGainsEvent) =>
        // Sort by date, newest first
        (e1.date > e2.date) ? -1
          : (e1.date < e2.date) ? 1
            : 0
      )
    );
  }, [addressBook, transactions, filterSource]);

  useEffect(() => {
    console.log(`Filtered ${transactions.length} txns down to ${filteredTxns.length}`);
  }, [transactions, filteredTxns]);

  const handleFilterChange = (event: React.ChangeEvent<{ value: string }>) => {
    setFilterSource(event.target.value);
  };

  const handleFileTypeChange = (event: React.ChangeEvent<{ value: boolean }>) => {
    console.log(`Setting file type based on event target:`, event.target);
    setImportFileType(event.target.value);
  };

  const resetTxns = () => {
    axios.delete("/api/transactions").then(res => {
      console.log(`Successfully cleared tx data from server`, res);
      setTransactions([]);
    }).catch(e => {
      console.log(`Unsuccessfully cleared tx data from server`, e);
      setTransactions([]);
    });
  };

  const syncTxns = () => {
    if (!axios.defaults.headers.common.authorization) {
      console.warn(`Auth header not set yet..`);
      return;
    }
    setSyncing(true);
    axios.post("/api/transactions", { addressBook: addressBook.json }).then((res) => {
      console.log(`Successfully fetched ${res.data?.length || 0} transactions`, res.data);
      const txMethods = getTransactions({
        addressBook,
        transactionsJson: transactions,
        logger: getLogger("info"),
      });
      txMethods.mergeTransactions(res.data);
      setTransactions([...txMethods.json]);
      setSyncing(false);
    }).catch((e) => {
      console.warn(`Failed to fetch transactions:`, e.response.data || e.message);
      setSyncing(false);
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
        const txMethods = getTransactions({
          addressBook,
          transactionsJson: transactions,
          logger: getLogger("info"),
        });
        const importedFile = reader.result as string;
        if (importFileType === "coinbase") {
          txMethods.mergeCoinbase(importedFile);
        } else if (importFileType === "digitalocean") {
          txMethods.mergeDigitalOcean(importedFile);
        } else if (importFileType === "wazrix") {
          txMethods.mergeWazrix(importedFile);
        } else if (importFileType === "wyre") {
          txMethods.mergeWyre(importedFile);
        }
        setTransactions([...txMethods.json]);
      } catch (e) {
        console.error(e);
      }
    };
  };

  return (
    <>

      <Typography variant="h3">
        Transaction Explorer
      </Typography>

      <Button
        className={classes.button}
        disabled={syncing}
        onClick={syncTxns}
        startIcon={syncing ? <CircularProgress size={20} /> : <SyncIcon/>}
        variant="outlined"
      >
        Sync Chain Data Transactions
      </Button>

      <Button
        className={classes.button}
        disabled={!transactions.length}
        onClick={resetTxns}
        startIcon={<ClearIcon/>}
        variant="outlined"
      >
        Clear Transactions
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

      <FormControl className={classes.selectUoA}>
        <InputLabel id="select-filter-source">Filter Source</InputLabel>
        <Select
          labelId="select-filter-source"
          id="select-filter-source"
          value={filterSource || ""}
          onChange={handleFilterChange}
        >
          <MenuItem value={""}>-</MenuItem>
          {Object.keys(TransactionSources).map(source => (
            <MenuItem key={source} value={source}>{source}</MenuItem>
          ))};
        </Select>
      </FormControl>

      <Typography align="center" variant="h4">
        {`${filteredTxns.length} Transactions`}
      </Typography>

      <Table>
        <TableHead>
          <TableRow>
            <TableCell> Date </TableCell>
            <TableCell> Description </TableCell>
            <TableCell> Hash </TableCell>
            <TableCell> Transfers </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredTxns.slice(0, 750).map((tx: CapitalGainsEvent, i: number) => (
            <TableRow key={i}>
              <TableCell> {tx.date.replace("T", " ").replace("Z", "")} </TableCell>
              <TableCell> {tx.description} </TableCell>
              <TableCell> {tx.hash ? <HexString value={tx.hash} /> : "N/A"} </TableCell>

              <TableCell>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell> Category </TableCell>
                      <TableCell> Asset </TableCell>
                      <TableCell> Amount </TableCell>
                      <TableCell> From </TableCell>
                      <TableCell> To </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tx.transfers.map((transfer: Transfer, i: number) => (
                      <TableRow key={i}>
                        <TableCell> {transfer.category} </TableCell>
                        <TableCell> {transfer.assetType} </TableCell>
                        <TableCell> {math.round(transfer.quantity, 4)} </TableCell>
                        <TableCell>
                          <HexString
                            display={addressBook?.getName(transfer.from)}
                            value={transfer.from}
                          />
                        </TableCell>
                        <TableCell>
                          <HexString
                            display={addressBook?.getName(transfer.to)}
                            value={transfer.to}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableCell>

            </TableRow>
          ))}
        </TableBody>
      </Table>

    </>
  );
};
