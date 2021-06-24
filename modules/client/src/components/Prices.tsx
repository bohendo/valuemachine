import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import Button from "@material-ui/core/Button";
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
import Typography from "@material-ui/core/Typography";
import SyncIcon from "@material-ui/icons/Sync";
import ClearIcon from "@material-ui/icons/Delete";
import {
  Assets,
  Blockchains,
  EthereumAssets,
  Prices,
  PricesJson,
  ValueMachine,
} from "@valuemachine/types";
import { sigfigs, smeq } from "@valuemachine/utils";
import React, { useEffect, useState } from "react";
import axios from "axios";

import { InputDate } from "./InputDate";

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
    minWidth: "550px",
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

export const PriceManager = ({
  prices,
  setPricesJson,
  vm,
  unit,
}: {
  prices: Prices;
  setPricesJson: (val: PricesJson) => void;
  vm: ValueMachine,
  unit: Assets,
}) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(25);
  const [syncing, setSyncing] = useState(false);
  const [filterAsset, setFilterAsset] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filteredPrices, setFilteredPrices] = useState({} as PricesJson);
  const classes = useStyles();

  useEffect(() => {
    if (!prices) return;
    const newFilteredPrices = {} as PricesJson;
    Object.entries(prices.json).forEach(([date, priceList]) => {
      if (filterDate && !date.startsWith(filterDate.split("T")[0])) return null;
      if (Object.keys(priceList).length === 0) return null;
      if (Object.keys(priceList[unit] || {}).length === 0) return null;
      Object.entries(priceList[unit] || {}).forEach(([asset, price]) => {
        if (!filterAsset || smeq(filterAsset, asset)) {
          newFilteredPrices[date] = newFilteredPrices[date] || {};
          newFilteredPrices[date][unit] = newFilteredPrices[date][unit] || {};
          newFilteredPrices[date][unit][asset] = price;
        }
      });
    });
    setFilteredPrices(newFilteredPrices);
  }, [unit, prices, filterAsset, filterDate]);

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
    if (!vm) {
      console.warn(`No vm is available to sync`);
      return;
    }
    if (!prices) {
      console.warn(`No prices utils are available`);
      return;
    }
    setSyncing(true);
    console.log(`Syncing price data for ${vm.json.chunks.length} chunks`);
    try {
      console.info(`Syncing prices for chunks`, vm.json.chunks);
      const newPrices = (await axios.post(
        `/api/prices/chunks/${unit}`,
        { chunks: vm.json.chunks },
      )).data;
      console.info(`Synced new prices`, newPrices);
      prices.merge(newPrices);
      setPricesJson({ ...prices.json });
    } catch (e) {
      console.error(`Failed to sync prices:`, e);
    }
    setSyncing(false);
  };

  const clearPrices = () => {
    setPricesJson({});
  };

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
          <Button
            className={classes.button}
            disabled={syncing}
            onClick={syncPrices}
            startIcon={syncing ? <CircularProgress size={20} /> : <SyncIcon/>}
            variant="outlined"
          >
            {`Sync ${unit} Prices For ${vm.json.chunks.length} Chunks`}
          </Button>
          <Button
            className={classes.button}
            disabled={!Object.keys(prices.json).length}
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
          {Object.keys({ ...EthereumAssets, ...Blockchains }).map(asset => (
            <MenuItem key={asset} value={asset}>{asset}</MenuItem>
          ))}
        </Select>
      </FormControl>

      <InputDate
        label="Filter Date"
        setDate={setFilterDate}
      />

      <Divider/>

      <Paper className={classes.paper}>

        <Typography align="center" variant="h4" className={classes.title} component="div">
          {`${unit} Prices on ${Object.keys(filteredPrices).length} days`}
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
                <TableCell> Prices ({unit}) </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Object.entries(filteredPrices)
                .sort((e1, e2) => new Date(e2[0]).getTime() - new Date(e1[0]).getTime())
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map(([date, list], i: number) => (
                  <TableRow key={i}>
                    <TableCell style={{ width: "120px" }}><strong>
                      {date.replace("T", " ").replace("Z", "")}
                    </strong></TableCell>
                    <TableCell>
                      <Table className={classes.subtable}>
                        <TableHead>
                          <TableRow>
                            {Object.entries(list[unit] || {})
                              .sort(byAsset)
                              .map(e => e[0])
                              .map(asset => (
                                <TableCell style={{ maxWidth: "120px" }} key={asset}>
                                  <strong> {asset} </strong>
                                </TableCell>
                              ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          <TableRow>
                            {Object.entries(list[unit] || {})
                              .sort(byAsset)
                              .map(e => e[1])
                              .map((price, i) => (
                                <TableCell style={{ maxWidth: "120px" }} key={i}>
                                  {sigfigs(price, 3)}
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
