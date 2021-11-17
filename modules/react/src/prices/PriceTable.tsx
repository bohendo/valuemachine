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
import {
  Cryptocurrencies,
  FiatCurrencies,
} from "@valuemachine/transactions";
import {
  Asset,
  Prices,
  PricesJson,
} from "@valuemachine/types";
import { sigfigs } from "@valuemachine/utils";
import React, { useEffect, useState } from "react";

import { DateInput, SelectOne } from "../utils";

type PriceTableProps = {
  prices: Prices;
  unit: Asset,
};
export const PriceTable: React.FC<PriceTableProps> = ({
  prices,
  unit,
}: PriceTableProps) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(25);
  const [filterAsset, setFilterAsset] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filteredPrices, setFilteredPrices] = useState({} as PricesJson);

  useEffect(() => {
    if (!prices) return;
    const newFilteredPrices = {} as PricesJson;
    Object.entries(prices.json).forEach(([date, priceList]) => {
      if (filterDate && !date.startsWith(filterDate.split("T")[0])) return null;
      if (Object.keys(priceList).length === 0) return null;
      if (Object.keys(priceList[unit] || {}).length === 0) return null;
      Object.entries(priceList[unit] || {}).forEach(([asset, price]) => {
        if (!filterAsset || filterAsset === asset) {
          newFilteredPrices[date] = newFilteredPrices[date] || {};
          newFilteredPrices[date][unit] = newFilteredPrices[date][unit] || {};
          newFilteredPrices[date][unit][asset] = price;
        }
      });
      return null;
    });
    setFilteredPrices(newFilteredPrices);
  }, [unit, prices, filterAsset, filterDate]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  const byAsset = (e1, e2) => (e1[0] < e2[0]) ? -1 : 1;

  return (
    <Paper sx={{ p: 2, minWidth: "70em" }}>

      <Grid container>
        <Grid item xs={12}>
          <Typography align="center" variant="h4" sx={{ m: 2 }} component="div">
            {`${unit} Prices on ${Object.keys(filteredPrices).length} days`}
          </Typography>
        </Grid>

        <Grid item>
          <SelectOne
            label="Filter Asset"
            choices={Object.keys({ ...FiatCurrencies, ...Cryptocurrencies })}
            selection={filterAsset}
            setSelection={setFilterAsset}
          />
        </Grid>

        <Grid item>
          <DateInput
            id="prices-filter-date"
            label="Filter Date"
            setDate={setFilterDate}
          />
        </Grid>
      </Grid>

      <TableContainer>
        <TablePagination
          rowsPerPageOptions={[25, 50, 100, 250]}
          component="div"
          count={Object.keys(filteredPrices).length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
        <Table sx={{ maxWidth: 0.98 }}>
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
                    <Table sx={{ maxWidth: 0.98 }}>
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
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>
    </Paper>
  );
};
