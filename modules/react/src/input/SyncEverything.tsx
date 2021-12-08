import SyncIcon from "@mui/icons-material/Sync";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import {
  ValueMachine,
  ValueMachineJson,
} from "@valuemachine/core";
import {
  PriceFns,
  PriceJson,
} from "@valuemachine/prices";
import {
  TaxRows,
} from "@valuemachine/taxes";
import {
  TransactionsJson,
  TxTags,
} from "@valuemachine/transactions";
import {
  AddressBook,
  Asset,
  CsvFiles,
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
  prices: PriceFns;
  setPricesJson: (val: PriceJson) => void;
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
    await syncTaxRows({
      addressBook,
      prices: newPrices,
      setSyncMsg,
      setTaxRows,
      txTags,
      unit,
      vm: newVm,
    });
    setSyncMsg("Everything is up to date");
    return new Promise(res => {
      setTimeout(() => { setSyncMsg?.(""); res(prices); }, 1000);
    });
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
      sx={{ m: 2, maxWidth: 0.95, minWidth: "24em", justifyContent: "flex-end" }}
      variant="text"
    >
      <Typography noWrap variant="button">
        {syncMsg || "Sync Everything"}
      </Typography>
    </Button>
  );
};
