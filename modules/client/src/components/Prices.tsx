import ClearIcon from "@mui/icons-material/Delete";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import { PriceTable, SyncPrices } from "@valuemachine/react";
import {
  Asset,
  Prices,
  PricesJson,
  ValueMachine,
} from "@valuemachine/types";
import React from "react";

type PropTypes = {
  globalSyncMsg: string;
  prices: Prices;
  setPricesJson: (val: PricesJson) => void;
  unit: Asset,
  vm: ValueMachine,
};
export const PriceManager: React.FC<PropTypes> = ({
  globalSyncMsg,
  prices,
  setPricesJson,
  unit,
  vm,
}: PropTypes) => {
  const clearPrices = () => { setPricesJson({}); };
  return (<>
    <Typography variant="h3">
      Price Explorer
    </Typography>

    <SyncPrices
      disabled={!!globalSyncMsg}
      prices={prices}
      setPricesJson={setPricesJson}
      unit={unit}
      vm={vm}
    />

    <Button
      sx={{ m: 3 }}
      disabled={!Object.keys(prices.json).length}
      onClick={clearPrices}
      startIcon={<ClearIcon/>}
      variant="outlined"
    >
      Clear Prices
    </Button>

    <Divider/>

    <PriceTable
      prices={prices}
      unit={unit}
    />
  </>);
};
