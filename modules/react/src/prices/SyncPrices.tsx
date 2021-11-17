import SyncIcon from "@mui/icons-material/Sync";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import {
  Asset,
  Prices,
  PricesJson,
  ValueMachine,
} from "@valuemachine/types";
import React, { useState } from "react";
import axios from "axios";

type SyncPricesProps = {
  prices: Prices;
  setPricesJson: (val: PricesJson) => void;
  unit: Asset,
  vm: ValueMachine,
};
export const SyncPrices: React.FC<SyncPricesProps> = ({
  prices,
  setPricesJson,
  unit,
  vm,
}: SyncPricesProps) => {
  const [syncMsg, setSyncMsg] = useState("");

  const syncPrices = async () => {
    if (syncMsg) return;
    try {
      setSyncMsg(`Fetching price data for ${vm.json.chunks.length} chunks..`);
      const newPrices = (await axios.post(
        `/api/prices/chunks/${unit}`,
        { chunks: vm.json.chunks },
      ) as any).data;
      console.info(`Synced new prices`, newPrices);
      setSyncMsg("Successfully fetched prices! Importing..");
      prices.merge(newPrices);
      setPricesJson({ ...prices.json });
      setSyncMsg("Successfully synced prices");
      setTimeout(() => setSyncMsg(""), 1000);
    } catch (e: any) {
      console.error(`Failed to sync prices:`, e);
      if (typeof e?.message === "string") {
        setSyncMsg(e.message);
        setTimeout(() => setSyncMsg(""), 5000);
      }
    }
  };

  return (
    <Button
      sx={{ m: 3 }}
      disabled={!!syncMsg}
      onClick={syncPrices}
      startIcon={syncMsg ? <CircularProgress size={20} /> : <SyncIcon/>}
      variant="outlined"
    >
      {syncMsg || `Sync ${unit} Prices For ${vm.json.chunks.length} Chunks`}
    </Button>
  );
};
