import {
  ExpenseTypes,
  ExpenseType,
  IncomeTypes,
  Logger,
  TaxActions,
  TaxInput,
  TaxRow,
} from "@valuemachine/types";

import {
  Forms,
  getTotalValue,
  math,
  strcat,
  thisYear,
} from "./utils";

export const f1040sc = (
  forms: Forms,
  input: TaxInput,
  taxRows: TaxRow[],
  logger: Logger,
): Forms => {
  const log = logger.child({ module: "f1040sc" });
  const { f1040s1, f1040sc, f1040sse } = forms;
  const business = input.business || {};
  const personal = input.personal || {};

  const seIncome = getTotalValue(
    taxRows.filter(thisYear),
    TaxActions.Income,
    { incomeType: IncomeTypes.SelfEmployed },
  );

  // If no self-employment income, then omit this form
  if (!math.gt(seIncome, "0")) {
    delete forms.f1040sc;
    return forms;
  }

  f1040sc.Name = strcat([personal.firstName, personal.lastName]);
  f1040sc.SSN = personal.SSN;

  ////////////////////////////////////////
  // Business Info

  f1040sc.LA = business.industry;
  f1040sc.LB = business.code;
  f1040sc.LC = business.name;
  f1040sc.LD = business.eid;
  f1040sc.LE_Address = business.street;
  f1040sc.LE_CityZip = strcat([business.city, business.state, business.zip], ", ");

  if (business.accountingMethod === "Cash") {
    f1040sc.C_F_Cash = true;
  } else if (business.accountingMethod === "Accrual") {
    f1040sc.C_F_Accrual = true;
  } else if (business.accountingMethod) {
    f1040sc.C_F_Other = true;
    f1040sc.LF_Other = business.accountingMethod;
  }

  ////////////////////////////////////////
  // Part III - Cost of Goods Sold

  // This info should probably be added to tax input eventually
  f1040sc.L40 = math.add(
    f1040sc.L35, // inventory at start of year
    f1040sc.L36, // purchases
    f1040sc.L37, // cost of labor
    f1040sc.L38, // materials
    f1040sc.L39, // other
  );
  f1040sc.L42 = math.sub(
    f1040sc.L40, // costs
    f1040sc.L41, // inventory at end of year
  );

  ////////////////////////////////////////
  // Part I - Income

  f1040sc.L1 = seIncome;
  f1040sc.L3 = math.sub(
    f1040sc.L1, // total income
    f1040sc.L2, // returns & allowances
  );
  f1040sc.L4 = f1040sc.L42;
  f1040sc.L5 = math.sub(
    f1040sc.L3, // income - returns
    f1040sc.L4, // cost of goods
  );
  log.info(`Gross Profit: f1040sc.L5=${f1040sc.L5}`);

  f1040sc.L7 = math.add(
    f1040sc.L5, // gross profit
    f1040sc.L6, // other income eg fuel tax credit
  );
  log.info(`Gross Income: f1040sc.L7=${f1040sc.L7}`);

  ////////////////////////////////////////
  // Part II - Expenses

  const getTotalExpenses = (expenseType: ExpenseType) =>
    getTotalValue(taxRows.filter(thisYear), TaxActions.Expense, { expenseType });

  f1040sc.L8   = getTotalExpenses(ExpenseTypes.Advertising);
  f1040sc.L9   = getTotalExpenses(ExpenseTypes.Vehicle);
  f1040sc.L10  = getTotalExpenses(ExpenseTypes.Commission);
  f1040sc.L11  = getTotalExpenses(ExpenseTypes.Labor);
  f1040sc.L12  = getTotalExpenses(ExpenseTypes.Depletion);
  f1040sc.L13  = getTotalExpenses(ExpenseTypes.Depreciation);
  f1040sc.L14  = getTotalExpenses(ExpenseTypes.EmployeeBenefits);
  f1040sc.L15  = getTotalExpenses(ExpenseTypes.Insurance);
  f1040sc.L16a = getTotalExpenses(ExpenseTypes.Mortgage);
  f1040sc.L16b = getTotalExpenses(ExpenseTypes.Interest);
  f1040sc.L17  = getTotalExpenses(ExpenseTypes.Legal);
  f1040sc.L18  = getTotalExpenses(ExpenseTypes.Office);
  f1040sc.L19  = getTotalExpenses(ExpenseTypes.Pension);
  f1040sc.L20a = getTotalExpenses(ExpenseTypes.EquipmentRental);
  f1040sc.L20b = getTotalExpenses(ExpenseTypes.PropertyRental);
  f1040sc.L21  = getTotalExpenses(ExpenseTypes.Repairs);
  f1040sc.L22  = getTotalExpenses(ExpenseTypes.Supplies);
  f1040sc.L23  = getTotalExpenses(ExpenseTypes.Licenses);
  f1040sc.L24a = getTotalExpenses(ExpenseTypes.Travel);
  f1040sc.L24b = getTotalExpenses(ExpenseTypes.Meals);
  f1040sc.L25  = getTotalExpenses(ExpenseTypes.Utilities);
  f1040sc.L26  = getTotalExpenses(ExpenseTypes.Wages);

  ////////////////////////////////////////
  // Part V - Other Expenses

  // Get the first row without any manually injected expenses
  const otherRows = [1, 2, 3, 4, 5, 6, 7 ,8, 9];
  let otherExpenseIndex = otherRows.reduce((res, i) => {
    return res || (!f1040sc[`L48_Expense${i}`] && !f1040sc[`L48_Amount${i}`]) ? i : 0;
  }, 0);

  // Add a new other expense for every expense with type === Other
  taxRows.filter(thisYear).filter(row => row.action === TaxActions.Expense).forEach(expense => {
    const value = math.mul(expense.value, expense.tag.multiplier || "1");
    if (expense.tag.expenseType === ExpenseTypes.Business) {
      f1040sc[`L48R${otherExpenseIndex}_desc`] = expense.tag.description;
      f1040sc[`L48R${otherExpenseIndex}_amt`] = value;
    }
    otherExpenseIndex++;
  });

  /* We should accumulate & add exchange fees as a "Currency Conversion" expense to L48
  let exchangeFees = "0";
  // Process expenses
  if (math.gt(exchangeFees, "0")) {
    f1040sc[`L48R${otherExpenseIndex}_desc`] = "Currency conversion";
    f1040sc[`L48R${otherExpenseIndex}_amt`] = exchangeFees;
    f1040sc.L48 = math.add(f1040sc.L48, exchangeFees);
  }
  */

  // Add up all other expenses
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

  ////////////////////////////////////////
  // Resume Part II - Expenses

  f1040sc.L28 = math.add(
    f1040sc.L8, f1040sc.L9, f1040sc.L10, f1040sc.L11, f1040sc.L12,
    f1040sc.L13, f1040sc.L14, f1040sc.L15, f1040sc.L16a, f1040sc.L16b,
    f1040sc.L17, f1040sc.L18, f1040sc.L19, f1040sc.L20a, f1040sc.L20b,
    f1040sc.L21, f1040sc.L22, f1040sc.L23, f1040sc.L24a, f1040sc.L24b,
    f1040sc.L25, f1040sc.L26, f1040sc.L27a,
  );

  f1040sc.L29 = math.sub(f1040sc.L7, f1040sc.L28);
  f1040sc.L31 = math.sub(f1040sc.L29, f1040sc.L30);

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
  // Part IV - Vehicle Info

  // Warn if user info is required but not provided
  if (math.gt(f1040sc.L9, "0") && !("f4562" in forms)) {
    if (!f1040sc.L43_MM || !f1040sc.L43_DD || !f1040sc.L43_YY) {
      log.warn(`L43: Date is required but missing`);
    }
    if (!f1040sc.L44a && !f1040sc.L44b && !f1040sc.L44c) {
      log.warn(`L44: Miles are required but missing`);
    }
    if (!f1040sc.C45_Yes && !f1040sc.C45_No) {
      log.warn(`C45: response required`);
    }
    if (!f1040sc.C46_Yes && !f1040sc.C46_No) {
      log.warn(`C46: response required`);
    }
    if (!f1040sc.C47a_Yes && !f1040sc.C47a_No) {
      log.warn(`C47a: response required`);
    }
    if (f1040sc.C47a_Yes && (!f1040sc.C47b_Yes && !f1040sc.C47b_No)) {
      log.warn(`C47b: response required`);
    }
  }

  return { ...forms, f1040s1, f1040sc, f1040sse };
};
