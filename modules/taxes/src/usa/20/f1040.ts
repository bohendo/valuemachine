import { getLogger, math } from "@valuemachine/utils";

const log = getLogger("info", "f1040s1");

export const f1040 = (oldForms: any): any => {
  const forms = JSON.parse(JSON.stringify(oldForms)) as any;
  const { f1040, f1040s1, f1040sd } = forms;

  f1040.L7 = f1040sd.L16;
  f1040.L8 = f1040s1.L9;
  f1040.L9 = math.add(
    f1040.L1, f1040.L2b, f1040.L3b, f1040.L4b,
    f1040.L5b, f1040.L6b, f1040.L7, f1040.L8,
  );

  f1040.L10a = f1040s1.L22;
  f1040.L11 = math.sub(f1040.L9, f1040.L10c);

  if (f1040.Single || f1040.MarriedSeparate) {
    f1040.L12 = "12200";
  } else if (f1040.MarriedJoint || f1040.Widow) {
    f1040.L12 = "24400";
  } else if (f1040.HeadOfHousehold) {
    f1040.L12 = "18350";
  }

  f1040.L14 = math.add(f1040.L12, f1040.L13);
  f1040.L15 = math.subToZero(f1040.L11, f1040.L14);

  log.warn(`f1040 is a work in progress`);

  return { ...forms, f1040 };
};
