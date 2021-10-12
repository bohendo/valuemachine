import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import Button from "@material-ui/core/Button";
import Card from "@material-ui/core/Card";
import CardHeader from "@material-ui/core/CardHeader";
import DownloadIcon from "@material-ui/icons/GetApp";
import { getTaxRows, requestF8949 } from "@valuemachine/taxes";
import { Guards } from "@valuemachine/transactions";
import {
  Guard,
  GuardChangeEvent,
  Prices,
  TradeEvent,
  ValueMachine,
} from "@valuemachine/types";
import { dedup, round } from "@valuemachine/utils";
import { parse as json2csv } from "json2csv";
import React, { useEffect } from "react";

import { SelectOne } from "../utils";

const useStyles = makeStyles((theme: Theme) => createStyles({
  button: {
    marginBottom: theme.spacing(4),
    marginLeft: theme.spacing(4),
    marginRight: theme.spacing(4),
    marginTop: theme.spacing(3),
  },
  card: {
    margin: theme.spacing(2),
    minWidth: "255px",
  },
}));

const allTaxYears = "all";

type TaxPorterProps = {
  guard: Guard;
  prices: Prices,
  vm: ValueMachine,
};
export const TaxPorter: React.FC<TaxPorterProps> = ({
  guard,
  prices,
  vm,
}: TaxPorterProps) => {
  const classes = useStyles();
  const [taxYear, setTaxYear] = React.useState(allTaxYears);
  const [taxYears, setTaxYears] = React.useState([] as string[]);

  useEffect(() => {
    setTaxYear(allTaxYears);
    setTaxYears(dedup(
      vm.json.events.filter(evt =>
        (evt as TradeEvent).account?.startsWith(guard) ||
        (evt as GuardChangeEvent).to?.startsWith(guard)
      ).map(evt => evt.date.split("-")[0])
    ));
  }, [guard, vm]);

  const handleCsvExport = () => {
    const taxes = getTaxRows({ guard, prices, vm });
    const output = json2csv(
      taxes.filter(row =>
        taxYear === allTaxYears
        || row.date.startsWith(taxYear)
      ).map(row => ({
        ...row,
        amount: round(row.amount, 6),
        value: round(row.value, 2),
        price: round(row.price, 2),
        receivePrice: round(row.receivePrice, 2),
        capitalChange: round(row.capitalChange, 2),
        cumulativeChange: round(row.cumulativeChange, 2),
        cumulativeIncome: round(row.cumulativeIncome, 2),
      })),
      Object.keys(taxes[0]),
    );
    const name = `${guard}-taxes.csv`;
    const data = `text/json;charset=utf-8,${encodeURIComponent(output)}`;
    const a = document.createElement("a");
    a.href = "data:" + data;
    a.download = name;
    a.click();
  };

  const handleF8949Export = () => {
    if (!vm?.json || !prices?.json || !guard || !taxYear) {
      console.warn(`Missing info, not trying to export f8949`);
      return;
    }
    console.log(`Requesting f8949 for ${taxYear}`);
    requestF8949(vm, prices, guard, taxYear, window);
  };

  return (<>
    <Card className={classes.card}>
      <CardHeader title={`Export ${guard} Tax Info`}/>
      <SelectOne
        label="Tax Year"
        defaultSelection={"all"}
        choices={taxYears}
        selection={taxYear}
        setSelection={setTaxYear}
      />

      <Button
        className={classes.button}
        color="primary"
        fullWidth={false}
        onClick={handleCsvExport}
        size="small"
        startIcon={<DownloadIcon />}
        variant="contained"
      >
        Download CSV
      </Button>

      {guard === Guards.USA && taxYear !== allTaxYears ?
        <Button
          className={classes.button}
          color="primary"
          fullWidth={false}
          onClick={handleF8949Export}
          size="small"
          startIcon={<DownloadIcon />}
          variant="contained"
        >
          Download F8949
        </Button>
        : null}

    </Card>
  </>);
};
