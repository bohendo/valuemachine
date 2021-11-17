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
import React from "react";

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
  setSyncMsg: (val: string) => void;
  setTaxRows: (val: TaxRows) => void;
  setTransactionsJson: (val: TransactionsJson) => void;
  setVMJson: (val: ValueMachineJson) => void;
  syncMsg,
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
  setSyncMsg,
  setTaxRows,
  setTransactionsJson,
  setVMJson,
  syncMsg,
  txTags,
  unit,
  vm,
}: SyncEverythingProps) => {

  const handleSync = async () => {
    if (syncMsg) return;
    const newTxns = await syncTxns({
      addressBook,
      csvFiles,
      customTxns,
      setSyncMsg,
      setTransactionsJson,
    });
    const newVm = await processTxns({
      setSyncMsg,
      setVMJson,
      transactions: newTxns,
      vm,
    });
    const newPrices = await syncPrices({
      prices,
      setPricesJson,
      setSyncMsg,
      unit,
      vm: newVm,
    });
    const newTaxRows = await syncTaxRows({
      addressBook,
      prices: newPrices,
      setSyncMsg,
      setTaxRows,
      txTags,
      unit,
      vm: newVm,
    });
    console.log(`Done syncing everything, generated ${newTaxRows.length} tax rows`);
  };

  return (
    <Button
      color="inherit"
      disabled={!!syncMsg}
      endIcon={syncMsg
        ? <CircularProgress size={20} color="inherit" />
        : <SyncIcon color="inherit" />
      }
      onClick={handleSync}
      sx={{ m: 2, maxWidth: 0.95  }}
      variant="text"
    >
      {syncMsg || "Sync Everything"}
    </Button>
  );
};
