import { math } from "@valuemachine/utils";

import { Forms } from "../../mappings";
import { logger } from "../../utils";

export const f1040 = (oldForms: Forms): Forms => {
  const log = logger.child({ module: "f1040" });
  const forms = JSON.parse(JSON.stringify(oldForms)) as Forms;
  const { f1040, f1040s1, f1040sd } = forms;

  let filingStatus;
  if (f1040.Single || f1040.MarriedSeparate) {
    filingStatus = "single";
  } else if (f1040.MarriedJoint || f1040.Widow) {
    filingStatus = "joint";
  } else if (f1040.HeadOfHousehold) {
    filingStatus = "head";
  }

  f1040.L7 = f1040sd.L16;
  f1040.L8 = f1040s1.L9;

  if (filingStatus === "single") {
    f1040.L12 = "12200";
  } else if (filingStatus === "joint") {
    f1040.L12 = "24400";
  } else if (filingStatus === "head") {
    f1040.L12 = "18350";
  }

  f1040.L14 = math.add(f1040.L12, f1040.L13);
  f1040.L15 = math.subToZero(f1040.L11, f1040.L14);

  log.warn(`f1040 is a work in progress`);

  return { ...forms, f1040 };
};
