import SyncIcon from "@mui/icons-material/Sync";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import { PriceFns, PriceJson } from "@valuemachine/prices";
import { Asset, ValueMachine } from "@valuemachine/types";
import React, { useState } from "react";

import { syncPrices } from "./utils";

type SyncPricesProps = {
  disabled?: boolean;
  prices: PriceFns;
  setPricesJson: (val: PriceJson) => void;
  unit: Asset,
  vm: ValueMachine,
};
export const SyncPrices: React.FC<SyncPricesProps> = ({
  disabled,
  prices,
  setPricesJson,
  unit,
  vm,
}: SyncPricesProps) => {
  const [syncMsg, setSyncMsg] = useState("");

  const handleSync = async () => {
    if (syncMsg) return;
    await syncPrices({
      prices,
      setPricesJson,
      setSyncMsg,
      unit,
      vm,
    });
  };

  return (
    <Button
      disabled={disabled || !!syncMsg}
      onClick={handleSync}
      startIcon={syncMsg ? <CircularProgress size={20} /> : <SyncIcon/>}
      sx={{ m: 2 }}
      variant="outlined"
    >
      {syncMsg || `Sync ${unit} Prices For ${vm.json.chunks.length} Chunks`}
    </Button>
  );
};
