import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import {
  getBusinessIncome,
  securityFeeMap,
  getTotalCapitalChange,
  getGetTotalIncome,
  getGetTotalTaxableIncome,
  getTotalTax,
} from "@valuemachine/taxes";
import { Assets } from "@valuemachine/transactions";
import {
  Asset,
  Guard,
  Prices,
  TaxInput,
  TaxRows,
} from "@valuemachine/types";
import { dedup, math } from "@valuemachine/utils";
import React, { useEffect, useState } from "react";

const getUnit = (guard, defaultUnit) => 
  (guard ? securityFeeMap[guard] : null) || defaultUnit || Assets.ETH;

const getRepricer = (unit, prices) => row => {
  if (!unit || !prices) return row;
  const fromUnit = getUnit(row.taxYear.substring(0, 3), unit);
  if (fromUnit !== unit) {
    const newRow = { ...row };
    const conversion = prices?.getNearest(row.date, fromUnit, unit) || "1";
    newRow.price = math.mul(conversion, row.price);
    newRow.receivePrice = math.mul(conversion, row.receivePrice);
    newRow.value = math.mul(conversion, row.value);
    newRow.capitalChange = math.mul(conversion, row.capitalChange);
    return newRow;
  } else {
    return row;
  }
};

type TaxSummaryProps = {
  guard?: Guard;
  prices?: Prices;
  taxInput: TaxInput;
  taxRows: TaxRows;
  unit?: Asset;
};
export const TaxSummary: React.FC<TaxSummaryProps> = ({
  guard,
  prices,
  taxInput,
  taxRows,
  unit: userUnit,
}: TaxSummaryProps) => {
  const [taxYears, setTaxYears] = React.useState([] as string[]);
  const [unit, setUnit] = React.useState(getUnit(guard, userUnit));
  const [repricedRows, setRepricedRows] = useState([] as TaxRows);

  console.log(`Years w guard=${guard} activity: ${taxYears}`);

  useEffect(() => {
    setUnit(getUnit(guard, userUnit));
  }, [guard, userUnit]);

  useEffect(() => {
    const rowsByGuard = taxRows.filter(row => !guard || row.taxYear.startsWith(guard));
    if (guard) {
      console.log(`Repricing ${rowsByGuard.length} of ${
        taxRows.length
      } rows that have guard === ${guard}`);
    } else {
      console.log(`Repricing ALL rows bc no guard was provided`);
    }
    const repriced = rowsByGuard.map(getRepricer(unit, prices));
    setRepricedRows(repriced);
    setTaxYears(dedup(repriced.map(row => row.taxYear)).sort((y1, y2) =>
      parseInt(y2.substring(3)) - parseInt(y1.substring(3))
    ));
  }, [guard, prices, taxRows, unit]);

  return (<>
    <Paper sx={{ p: 3 }}>

      <Typography variant="h6">
        {`Unit of Account: ${unit}`}
      </Typography>

      <TableContainer>
        <Table size="small" sx={{ minWidth: "20em", overflow: "auto" }}>
          <TableHead>
            <TableRow>
              <TableCell><strong> {"Tax Year"} </strong></TableCell>
              <TableCell><strong> {"Business Income"} </strong></TableCell>
              <TableCell><strong> {"Capital Change"} </strong></TableCell>
              <TableCell><strong> {"Total Income"} </strong></TableCell>
              <TableCell><strong> {"Taxable Income"} </strong></TableCell>
              <TableCell><strong> {"Taxes Due"} </strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {/*<TableRow> Add totals of all taxYears to the top row</TableRow>*/}
            {taxYears.map((taxYear, i) => (
              <TableRow key={i}>

                <TableCell> {taxYear} </TableCell>

                <TableCell>{
                  math.commify(getBusinessIncome(
                    repricedRows.filter(r => r.taxYear === taxYear),
                  ), 0, unit)
                }</TableCell>

                <TableCell>{
                  math.commify(getTotalCapitalChange(
                    taxInput,
                    repricedRows.filter(r => r.taxYear === taxYear),
                  ), 0, unit)
                }</TableCell>

                <TableCell>{
                  math.commify(getGetTotalIncome(taxYear.substring(3))(
                    taxInput,
                    repricedRows.filter(r => r.taxYear === taxYear),
                  ), 0, unit)
                }</TableCell>

                <TableCell>{
                  math.commify(getGetTotalTaxableIncome(taxYear.substring(3))(
                    taxInput,
                    repricedRows.filter(r => r.taxYear === taxYear),
                  ), 0, unit)
                }</TableCell>

                <TableCell>{
                  math.commify(getTotalTax(
                    taxInput,
                    repricedRows.filter(r => r.taxYear === taxYear),
                  ), 0, unit)
                }</TableCell>

              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

    </Paper>
  </>);
};
