import { ExpenseTypes, IncomeTypes, Logger, TaxInput, TaxRow } from "@valuemachine/types";

import { Forms, math, processExpenses, processIncome } from "./utils";

export const f1040sc = (
  forms: Forms,
  input: TaxInput,
  taxRows: TaxRow[],
  logger: Logger,
): Forms => {
  const log = logger.child({ module: "f1040sc" });
  const { f1040s1, f1040sc, f1040sse } = forms;
  const { business, personal } = input;

  // If no business info, then omit this form
  if (!business?.industry) {
    delete forms.f1040sc;
    return forms;
  }

  f1040sc.Name = `${personal?.firstName || ""} ${personal?.lastName || ""}`;
  f1040sc.SSN = personal?.SSN;

  ////////////////////////////////////////
  // Business Info

  f1040sc.LA = business.industry;
  f1040sc.LB = business.code;
  f1040sc.LC = business.name;
  f1040sc.LD = business.eid;
  f1040sc.LE_Address = business.street;
  f1040sc.LE_CityZip = `${
    business.city ? `${business.city}, ` : ""
  }${
    business.state ? `${business.state} ` : ""
  }${business.zip || ""}`;

  if (business.accountingMethod === "Cash") {
    f1040sc.C_F_Cash = true;
  } else if (business.accountingMethod === "Accrual") {
    f1040sc.C_F_Accrual = true;
  } else if (business.accountingMethod) {
    f1040sc.C_F_Other = true;
    f1040sc.LF_Other = business.accountingMethod;
  }

  ////////////////////////////////////////
  // Part I - Income

  const pad = (str: string, n = 9): string => str.padStart(n, " ");

  let totalIncome = "0";
  processIncome(taxRows, (income: TaxRow, value: string): void => {
    if (income.tags.incomeType !== IncomeTypes.SelfEmployed) {
      totalIncome = math.add(totalIncome, value);
      log.info(
        `${income.date.split("T")[0]} Income of ${pad(math.round(income.amount))} ` +
        `${pad(income.asset, 4)} worth ${pad(math.round(value))}`,
      );
    }
  });

  f1040sc.L1 = math.round(totalIncome);
  log.info(`Total income: ${f1040sc.L1}`);
  f1040sc.L3 = math.round(math.sub(f1040sc.L1, f1040sc.L2));

  // Part III will go here someday

  f1040sc.L4 = f1040sc.L42;
  f1040sc.L5 = math.round(math.sub(f1040sc.L3, f1040sc.L4));
  f1040sc.L7 = math.round(math.add(f1040sc.L5, f1040sc.L6));

  ////////////////////////////////////////
  // Part II - Expenses

  // TODO: accumulate & add exchange fees as a "Currency Conversion" expense to L48
  // let exchangeFees = "0";

  const otherRows = [1, 2, 3, 4, 5, 6, 7 ,8, 9];
  let otherExpenseIndex = otherRows.reduce((res, i) => {
    return res || (!f1040sc[`L48_Expense${i}`] && !f1040sc[`L48_Amount${i}`]) ? i : 0;
  }, 0);
  processExpenses(taxRows, (expense: TaxRow, value: string): void => {
    const message = `${expense.date.split("T")[0]} Expense of ${
      pad(math.round(expense.amount), 8)
    } ${pad(expense.asset, 4)} `;
    if (!expense.tags.expenseType && expense.tags.description) {
      log.info(`${message}: L48 ${expense.tags.description}`);
      f1040sc[`L48R${otherExpenseIndex}_desc`] = expense.tags.description;
      f1040sc[`L48R${otherExpenseIndex}_amt`] = value;
      f1040sc.L48 = math.add(f1040sc.L48, value);
      otherExpenseIndex += 1;

    } else if (expense.tags.expenseType === ExpenseTypes.Advertising) {
      f1040sc.L8 = math.add(f1040sc.L8, value);
      log.info(`${message}: ${expense.tags.expenseType}`);
    } else if (expense.tags.expenseType === ExpenseTypes.Vehicle) {
      f1040sc.L9 = math.add(f1040sc.L9, value);
      log.info(`${message}: ${expense.tags.expenseType}`);
    } else if (expense.tags.expenseType === ExpenseTypes.Commission) {
      f1040sc.L10 = math.add(f1040sc.L10, value);
      log.info(`${message}: ${expense.tags.expenseType}`);
    } else if (expense.tags.expenseType === ExpenseTypes.Labor) {
      f1040sc.L11 = math.add(f1040sc.L11, value);
      log.info(`${message}: ${expense.tags.expenseType}`);
    } else if (expense.tags.expenseType === ExpenseTypes.Depletion) {
      f1040sc.L12 = math.add(f1040sc.L12, value);
      log.info(`${message}: ${expense.tags.expenseType}`);
    } else if (expense.tags.expenseType === ExpenseTypes.Depreciation) {
      f1040sc.L13 = math.add(f1040sc.L13, value);
      log.info(`${message}: ${expense.tags.expenseType}`);
    } else if (expense.tags.expenseType === ExpenseTypes.EmployeeBenefits) {
      f1040sc.L14 = math.add(f1040sc.L14, value);
      log.info(`${message}: ${expense.tags.expenseType}`);
    } else if (expense.tags.expenseType === ExpenseTypes.Insurance) {
      f1040sc.L15 = math.add(f1040sc.L15, value);
      log.info(`${message}: ${expense.tags.expenseType}`);
    } else if (expense.tags.expenseType === ExpenseTypes.Mortgage) {
      f1040sc.L16a = math.add(f1040sc.L16a, value);
      log.info(`${message}: ${expense.tags.expenseType}`);
    } else if (expense.tags.expenseType === ExpenseTypes.Interest) {
      f1040sc.L16b = math.add(f1040sc.L16b, value);
      log.info(`${message}: ${expense.tags.expenseType}`);
    } else if (expense.tags.expenseType === ExpenseTypes.Legal) {
      f1040sc.L17 = math.add(f1040sc.L17, value);
      log.info(`${message}: ${expense.tags.expenseType}`);
    } else if (expense.tags.expenseType === ExpenseTypes.Office) {
      f1040sc.L18 = math.add(f1040sc.L18, value);
      log.info(`${message}: ${expense.tags.expenseType}`);
    } else if (expense.tags.expenseType === ExpenseTypes.Pension) {
      f1040sc.L19 = math.add(f1040sc.L19, value);
      log.info(`${message}: ${expense.tags.expenseType}`);
    } else if (expense.tags.expenseType === ExpenseTypes.EquipmentRental) {
      f1040sc.L20a = math.add(f1040sc.L20a, value);
      log.info(`${message}: ${expense.tags.expenseType}`);
    } else if (expense.tags.expenseType === ExpenseTypes.PropertyRental) {
      f1040sc.L20b = math.add(f1040sc.L20b, value);
      log.info(`${message}: ${expense.tags.expenseType}`);
    } else if (expense.tags.expenseType === ExpenseTypes.Repairs) {
      f1040sc.L21 = math.add(f1040sc.L21, value);
      log.info(`${message}: ${expense.tags.expenseType}`);
    } else if (expense.tags.expenseType === ExpenseTypes.Supplies) {
      f1040sc.L22 = math.add(f1040sc.L22, value);
      log.info(`${message}: ${expense.tags.expenseType}`);
    } else if (expense.tags.expenseType === ExpenseTypes.Licenses) {
      f1040sc.L23 = math.add(f1040sc.L23, value);
      log.info(`${message}: ${expense.tags.expenseType}`);
    } else if (expense.tags.expenseType === ExpenseTypes.Travel) {
      f1040sc.L24a = math.add(f1040sc.L24a, value);
      log.info(`${message}: ${expense.tags.expenseType}`);
    } else if (expense.tags.expenseType === ExpenseTypes.Meals) {
      f1040sc.L24b = math.add(f1040sc.L24b, value);
      log.info(`${message}: ${expense.tags.expenseType}`);
    } else if (expense.tags.expenseType === ExpenseTypes.Utilities) {
      f1040sc.L25 = math.add(f1040sc.L25, value);
      log.info(`${message}: ${expense.tags.expenseType}`);
    } else if (expense.tags.expenseType === ExpenseTypes.Wages) {
      f1040sc.L26 = math.add(f1040sc.L26, value);
      log.info(`${message}: ${expense.tags.expenseType}`);
    } else if (expense.tags.expenseType === ExpenseTypes.Other) {
      f1040sc.L27a = math.add(f1040sc.L27a, value);
      log.info(`${message}: ${expense.tags.expenseType}`);
    }
  });

  ////////////////////////////////////////
  // Part V - Other Expenses

  /*
  if (math.gt(exchangeFees, "0")) {
    f1040sc[`L48R${otherExpenseIndex}_desc`] = "Currency conversion";
    f1040sc[`L48R${otherExpenseIndex}_amt`] = exchangeFees;
    f1040sc.L48 = math.add(f1040sc.L48, exchangeFees);
  }
  */

  f1040sc.L48 = math.add(
    f1040sc.L48_Amount1,
    f1040sc.L48_Amount2,
    f1040sc.L48_Amount3,
    f1040sc.L48_Amount4,
    f1040sc.L48_Amount5,
    f1040sc.L48_Amount6,
    f1040sc.L48_Amount7,
    f1040sc.L48_Amount8,
    f1040sc.L48_Amount9,
  );
  f1040sc.L27a = f1040sc.L48;

  f1040sc.L28 = math.add(
    f1040sc.L8, f1040sc.L9, f1040sc.L10, f1040sc.L11, f1040sc.L12,
    f1040sc.L13, f1040sc.L14, f1040sc.L15, f1040sc.L16a, f1040sc.L16b,
    f1040sc.L17, f1040sc.L18, f1040sc.L19, f1040sc.L20a, f1040sc.L20b,
    f1040sc.L21, f1040sc.L22, f1040sc.L23, f1040sc.L24a, f1040sc.L24b,
    f1040sc.L25, f1040sc.L26, f1040sc.L27a,
  );

  f1040sc.L29 = math.round(math.sub(f1040sc.L7, f1040sc.L28));
  f1040sc.L31 = math.round(math.sub(f1040sc.L29, f1040sc.L30));

  if (math.gt(f1040sc.L31, "0")) {
    f1040s1.L3 = f1040sc.L31;
    f1040sse.L2 = f1040sc.L31;
  } else if (math.lt(f1040sc.L31, "0")) {
    if (f1040sc.C32a) {
      f1040s1.L3 = f1040sc.L31;
      f1040sse.L2 = f1040sc.L31;
    }
  }

  ////////////////////////////////////////
  // Part III - Cost of Goods Sold - TBD
  // Part IV - Vehicle Info - TBD
  // Part V - Extra Expenses - Included in Part II

  return { ...forms, f1040s1, f1040sc, f1040sse };
};
