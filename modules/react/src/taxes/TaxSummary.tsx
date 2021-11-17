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
  TaxInput,
  TaxRows,
} from "@valuemachine/types";
import { math } from "@valuemachine/utils";
import React, { useEffect, useState } from "react";

type TaxSummaryProps = {
  guard?: Guard;
  taxInput?: TaxInput;
  taxRows: TaxRows;
  unit?: Asset;
};
export const TaxSummary: React.FC<TaxSummaryProps> = ({
  guard,
  taxInput,
  taxRows,
  unit: userUnit,
}: TaxSummaryProps) => {
  const [totalBusinessIncome, setTotalBusinessIncome] = useState("0");
  const [totalCapitalChange, setTotalCapitalChange] = useState("0");
  const [totalIncome, setTotalIncome] = useState("0");
  const [totalTaxableIncome, setTotalTaxableIncome] = useState("0");
  const [totalTaxesDue, setTotalTaxesDue] = useState("0");
  const [unit, setUnit] = React.useState(userUnit || Assets.ETH);

  console.log(`Rendering Summary w userUnit=${userUnit} unit=${unit}`);

  useEffect(() => {
    setUnit((guard ? securityFeeMap[guard] : null) || userUnit);
  }, [guard, userUnit]);

  useEffect(() => {
    setTotalBusinessIncome(getBusinessIncome(
      taxRows.filter(row => !guard || row.guard === guard),
    ));
    setTotalCapitalChange(getTotalCapitalChange(
      taxRows.filter(row => !guard || row.guard === guard),
      taxInput?.personal?.filingStatus || "",
    ));
    setTotalIncome(getTotalIncome(
      taxRows.filter(row => !guard || row.guard === guard),
      taxInput?.personal?.filingStatus || "",
    ));
    setTotalTaxableIncome(getTotalTaxableIncome(
      taxRows.filter(row => !guard || row.guard === guard),
      taxInput?.personal?.filingStatus || "",
    ));
    setTotalTaxesDue(getTotalTaxes(
      taxRows.filter(row => !guard || row.guard === guard),
      taxInput,
    ));
  }, [guard, taxInput, taxRows]);

  return (<>
    <Paper sx={{ p: 3 }}>

      <Typography variant="h6">
        {`Unit of Account: ${unit}`}
      </Typography>

      <Typography variant="h6">
        {`Total Business Income: ${math.round(totalBusinessIncome, 2)}`}
      </Typography>

      <Typography variant="h6">
        {`Total Capital Gain/Loss: ${math.round(totalCapitalChange, 2)}`}
      </Typography>

      <Typography variant="h6">
        {`Total Income: ${math.round(totalIncome, 2)}`}
      </Typography>

      <Typography variant="h6">
        {`Total Taxable Income: ${math.round(totalTaxableIncome, 2)}`}
      </Typography>

      <Typography variant="h6">
        {`Total Taxes Due: ${math.round(totalTaxesDue, 2)}`}
      </Typography>

    </Paper>
  </>);
};
