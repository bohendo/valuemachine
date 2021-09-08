import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import Button from "@material-ui/core/Button";
import CircularProgress from "@material-ui/core/CircularProgress";
import Divider from "@material-ui/core/Divider";
import Typography from "@material-ui/core/Typography";
import SyncIcon from "@material-ui/icons/Sync";
import ClearIcon from "@material-ui/icons/Delete";
import { TransactionTable } from "@valuemachine/react";
import {
  getTransactions,
} from "@valuemachine/transactions";
import {
  AddressBook,
  AddressCategories,
  CsvFiles,
  TransactionSource,
  Transactions,
  TransactionsJson,
} from "@valuemachine/types";
import { getLogger } from "@valuemachine/utils";
import React, { useState } from "react";
import axios from "axios";

const logger = getLogger("warn");

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
  csvFiles: CsvFiles,
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
  const classes = useStyles();

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
            console.log(`Got ${resEth.data.length} Eth transactions`, resEth.data);
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
        newTransactions.mergeCsv(csvFile.data, csvFile.type as TransactionSource);
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

      <TransactionTable addressBook={addressBook} transactions={transactions} />

    </React.Fragment>
  );
};
