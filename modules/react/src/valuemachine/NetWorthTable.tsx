import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableContainer from "@material-ui/core/TableContainer";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import Typography from "@material-ui/core/Typography";
import { Asset, Balances, Prices } from "@valuemachine/types";
import { add, div, gt, lt, mul, round } from "@valuemachine/utils";
import React, { useEffect, useState } from "react";

const useStyles = makeStyles((theme: Theme) => createStyles({
  paper: {
    padding: theme.spacing(2),
  },
  title: {
    margin: theme.spacing(2),
  },
  table: {
    minWidth: theme.spacing(56),
    overflow: "auto",
    padding: theme.spacing(1),
  },
  row: {
    margin: theme.spacing(0),
    "&:last-child th, &:last-child td": {
      borderBottom: 0,
    },
  },
  assetColumn: {
    maxWidth: theme.spacing(24),
    minWidth: theme.spacing(24),
    width: theme.spacing(24),
    overflow: "hidden",
  },
}));

type NetWorthTableProps = {
  balances: Balances;
  prices: Prices;
  unit: Asset;
};
export const NetWorthTable: React.FC<NetWorthTableProps> = ({
  balances,
  prices,
  unit,
}: NetWorthTableProps) => {
  const classes = useStyles();
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
    <Paper className={classes.paper}>
      <Typography variant="h4" className={classes.title}>
        {`Net Worth: ${round(netWorth, 4)} ${unit}`}
      </Typography>
      <TableContainer>
        <Table size="small" className={classes.table}>
          <TableHead>
            <TableRow>
              <TableCell><strong> Asset </strong></TableCell>
              <TableCell><strong> Amount </strong></TableCell>
              <TableCell><strong> {`Price (${unit}/asset)`} </strong></TableCell>
              <TableCell><strong> {`${unit} Value`} </strong></TableCell>
              <TableCell><strong> Share </strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Object.entries(values).sort(
              (v1, v2) => lt(v1[1], v2[1]) ? 1 : -1
            ).map(([asset, value]: string[], i: number) => (
              <TableRow  key={i} className={classes.row}>
                <TableCell className={classes.assetColumn}> {asset} </TableCell>
                <TableCell> {round(balances[asset])} </TableCell>
                <TableCell> {round(todayPrices[asset], 2)} </TableCell>
                <TableCell> {round(value)} </TableCell>
                <TableCell> {gt(netWorth, "0") ? round(mul(div(value, netWorth), "100"), 4) : "0.0000"} </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  </>);
};
