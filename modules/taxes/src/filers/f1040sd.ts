import { ContextLogger, LevelLogger } from "@finances/core";
import { Log } from "@finances/types";

import { env } from "../env";
import { Forms } from "../types";
import { round, add, gt, lt, eq } from "../utils";

export const f1040sd = (vmLogs: Log[], oldForms: Forms): Forms => {
  const log = new ContextLogger("f1040sd", new LevelLogger(env.logLevel));
  const forms = JSON.parse(JSON.stringify(oldForms)) as Forms;
  const { f1040, f1040sd } = forms;

  f1040sd.FullName = `${f1040.FirstNameMI} ${f1040.LastName}`;
  f1040sd.SSN = f1040.SocialSecurityNumber;

  const totals = {
    longTerm: { cost: "0", gainOrLoss: "0", proceeds: "0" },
    shortTerm: { cost: "0", gainOrLoss: "0", proceeds: "0" },
  };
  for (const f8949 of forms.f8949) {
    log.debug(`Fetching data from f8949: proceeds=${f8949.f1_115} cost=${f8949.f1_116} gain|loss=${f8949.f1_119}`);
    totals.shortTerm.proceeds = add([totals.shortTerm.proceeds, f8949.f1_115]);
    totals.shortTerm.cost = add([totals.shortTerm.cost, f8949.f1_116]);
    totals.shortTerm.gainOrLoss = add([totals.shortTerm.gainOrLoss, f8949.f1_119]);
    totals.longTerm.proceeds = add([totals.longTerm.proceeds, f8949.f2_115]);
    totals.longTerm.cost = add([totals.longTerm.cost, f8949.f2_116]);
    totals.longTerm.gainOrLoss = add([totals.longTerm.gainOrLoss, f8949.f2_119]);
  }

  f1040sd.f1_15 = round(totals.shortTerm.proceeds);
  f1040sd.f1_16 = round(totals.shortTerm.cost);
  f1040sd.f1_18 = round(totals.shortTerm.gainOrLoss);

  f1040sd.f1_22 = add([f1040sd.f1_18, f1040sd.f1_19, f1040sd.f1_20, f1040sd.f1_21]);

  f1040sd.f1_35 = round(totals.longTerm.proceeds);
  f1040sd.f1_36 = round(totals.longTerm.cost);
  f1040sd.f1_38 = round(totals.longTerm.gainOrLoss);

  f1040sd.f1_43 = add([f1040sd.f1_38, f1040sd.f1_39, f1040sd.f1_40, f1040sd.f1_41, f1040sd.f1_42]);

  f1040sd.f2_01 = add([f1040sd.f1_22, f1040sd.f1_43]);

  if (gt(f1040sd.f2_01, "0")) {
    f1040.L6 = f1040sd.f2_01;
    if (gt(f1040sd.f1_43, "0")) {
      f1040sd.c2_1_0 = true;
      throw new Error(`28% rate worksheet not implemented yet`);
    } else {
      f1040sd.c2_1_1 = true;
    }
  } else if (lt(f1040sd.f2_01, "0")) {
    if (f1040.MarriedFilingSeparately) {
      f1040sd.f2_04 = lt(f1040sd.f2_01, "1500") ? f1040sd.f2_01 : "1500.00";
    } else {
      f1040sd.f2_04 = lt(f1040sd.f2_01, "3000") ? f1040sd.f2_01 : "3000.00";
    }
    f1040.L6 = f1040sd.f2_04;
  } else if (eq(f1040sd.f2_01, "0")) {
    f1040.L6 = "0.00";
  }

  if (!eq(f1040.L3a, "0")) {
    f1040sd.c2_3_0 = true;
    throw new Error(`Qualified Dividends and Capital Gain Tax Worksheet not implemented yet`);
  } else {
    f1040sd.c2_3_1 = true;
  }

  return { ...forms, f1040, f1040sd };
};
