import ClearIcon from "@mui/icons-material/Delete";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import {
  Asset,
  PriceFns,
  PriceJson,
  PriceTable,
  SyncPrices,
  ValueMachine,
} from "valuemachine";
import React from "react";

type PropTypes = {
  globalSyncMsg: string;
  prices: PriceFns;
  setPricesJson: (val: PriceJson) => void;
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
  const handleClear = () => { setPricesJson([]); };
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
      disabled={!!globalSyncMsg || !prices.getJson().length}
      onClick={handleClear}
      startIcon={<ClearIcon/>}
      variant="outlined"
    >
      Clear Prices
    </Button>

    <Divider sx={{ mb: 2 }} />

    <PriceTable
      prices={prices}
      unit={unit}
    />
  </>);
};
