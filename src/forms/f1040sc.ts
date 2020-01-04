import * as mappings from '../mappings/f1040sc.json';
import { add, div, emptyForm, gt, lt, mergeForms, parseHistory, round, sub } from '../utils';
import { HasMappings, InputData, TaxableTx } from '../types';

export type F1040sc = HasMappings & { [key in keyof typeof mappings]: string|boolean; };

export const f1040sc = (input: InputData, output: any): F1040sc[] => {
  const f1040sc = mergeForms(mergeForms(emptyForm(mappings), input.f1040sc), output.f1040sc) as any;
  f1040sc.mappings = mappings;
  if (process.env.MODE === "test") { return [f1040sc]; }
  const f1040s1 = output.f1040s1 && output.f1040s1[0] ? output.f1040s1[0] : {};
  const f1040sse = output.f1040sse && output.f1040sse[0] ? output.f1040sse[0] : {};

  f1040sc.FullName = `${input.FirstName} ${input.MiddleInitial} ${input.LastName}`;
  f1040sc.SSN = input.SocialSecurityNumber;

  const txHistory = parseHistory(input) as TaxableTx[];
  let totalIncome = "0";

  input.income.payments.forEach(payment => {
    totalIncome = add([totalIncome, payment.amount])
  });

  for (const tx of txHistory) {
    if (tx.timestamp.substring(0,2) !== input.taxYear.substring(2)) {
      console.log(`Skipping old tx from ${input.taxYear}`);
      continue;
    }
    if (input.income.exceptions.skip.includes(tx.from)) {
      console.log(`Skipping tx of ${tx.valueIn} from ${tx.from}`);
      continue;
    } else if (input.income.exceptions.half.includes(tx.from)) {
      console.log(`Got half payment of ${tx.valueIn} from ${tx.from}`);
      totalIncome = add([totalIncome, div(tx.valueIn, "2")])
    } else if (tx.from.startsWith("entity")) {
      console.log(`Got payment of ${tx.valueIn} from ${tx.from}`);
      totalIncome = add([totalIncome, tx.valueIn])
    }
  }

  f1040sc.Line1 = round(totalIncome, 2);
  console.log(`Total income: ${f1040sc.Line1}`);
  f1040sc.Line3 = round(sub(f1040sc.Line1, f1040sc.Line2), 2);

  // TODO: Part III

  f1040sc.Line4 = f1040sc.Line42;
  f1040sc.Line5 = round(sub(f1040sc.Line3, f1040sc.Line4), 2);
  f1040sc.Line7 = round(add([f1040sc.Line5, f1040sc.Line6]), 2);

  let totalExpenses = "0";
  for (const expense of input.expenses) {
    const key = `Line${expense.type}`
    if (typeof f1040sc[key] !== 'undefined') {
      console.log(`Handling expense of ${expense.amount}: ${expense.description}`);
      f1040sc[key] = add([f1040sc[expense.type], expense.amount]);
    }
  }

  f1040sc.Line28 = add([
    f1040sc.Line8, f1040sc.Line9, f1040sc.Line10, f1040sc.Line11, f1040sc.Line12,
    f1040sc.Line13, f1040sc.Line14, f1040sc.Line15, f1040sc.Line16a, f1040sc.Line16b,
    f1040sc.Line17, f1040sc.Line18, f1040sc.Line19, f1040sc.Line20a, f1040sc.Line20b,
    f1040sc.Line21, f1040sc.Line22, f1040sc.Line23, f1040sc.Line24a, f1040sc.Line24b,
    f1040sc.Line25, f1040sc.Line26, f1040sc.Line27a, f1040sc.Line27b,
  ]);

  f1040sc.Line29 = round(sub(f1040sc.Line7, f1040sc.Line28), 2);
  f1040sc.Line31 = round(sub(f1040sc.Line29, f1040sc.Line30), 2);

  if (gt(f1040sc.Line31, "0")) {
    f1040s1.Line3 = f1040sc.Line31
    f1040sse.Line2 = f1040sc.Line31
  } else if (lt(f1040sc.Line31, "0")) {
    if (f1040sc.Check32a) {
      f1040s1.Line3 = f1040sc.Line31
      f1040sse.Line2 = f1040sc.Line31
    }
  }

  output.f1040s1 = [f1040s1];
  // output.f1040sse = [f1040sse];
  return [f1040sc]
}

