import { FinancialData, Forms } from "../types";
import { add, div, gt, lt, round, sub } from "../utils";

export const f1040sc = (finances: FinancialData, oldForms: Forms): Forms => {
  const forms = JSON.parse(JSON.stringify(oldForms)) as Forms;
  const { f1040, f1040s1, f1040sc, f1040sse } = forms;

  f1040sc.FullName = `${f1040.FirstNameMI} ${f1040.LastName}`;
  f1040sc.SSN = f1040.SocialSecurityNumber;

  let totalIncome = "0";

  finances.income.forEach(event => {
    totalIncome = add([totalIncome, event.assetsIn[0].amount]);
  });

  f1040sc.L1 = round(totalIncome);
  console.log(`Total income: ${f1040sc.L1}`);
  f1040sc.L3 = round(sub(f1040sc.L1, f1040sc.L2));

  // TODO: Part III

  f1040sc.L4 = f1040sc.L42;
  f1040sc.L5 = round(sub(f1040sc.L3, f1040sc.L4));
  f1040sc.L7 = round(add([f1040sc.L5, f1040sc.L6]));

  let totalExpenses = "0";
  for (const expense of finances.expenses) {
    const asset = expense.assetsIn[0];
    if (!asset) { throw new Error("idk"); }
    const key = `L${asset.type}`;
    if (typeof f1040sc[key] !== "undefined") {
      console.log(`Handling expense of ${asset.amount} ${asset.type}: ${expense.description}`);
      f1040sc[key] = add([f1040sc[asset.type], asset.amount]);
    }
  }

  f1040sc.L28 = add([
    f1040sc.L8, f1040sc.L9, f1040sc.L10, f1040sc.L11, f1040sc.L12,
    f1040sc.L13, f1040sc.L14, f1040sc.L15, f1040sc.L16a, f1040sc.L16b,
    f1040sc.L17, f1040sc.L18, f1040sc.L19, f1040sc.L20a, f1040sc.L20b,
    f1040sc.L21, f1040sc.L22, f1040sc.L23, f1040sc.L24a, f1040sc.L24b,
    f1040sc.L25, f1040sc.L26, f1040sc.L27a, f1040sc.L27b,
  ]);

  f1040sc.L29 = round(sub(f1040sc.L7, f1040sc.L28));
  f1040sc.L31 = round(sub(f1040sc.L29, f1040sc.L30));

  if (gt(f1040sc.L31, "0")) {
    f1040s1.L3 = f1040sc.L31;
    f1040sse.L2 = f1040sc.L31;
    f1040sse.L2_Long = f1040sc.L31;
  } else if (lt(f1040sc.L31, "0")) {
    if (f1040sc.C32a) {
      f1040s1.L3 = f1040sc.L31;
      f1040sse.L2 = f1040sc.L31;
      f1040sse.L2_Long = f1040sc.L31;
    }
  }

  return { ...forms, f1040, f1040s1, f1040sc, f1040sse };
};
