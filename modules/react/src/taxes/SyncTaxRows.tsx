import SyncIcon from "@mui/icons-material/Sync";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import {
  ValueMachine,
} from "@valuemachine/core";
import {
  PriceFns,
} from "@valuemachine/prices";
import {
  AddressBook,
  Asset,
  TaxRows,
  TxTags,
} from "@valuemachine/types";
import React, { useState } from "react";

import { syncTaxRows } from "./utils";

type SyncTaxRowsProps = {
  addressBook?: AddressBook;
  disabled?: boolean;
  prices?: PriceFns;
  setTaxRows: (val: TaxRows) => void;
  txTags: TxTags;
  unit?: Asset;
  vm?: ValueMachine;
};
export const SyncTaxRows: React.FC<SyncTaxRowsProps> = ({
  addressBook,
  disabled,
  prices,
  setTaxRows,
  txTags,
  unit,
  vm,
}: SyncTaxRowsProps) => {
  const [syncMsg, setSyncMsg] = useState("");

  const handleSync = async () => {
    if (!addressBook?.json || !prices?.json || !vm?.json?.events?.length || !unit) return;
    if (syncMsg) return;
    await syncTaxRows({
      addressBook,
      prices,
      setSyncMsg,
      setTaxRows,
      txTags,
      unit,
      vm,
    });
  };

  return (
    <Button
      disabled={disabled || !!syncMsg}
      onClick={handleSync}
      startIcon={syncMsg ? <CircularProgress size={20} /> : <SyncIcon/>}
      sx={{ m: 2, maxWidth: 0.95  }}
      variant="outlined"
    >
      {syncMsg || `Sync Tax Rows w ${vm?.json?.events?.length || "0"} VM Events`}
    </Button>
  );
};
