import DownloadIcon from "@mui/icons-material/GetApp";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import {
  allTaxYears,
  getTaxReturn,
  getTaxRows,
  getTaxYearBoundaries,
  TaxYears,
} from "@valuemachine/taxes";
import { Guards } from "@valuemachine/transactions";
import {
  AddressBook,
  Guard,
  GuardChangeEvent,
  Prices,
  TaxInput,
  TradeEvent,
  TxTags,
  ValueMachine,
} from "@valuemachine/types";
import { dedup, round } from "@valuemachine/utils";
import axios from "axios";
import { parse as json2csv } from "json2csv";
import React, { useEffect } from "react";

import { SelectOne } from "../utils";

type TaxPorterProps = {
  addressBook: AddressBook;
  guard: Guard;
  prices: Prices,
  taxInput?: TaxInput;
  txTags?: TxTags;
  vm: ValueMachine,
};
export const TaxPorter: React.FC<TaxPorterProps> = ({
  addressBook,
  guard,
  prices,
  taxInput,
  txTags,
  vm,
}: TaxPorterProps) => {
  const [taxYear, setTaxYear] = React.useState(allTaxYears);
  const [taxYears, setTaxYears] = React.useState([] as string[]);

  useEffect(() => {
    setTaxYear(allTaxYears);
    setTaxYears(dedup(
      (vm?.json?.events?.filter(evt =>
        (evt as TradeEvent).account?.startsWith(guard) ||
        (evt as GuardChangeEvent).to?.startsWith(guard)
      ).map(evt => evt.date.split("-")[0]) || []).concat([
        (new Date().getFullYear() - 1).toString() // always provide the option for last year
      ])
    ).sort());
  }, [guard, vm]);

  const handleCsvExport = () => {
    console.log(`Exporting csv for ${taxYear} taxes`);
    const taxes = getTaxRows({ addressBook, guard, prices, vm, taxYear, txTags });
    if (!taxes?.length) {
      console.warn(`There were no known taxable events in ${taxYear}`);
      return;
    }
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
      Object.keys(taxes?.[0] || {}),
    );
    const name = `${guard}-taxes.csv`;
    const data = `text/json;charset=utf-8,${encodeURIComponent(output)}`;
    const a = document.createElement("a");
    a.href = "data:" + data;
    a.download = name;
    a.click();
  };

  const handleExport = async (): Promise<void> => {
    if (!guard || !taxYear || !vm?.json || !prices?.json || !taxInput) return;
    if (guard !== Guards.USA) return;
    const year = taxYear === "2019" ? TaxYears.USA19 : taxYear === "2020" ? TaxYears.USA20 : "";
    if (!year) return;
    const taxRows = getTaxRows({ addressBook, guard, prices, vm, taxYear, txTags });
    console.log(`Fetching tax return for ${year} w ${Object.keys(taxInput).length} forms`);
    const forms = getTaxReturn(year, taxInput, taxRows);
    return new Promise((res, rej) => {
      axios({
        url: `/api/taxes/${year}`,
        method: "post",
        responseType: "blob",
        data: { forms },
      }).then((response: any) => {
        const url = window.URL.createObjectURL(new window.Blob([response.data]));
        const link = window.document.createElement("a");
        link.href = url;
        link.setAttribute("download", `tax-return-${year}.pdf`);
        window.document.body.appendChild(link);
        link.click();
        res();
      }).catch(rej);
    });
  };

  const taxYearBoundaries = getTaxYearBoundaries(guard, taxYear);
  // add 10ms in case the boundary is immediately before midnight
  const fmtDate = (time: number) =>
    typeof time === "number" ? new Date(time + 10).toISOString().split("T")[0] : "???";

  return (<>

    <Paper sx={{ p: 3, minWidth: "15em", maxWidth: "64em" }}>
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

        {guard === Guards.USA && (taxYear === "2019" || taxYear === "2020") ?
          <Grid item xs={12} sm={6}>
            <Button
              sx={{ ml: 1, my: 2, maxWidth: "24em" }}
              color="primary"
              fullWidth={false}
              onClick={handleExport}
              size="small"
              startIcon={<DownloadIcon />}
              variant="contained"
            >
              Download Tax Return
            </Button>
          </Grid>
          : null
        }
      </Grid>
    </Paper>

  </>);
};
