import {
  Forms,
  FilingStatuses,
  getIncomeTax,
  logger,
  math,
} from "./utils";

const log = logger.child({ module: "f1040" });

export const f1040 = (oldForms: Forms): Forms => {
  const forms = JSON.parse(JSON.stringify(oldForms)) as Forms;
  const { f1040, f2555 } = forms;

  let filingStatus;
  if (f1040.Single || f1040.MarriedSeparate) {
    filingStatus = FilingStatuses.Single;
  } else if (f1040.MarriedJoint || f1040.Widow) {
    filingStatus = FilingStatuses.Joint;
  } else if (f1040.HeadOfHousehold) {
    filingStatus = FilingStatuses.Head;
  }

  // These two lines should throw type errors at build time
  //f1040.StatusInfo = true;
  //f1040.HasCrypto_Yes = "Yea";

  f1040.L9 = math.add(
    f1040.L1, f1040.L2b, f1040.L3b, f1040.L4b,
    f1040.L5b, f1040.L6b, f1040.L7, f1040.L8,
  );

  f1040.L10c = math.add(f1040.L10a, f1040.L10b);
  f1040.L11 = math.sub(f1040.L9, f1040.L10c);

  if (filingStatus === FilingStatuses.Single) {
    f1040.L12 = "12200";
  } else if (filingStatus === FilingStatuses.Joint) {
    f1040.L12 = "24400";
  } else if (filingStatus === FilingStatuses.Head) {
    f1040.L12 = "18350";
  }

  f1040.L14 = math.add(f1040.L12, f1040.L13);
  f1040.L15 = math.subToZero(f1040.L11, f1040.L14);

  if (!forms.f2555) {
    f1040.L16 = getIncomeTax(f1040.L11, filingStatus);
  } else {
    log.warn(`idk what 2b from Foreign Earned Income Tax Worksheet should be, using 0`);
    const L2c = math.add(f2555.L45, f2555.L50);
    const L3 = math.add(f1040.L11, math.add());
    const L4 = getIncomeTax(L3, filingStatus);
    const L5 = getIncomeTax(L2c, filingStatus);
    f1040.L16 = math.subToZero(L4, L5);
  }

  f1040.L18 = math.add(f1040.L16, f1040.L17);
  f1040.L21 = math.add(f1040.L19, f1040.L20);
  f1040.L22 = math.subToZero(f1040.L18, f1040.L21);
  f1040.L24 = math.add(f1040.L22, f1040.L23);
  f1040.L25d = math.add(f1040.L25a, f1040.L25b, f1040.L25c);
  f1040.L32 = math.add(f1040.L27, f1040.L28, f1040.L29, f1040.L30, f1040.L31);
  f1040.L33 = math.add(f1040.L25d, f1040.L26, f1040.L32);
  f1040.L34 = math.gt(f1040.L33, f1040.L24) ? math.sub(f1040.L33, f1040.L24) : "";
  f1040.L36 = math.lt(f1040.L33, f1040.L24) ? math.sub(f1040.L24, f1040.L33) : "";

  return { ...forms, f1040 };
};
