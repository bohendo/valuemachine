import { getPrices } from "@finances/core";
import {
  AssetTypes,
  AltChainAssets,
  EthereumAssets,
  FiatAssets,
  Prices,
  PricesJson,
  TransactionsJson,
} from "@finances/types";
import { math, smeq } from "@finances/utils";
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
  title: {
    margin: theme.spacing(2),
  },
  subtitle: {
    margin: theme.spacing(2),
  },
  dateFilter: {
    margin: theme.spacing(2),
  },
  table: {
    maxWidth: "98%",
  },
  subtable: {
    maxWidth: "98%",
    // overflow: "scroll",
  },
  subtableCell: {
    maxWidth: "100px",
    // overflow: "scroll",
  },
}));

type DateInput = {
  value: string;
  display: string;
  error: string;
};

const emptyDateInput = { value: "", display: "", error: "" } as DateInput;

export const PriceManager = ({
  pricesJson,
  setPricesJson,
  transactions,
}: {
  pricesJson: PricesJson;
  setPricesJson: (val: PricesJson) => void;
  transactions: TransactionsJson,
}) => {
  const [prices, setPrices] = useState({} as Prices);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(25);
  const [syncing, setSyncing] = useState(false);
  const [filterAsset, setFilterAsset] = useState("");
  const [filterDate, setFilterDate] = useState(emptyDateInput);
  const [filteredPrices, setFilteredPrices] = useState({} as PricesJson);
  const [uoa, setUoa] = useState(AssetTypes.ETH);
  const classes = useStyles();

  useEffect(() => {
    if (!pricesJson || !Object.keys(prices).length) return;
    if (filterDate.error) return;
    const newFilteredPrices = {} as PricesJson;
    Object.entries(pricesJson).forEach(([date, priceList]) => {
      if (filterDate.value && filterDate.value !== date.split("T")[0]) return null;
      if (Object.keys(priceList).length === 0) return null;
      if (Object.keys(priceList[uoa] || {}).length === 0) return null;
      Object.entries(priceList[uoa] || {}).forEach(([asset, price]) => {
        if (!filterAsset || smeq(filterAsset, asset)) {
          newFilteredPrices[date] = newFilteredPrices[date] || {};
          newFilteredPrices[date][uoa] = newFilteredPrices[date][uoa] || {};
          newFilteredPrices[date][uoa][asset] = price;
        }
      });
    });
    setFilteredPrices(newFilteredPrices);
  }, [uoa, prices, pricesJson, filterAsset, filterDate]);

  useEffect(() => {
    setPrices(getPrices({ pricesJson, store, unitOfAccount: uoa }));
  }, [pricesJson, uoa]);

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
    if (!transactions) {
      console.warn(`No transactions to sync`);
      return;
    }
    setSyncing(true);
    console.log(`Syncing price data for ${transactions.length} transactions`);
    try {
      for (const i in transactions) {
        const transaction = transactions[i];
        // Only sync via server if we're missing some prices
        const missing = Array.from(new Set([...transaction.transfers.map(t => t.assetType)]))
          .map(asset => prices.getPrice(transaction.date, asset))
          .filter(p => !p).length;
        if (missing > 0) {
          const res = await axios({
            method: "post",
            url: `/api/prices/${uoa}`,
            data: { transaction },
          });
          console.log(res.data, `got prices for transaction ${i}`);
          prices.merge(res.data);
          setPricesJson({ ...prices.json });
        }
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
    setPricesJson({});
  };

  const countPrices = (input: PricesJson): number =>
    Object.values(input).reduce((output, uoa) => {
      return output + Object.values(uoa).reduce((inter, asset) => {
        return inter + Object.values(asset).length;
      }, 0);
    }, 0);

  const byAsset = (e1, e2) => (e1[0] < e2[0]) ? -1 : 1;

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
                {Object.keys({ ...FiatAssets }).concat(["ETH"]).map(asset => (
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
            {`Sync ${uoa} Prices for ${transactions.length} Transactions`}
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
          {countPrices(filteredPrices) === prices.getCount?.(uoa)
            ? `${countPrices(filteredPrices)} ${uoa} Prices`
            : `${countPrices(filteredPrices)} of ${prices.getCount?.(uoa)} ${uoa} Prices`
          }
        </Typography>

        <TableContainer>
          <TablePagination
            rowsPerPageOptions={[25, 50, 100, 250]}
            component="div"
            count={Object.keys(filteredPrices).length}
            rowsPerPage={rowsPerPage}
            page={page}
            onChangePage={handleChangePage}
            onChangeRowsPerPage={handleChangeRowsPerPage}
          />
          <Table className={classes.table}>
            <TableHead>
              <TableRow>
                <TableCell> Date </TableCell>
                <TableCell> Prices ({uoa}) </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Object.entries(filteredPrices)
                .sort((e1, e2) => new Date(e2[0]).getTime() - new Date(e1[0]).getTime())
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map(([date, list], i: number) => (
                  <TableRow key={i}>
                    <TableCell style={{ minWidth: "120px" }}>
                      {date.replace("T", " ").replace("Z", "")}
                    </TableCell>
                    <TableCell>
                      <Table className={classes.subtable}>
                        <TableHead>
                          <TableRow>
                            {Object.entries(list[uoa] || {})
                              .sort(byAsset)
                              .map(e => e[0])
                              .map(asset => (
                                <TableCell style={{ width: "120px" }} key={asset}>
                                  <strong> {asset} </strong>
                                </TableCell>
                              ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          <TableRow>
                            {Object.entries(list[uoa] || {})
                              .sort(byAsset)
                              .map(e => e[1])
                              .map((price, i) => (
                                <TableCell style={{ width: "120px" }} key={i}>
                                  {math.sigfigs(price, 3)}
                                </TableCell>
                              ))}
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
          <TablePagination
            rowsPerPageOptions={[25, 50, 100, 250]}
            component="div"
            count={Object.keys(filteredPrices).length}
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
