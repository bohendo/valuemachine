import { getPrices } from "@finances/core";
import {
  DateString,
  PricesJson,
  DecimalString,
  Assets,
  EventTypes,
  Events,
  Fiat,
  TransferCategories,
} from "@finances/types";
import { getJurisdiction, math } from "@finances/utils";
import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import Button from "@material-ui/core/Button";
import Card from "@material-ui/core/Card";
import CardHeader from "@material-ui/core/CardHeader";
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
import DownloadIcon from "@material-ui/icons/GetApp";
import { parse as json2csv } from "json2csv";
import React, { useEffect, useState } from "react";

import { store } from "../store";

import { InputDate } from "./InputDate";

const { add, mul, sub } = math;
const round = (num: DecimalString): DecimalString => math.round(num, 4);

const useStyles = makeStyles((theme: Theme) => createStyles({
  root: {
    margin: theme.spacing(1),
  },
  paper: {
    minWidth: "500px",
    padding: theme.spacing(2),
  },
  select: {
    margin: theme.spacing(3),
    minWidth: "160px",
  },
  title: {
    paddingTop: theme.spacing(2),
  },
  exportButton: {
    marginBottom: theme.spacing(4),
    marginLeft: theme.spacing(4),
    marginRight: theme.spacing(4),
    marginTop: theme.spacing(0),
  },
  exportCard: {
    margin: theme.spacing(2),
    minWidth: "255px",
  },
}));

type TaxRow = {
  date: DateString;
  action: EventTypes.Trade | TransferCategories.Income;
  amount: DecimalString;
  asset: Assets;
  price: DecimalString;
  value: DecimalString;
  receiveDate: DateString;
  receivePrice: DecimalString;
  capitalChange: DecimalString;
  cumulativeChange: DecimalString;
  cumulativeIncome: DecimalString;
};

