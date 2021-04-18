import { getTransactions } from "@finances/core";
import {
  AddressBook,
  CapitalGainsEvent,
  Transactions,
  TransactionsJson,
  Transfer,
} from "@finances/types";
import { math } from "@finances/utils";
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
  // GetApp as ImportIcon,
} from "@material-ui/icons";
import React, { useEffect, useState } from "react";
import axios from "axios";

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
  const [syncing, setSyncing] = useState({ transactions: false, prices: false });
  const [filterSource, setFilterSource] = useState("");
  const [filteredTxns, setFilteredTxns] = useState([] as TransactionsJson);
  const [importFileType, setImportFileType] = useState("");
  const classes = useStyles();

  useEffect(() => {
    setFilteredTxns(transactions.getAll()
      .filter(tx =>
        !filterSource || (tx?.sources || []).map(s => s.toLowerCase()).includes(filterSource)
      ).sort((e1: CapitalGainsEvent, e2: CapitalGainsEvent) =>
        // Sort by date, newest first
        (e1.date > e2.date) ? -1
          : (e1.date < e2.date) ? 1
            : 0
      )
    );
  }, [transactions, filterSource]);

  useEffect(() => {
    console.log(`Filtered ${transactions.getAll().length} txns down to ${filteredTxns.length}`);
  }, [transactions, filteredTxns]);

  const handleFilterChange = (event: React.ChangeEvent<{ value: string }>) => {
    setFilterSource(event.target.value);
  };

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
      // TODO: below command crashes the page, find a better solution
      // res.data.forEach(transactions.mergeTransaction);
      // Get new object to trigger a re-render
      setTransactions(getTransactions({ ...transactions.getParams(), transactionsJson: res.data }));
      setSyncing(old => ({ ...old, transactions: false }));
    }).catch(e => {
      console.log(`Failed to fetch transactions`, e);
      setSyncing(old => ({ ...old, transactions: false }));
    });
  };

  const syncPrices = async () => {
    if (!axios.defaults.headers.common.authorization) {
      console.warn(`Auth header not set yet..`);
      return;
    }
    setSyncing(old => ({ ...old, prices: true }));
    try {
      await axios.get("/api/prices");
      console.log(`Server has synced prices`);
      await transactions.syncPrices();
      console.log(`Client has synced prices`);
    } catch (e) {
      console.error(`Failed to sync prices`, e);
    }
    setSyncing(old => ({ ...old, prices: false }));
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
        if (importFileType === "coinbase") {
          transactions.mergeCoinbase(importedFile);
        } else if (importFileType === "digitalocean") {
          transactions.mergeDigitalOcean(importedFile);
        } else if (importFileType === "wazrix") {
          transactions.mergeWazrix(importedFile);
        } else if (importFileType === "wyre") {
          transactions.mergeWyre(importedFile);
        }
        // Get new object to trigger a re-render
        setTransactions(getTransactions(transactions.getParams()));
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

      <FormControl className={classes.selectUoA}>
        <InputLabel id="select-filter-source">Filter Source</InputLabel>
        <Select
          labelId="select-filter-source"
          id="select-filter-source"
          value={filterSource || ""}
          onChange={handleFilterChange}
        >
          <MenuItem value={""}>-</MenuItem>
          <MenuItem value={"wazrix"}>Wazrix</MenuItem>
          <MenuItem value={"coinbase"}>Coinbase</MenuItem>
          <MenuItem value={"ethtx"}>EthTx</MenuItem>
          <MenuItem value={"ethcall"}>EthCall</MenuItem>
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
            <TableCell> Prices </TableCell>
            <TableCell> Transfers </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredTxns.slice(0, 250).map((tx: CapitalGainsEvent, i: number) => (
            <TableRow key={i}>
              <TableCell> {tx.date.replace("T", " ").replace("Z", "")} </TableCell>
              <TableCell> {tx.description} </TableCell>
              <TableCell>
                {tx.hash
                  ? tx.hash.substring(0,6) + "..." + tx.hash.substring(tx.hash.length-4)
                  : "N/A"
                }
              </TableCell>
              <TableCell><pre> {JSON.stringify(tx.prices, null, 2)} </pre></TableCell>

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
                        <TableCell> {addressBook?.getName(transfer.from) || "?"} </TableCell>
                        <TableCell> {addressBook?.getName(transfer.to) || "?"} </TableCell>
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
