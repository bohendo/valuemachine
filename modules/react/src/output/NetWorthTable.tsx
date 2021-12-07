import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { PriceFns } from "@valuemachine/prices";
import { Asset, Balances } from "@valuemachine/types";
import { add, div, gt, lt, mul, round } from "@valuemachine/utils";
import React, { useEffect, useState } from "react";

type NetWorthTableProps = {
  balances: Balances;
  prices: PriceFns;
  unit: Asset;
};
export const NetWorthTable: React.FC<NetWorthTableProps> = ({
  balances,
  prices,
  unit,
}: NetWorthTableProps) => {
  const [netWorth, setNetWorth] = useState("0");
  const [todayPrices, setTodayPrices] = useState({} as Balances);
  const [values, setValues] = useState({} as Balances);

  useEffect(() => {
    if (!balances || !todayPrices) return;
    setNetWorth(Object.keys(balances).reduce((total, asset) => {
      return add(total, mul(balances[asset], todayPrices[asset]));
    }, "0"));
  }, [balances, todayPrices]);

  useEffect(() => {
    if (!prices || !unit) return;
    const today = new Date().toISOString();
    setTodayPrices(Object.keys(balances).reduce((total, asset) => {
      total[asset] = prices.getNearest(today, asset, unit) || "0";
      return total;
    }, {} as Balances));
  }, [balances, prices, unit]);

  useEffect(() => {
    if (!balances || !todayPrices) return;
    setValues(Object.keys(balances).reduce((value, asset) => {
      value[asset] = mul(balances[asset], todayPrices[asset]);
      return value;
    }, {} as Balances));
  }, [balances, todayPrices]);

  return (<>
    <Paper sx={{ p: 2 }}>
      <Typography variant="h4" sx={{ p: 2 }}>
        {`Net Worth: ${round(netWorth, 4)} ${unit}`}
      </Typography>
      <TableContainer>
        <Table size="small" sx={{ p: 1, overflow: "auto", minWidth: "36em" }}>
          <TableHead>
            <TableRow>
              <TableCell><strong> Asset </strong></TableCell>
              <TableCell><strong> Amount </strong></TableCell>
              <TableCell><strong> {`Price (${unit}/asset)`} </strong></TableCell>
              <TableCell><strong> {`${unit} Value`} </strong></TableCell>
              <TableCell><strong> {"Share of Total"} </strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Object.entries(values).sort(
              (v1, v2) => lt(v1[1], v2[1]) ? 1 : -1
            ).map(([asset, value]: string[], i: number) => (
              <TableRow  key={i} sx={{ m: 2, ["&>td"]: { borderBottom: 0 } }}>
                <TableCell sx={{ width: "16em", overflow: "hidden" }}> {asset} </TableCell>
                <TableCell> {round(balances[asset])} </TableCell>
                <TableCell> {round(todayPrices[asset], 2)} </TableCell>
                <TableCell> {round(value)} </TableCell>
                <TableCell> {
                  gt(netWorth, "0") ? round(mul(div(value, netWorth), "100"), 4) : "0.0000"
                } </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  </>);
};
