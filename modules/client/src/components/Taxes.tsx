import { commify } from "@ethersproject/units";
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
import { DateInput } from "@valuemachine/react";
import {
  AddressBook,
  Asset,
  Assets,
  DateString,
  DecimalString,
  EventTypes,
  Guard,
  GuardChangeEvent,
  Guards,
  Prices,
  TradeEvent,
  TransferCategories,
  ValueMachine,
} from "@valuemachine/types";
import {
  add,
  mul,
  round as defaultRound,
  sub,
} from "@valuemachine/utils";
import { parse as json2csv } from "json2csv";
import React, { useEffect, useState } from "react";

const { ETH } = Assets;

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
  action: string;
  amount: DecimalString;
  asset: Asset;
  price: DecimalString;
  value: DecimalString;
  receiveDate: DateString;
  receivePrice: DecimalString;
  capitalChange: DecimalString;
  cumulativeChange: DecimalString;
  cumulativeIncome: DecimalString;
};

type PropTypes = {
  addressBook: AddressBook;
  vm: ValueMachine,
  prices: Prices,
};
export const TaxesExplorer: React.FC<PropTypes> = ({
  addressBook,
  vm,
  prices,
}: PropTypes) => {
  const classes = useStyles();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(25);
  const [allGuards, setAllGuards] = useState([] as Guard[]);
  const [guard, setGuard] = React.useState(Guards.Ethereum as Guard);
  const [taxes, setTaxes] = React.useState([] as TaxRow[]);
  const [fromDate, setFromDate] = React.useState("");
  const [toDate, setToDate] = React.useState("");

  const fmtNum = num => {
    const round = defaultRound(num, guard === Guards.Ethereum ? 4 : 2);
    const insert = (str: string, index: number, char: string = ",") =>
      str.substring(0, index) + char + str.substring(index);
    if (guard === Guards.IND) {
      const neg = round.startsWith("-") ? "-" : "";
      const [int, dec] = round.replace("-", "").split(".");
      const len = int.length;
      if (len <= 3) {
        return round;
      } else if (len <= 5) {
        return `${neg}${insert(int, len - 3)}.${dec}`;
      } else if (len <= 7) {
        return `${neg}${insert(insert(int, len - 3), len - 5)}.${dec}`;
      } else if (len <= 9) {
        return `${neg}${
          insert(insert(insert(int, len - 3), len - 5), len - 7)
        }.${dec}`;
      } else {
        return `${neg}${
          insert(insert(insert(insert(int, len - 3), len - 5), len - 7), len - 9)
        }.${dec}`;
      }
    }
    return commify(round);
  };

  useEffect(() => {
    if (!addressBook || !vm?.json?.events?.length) return;
    const newGuards = Array.from(vm.json.events
      .filter(
        e => e.type === EventTypes.Trade || e.type === EventTypes.Income
      ).reduce((all, evt) => {
        const jur = (evt as TradeEvent).account.split("/")[0];
        if (Object.keys(Guards).includes(jur)) {
          all.add(jur);
        }
        return all;
      }, new Set())
    ).sort() as Guard[];
    setAllGuards(newGuards);
    setGuard(newGuards[0]);
  }, [addressBook, vm]);

  useEffect(() => {
    if (!addressBook || !guard || !vm?.json?.events?.length) return;
    let cumulativeIncome = "0";
    let cumulativeChange = "0";
    setTaxes(
      vm?.json?.events.filter(evt => {
        const toJur = (
          (evt as GuardChangeEvent).to || (evt as TradeEvent).account || ""
        ).split("/")[0];
        return toJur === guard && (
          evt.type === EventTypes.Trade
          || evt.type === EventTypes.GuardChange
          || evt.type === EventTypes.Income
        );
      }).reduce((output, evt) => {
        const date = (evt as any).date || new Date().toISOString();
        if (evt.type === EventTypes.Trade) {
          return output.concat(...evt.outputs?.map(chunkIndex => {
            const chunk = vm.getChunk(chunkIndex);
            const price = prices.getPrice(date, chunk.asset);
            const value = mul(chunk.quantity, price || "0");
            if (chunk.history[0]?.date) {
              const receivePrice = prices.getPrice(chunk.history[0]?.date, chunk.asset);
              const capitalChange = mul(chunk.quantity, sub(price || "0", receivePrice || "0"));
              cumulativeChange = add(cumulativeChange, capitalChange);
              return {
                date: date,
                action: EventTypes.Trade,
                amount: chunk.quantity,
                asset: chunk.asset,
                price,
                value,
                receivePrice,
                receiveDate: date, // wrong!
                capitalChange,
                cumulativeChange,
                cumulativeIncome,
              } as TaxRow;
            } else {
              return {
                date: date,
                receiveDate: date, // wrong!
              } as TaxRow;
            }
          }));
        } else if (evt.type === TransferCategories.Income) {
          const price = prices.getPrice(date, ETH/*TODO evt.asset*/);
          const income = mul("0"/*TODO evt.quantity*/, price || "0");
          cumulativeIncome = add(cumulativeIncome, income);
          return output.concat({
            date: date,
            action: TransferCategories.Income,
            amount: "0", // TODO evt.quantity,
            asset: ETH, // TODO evt.asset
            price,
            value: income,
            receivePrice: price,
            receiveDate: date,
            capitalChange: "0",
            cumulativeChange,
            cumulativeIncome,
          } as TaxRow);
        } else if (evt.type === EventTypes.GuardChange) {
          console.warn(evt, `Temporarily pretending this guard change is income`);
          const price = prices.getPrice(date, ETH /*TODO evt.asset*/);
          const income = mul("0"/*TODO evt.quantity*/, price || "0");
          cumulativeIncome = add(cumulativeIncome, income);
          return output.concat({
            date: date,
            action: TransferCategories.Deposit,
            amount: "0", // TODO evt.quantity,
            asset: ETH, // TODO evt.asset
            price,
            value: income,
            receivePrice: price,
            receiveDate: date,
            capitalChange: "0",
            cumulativeChange,
            cumulativeIncome,
          } as TaxRow);
        } else {
          return output;
        }
      }, [] as TaxRow[])
    );
  }, [addressBook, guard, vm, prices]);

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
    const name = `${guard}-taxes.csv`;
    const data = `text/json;charset=utf-8,${encodeURIComponent(output)}`;
    const a = document.createElement("a");
    a.href = "data:" + data;
    a.download = name;
    a.click();
  };

  const handleGuardChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    if (typeof event.target.value !== "string") return;
    setGuard(event.target.value);
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
        Physical security provided by: {allGuards.join(", ")}
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
            <InputLabel id="select-guard">Guard</InputLabel>
            <Select
              labelId="select-guard"
              id="select-guard"
              value={guard || ""}
              onChange={handleGuardChange}
            >
              <MenuItem value={""}>-</MenuItem>
              {allGuards?.map((grd, i) => <MenuItem key={i} value={grd}>{grd}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>

        <Grid item md={8}>
          <Card className={classes.exportCard}>
            <CardHeader title={"Export CSV"}/>
            <DateInput id="from-date" label="From Date" setDate={setFromDate} />
            <DateInput id="to-date" label="To Date" setDate={setToDate} />
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
          {`${taxes.length} Taxable ${guard} Events`}
        </Typography>

        <TableContainer>
          <TablePagination
            rowsPerPageOptions={[25, 50, 100, 250]}
            component="div"
            count={taxes.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong> Date </strong></TableCell>
                <TableCell><strong> Action </strong></TableCell>
                <TableCell><strong> Asset </strong></TableCell>
                <TableCell><strong> {`Price (${guard}/Asset)`} </strong></TableCell>
                <TableCell><strong> {`Value (${guard})`} </strong></TableCell>
                <TableCell><strong> Receive Date </strong></TableCell>
                <TableCell><strong> {`Receive Price (${guard}/Asset)`} </strong></TableCell>
                <TableCell><strong> {`Capital Change (${guard})`} </strong></TableCell>
                <TableCell><strong> {`Cumulative Change (${guard})`} </strong></TableCell>
                <TableCell><strong> {`Cumulative Income (${guard})`} </strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {taxes
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((row: TaxRow, i: number) => (
                  <TableRow key={i}>
                    <TableCell> {row.date.replace("T", " ").replace(".000Z", "")} </TableCell>
                    <TableCell> {row.action} </TableCell>
                    <TableCell> {`${fmtNum(row.amount)} ${row.asset}`} </TableCell>
                    <TableCell> {fmtNum(row.price)} </TableCell>
                    <TableCell> {fmtNum(row.value)} </TableCell>
                    <TableCell> {row.receiveDate.replace("T", " ").replace(".000Z", "")} </TableCell>
                    <TableCell> {fmtNum(row.receivePrice)} </TableCell>
                    <TableCell> {fmtNum(row.capitalChange)} </TableCell>
                    <TableCell> {fmtNum(row.cumulativeChange)} </TableCell>
                    <TableCell> {fmtNum(row.cumulativeIncome)} </TableCell>
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
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </TableContainer>
      </Paper>

    </>
  );
};
