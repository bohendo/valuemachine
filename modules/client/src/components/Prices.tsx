import { getPrices } from "@finances/core";
import {
  AltChainAssets,
  EthereumAssets,
  FiatAssets,
  PricesJson,
  TransactionsJson,
} from "@finances/types";
import { smeq } from "@finances/utils";
import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import Button from "@material-ui/core/Button";
import Card from "@material-ui/core/Card";
import CardHeader from "@material-ui/core/CardHeader";
import CircularProgress from "@material-ui/core/CircularProgress";
import Divider from "@material-ui/core/Divider";
import FormControl from "@material-ui/core/FormControl";
import Grid from "@material-ui/core/Grid";
import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import Paper from "@material-ui/core/Paper";
import Select from "@material-ui/core/Select";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableContainer from "@material-ui/core/TableContainer";
import TableHead from "@material-ui/core/TableHead";
import TablePagination from "@material-ui/core/TablePagination";
import TableRow from "@material-ui/core/TableRow";
import TextField from "@material-ui/core/TextField";
import Typography from "@material-ui/core/Typography";
import SyncIcon from "@material-ui/icons/Sync";
import ClearIcon from "@material-ui/icons/Delete";
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
  paper: {
    minWidth: "500px",
    padding: theme.spacing(2),
  },
  select: {
    margin: theme.spacing(3),
    minWidth: 160,
  },
  subtitle: {
    margin: theme.spacing(2),
  },
  dateFilter: {
    margin: theme.spacing(2),
  },
}));

type PriceRow = {
  date: string;
  asset: string;
  price: string;
}

type DateInput = {
  value: string;
  display: string;
  error: string;
};

const emptyDateInput = { value: "", display: "", error: "" } as DateInput;

export const PriceManager = ({
  pricesJson,
  setPrices,
  transactions,
}: {
  pricesJson: PricesJson;
  setPrices: (val: PricesJson) => void;
  transactions: TransactionsJson,
}) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(25);
  const [syncing, setSyncing] = useState(false);
  const [filterAsset, setFilterAsset] = useState("");
  const [filterDate, setFilterDate] = useState(emptyDateInput);
  const [filteredPrices, setFilteredPrices] = useState([] as PriceRow);
  const [uoa, setUoa] = useState("USD");
  const classes = useStyles();

  useEffect(() => {
    if (!pricesJson) return;
    if (filterDate.error) return;
    const newFilteredPrices = [] as PriceRow[];
    Object.entries(pricesJson).forEach(([date, priceEntry]) => {
      if (filterDate.value && filterDate.value !== date) return null;
      if (Object.keys(priceEntry).length === 0) return null;
      if (Object.keys(priceEntry[uoa] || {}).length === 0) return null;
      Object.entries(priceEntry[uoa] || {}).forEach(([asset, price]) => {
        if (!filterAsset || smeq(filterAsset, asset)) {
          newFilteredPrices.push({ date, asset, price });
        }
      });
    });
    setFilteredPrices(newFilteredPrices.sort((e1: PriceRow, e2: PriceRow): number => {
      return e1.date > e2.date ? -1 : e1.date < e2.date ? 1
        : e1.asset > e2.asset ? 1 : e1.asset < e2.asset ? -1
          : 0;
    }));
  }, [uoa, pricesJson, filterAsset, filterDate]);

  const handleUoaChange = (event: React.ChangeEvent<{ value: string }>) => {
    setUoa(event.target.value);
  };

  const handleFilterChange = (event: React.ChangeEvent<{ value: string }>) => {
    setFilterAsset(event.target.value);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  const syncPrices = async () => {
    if (!transactions) return;
    try {
      setSyncing(true);
      console.log(`Syncing price data for ${transactions.length} transactions`);
      const prices = getPrices({ pricesJson, store, unitOfAccount: uoa });
      for (const tx of transactions) {
        const date = tx.date.split("T")[0];
        const assets = Array.from(new Set([...tx.transfers.map(t => t.assetType)]));
        for (const asset of assets) {
          try {
            if (!prices.getPrice(date, asset)) {
              const res = await axios.get(`/api/prices/${uoa}/${asset}/${date}`, { timeout: 21000 });
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

  const changeFilterDate = (event: React.ChangeEvent<{ value: string }>) => {
    const display = event.target.value;
    let error, value;
    if (display.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/)) {
      value = display;
      error = "";
    } else if (display === "") {
      value = "";
      error = "";
    } else {
      value = "";
      error = "Format date as YYYY-MM-DD";
    }
    setFilterDate({ display, value, error });
  };

  const clearPrices = () => {
    setPrices({});
  };

  return (
    <>

      <Typography variant="h3">
        Price Explorer
      </Typography>

      <Divider/>
      <Typography variant="h4" className={classes.subtitle}>
        Management
      </Typography>

      <Grid alignContent="center" alignItems="center" container spacing={1} className={classes.root}>

        <Grid item>
          <Card className={classes.root}>
            <CardHeader title={"Set Unit of Account"} />
            <FormControl className={classes.select}>
              <InputLabel id="select-asset-type">AssetType</InputLabel>
              <Select
                labelId="select-uoa"
                id="select-uoa"
                value={uoa || ""}
                onChange={handleUoaChange}
              >
                {Object.keys({ ...FiatAssets }).map(asset => (
                  <MenuItem key={asset} value={asset}>{asset}</MenuItem>
                ))}
              </Select>
            </FormControl>
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
      <Typography variant="h4" className={classes.subtitle}>
        Filters
      </Typography>

      <FormControl className={classes.select}>
        <InputLabel id="select-filter-asset">Filter Asset</InputLabel>
        <Select
          labelId="select-filter-asset"
          id="select-filter-asset"
          value={filterAsset || ""}
          onChange={handleFilterChange}
        >
          <MenuItem value={""}>-</MenuItem>
          {Object.keys({ ...EthereumAssets, ...AltChainAssets }).map(asset => (
            <MenuItem key={asset} value={asset}>{asset}</MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField
        autoComplete="off"
        className={classes.dateFilter}
        error={!!filterDate.error}
        helperText={filterDate.error || "YYYY-MM-DD"}
        id="filter-date"
        label="Filter Date"
        margin="normal"
        name="filter-date"
        onChange={changeFilterDate}
        value={filterDate.display || ""}
        variant="outlined"
      />

      <Divider/>

      <Paper className={classes.paper}>

        <Typography align="center" variant="h4" className={classes.title} component="div">
          {`${filteredPrices.length} Prices`}
        </Typography>

        <TableContainer>
          <TablePagination
            rowsPerPageOptions={[25, 50, 100, 250]}
            component="div"
            count={filteredPrices.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onChangePage={handleChangePage}
            onChangeRowsPerPage={handleChangeRowsPerPage}
          />
          <Table>
            <TableHead>
              <TableRow>
                <TableCell> Date </TableCell>
                <TableCell> Asset </TableCell>
                <TableCell> Price ({uoa}) </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredPrices
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((row: PriceRow, i: number) => (
                  <TableRow key={i}>
                    <TableCell> {row.date.replace("T", " ").replace("Z", "")} </TableCell>
                    <TableCell> {row.asset} </TableCell>
                    <TableCell> {row.price} </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
          <TablePagination
            rowsPerPageOptions={[25, 50, 100, 250]}
            component="div"
            count={filteredPrices.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onChangePage={handleChangePage}
            onChangeRowsPerPage={handleChangeRowsPerPage}
          />
        </TableContainer>
      </Paper>

    </>
  );
};
