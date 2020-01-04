import * as mappings from '../mappings/f1040sd.json';
import { emptyForm, mergeForms } from '../utils';
import { round, add, gt, lt, eq } from '../utils';
import { HasMappings, InputData } from '../types';

export type F1040sd = HasMappings & { [key in keyof typeof mappings]: string|boolean; };

export const f1040sd = (input: InputData, output: any): F1040sd[] => {
  const f1040sd = mergeForms(mergeForms(emptyForm(mappings), input.f1040sd), output.f1040sd);
  f1040sd.mappings = mappings
  if (process.env.MODE === "test") { return [f1040sd]; }
  const f1040 = output.f1040 && output.f1040[0] ? output.f1040[0] : {};
  const f8949s = output.f8949 && output.f8949[0] ? output.f8949 : {};

  f1040sd.f1_01 = `${input.FirstName} ${input.MiddleInitial} ${input.LastName}`;
  f1040sd.f1_02 = input.SocialSecurityNumber;

  const totals = { proceeds: "0", cost: "0", gainOrLoss: "0" }
  for (const f8949 of f8949s) {
    console.log(`Fetching data from f8949: proceeds=${f8949.f1_115} cost=${f8949.f1_116} gain|loss=${f8949.f1_119}`);
    totals.proceeds = add([totals.proceeds, f8949.f1_115]);
    totals.cost = add([totals.cost, f8949.f1_116]);
    totals.gainOrLoss = add([totals.gainOrLoss, f8949.f1_119]);
  }
  f1040sd.f1_15 = round(totals.proceeds, 2);
  f1040sd.f1_16 = round(totals.cost, 2);
  f1040sd.f1_18 = round(totals.gainOrLoss, 2);

  f1040sd.f1_22 = add([f1040sd.f1_18, f1040sd.f1_19, f1040sd.f1_20, f1040sd.f1_21]);

  // TODO: handle long-term capital gains properly

  f1040sd.f2_01 = add([f1040sd.f1_22, f1040sd.f1_43]);

  if (gt(f1040sd.f2_01, "0")) {
    f1040.Line6 = f1040sd.f2_01;
    if (gt(f1040sd.f1_43, "0")) {
      f1040sd.c2_1_0 = true;
      throw new Error(`28% rate worksheet not implemented yet`);
    } else {
      f1040sd.c2_1_1 = true;
    }
  } else if (lt(f1040sd.f2_01, "0")) {
    if (f1040.isMarriedSeparate) {
      f1040sd.f2_04 = lt(f1040sd.f2_04, "1500") ? f1040sd.f2_04 : "1500.00";
    } else {
      f1040sd.f2_04 = lt(f1040sd.f2_04, "3000") ? f1040sd.f2_04 : "3000.00";
    }
  } else if (eq(f1040sd.f2_01, "0")) {
    f1040.Line6 = "0.00" 
  }

  if (!eq(f1040.Line3a, "0")) {
    f1040sd.c2_3_0 = true;
    throw new Error(`Qualified Dividends and Capital Gain Tax Worksheet not implemented yet`);
  } else {
    f1040sd.c2_3_1 = true;
  }

  output.f1040 = [f1040];
  return [f1040sd]
}
