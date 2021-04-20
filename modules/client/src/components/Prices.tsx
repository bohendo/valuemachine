import { Prices } from "@finances/types";
import { math } from "@finances/utils";
import {
  Button,
  CircularProgress,
  createStyles,
  Divider,
  FormControl,
  InputLabel,
  makeStyles,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Theme,
  Typography,
} from "@material-ui/core";
import {
  Sync as SyncIcon,
  // GetApp as ImportIcon,
} from "@material-ui/icons";
import React, { useEffect, useState } from "react";
import axios from "axios";

const useStyles = makeStyles((theme: Theme) => createStyles({
  button: {
    margin: theme.spacing(3),
  },
  spinner: {
    padding: "0",
  },
  importer: {
    margin: theme.spacing(4),
  },
  selectUoA: {
    margin: theme.spacing(3),
    minWidth: 160,
  },
}));

export const PriceManager = ({
  prices,
  setPrices,
}: {
  prices: Prices;
  setPrices: (val: Prices) => void;
}) => {
  const [syncing, setSyncing] = useState({ transactions: false, prices: false });
  const [filter, setFilter] = useState("");
  const [filteredPrices, setFilteredPrices] = useState([] as any);
  const classes = useStyles();

  useEffect(() => {
    if (!prices?.json) return;
    setFilteredPrices(
      Object.entries(prices.json).map(([key, val]) => {
        if (key === "ids") return null;
        return ({ date: key, prices: val });
      }).filter(e => !!e)
    );
  }, [prices, filter]);

  useEffect(() => {
    if (!prices?.json) return;
    console.log(`Filtered ${
      Object.entries(prices.json).length
    } prices down to ${filteredPrices.length}`);
  }, [prices, filteredPrices]);

  const handleFilterChange = (event: React.ChangeEvent<{ value: string }>) => {
    setFilter(event.target.value);
  };

  const syncPrices = async () => {
    if (!axios.defaults.headers.common.authorization) {
      console.warn(`Auth header not set yet..`);
      return;
    }
    setSyncing(old => ({ ...old, prices: true }));
    try {
      await axios.get("/api/prices");
      console.log(`Server has synced prices`);
      // await transactions.syncPrices();
      // console.log(`Client has synced prices`);
    } catch (e) {
      console.error(`Failed to sync prices`, e);
    }
    setSyncing(old => ({ ...old, prices: false }));
  };

  return (
    <>

      <Typography variant="h4">
        Price Explorer
      </Typography>
      <Divider/>

      <Button
        className={classes.button}
        disabled={syncing.prices}
        onClick={syncPrices}
        startIcon={syncing.prices ? <CircularProgress size={20} /> : <SyncIcon/>}
        variant="outlined"
      >
        Sync Prices
      </Button>

      <FormControl className={classes.selectUoA}>
        <InputLabel id="select-filter-asset">Filter Asset</InputLabel>
        <Select
          labelId="select-filter-asset"
          id="select-filter-asset"
          value={filter || ""}
          onChange={handleFilterChange}
        >
          <MenuItem value={""}>-</MenuItem>
          <MenuItem value={"ETH"}>Wazrix</MenuItem>
          <MenuItem value={"BTC"}>Coinbase</MenuItem>
          <MenuItem value={"DAI"}>EthTx</MenuItem>
        </Select>
      </FormControl>

      <Typography align="center" variant="h4">
        {`${filteredPrices.length} Prices`}
      </Typography>
      <Divider/>

      <Table>
        <TableHead>
          <TableRow>
            <TableCell> Date </TableCell>
            <TableCell> Prices </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredPrices.slice(0, 250).map((price: any, i: number) => (
            <TableRow key={i}>
              <TableCell> {price.date.replace("T", " ").replace("Z", "")} </TableCell>
              <TableCell>

                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell> Asset </TableCell>
                      <TableCell> Price </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(price.prices).map(([key, val], i: number) => (
                      <TableRow key={i}>
                        <TableCell> {key} </TableCell>
                        <TableCell> {math.round(val, 4)} </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

    </>
  );
};
