import {
  logger,
  math,
  processExpenses,
  processIncome,
  TaxRow,
} from "./utils";

const log = logger.child({ module: "f1040sc" });
const { add, gt, lt, round, sub } = math;

export const f1040sc = (taxRows: TaxRow[], oldForms: any): any => {
  const forms = JSON.parse(JSON.stringify(oldForms)) as any;
  const { f1040, f1040s1, f1040sc, f1040sse } = forms;

  const pad = (str: string, n = 9): string => str.padStart(n, " ");

  f1040sc.Name = `${f1040.FirstNameMI} ${f1040.LastName}`;
  f1040sc.SSN = f1040.SSN;

  let totalIncome = "0";
  processIncome(taxRows, (income: TaxRow, value: string): void => {
    if (income.tags.includes("prize")) {
      log.debug(`Prize money goes on f1040s1.L8`);
    } else {
      totalIncome = math.add(totalIncome, value);
      log.info(
        `${income.date.split("T")[0]} Income of ${pad(math.round(income.amount))} ` +
        `${pad(income.asset, 4)} worth ${pad(math.round(value))}`,
      );
    }
  });

  f1040sc.L1 = round(totalIncome);
  log.info(`Total income: ${f1040sc.L1}`);
  f1040sc.L3 = round(sub(f1040sc.L1, f1040sc.L2));

  // TODO: Part III

  f1040sc.L4 = f1040sc.L42;
  f1040sc.L5 = round(sub(f1040sc.L3, f1040sc.L4));
  f1040sc.L7 = round(add(f1040sc.L5, f1040sc.L6));

  let otherExpenseIndex = 1;
  let exchangeFees = "0";
  processExpenses(taxRows, (expense: TaxRow, value: string): void => {
    const tags = expense.tags;
    const message = `${expense.date.split("T")[0]} ` +
      `Expense of ${pad(math.round(expense.amount), 8)} ${pad(expense.asset, 4)} `;
    const otherExpenseKey = "f1040sc-L48:";
    if (tags.some(tag => tag.startsWith(otherExpenseKey))) {
      const description = tags
        .find(tag => tag.startsWith(otherExpenseKey))
        .replace(otherExpenseKey, "");
      log.info(`${message}: L48 ${description}`);
      f1040sc[`L48R${otherExpenseIndex}_desc`] = description;
      f1040sc[`L48R${otherExpenseIndex}_amt`] = value;
      f1040sc.L48 = add(f1040sc.L48, value);
      otherExpenseIndex += 1;
    } else if (expense.tags.includes(`exchange-fee`)) {
      log.info(`${message}: L48 += Currency conversion`);
      exchangeFees = add(exchangeFees, value);
    } else if (expense.tags.some(tag => tag.startsWith("f1040sc"))) {
      for (const row of [
        "L8", "L9", "L10", "L11", "L12",
        "L13", "L14", "L15", "L16a", "L16b",
        "L17", "L18", "L19", "L20a", "L20b",
        "L21", "L22", "L23", "L24a", "L24b",
        "L25", "L26", "L27a", "L27b",
      ]) {
        if (tags.some(tag => tag.startsWith(`f1040sc-${row}`))) {
          log.info(`${message}: ${row}`);
          f1040sc[row] = add(f1040sc[row], value);
        }
      }
    }
  });

  if (math.gt(exchangeFees, "0")) {
    f1040sc[`L48R${otherExpenseIndex}_desc`] = "Currency conversion";
    f1040sc[`L48R${otherExpenseIndex}_amt`] = exchangeFees;
    f1040sc.L48 = add(f1040sc.L48, exchangeFees);
  }

  f1040sc.L27a = f1040sc.L48;

  f1040sc.L28 = add(
    f1040sc.L8, f1040sc.L9, f1040sc.L10, f1040sc.L11, f1040sc.L12,
    f1040sc.L13, f1040sc.L14, f1040sc.L15, f1040sc.L16a, f1040sc.L16b,
    f1040sc.L17, f1040sc.L18, f1040sc.L19, f1040sc.L20a, f1040sc.L20b,
    f1040sc.L21, f1040sc.L22, f1040sc.L23, f1040sc.L24a, f1040sc.L24b,
    f1040sc.L25, f1040sc.L26, f1040sc.L27a, f1040sc.L27b,
  );

  f1040sc.L29 = round(sub(f1040sc.L7, f1040sc.L28));
  f1040sc.L31 = round(sub(f1040sc.L29, f1040sc.L30));

  if (gt(f1040sc.L31, "0")) {
    f1040s1.L3 = f1040sc.L31;
    f1040sse.P1L2 = f1040sc.L31;
  } else if (lt(f1040sc.L31, "0")) {
    if (f1040sc.C32a) {
      f1040s1.L3 = f1040sc.L31;
      f1040sse.P1L2 = f1040sc.L31;
    }
  }

  return { ...forms, f1040s1, f1040sc, f1040sse };
};
