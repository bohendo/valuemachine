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

import { syncPrices } from "./utils";

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

  const handleSync = async () => {
    if (syncMsg) return;
    await syncPrices(vm, prices, unit, setPricesJson, setSyncMsg);
  };

  return (
    <Button
      sx={{ m: 3 }}
      disabled={!!syncMsg}
      onClick={handleSync}
      startIcon={syncMsg ? <CircularProgress size={20} /> : <SyncIcon/>}
      variant="outlined"
    >
      {syncMsg || `Sync ${unit} Prices For ${vm.json.chunks.length} Chunks`}
    </Button>
  );
};
