import { getPrices } from "@finances/core";
import { AltChainAssets, EthereumAssets, PricesJson, TransactionsJson } from "@finances/types";
import {
  Button,
  Card,
  CardHeader,
  CircularProgress,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Theme,
  Typography,
  createStyles,
  makeStyles,
} from "@material-ui/core";
import {
  Sync as SyncIcon,
  Add as AddIcon,
  Delete as ClearIcon,
  // GetApp as ImportIcon,
} from "@material-ui/icons";
import React, { useEffect, useState } from "react";
import axios from "axios";

import { store } from "../utils";

const useStyles = makeStyles((theme: Theme) => createStyles({
  root: {
    margin: theme.spacing(1),
  },
  button: {
    margin: theme.spacing(3),
  },
  header: {
    marginTop: theme.spacing(2),
  },
  select: {
    margin: theme.spacing(3),
    minWidth: 160,
  },
}));

const emptyPriceEntry = {
  date: "",
  asset: "",
};

type PriceRow = {
  date: string;
  asset: string;
  price: string;
}

export const PriceManager = ({
  pricesJson,
  setPrices,
  transactions,
}: {
  pricesJson: PricesJson;
  setPrices: (val: PricesJson) => void;
  transactions: TransactionsJson,
}) => {
  const [newPriceModified, setNewPriceModified] = useState(false);
  const [newPrice, setNewPrice] = useState(emptyPriceEntry);
  const [newPriceError, setNewPriceError] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [filter, setFilter] = useState("");
  const [filteredPrices, setFilteredPrices] = useState([] as PriceRow);
  const classes = useStyles();

  useEffect(() => {
    if (
      newPrice.date !== emptyPriceEntry.date ||
      newPrice.asset !== emptyPriceEntry.asset
    ) {
      setNewPriceModified(true);
    } else {
      setNewPriceModified(false);
    }
  }, [newPrice]);

  useEffect(() => {
    if (!pricesJson) return;
    const newFilteredPrices = [] as PriceRow[];
    Object.entries(pricesJson).forEach(([date, priceEntry]) => {
      if (Object.keys(priceEntry).length === 0) return null;
      Object.entries(priceEntry).forEach(([asset, price]) => {
        if (!filter || filter === asset) newFilteredPrices.push({ date, asset, price });
      });
    });
    setFilteredPrices(newFilteredPrices.sort((e1: PriceRow, e2: PriceRow): number => {
      return e1.date > e2.date ? -1 : e1.date < e2.date ? 1
        : e1.asset > e2.asset ? 1 : e1.asset < e2.asset ? -1
          : 0;
    }));
  }, [pricesJson, filter]);

  const handleAssetChange = (event: React.ChangeEvent<{ value: string }>) => {
    setNewPrice({ ...newPrice, asset: event.target.value });
    setNewPriceError("");
  };

  const handlePriceChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setNewPrice({ ...newPrice, [event.target.name]: event.target.value });
    setNewPriceError("");
  };

  const handleFilterChange = (event: React.ChangeEvent<{ value: string }>) => {
    setFilter(event.target.value);
  };

  const addNewPrice = async () => {
    if (!newPrice.date) {
      setNewPriceError("Date is required");
    } else if (!newPrice.date.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/)) {
      setNewPriceError("Date is not in YYYY-MM-DD format");
    } else {
      setSyncing(true);
      const prices = getPrices({ pricesJson, store });
      try {
        const res = await axios.get(
          `/api/prices/${newPrice.asset}/${newPrice.date}`,
          { timeout: 21000 },
        );
        if (res.status === 200 && res.data) {
          prices.setPrice(newPrice.date, newPrice.asset, res.data);
        } else {
          await prices.syncPrice(newPrice.date, newPrice.asset);
        }
        setPrices({ ...prices.json });
      } catch (e) {
        console.error(e);
      }
      setSyncing(false);
    }
  };

  const syncPrices = async () => {
    if (!transactions) return;
    try {
      setSyncing(true);
      console.log(`Syncing price data for ${transactions.length} transactions`);
      const prices = getPrices({ pricesJson, store });
      for (const tx of transactions) {
        const date = tx.date.split("T")[0];
        const assets = Array.from(new Set([...tx.transfers.map(t => t.assetType)]));
        for (const asset of assets) {
          try {
            if (!prices.getPrice(date, asset)) {
              const res = await axios.get(`/api/prices/${asset}/${date}`, { timeout: 21000 });
              if (res.status === 200 && res.data) {
                prices.setPrice(date, asset, res.data);
              } else {
                await prices.syncPrice(date, asset);
              }
            }
          } catch (e) {
            console.error(e);
          }
        }
        setPrices({ ...prices.json });
      }
    } catch (e) {
      console.error(`Failed to sync prices:`, e);
    }
    setSyncing(false);
  };

  const clearPrices = () => {
    setPrices({});
  };

  return (
    <>

      <Typography variant="h4">
        Price Manager
      </Typography>

      <Grid alignContent="center" alignItems="center" container spacing={1} className={classes.root}>

        <Grid item>
          <Card className={classes.root}>
            <CardHeader title={"Add new Price"} />
            <Grid alignContent="center" alignItems="center" container spacing={1} className={classes.root}>
              <Grid item>
                <TextField
                  autoComplete="off"
                  error={!!newPriceError}
                  fullWidth
                  helperText={newPriceError || "YYYY-MM-DD"}
                  id="new-price-date"
                  label="Date"
                  margin="normal"
                  name="date"
                  onChange={handlePriceChange}
                  value={newPrice.date}
                  variant="outlined"
                />
              </Grid>
              <Grid item>
                <FormControl className={classes.select}>
                  <InputLabel id="select-asset-type">AssetType</InputLabel>
                  <Select
                    labelId="select-asset-type"
                    id="select-asset-type"
                    value={newPrice.asset || ""}
                    onChange={handleAssetChange}
                  >
                    <MenuItem value={""}>-</MenuItem>
                    {Object.keys({ ...EthereumAssets, ...AltChainAssets }).map(asset => (
                      <MenuItem key={asset} value={asset}>{asset}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item>
                <Grid item>
                  <Button
                    className={classes.button}
                    color="primary"
                    disabled={!newPriceModified || syncing}
                    onClick={addNewPrice}
                    size="small"
                    startIcon={syncing ? <CircularProgress size={20} /> : <AddIcon/>}
                    variant="contained"
                  >
                    Add Price
                  </Button>
                </Grid>
              </Grid>
            </Grid>
          </Card>
        </Grid>

        <Grid item>
          <Button
            className={classes.button}
            disabled={syncing}
            onClick={syncPrices}
            startIcon={syncing ? <CircularProgress size={20} /> : <SyncIcon/>}
            variant="outlined"
          >
            {`Sync Prices for ${transactions.length} Transactions`}
          </Button>
          <Button
            className={classes.button}
            disabled={!Object.keys(pricesJson).length}
            onClick={clearPrices}
            startIcon={<ClearIcon/>}
            variant="outlined"
          >
            Clear Prices
          </Button>
        </Grid>

      </Grid>

      <Divider/>

      <Typography variant="h4" className={classes.header}>
        Price Explorer
      </Typography>

      <FormControl className={classes.select}>
        <InputLabel id="select-filter-asset">Filter Asset</InputLabel>
        <Select
          labelId="select-filter-asset"
          id="select-filter-asset"
          value={filter || ""}
          onChange={handleFilterChange}
        >
          <MenuItem value={""}>-</MenuItem>
          {Object.keys({ ...EthereumAssets, ...AltChainAssets }).map(asset => (
            <MenuItem key={asset} value={asset}>{asset}</MenuItem>
          ))}
        </Select>
      </FormControl>

      <Divider/>

      <Table>
        <TableHead>
          <TableRow>
            <TableCell> Date </TableCell>
            <TableCell> Asset </TableCell>
            <TableCell> Price </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredPrices.slice(0, 250).map((row: PriceRow, i: number) => (
            <TableRow key={i}>
              <TableCell> {row.date.replace("T", " ").replace("Z", "")} </TableCell>
              <TableCell> {row.asset} </TableCell>
              <TableCell> ${row.price} </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

    </>
  );
};
