import SyncIcon from "@mui/icons-material/Sync";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import { getTaxRows } from "@valuemachine/taxes";
import {
  AddressBook,
  Asset,
  Prices,
  ValueMachine,
  TaxRows,
  TxTags,
} from "@valuemachine/types";
import React, { useState } from "react";

type SyncTaxRowsProps = {
  addressBook?: AddressBook;
  prices?: Prices;
  setTaxRows: (val: TaxRows) => void;
  txTags: TxTags;
  unit?: Asset;
  vm?: ValueMachine;
};
export const SyncTaxRows: React.FC<SyncTaxRowsProps> = ({
  addressBook,
  prices,
  setTaxRows,
  txTags,
  unit,
  vm,
}: SyncTaxRowsProps) => {
  const [syncMsg, setSyncMsg] = useState("");

  const syncRows = async () => {
    if (!addressBook?.json || !prices?.json || !vm?.json?.events?.length) return;
    setSyncMsg("Syncing..");
    setTaxRows(await getTaxRows({ addressBook, prices, txTags, userUnit: unit, vm }));
    setSyncMsg("");
  };

  return (
    <Button
      sx={{ m: 2, maxWidth: 0.95  }}
      disabled={!!syncMsg}
      onClick={syncRows}
      startIcon={syncMsg ? <CircularProgress size={20} /> : <SyncIcon/>}
      variant="outlined"
    >
      {syncMsg || `Sync Tax Rows w ${vm?.json?.events?.length || "0"} VM Events`}
    </Button>
  );
};
