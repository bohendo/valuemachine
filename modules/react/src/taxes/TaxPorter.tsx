import DownloadIcon from "@mui/icons-material/GetApp";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { allTaxYears, getTaxYearBoundaries, getTaxRows, requestF8949 } from "@valuemachine/taxes";
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
  const [taxYear, setTaxYear] = React.useState(allTaxYears);
  const [taxYears, setTaxYears] = React.useState([] as string[]);

  useEffect(() => {
    setTaxYear(allTaxYears);
    setTaxYears(dedup(
      vm?.json?.events?.filter(evt =>
        (evt as TradeEvent).account?.startsWith(guard) ||
        (evt as GuardChangeEvent).to?.startsWith(guard)
      ).map(evt => evt.date.split("-")[0]) || []
    ));
  }, [guard, vm]);

  const handleCsvExport = () => {
    console.log(`Exporting csv for ${taxYear} taxes`);
    const taxes = getTaxRows({ guard, prices, vm, taxYear });
    const output = json2csv(
      taxes.map(row => ({
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
      return;
    }
    requestF8949(vm, prices, guard, taxYear, window);
  };

  const taxYearBoundaries = getTaxYearBoundaries(guard, taxYear);
  // add 10ms in case the boundary is immediately before midnight
  const fmtDate = (time: number) =>
    typeof time === "number" ? new Date(time + 10).toISOString().split("T")[0] : "???";

  return (<>

    <Paper sx={{ p: 3, minWidth: "15em", maxWidth: "30em" }}>
      <Grid container alignItems="center">

        <Grid item xs={12}>
          <Typography variant="h6">
            {`Export ${guard} Tax Info`}
          </Typography>
        </Grid>

        <Grid item xs={12} sm={4} sx={{ px: 1, py: 2, maxWidth: "16em" }}>
          <SelectOne
            choices={taxYears}
            defaultSelection={"all"}
            label="Tax Year"
            selection={taxYear}
            setSelection={setTaxYear}
            sx={{ m: 0, p: 0 }}
          />
        </Grid>

        <Grid item xs={12} sm={8} sx={{ ml: 1, mr: -4 }}>
          <Typography noWrap variant="body1">
            {taxYear === allTaxYears
              ? "Entire financial history"
              : `From ${fmtDate(taxYearBoundaries[0])} to ${fmtDate(taxYearBoundaries[1])}`
            }
          </Typography>
        </Grid>

        <br/>

        <Grid item xs={12} sm={6}>
          <Button
            sx={{ ml: 1, my: 2, maxWidth: "24em" }}
            color="primary"
            fullWidth={false}
            onClick={handleCsvExport}
            size="small"
            startIcon={<DownloadIcon />}
            variant="contained"
          >
            Download CSV
          </Button>
        </Grid>

        {guard === Guards.USA && taxYear !== allTaxYears ?
          <Grid item xs={12} sm={6}>
            <Button
              sx={{ ml: 1, my: 2, maxWidth: "24em" }}
              color="primary"
              fullWidth={false}
              onClick={handleF8949Export}
              size="small"
              startIcon={<DownloadIcon />}
              variant="contained"
            >
              Download F8949
            </Button>
          </Grid>
          : null
        }
      </Grid>
    </Paper>

  </>);
};
