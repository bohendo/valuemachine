import SyncIcon from "@mui/icons-material/Sync";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import {
  AddressBook,
  Asset,
  CsvFiles,
  Prices,
  PricesJson,
  TaxRows,
  TransactionsJson,
  TxTags,
  ValueMachine,
  ValueMachineJson,
} from "@valuemachine/types";
import React, { useState } from "react";

import { syncPrices } from "../prices";
import { syncTxns } from "../transactions";
import { processTxns } from "../valuemachine";
import { syncTaxRows } from "../taxes";

type SyncEverythingProps = {
  addressBook: AddressBook;
  csvFiles: CsvFiles;
  customTxns: TransactionsJson;
  prices: Prices;
  setPricesJson: (val: PricesJson) => void;
  setTaxRows: (val: TaxRows) => void;
  setTransactionsJson: (val: TransactionsJson) => void;
  setVMJson: (val: ValueMachineJson) => void;
  txTags: TxTags;
  unit: Asset;
  vm: ValueMachine;
};
export const SyncEverything: React.FC<SyncEverythingProps> = ({
  addressBook,
  csvFiles,
  customTxns,
  prices,
  setPricesJson,
  setTaxRows,
  setTransactionsJson,
  setVMJson,
  txTags,
  unit,
  vm,
}: SyncEverythingProps) => {
  const [syncMsg, setSyncMsg] = useState("");

  const handleSync = async () => {
    if (syncMsg) return;
    const newTxns = await syncTxns(
      addressBook,
      customTxns,
      csvFiles,
      setTransactionsJson,
      setSyncMsg,
    );
    const newVm = await processTxns(vm, newTxns, setVMJson, setSyncMsg);
    const newPrices = await syncPrices(newVm, prices, unit, setPricesJson, setSyncMsg);
    await syncTaxRows(addressBook, newPrices, txTags, unit, newVm, setTaxRows, setSyncMsg);
  };

  return (
    <Button
      sx={{ mx: 2, mt: 2, mb: 1, maxWidth: 0.95  }}
      disabled={!!syncMsg}
      onClick={handleSync}
      startIcon={syncMsg ? <CircularProgress size={20} /> : <SyncIcon/>}
      variant="outlined"
    >
      {syncMsg || "Sync"}
    </Button>
  );
};
