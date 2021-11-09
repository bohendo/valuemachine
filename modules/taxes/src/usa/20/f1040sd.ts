import {
  Forms,
  Logger,
  math,
  TaxInput,
  TaxRow,
} from "./utils";

export const f1040sd = (
  forms: Forms,
  input: TaxInput,
  taxRows: TaxRow[],
  logger: Logger,
): Forms => {
  const log = logger.child({ module: "f1040sd" });
  const { f1040, f1040sd } = forms;
  const { personal } = input;

  f1040sd.Name = `${personal?.firstName || ""} ${personal?.lastName || ""}`;
  f1040sd.SSN = personal?.SSN;

  // Omit this form if we don't have any f8949 pages
  if (!forms.f8949 || !forms.f8949.length) {
    f1040.C7 = false;
    delete forms.f1040sd;
    return forms;
  }
  f1040.C7 = true;

  ////////////////////////////////////////
  // Parts I & II - Sum up all gains/losses

  forms.f8949.forEach(f8949 => {
    const shortRow = f8949.P1_CA ? "1b" : f8949.P1_CB ? "2" : f8949.P1_CC ? "3" : "";
    if (!shortRow) return;
    for (const col of ["d", "e", "g", "h"]) {
      f1040sd[`L${shortRow}_${col}`] = math.add(
        f1040sd[`L${shortRow}_${col}`],
        f8949[`P1L2${col}`],
      );
    }
    const longRow = f8949.P2_CD ? "8b" : f8949.P2_CE ? "9" : f8949.P2_CF ? "10" : "";
    if (!longRow) return;
    for (const col of ["d", "e", "g", "h"]) {
      f1040sd[`L${longRow}_${col}`] = math.add(
        f1040sd[`L${longRow}_${col}`],
        f8949[`P2L2${col}`],
      );
    }
  });

  f1040sd.L7 = math.add(
    f1040sd.L1a_h, // simple no-f8949 gain/loss
    f1040sd.L1b_h, // type-A gain/loss
    f1040sd.L2_h,  // type-B gain/loss
    f1040sd.L3_h,  // type-C gain/loss
    f1040sd.L4,    // short term gain/loss from f6252, f4684, f6781, f8824
    f1040sd.L5,    // short term gain/loss from f1065 schedule K-1
    f1040sd.L6,    // capital loss carryover from last year
  );
  log.info(`Net short-term capital gain/loss: ${f1040sd.L7}`);

  f1040sd.L15 = math.add(
    f1040sd.L8a_h, // simple no-f8949 gain/loss
    f1040sd.L8b_h, // type-D gain/loss
    f1040sd.L9_h,  // type-E gain/loss
    f1040sd.L10_h, // type-F gain/loss
    f1040sd.L11,   // long term gain/loss from f4797, f2439, f6252, f4684, f6781, f8824
    f1040sd.L12,   // long term gain/loss from f1065 schedule K-1
    f1040sd.L13,   // gain distributions
    f1040sd.L14,   // long term loss carryover from last year
  );
  log.info(`Net long-term capital gain/loss: ${f1040sd.L15}`);

  ////////////////////////////////////////
  // Parts III - Summary

  f1040sd.L16 = math.add(
    f1040sd.L7,  // Net short-term gain/loss
    f1040sd.L15, // Net long-term gain/loss
  );

  let next: string;

  if (math.gt(f1040sd.L16, "0")) {
    f1040.L7 = f1040sd.L16;
    next = "L17";
  } else if (math.lt(f1040sd.L16, "0")) {
    next = "L21";
  } else if (math.eq(f1040sd.L16, "0")) {
    f1040.L7 = "0";
    next = "L22";
  }

  if (next === "L17") {
    if (math.gt(f1040sd.L15, "0") && math.gt(f1040sd.L16, "0")) {
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
    if (math.eq(f1040sd.L18, "0") && math.eq(f1040sd.L19, "0")) {
      log.warn("Required but not implemented: Qualified Dividends and Capital Gain Tax Worksheet");
    } else {
      log.warn("Required but not implemented: Schedule D Tax Worksheet");
    }
    next = "Done";
  }

  if (next === "L21") {
    f1040sd.L21 = math.max(
      f1040sd.L16, // capital loss
      personal.filingStatus === "MarriedSeparate" ? "-1500" : "-3000",
    );
    f1040.L7 = f1040sd.L21;
  }

  if (next === "L22") {
    if (math.gt(f1040.L3a, "0")) {
      f1040sd.C22_Yes = true;
      log.warn("Required but not implemented: Qualified Dividends and Capital Gain Tax Worksheet");
    } else {
      f1040sd.C22_No = true;
    }
  }

  return { ...forms, f1040, f1040sd };
};
