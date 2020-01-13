import { InputData, Forms, TaxableTx } from '../types';
import { add, div, gt, lt, parseHistory, round, sub } from '../utils';

export const f1040sc = (input: InputData, oldForms: Forms): Forms => {
  const forms = JSON.parse(JSON.stringify(oldForms)) as Forms;
  const f1040s1 = forms.f1040s1 && forms.f1040s1[0] ? forms.f1040s1[0] : {};
  const f1040sc = forms.f1040sc && forms.f1040sc[0] ? forms.f1040sc[0] : {};
  const f1040sse = forms.f1040sse && forms.f1040sse[0] ? forms.f1040sse[0] : {};

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

  f1040sc.L1 = round(totalIncome);
  console.log(`Total income: ${f1040sc.L1}`);
  f1040sc.L3 = round(sub(f1040sc.L1, f1040sc.L2));

  // TODO: Part III

  f1040sc.L4 = f1040sc.L42;
  f1040sc.L5 = round(sub(f1040sc.L3, f1040sc.L4));
  f1040sc.L7 = round(add([f1040sc.L5, f1040sc.L6]));

  let totalExpenses = "0";
  for (const expense of input.expenses) {
    const key = `L${expense.type}`
    if (typeof f1040sc[key] !== 'undefined') {
      console.log(`Handling expense of ${expense.amount}: ${expense.description}`);
      f1040sc[key] = add([f1040sc[expense.type], expense.amount]);
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
    f1040s1.L3 = f1040sc.L31
    f1040sse.L2 = f1040sc.L31
    f1040sse.L2_Long = f1040sc.L31
  } else if (lt(f1040sc.L31, "0")) {
    if (f1040sc.C32a) {
      f1040s1.L3 = f1040sc.L31
      f1040sse.L2 = f1040sc.L31
      f1040sse.L2_Long = f1040sc.L31
    }
  }

  forms.f1040s1 = [f1040s1];
  forms.f1040sc = [f1040sc];
  forms.f1040sse = [f1040sse];
  return forms;
}

