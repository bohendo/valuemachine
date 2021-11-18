import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import {
  getBusinessIncome,
  securityFeeMap,
  getTotalCapitalChange,
  getTotalIncome,
  getTotalTaxableIncome,
  getTotalTaxes,
} from "@valuemachine/taxes";
import { Assets } from "@valuemachine/transactions";
import {
  Asset,
  Guard,
  Prices,
  TaxInput,
  TaxRows,
} from "@valuemachine/types";
import { math } from "@valuemachine/utils";
import React, { useEffect, useState } from "react";

const getUnit = (guard, defaultUnit) => 
  (guard ? securityFeeMap[guard] : null) || defaultUnit || Assets.ETH;

const getRepricer = (unit, prices) => row => {
  if (!unit || !prices) return row;
  const fromUnit = getUnit(row.guard, unit);
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
  taxInput?: TaxInput;
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
  const [totalBusinessIncome, setTotalBusinessIncome] = useState("0");
  const [totalCapitalChange, setTotalCapitalChange] = useState("0");
  const [totalIncome, setTotalIncome] = useState("0");
  const [totalTaxableIncome, setTotalTaxableIncome] = useState("0");
  const [totalTaxesDue, setTotalTaxesDue] = useState("0");
  const [unit, setUnit] = React.useState(getUnit(guard, userUnit));
  const [repricedRows, setRepricedRows] = useState([] as TaxRows);

  useEffect(() => {
    setUnit(getUnit(guard, userUnit));
  }, [guard, userUnit]);

  useEffect(() => {
    const rowsByGuard = taxRows.filter(row => !guard || row.guard === guard);
    if (guard) {
      console.log(`Repricing ${rowsByGuard.length} of ${
        taxRows.length
      } rows that have guard === ${guard}`);
    } else {
      console.log(`Repricing ALL rows bc no guard was provided`);
    }
    setRepricedRows(rowsByGuard.map(getRepricer(unit, prices)));
  }, [guard, prices, taxRows, unit]);

  useEffect(() => {
    if (!repricedRows?.length) return;
    setTotalBusinessIncome(getBusinessIncome(
      repricedRows,
    ));
    setTotalCapitalChange(getTotalCapitalChange(
      repricedRows,
      taxInput?.personal?.filingStatus || "",
    ));
    setTotalIncome(getTotalIncome(
      repricedRows,
      taxInput?.personal?.filingStatus || "",
    ));
    setTotalTaxableIncome(getTotalTaxableIncome(
      repricedRows,
      taxInput?.personal?.filingStatus || "",
    ));
    setTotalTaxesDue(getTotalTaxes(
      repricedRows,
      taxInput,
    ));
  }, [repricedRows, taxInput]);

  return (<>
    <Paper sx={{ p: 3 }}>

      <Typography variant="h6">
        {`Unit of Account: ${unit}`}
      </Typography>

      <Typography variant="h6">
        {`Total Business Income: ${math.commify(totalBusinessIncome, 2, unit)}`}
      </Typography>

      <Typography variant="h6">
        {`Total Capital Gain/Loss: ${math.commify(totalCapitalChange, 2, unit)}`}
      </Typography>

      <Typography variant="h6">
        {`Total Income: ${math.commify(totalIncome, 2, unit)}`}
      </Typography>

      <Typography variant="h6">
        {`Total Taxable Income: ${math.commify(totalTaxableIncome, 2, unit)}`}
      </Typography>

      <Typography variant="h6">
        {`Total Taxes Due: ${math.commify(totalTaxesDue, 2, unit)}`}
      </Typography>

    </Paper>
  </>);
};
