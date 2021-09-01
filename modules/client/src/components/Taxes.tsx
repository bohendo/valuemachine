import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import Button from "@material-ui/core/Button";
import Card from "@material-ui/core/Card";
import CardHeader from "@material-ui/core/CardHeader";
import Divider from "@material-ui/core/Divider";
import FormControl from "@material-ui/core/FormControl";
import Grid from "@material-ui/core/Grid";
import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import Select from "@material-ui/core/Select";
import Typography from "@material-ui/core/Typography";
import DownloadIcon from "@material-ui/icons/GetApp";
import { DateInput, TaxTable } from "@valuemachine/react";
import {
  Assets,
  Guards,
  PhysicalGuards,
} from "@valuemachine/transactions";
import {
  AddressBook,
  Asset,
  DateString,
  DecimalString,
  EventTypes,
  Guard,
  GuardChangeEvent,
  Prices,
  TradeEvent,
  TransferCategories,
  ValueMachine,
} from "@valuemachine/types";
import {
  add,
  mul,
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
  const [allGuards, setAllGuards] = useState([] as Guard[]);
  const [guard, setGuard] = React.useState(Guards.Ethereum as Guard);
  const [taxes, setTaxes] = React.useState([] as TaxRow[]);
  const [fromDate, setFromDate] = React.useState("");
  const [toDate, setToDate] = React.useState("");

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
    setAllGuards(newGuards.filter(g => Object.keys(PhysicalGuards).includes(g)));
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
              {allGuards?.map((g, i) => <MenuItem key={i} value={g}>{g}</MenuItem>)}
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

      <TaxTable addressBook={addressBook} prices={prices} vm={vm} guard={guard}/>

    </>
  );
};
