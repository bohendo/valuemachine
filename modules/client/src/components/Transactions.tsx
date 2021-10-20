import SyncIcon from "@mui/icons-material/Sync";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import { TransactionTable } from "@valuemachine/react";
import {
  getTransactions,
} from "@valuemachine/transactions";
import {
  AddressBook,
  AddressCategories,
  CsvFiles,
  Transactions,
  TransactionsJson,
} from "@valuemachine/types";
import { getLogger } from "@valuemachine/utils";
import React, { useState } from "react";
import axios from "axios";

const logger = getLogger("warn");

type TransactionExplorerProps = {
  addressBook: AddressBook;
  csvFiles: CsvFiles,
  customTxns: TransactionsJson,
  transactions: Transactions;
  setTransactionsJson: (val: TransactionsJson) => void;
};
export const TransactionExplorer: React.FC<TransactionExplorerProps> = ({
  addressBook,
  csvFiles,
  customTxns,
  transactions,
  setTransactionsJson,
}: TransactionExplorerProps) => {
  const [syncing, setSyncing] = useState("");

  const syncTxns = async () => {
    if (syncing) return;
    // Sync Chain Data
    const newTransactions = getTransactions({
      json: JSON.parse(JSON.stringify(customTxns)),
      logger,
    });
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
            const resEth = await axios.post("/api/ethereum", {
              addressBook: addressBook.json
            }) as any;
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
            const resPolygon = await axios.post("/api/polygon", {
              addressBook: addressBook.json
            }) as any;
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
    for (const csv of Object.values(csvFiles)) {
      setSyncing(`Parsing ${
        csv.data.split("\n").length - 1
      } rows of ${csv.source} data from ${csv.name}`);
      await new Promise((res) => setTimeout(res, 200)); // let sync message re-render
      newTransactions.mergeCsv(csv.data);
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
        sx={{ mx: 2, mt: 2, mb: 1, maxWidth: 0.95  }}
        disabled={!!syncing}
        onClick={syncTxns}
        startIcon={syncing ? <CircularProgress size={20} /> : <SyncIcon/>}
        variant="outlined"
      >
        Sync Transactions
      </Button>

      <br/>

      <Typography
        variant="body1"
        sx={{ m: 1 }}
        align="center"
      >
        {syncing}
      </Typography>

      <Divider/>

      <TransactionTable addressBook={addressBook} transactions={transactions} />

    </React.Fragment>
  );
};
