import { Guards } from "@valuemachine/transactions";
import {
  DecString,
  IncomeTypes,
  TaxActions,
  TaxInput,
  TaxRows,
  TaxYear,
} from "@valuemachine/types";
import { splitTaxYear } from "@valuemachine/utils";

import {
  getNetBusinessIncome as getNetBusinessIncomeIND,
  getTotalCapitalChange as getTotalCapitalChangeIND,
  getTotalIncome as getTotalIncomeIND,
  getTotalTaxableIncome as getTotalTaxableIncomeIND,
  getTotalTax as getTotalTaxIND,
} from "./IND";
import {
  getNetBusinessIncome as getNetBusinessIncomeUSA,
  getTotalCapitalChange as getTotalCapitalChangeUSA,
  getTotalIncome as getTotalIncomeUSA,
  getTotalTaxableIncome as getTotalTaxableIncomeUSA,
  getTotalTax as getTotalTaxUSA,
} from "./USA";
import { getTotalValue,  getRowTotal } from "./utils";

////////////////////////////////////////
// Income/Tax by TaxYear

export const getNetBusinessIncome = (
  taxYear: TaxYear,
  input: TaxInput,
  rows: TaxRows,
): DecString => {
  const [guard, year] = splitTaxYear(taxYear);
  const taxRows = rows.filter(row => row.taxYear === taxYear);
  if (guard === Guards.IND) {
    return getNetBusinessIncomeIND(taxRows);
  } else if (guard === Guards.USA) {
    return getNetBusinessIncomeUSA(year, taxRows);
  } else {
    return getTotalValue(taxRows, TaxActions.Income, { incomeType: IncomeTypes.Business });
  }
};

export const getTotalCapitalChange = (
  taxYear: TaxYear,
  input: TaxInput,
  rows: TaxRows,
): DecString => {
  const [guard, year] = splitTaxYear(taxYear);
  const taxRows = rows.filter(row => row.taxYear === taxYear);
  if (guard === Guards.IND) {
    return getTotalCapitalChangeIND(input, taxRows);
  } else if (guard === Guards.USA) {
    return getTotalCapitalChangeUSA(year, input, taxRows);
  } else {
    return getRowTotal(taxRows, "", {}, row => row.capitalChange);
  }
};

export const getTotalIncome = (
  taxYear: TaxYear,
  input: TaxInput,
  rows: TaxRows,
): DecString => {
  const [guard, year] = splitTaxYear(taxYear);
  const taxRows = rows.filter(row => row.taxYear === taxYear);
  if (guard === Guards.IND) {
    return getTotalIncomeIND(input, taxRows);
  } else if (guard === Guards.USA) {
    return getTotalIncomeUSA(year, input, taxRows);
  } else {
    return getTotalValue(taxRows, TaxActions.Income);
  }
};

export const getTotalTaxableIncome = (
  taxYear: TaxYear,
  input: TaxInput,
  rows: TaxRows,
): DecString => {
  const [guard, year] = splitTaxYear(taxYear);
  const taxRows = rows.filter(row => row.taxYear === taxYear);
  if (guard === Guards.IND) {
    return getTotalTaxableIncomeIND(input, taxRows);
  } else if (guard === Guards.USA) {
    return getTotalTaxableIncomeUSA(year, input, taxRows);
  } else {
    return getTotalValue(taxRows, TaxActions.Income);
  }
};

export const getTotalTax = (
  taxYear: TaxYear,
  input: TaxInput,
  rows: TaxRows,
): DecString => {
  const [guard, year] = splitTaxYear(taxYear);
  const taxRows = rows.filter(row => row.taxYear === taxYear);
  if (guard === Guards.IND) {
    return getTotalTaxIND(input, taxRows);
  } else if (guard === Guards.USA) {
    return getTotalTaxUSA(year, input, taxRows);
  } else {
    return "0";
  }
};
