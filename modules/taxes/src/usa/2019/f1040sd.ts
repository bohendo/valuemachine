import { TaxRow } from "@valuemachine/types";
import { math } from "@valuemachine/utils";

import { Forms } from "./types";
import { logger } from "./utils";

const { add, eq, gt, lt, round } = math;

export const f1040sd = (taxRows: TaxRow[], oldForms: Forms): Forms => {
  const log = logger.child({ module: "f1040sd" });
  const forms = JSON.parse(JSON.stringify(oldForms)) as Forms;
  const { f1040, f1040sd } = forms;

  f1040sd.FullName = `${f1040.FirstNameMI} ${f1040.LastName}`;
  f1040sd.SSN = f1040.SocialSecurityNumber;

  const totals = {
    A: { proceeds: "0", cost: "0", adjustments: "0", gainOrLoss: "0" },
    B: { proceeds: "0", cost: "0", adjustments: "0", gainOrLoss: "0" },
    C: { proceeds: "0", cost: "0", adjustments: "0", gainOrLoss: "0" },
    D: { proceeds: "0", cost: "0", adjustments: "0", gainOrLoss: "0" },
    E: { proceeds: "0", cost: "0", adjustments: "0", gainOrLoss: "0" },
    F: { proceeds: "0", cost: "0", adjustments: "0", gainOrLoss: "0" },
    ["?"]: { proceeds: "0", cost: "0", adjustments: "0", gainOrLoss: "0" },
  };

  for (const f8949 of forms.f8949) {

    const shortType =
      f8949.P1C0_A ? "A"
      : f8949.P1C0_B ? "B"
      : f8949.P1C0_C ? "C"
      : "?";

    log.debug(`Short-term f8949 row: proceeds=${f8949.P1L2d} cost=${f8949.P1L2e} gain|loss=${f8949.P1L2h}`);
    totals[shortType].proceeds = add(totals[shortType].proceeds, f8949.P1L2d);
    totals[shortType].cost = add(totals[shortType].cost, f8949.P1L2e);
    totals[shortType].adjustments = add(totals[shortType].adjustments, f8949.P1L2g);
    totals[shortType].gainOrLoss = add(totals[shortType].gainOrLoss, f8949.P1L2h);

    const longType =
      f8949.P2C0_D ? "D"
      : f8949.P2C0_E ? "E"
      : f8949.P2C0_F ? "F"
      : "?";

    log.debug(`Long-term f8949 row: proceeds=${f8949.P2L2d} cost=${f8949.P2L2e} gain|loss=${f8949.P2L2h}`);
    totals[longType].proceeds = add(totals[longType].proceeds, f8949.P2L2d);
    totals[longType].cost = add(totals[longType].cost, f8949.P2L2e);
    totals[longType].adjustments = add(totals[longType].adjustments, f8949.P2L2g);
    totals[longType].gainOrLoss = add(totals[longType].gainOrLoss, f8949.P2L2h);
  }

  f1040sd.L1b_d = round(totals.A.proceeds);
  f1040sd.L1b_e = round(totals.A.cost);
  f1040sd.L1b_g = round(totals.A.adjustments);
  f1040sd.L1b_h = round(totals.A.gainOrLoss);

  f1040sd.L2_d = round(totals.B.proceeds);
  f1040sd.L2_e = round(totals.B.cost);
  f1040sd.L2_g = round(totals.B.adjustments);
  f1040sd.L2_h = round(totals.B.gainOrLoss);

  f1040sd.L3_d = round(totals.C.proceeds);
  f1040sd.L3_e = round(totals.C.cost);
  f1040sd.L3_g = round(totals.C.adjustments);
  f1040sd.L3_h = round(totals.C.gainOrLoss);

  f1040sd.L7 = add(
    f1040sd.L1a_h, f1040sd.L1b_h, f1040sd.L2_h, f1040sd.L3_h,
    f1040sd.L4, f1040sd.L5, f1040sd.L6,
  );

  f1040sd.L8b_d = round(totals.D.proceeds);
  f1040sd.L8b_e = round(totals.D.cost);
  f1040sd.L8b_g = round(totals.D.adjustments);
  f1040sd.L8b_h = round(totals.D.gainOrLoss);

  f1040sd.L9_d = round(totals.E.proceeds);
  f1040sd.L9_e = round(totals.E.cost);
  f1040sd.L9_g = round(totals.E.adjustments);
  f1040sd.L9_h = round(totals.E.gainOrLoss);

  f1040sd.L10_d = round(totals.F.proceeds);
  f1040sd.L10_e = round(totals.F.cost);
  f1040sd.L10_g = round(totals.F.adjustments);
  f1040sd.L10_h = round(totals.F.gainOrLoss);

  f1040sd.L15 = add(
    f1040sd.L8a_h, f1040sd.L8b_h, f1040sd.L9_h, f1040sd.L10_h,
    f1040sd.L11, f1040sd.L12, f1040sd.L13, f1040sd.L14,
  );

  f1040sd.L16 = add(f1040sd.L7, f1040sd.L15);

  let next: string;

  if (gt(f1040sd.L16, "0")) {
    f1040.L6 = f1040sd.L16;
    next = "L17";
  } else if (lt(f1040sd.L16, "0")) {
    next = "L21";
  } else if (eq(f1040sd.L16, "0")) {
    f1040.L6 = "0";
    next = "L22";
  }

  if (next === "L17") {
    if (gt(f1040sd.L15, "0")) {
      f1040sd.C17_Yes = true;
      next = "L18";
    } else {
      f1040sd.C17_No = true;
      next = "L22";
    }
  }

  if (next === "L18") {
    log.warn("Required but not implemented: 28% Rate Gain Worksheet");
    log.warn("Required but not implemented: Unrecaptured Section 1250 Gain Worksheet");
    if (eq(f1040sd.L18, "0") && eq(f1040sd.L19, "0")) {
      log.warn("Required but not implemented: Qualified Dividends and Capital Gain Tax Worksheet");
    } else {
      log.warn("Required but not implemented: Schedule D Tax Worksheet");
    }
    next = "Done";
  }

  if (next === "L21") {
    if (f1040.MarriedFilingSeparately) {
      f1040sd.L21 = lt(f1040sd.L16, "-1500") ? "-1500" : f1040sd.L16;
    } else {
      f1040sd.L21 = lt(f1040sd.L16, "-3000") ? "-3000" : f1040sd.L16;
    }
    f1040.L6 = f1040sd.L21;
  }

  if (next === "L22") {
    if (!eq(f1040.L3a, "0")) {
      f1040sd.C22_Yes = true;
      log.warn("Required but not implemented: Qualified Dividends and Capital Gain Tax Worksheet");
    } else {
      f1040sd.C22_No = true;
    }
  }

  return { ...forms, f1040, f1040sd };
};