export const TaxesExplorer = ({
  events,
  pricesJson,
}: {
  events: Events,
  pricesJson: PricesJson,
}) => {
  const classes = useStyles();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(25);
  const [allJurisdictions, setAllJurisdictions] = useState([]);
  const [jurisdiction, setJurisdiction] = React.useState(0);
  const [taxes, setTaxes] = React.useState([] as TaxRow[]);
  const [fromDate, setFromDate] = React.useState("");
  const [toDate, setToDate] = React.useState("");

  useEffect(() => {
    const newJurisdictions = Array.from(events
      .filter(e => e.type === EventTypes.JurisdictionChange)
      .reduce((all, cur) => {
        Object.keys(Fiat).includes(cur.oldJurisdiction) && all.add(cur.oldJurisdiction);
        Object.keys(Fiat).includes(cur.newJurisdiction) && all.add(cur.newJurisdiction);
        return all;
      }, new Set())
    ).sort((j1, j2) => j2 > j1 ? 1 : -1).sort((j1, j2) =>
      !Object.keys(Fiat).includes(j1) && Object.keys(Fiat).includes(j2) ? 1 : -1
    );
    setAllJurisdictions(newJurisdictions);
    setJurisdiction(newJurisdictions[0]);
  }, [events]);

  useEffect(() => {
    if (!jurisdiction || !events?.length) return;
    const prices = getPrices({ pricesJson, store, unit: jurisdiction });
    let cumulativeIncome = "0";
    let cumulativeChange = "0";
    setTaxes(
      events.filter(evt => {
        const toJur = getJurisdiction(evt.to || evt.account);
        const fromJur = getJurisdiction(evt.from || evt.account);
        return (
          evt.type === EventTypes.Trade
          || evt.type === EventTypes.JurisdictionChange
          || (evt.type === EventTypes.Transfer && evt.category === TransferCategories.Income)
        ) && (
          jurisdiction === toJur || jurisdiction === fromJur
        );
      }).reduce((output, evt) => {
        if (evt.type === EventTypes.Trade) {
          return output.concat(...evt.spentChunks.map(chunk => {
            const price = prices.getPrice(evt.date, chunk.asset);
            const value = mul(chunk.quantity, price);
            const receivePrice = prices.getPrice(chunk.receiveDate, chunk.asset);
            const capitalChange = mul(chunk.quantity, sub(price, receivePrice));
            cumulativeChange = add(cumulativeChange, capitalChange);
            return {
              date: evt.date,
              action: EventTypes.Trade,
              amount: chunk.quantity,
              asset: chunk.asset,
              price,
              value,
              receivePrice,
              receiveDate: chunk.receiveDate,
              capitalChange,
              cumulativeChange,
              cumulativeIncome,
            };
          }));
        } else if (evt.category === TransferCategories.Income) {
          const price = prices.getPrice(evt.date, evt.asset);
          const income = mul(evt.quantity, price);
          cumulativeIncome = add(cumulativeIncome, income);
          return output.concat({
            date: evt.date,
            action: TransferCategories.Income,
            amount: evt.quantity,
            asset: evt.asset,
            price,
            value: income,
            receivePrice: price,
            receiveDate: evt.date,
            capitalChange: "0",
            cumulativeChange,
            cumulativeIncome,
          });
        } else if (evt.type === EventTypes.JurisdictionChange) {
          console.warn(evt, `Temporarily pretending this jurisdiction change is income`);
          const price = prices.getPrice(evt.date, evt.asset);
          const income = mul(evt.quantity, price);
          cumulativeIncome = add(cumulativeIncome, income);
          return output.concat({
            date: evt.date,
            action: TransferCategories.Income,
            amount: evt.quantity,
            asset: evt.asset,
            price,
            value: income,
            receivePrice: price,
            receiveDate: evt.date,
            capitalChange: "0",
            cumulativeChange,
            cumulativeIncome,
          });
        } else {
          return output;
        }
      }, [])
    );
  }, [jurisdiction, events, pricesJson]);

  const handleExport = () => {
    if (!taxes?.length) { console.warn("Nothing to export"); return; }
    const getDate = (timestamp: string): string =>
      (new Date(timestamp)).toISOString().split("T")[0];
    const output = json2csv(
      taxes.filter(row =>
        (!fromDate || getDate(row.date) >= getDate(fromDate)) &&
        (!toDate || getDate(row.date) <= getDate(toDate))
      ),
      Object.keys(taxes[0]),
    );
    const name = `${jurisdiction}-taxes.csv`;
    const data = `text/json;charset=utf-8,${encodeURIComponent(output)}`;
    const a = document.createElement("a");
    a.href = "data:" + data;
    a.download = name;
    a.click();
  };

  const handleJurisdictionChange = (event: React.ChangeEvent<{ value: string }>) => {
    setJurisdiction(event.target.value);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  return (
    <>
      <Typography variant="h3">
        Taxes Explorer
      </Typography>
      <Divider/>

      <Typography variant="body1" className={classes.root}>
        Physical security provided by: {allJurisdictions.join(", ")}
      </Typography>

      <Grid
        alignContent="center"
        alignItems="center"
        container
        spacing={1}
        className={classes.root}
      >

        <Grid item md={4}>
          <FormControl className={classes.select}>
            <InputLabel id="select-jurisdiction">Jurisdication</InputLabel>
            <Select
              labelId="select-jurisdiction"
              id="select-jurisdiction"
              value={jurisdiction || ""}
              onChange={handleJurisdictionChange}
            >
              <MenuItem value={""}>-</MenuItem>
              {allJurisdictions?.map((jur, i) => <MenuItem key={i} value={jur}>{jur}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>

        <Grid item md={8}>
          <Card className={classes.exportCard}>
            <CardHeader title={"Export CSV"}/>

            <InputDate label="From Date" setDate={setFromDate} />
            <InputDate label="To Date" setDate={setToDate} />

            <Button
              className={classes.exportButton}
              color="primary"
              fullWidth={false}
              onClick={handleExport}
              size="small"
              startIcon={<DownloadIcon />}
              variant="contained"
            >
              Download
            </Button>
          </Card>
        </Grid>

      </Grid>

      <Paper className={classes.paper}>

        <Typography align="center" variant="h4" className={classes.title} component="div">
          {`${taxes.length} Taxable ${jurisdiction} Events`}
        </Typography>

        <TableContainer>
          <TablePagination
            rowsPerPageOptions={[25, 50, 100, 250]}
            component="div"
            count={taxes.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onChangePage={handleChangePage}
            onChangeRowsPerPage={handleChangeRowsPerPage}
          />
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong> Date </strong></TableCell>
                <TableCell><strong> Action </strong></TableCell>
                <TableCell><strong> Asset </strong></TableCell>
                <TableCell><strong> Price </strong></TableCell>
                <TableCell><strong> {`${jurisdiction} Value`} </strong></TableCell>
                <TableCell><strong> Receive Date </strong></TableCell>
                <TableCell><strong> Receive Price </strong></TableCell>
                <TableCell><strong> Capital Change </strong></TableCell>
                <TableCell><strong> Cumulative Change </strong></TableCell>
                <TableCell><strong> Cumulative Income </strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {taxes
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((row: TaxRow, i: number) => (
                  <TableRow key={i}>
                    <TableCell> {row.date.replace("T", " ").replace(".000Z", "")} </TableCell>
                    <TableCell> {row.action} </TableCell>
                    <TableCell> {`${round(row.amount)} ${row.asset}`} </TableCell>
                    <TableCell> {round(row.price)} </TableCell>
                    <TableCell> {round(row.value)} </TableCell>
                    <TableCell> {row.receiveDate.replace("T", " ").replace(".000Z", "")} </TableCell>
                    <TableCell> {round(row.receivePrice)} </TableCell>
                    <TableCell> {round(row.capitalChange)} </TableCell>
                    <TableCell> {round(row.cumulativeChange)} </TableCell>
                    <TableCell> {round(row.cumulativeIncome)} </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
          <TablePagination
            rowsPerPageOptions={[25, 50, 100, 250]}
            component="div"
            count={taxes.length}
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
