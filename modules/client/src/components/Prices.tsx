import { getPrices } from "@finances/core";
import { AssetTypes, Prices } from "@finances/types";
import { math } from "@finances/utils";
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
  // GetApp as ImportIcon,
} from "@material-ui/icons";
import React, { useEffect, useState } from "react";
import axios from "axios";

const useStyles = makeStyles((theme: Theme) => createStyles({
  root: {
    margin: theme.spacing(1),
  },
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

const emptyPriceEntry = {
  date: "",
  asset: "",
};

export const PriceManager = ({
  pricesJson,
  setPrices,
}: {
  pricesJson: Prices;
  setPrices: (val: Prices) => void;
}) => {
  const [newPriceModified, setNewPriceModified] = useState(false);
  const [newPrice, setNewPrice] = useState(emptyPriceEntry);
  const [newPriceError, setNewPriceError] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [filter, setFilter] = useState("");
  const [filteredPrices, setFilteredPrices] = useState([] as any);
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
    setFilteredPrices(
      Object.entries(pricesJson).map(([key, val]) => {
        if (key === "ids") return null;
        return ({ date: key, prices: val });
      }).filter(e => !!e)
    );
  }, [pricesJson, filter]);

  useEffect(() => {
    if (!pricesJson) return;
    console.log(`Filtered ${
      Object.entries(pricesJson).length
    } prices down to ${filteredPrices.length}`);
  }, [pricesJson, filteredPrices]);

  const handleFilterChange = (event: React.ChangeEvent<{ value: string }>) => {
    setFilter(event.target.value);
  };

  const syncPrices = async () => {
    if (!axios.defaults.headers.common.authorization) {
      console.warn(`Auth header not set yet..`);
      return;
    }
    setSyncing(true);
    try {
      await axios.get("/api/prices");
      console.log(`Server has synced prices`);
      // await transactions.syncPrices();
      // console.log(`Client has synced prices`);
    } catch (e) {
      console.error(`Failed to sync prices`, e);
    }
    setSyncing(false);
  };

  const handleAssetChange = (event: React.ChangeEvent<{ value: string }>) => {
    setNewPrice({ ...newPrice, asset: event.target.value });
    setNewPriceError("");
  };

  const handlePriceChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setNewPrice({ ...newPrice, [event.target.name]: event.target.value });
    setNewPriceError("");
  };

  const addNewPrice = async () => {
    if (!newPrice.date) {
      setNewPriceError("Date is required");
    } else if (!newPrice.date.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/)) {
      setNewPriceError("Date is not in YYYY-MM-DD format");
    } else {
      setSyncing(true);
      const prices = getPrices({ pricesJson });
      await prices.syncPrice(newPrice.date, newPrice.asset);
      setPrices(prices.json);
      setSyncing(false);
    }
  };

  return (
    <>

      <Typography variant="h4">
        Price Explorer
      </Typography>
      <Divider/>

      <Button
        className={classes.button}
        disabled={syncing}
        onClick={syncPrices}
        startIcon={syncing ? <CircularProgress size={20} /> : <SyncIcon/>}
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
                <FormControl className={classes.selectUoA}>
                  <InputLabel id="select-asset-type">AssetType</InputLabel>
                  <Select
                    labelId="select-asset-type"
                    id="select-asset-type"
                    value={newPrice.asset || ""}
                    onChange={handleAssetChange}
                  >
                    <MenuItem value={""}>-</MenuItem>
                    {Object.keys(AssetTypes).map(asset => (
                      <MenuItem key={asset} value={asset}>{asset}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item>
                {newPriceModified ?
                  <Grid item>
                    <Button
                      className={classes.button}
                      color="primary"
                      onClick={addNewPrice}
                      size="small"
                      startIcon={<AddIcon />}
                      variant="contained"
                    >
                      Save Price
                    </Button>
                  </Grid>
                  : undefined
                }
              </Grid>
            </Grid>
          </Card>
        </Grid>
      </Grid>

      <Divider/>
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
