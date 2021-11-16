import SyncIcon from "@mui/icons-material/Sync";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import {
  getTransactions,
} from "@valuemachine/transactions";
import {
  AddressBook,
  AddressCategories,
  CsvFiles,
  TransactionsJson,
} from "@valuemachine/types";
import { getLogger } from "@valuemachine/utils";
import React, { useState } from "react";
import axios from "axios";

const logger = getLogger("warn");

type SyncTransactionsProps = {
  addressBook: AddressBook;
  csvFiles: CsvFiles,
  customTxns: TransactionsJson,
  setTransactionsJson: (val: TransactionsJson) => void;
};
export const SyncTransactions: React.FC<SyncTransactionsProps> = ({
  addressBook,
  csvFiles,
  customTxns,
  setTransactionsJson,
}: SyncTransactionsProps) => {
  const [syncMsg, setSyncMsg] = useState("");

  const syncTxns = async () => {
    if (syncMsg) return;
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
            setSyncMsg(`Syncing Ethereum data for ${selfAddresses.length} addresses`);
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
            setSyncMsg(`Syncing Polygon data for ${selfAddresses.length} addresses`);
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
      setSyncMsg(`Parsing ${
        csv.data.split("\n").length - 1
      } rows of ${csv.source} data from ${csv.name}`);
      await new Promise((res) => setTimeout(res, 10)); // let sync message re-render
      newTransactions.mergeCsv(csv.data);
    }
    setTransactionsJson(newTransactions.json);
    setSyncMsg("");
  };

  return (
    <Button
      sx={{ mx: 2, mt: 2, mb: 1, maxWidth: 0.95  }}
      disabled={!!syncMsg}
      onClick={syncTxns}
      startIcon={syncMsg ? <CircularProgress size={20} /> : <SyncIcon/>}
      variant="outlined"
    >
      {syncMsg || "Sync Transactions"}
    </Button>
  );
};
