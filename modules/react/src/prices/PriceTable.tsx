import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { PriceFns, PriceJson, PriceEntry } from "@valuemachine/prices";
import {
  EvmAssets,
  UtxoAssets,
  FiatCurrencies,
} from "@valuemachine/transactions";
import { Asset } from "@valuemachine/types";
import { chrono, dedup, math } from "@valuemachine/utils";
import React, { useEffect, useState } from "react";

import { DateInput, SelectOne } from "../utils";

type PriceTableProps = {
  prices: PriceFns;
  unit?: Asset,
};
export const PriceTable: React.FC<PriceTableProps> = ({
  prices,
  unit,
}: PriceTableProps) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(25);
  const [allAssets, setAllAssets] = useState([] as Asset[]);
  const [filterAsset, setFilterAsset] = useState("");
  const [filterUnit, setFilterUnit] = useState(unit);
  const [filterDate, setFilterDate] = useState("");
  const [filteredPrices, setFilteredPrices] = useState([] as PriceJson);

  useEffect(() => {
    setAllAssets(dedup(prices?.getJson().map(entry => entry.asset)));
  }, [prices]);

  useEffect(() => {
    if (!prices?.getJson()) return;
    const newFilteredPrices = prices.getJson().filter(entry => (
      !filterDate || entry.date.startsWith(filterDate)
    ) && (
      (!filterUnit || entry.unit === filterUnit) &&
      (!unit || entry.unit === unit)
    ) && (
      !filterAsset || entry.asset === filterAsset
    ));
    setFilteredPrices(newFilteredPrices);
  }, [unit, prices, filterAsset, filterDate, filterUnit]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  return (
    <Paper sx={{ p: 2 }}>

      <Grid container>
        <Grid item xs={12}>
          <Typography align="center" variant="h4" sx={{ m: 2 }} component="div">
            {`${filteredPrices.length} ${
              unit ? `${unit} ` : ""
            }Price${filteredPrices.length === 1 ? "" : "s"}`}
          </Typography>
        </Grid>

        <Grid item>
          <SelectOne
            label="Filter Asset"
            choices={allAssets}
            selection={filterAsset}
            setSelection={setFilterAsset}
          />
        </Grid>

        {!unit ? (
          <Grid item>
            <SelectOne
              label="Filter Unit"
              choices={Object.keys({ ...FiatCurrencies, ...EvmAssets, ...UtxoAssets })}
              selection={filterUnit}
              setSelection={setFilterUnit}
            />
          </Grid>
        ) : null}

        <Grid item>
          <DateInput
            id="prices-filter-date"
            label="Filter Date"
            setDate={setFilterDate}
          />
        </Grid>
      </Grid>

      <TableContainer>
        <Table sx={{ minWidth: "40em"  }}>
          <TableHead>
            <TableRow>
              <TableCell> Date </TableCell>
              {!unit ? <TableCell> Unit </TableCell> : null}
              <TableCell> Asset </TableCell>
              <TableCell> Price </TableCell>
              <TableCell> Source </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredPrices
              .sort(chrono)
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((entry: PriceEntry, i: number) => (
                <TableRow key={i}>
                  <TableCell style={{ width: "120px" }}>
                    {entry.date.replace("T", " ").replace("Z", "")}
                  </TableCell>
                  {!unit ? (
                    <TableCell>
                      {entry.unit}
                    </TableCell>
                  ) : null}
                  <TableCell>
                    {entry.asset}
                  </TableCell>
                  <TableCell>
                    {math.round(entry.price, 6)}
                  </TableCell>
                  <TableCell>
                    {entry.source}
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
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>
    </Paper>
  );
};
