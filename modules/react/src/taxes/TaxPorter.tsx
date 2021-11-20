import DownloadIcon from "@mui/icons-material/GetApp";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import {
  allTaxYears,
  getTaxReturn,
  getTaxYearBoundaries,
  inTaxYear,
  TaxYears,
} from "@valuemachine/taxes";
import { Guards } from "@valuemachine/transactions";
import {
  Guard,
  TaxInput,
  TaxRows,
} from "@valuemachine/types";
import { dedup, digest, math } from "@valuemachine/utils";
import axios from "axios";
import { parse as json2csv } from "json2csv";
import React, { useEffect } from "react";

import { SelectOne } from "../utils";

type TaxPorterProps = {
  guard: Guard;
  taxInput?: TaxInput;
  taxRows: TaxRows;
};
export const TaxPorter: React.FC<TaxPorterProps> = ({
  guard,
  taxInput,
  taxRows,
}: TaxPorterProps) => {
  const [taxYear, setTaxYear] = React.useState(allTaxYears);
  const [taxYears, setTaxYears] = React.useState([] as string[]);

  const taxYearBoundaries = getTaxYearBoundaries(guard, taxYear);

  useEffect(() => {
    setTaxYear(allTaxYears);
    setTaxYears(dedup(
      taxRows.filter(row => row.taxYear.startsWith(guard)).map(row => row.date.split("-")[0]).concat([
        (new Date().getFullYear() - 1).toString() // always provide the option for last year
      ])
    ).sort());
  }, [guard, taxRows]);

  const handleCsvExport = () => {
    console.log(`Exporting csv for ${taxYear} taxes`);
    if (!taxRows?.length) {
      console.warn(`There were no known taxable events in ${taxYear}`);
      return;
    }
    const csvData = taxRows.filter(inTaxYear(guard, taxYear)).map(row => ({
      ...row,
      amount: math.round(row.amount, 6),
      value: math.round(row.value, 2),
      price: math.round(row.price, 4),
      receivePrice: math.round(row.receivePrice, 4),
      capitalChange: math.round(row.capitalChange, 2),
      tag: JSON.stringify(row.tag),
    }));
    const headers = Object.keys(taxRows?.[0] || {});
    console.log(`Exporting csv data w headers: ${headers}`, csvData);
    const output = json2csv(csvData, headers);
    const name = `${guard}-taxes-${digest(output)}.csv`;
    const data = `text/json;charset=utf-8,${encodeURIComponent(output)}`;
    const a = document.createElement("a");
    a.href = "data:" + data;
    a.download = name;
    a.click();
  };

  const handleReturnExport = async (): Promise<void> => {
    if (!guard || !taxYear || !taxInput) return;
    if (guard !== Guards.USA) return;
    const year = taxYear === "2019" ? TaxYears.USA2019 : taxYear === "2020" ? TaxYears.USA2020 : "";
    if (!year || !taxRows?.length) return;
    const forms = getTaxReturn(
      year,
      taxInput,
      taxRows.filter(row => row.taxYear.startsWith(guard)),
    );
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
        link.setAttribute("download", `${year}-tax-return.pdf`);
        window.document.body.appendChild(link);
        link.click();
        res();
      }).catch(rej);
    });
  };

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

        <Grid item sx={{ px: 1, py: 2, maxWidth: "16em" }}>
          <SelectOne
            choices={taxYears}
            defaultSelection={allTaxYears}
            label="Tax Year"
            selection={taxYear}
            setSelection={setTaxYear}
            sx={{ m: 0, p: 0 }}
          />
        </Grid>

        <Grid item sx={{ ml: 1, mr: -4 }}>
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
              onClick={handleReturnExport}
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
