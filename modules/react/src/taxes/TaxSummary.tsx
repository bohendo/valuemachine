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
  getTotalIncome,
  getTotalTaxableIncome,
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
  const [taxYears, setTaxYears] = useState([] as string[]);
  const [unit, setUnit] = useState(getUnit(guard, userUnit));

  console.log(`Years w guard=${guard} activity: ${taxYears}`);

  useEffect(() => {
    setUnit(getUnit(guard, userUnit));
  }, [guard, userUnit]);

  useEffect(() => {
    setTaxYears(
      dedup(taxRows.map(row => row.taxYear))
        .filter(taxYear => !guard || taxYear.startsWith(guard))
        .sort()
    );
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
            {taxYears.map((taxYear, i) => (
              <TableRow key={i}>

                <TableCell> {guard ? taxYear.replace(guard, "") : taxYear} </TableCell>

                <TableCell>{
                  math.commify(getBusinessIncome(taxYear, taxInput, taxRows), 0, unit)
                }</TableCell>

                <TableCell>{
                  math.commify(getTotalCapitalChange(taxYear, taxInput, taxRows), 0, unit)
                }</TableCell>

                <TableCell>{
                  math.commify(getTotalIncome(taxYear, taxInput, taxRows), 0, unit)
                }</TableCell>

                <TableCell>{
                  math.commify(getTotalTaxableIncome(taxYear, taxInput, taxRows), 0, unit)
                }</TableCell>

                <TableCell>{
                  math.commify(getTotalTax(taxYear, taxInput, taxRows), 0, unit)
                }</TableCell>

              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

    </Paper>
  </>);
};
