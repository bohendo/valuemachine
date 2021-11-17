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
  if (getUnit(row.guard, unit) !== unit) {
    const conversion = prices?.getNearest(row.date, getUnit(row.guard, unit), unit) || "1";
    row.price = math.mul(conversion, row.price);
    row.receivePrice = math.mul(conversion, row.receivePrice);
    row.value = math.mul(conversion, row.value);
    row.capitalChange = math.mul(conversion, row.capitalChange);
  }
  return row;
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

  useEffect(() => {
    setUnit(getUnit(guard, userUnit));
  }, [guard, userUnit]);

  useEffect(() => {
    setTotalBusinessIncome(getBusinessIncome(
      taxRows.filter(row => !guard || row.guard === guard).map(getRepricer(unit, prices)),
    ));
    setTotalCapitalChange(getTotalCapitalChange(
      taxRows.filter(row => !guard || row.guard === guard).map(getRepricer(unit, prices)),
      taxInput?.personal?.filingStatus || "",
    ));
    setTotalIncome(getTotalIncome(
      taxRows.filter(row => !guard || row.guard === guard).map(getRepricer(unit, prices)),
      taxInput?.personal?.filingStatus || "",
    ));
    setTotalTaxableIncome(getTotalTaxableIncome(
      taxRows.filter(row => !guard || row.guard === guard).map(getRepricer(unit, prices)),
      taxInput?.personal?.filingStatus || "",
    ));
    setTotalTaxesDue(getTotalTaxes(
      taxRows.filter(row => !guard || row.guard === guard).map(getRepricer(unit, prices)),
      taxInput,
    ));
  }, [guard, prices, taxInput, taxRows, unit]);

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
