import {
  FilingStatuses,
  Logger,
  TaxActions,
  TaxInput,
  TaxRow,
} from "@valuemachine/types";

import {
  Forms,
  math,
  getRowTotal,
  isLongTermTrade,
  lastYear,
  strcat,
  thisYear,
} from "./utils";

export const f1040sd = (
  forms: Forms,
  input: TaxInput,
  taxRows: TaxRow[],
  logger: Logger,
): Forms => {
  const log = logger.child({ module: "f1040sd" });
  const { f1040, f1040sd } = forms;
  const personal = input.personal || {};

  f1040sd.Name = strcat([personal.firstName, personal.lastName]);
  f1040sd.SSN = personal.SSN;

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
      f1040sd[`L${shortRow}${col}`] = math.add(
        f1040sd[`L${shortRow}${col}`],
        f8949[`P1L2${col}`],
      );
    }
    const longRow = f8949.P2_CD ? "8b" : f8949.P2_CE ? "9" : f8949.P2_CF ? "10" : "";
    if (!longRow) return;
    for (const col of ["d", "e", "g", "h"]) {
      f1040sd[`L${longRow}${col}`] = math.add(
        f1040sd[`L${longRow}${col}`],
        f8949[`P2L2${col}`],
      );
    }
  });

  ////////////////////////////////////////
  // Double check Parts I & II

  let sumTrades = fn => getRowTotal(
    taxRows.filter(thisYear),
    TaxActions.Trade,
    {},
    row => fn(row),
  );

  const shortTermProceeds = sumTrades(row => isLongTermTrade(row) ? "0" : row.value);
  if (!math.eq(shortTermProceeds, f1040sd.L3d))
    throw new Error(`DOUBLE_CHECK_FAILED: f1040sd.L3d=${f1040sd.L3d} !== ${shortTermProceeds}`);

  const shortTermCost = sumTrades(row =>
    isLongTermTrade(row) ? "0" : math.mul(row.amount, row.receivePrice)
  );
  if (!math.eq(shortTermCost, f1040sd.L3e))
    throw new Error(`DOUBLE_CHECK_FAILED: f1040sd.L3e=${f1040sd.L3e} !== ${shortTermCost}`);

  const shortTermChange = sumTrades(row => isLongTermTrade(row) ? "0" : row.capitalChange);
  if (!math.eq(shortTermChange, f1040sd.L3h))
    throw new Error(`DOUBLE_CHECK_FAILED: f1040sd.L3h=${f1040sd.L3h} !== ${shortTermChange}`);

  const longTermProceeds = sumTrades(row => !isLongTermTrade(row) ? "0" : row.value);
  if (!math.eq(longTermProceeds, f1040sd.L10d))
    throw new Error(`DOUBLE_CHECK_FAILED: f1040sd.L10d=${f1040sd.L10d} !== ${longTermProceeds}`);

  const longTermCost = sumTrades(row =>
    !isLongTermTrade(row) ? "0" : math.mul(row.amount, row.receivePrice)
  );
  if (!math.eq(longTermCost, f1040sd.L10e))
    throw new Error(`DOUBLE_CHECK_FAILED: f1040sd.L10e=${f1040sd.L10e} !== ${longTermCost}`);

  const longTermChange = sumTrades(row => !isLongTermTrade(row) ? "0" : row.capitalChange);
  if (!math.eq(longTermChange, f1040sd.L10h))
    throw new Error(`DOUBLE_CHECK_FAILED: f1040sd.L10h=${f1040sd.L10h} !== ${longTermChange}`);

  ////////////////////////////////////////
  // Capital Loss Carryover Worksheet

  sumTrades = fn => getRowTotal(
    taxRows.filter(lastYear),
    TaxActions.Trade,
    {},
    row => fn(row),
  );

  const ws = {} as any;
  ws.L1 = "0"; // TODO total taxable income from 2019 f1040.L11b
  ws.L2 = math.abs("-1500"); // TODO capital loss from 2019 f1040sd.L21
  ws.L3 = math.add(ws.L1, ws.L2);
  if (math.lt(ws.L3, "0")) ws.L3 = "0";
  ws.L4 = math.min(ws.L2, ws.L3); // instructions say smaller of L2 & L3b.. where's L3b tho?
  ws.L5 = math.abs("-6300"); // TODO 2019 loss from f1040sd.L7
  ws.L6 = "0"; // TODO 2019 gain from f1040sd.L15
  if (math.lt(ws.L6, "0")) ws.L6 = "0";
  ws.L7 = math.add(ws.L4, ws.L6);
  ws.L8 = math.subToZero(ws.L5, ws.L7);
  f1040sd.L6 = ws.L8;
  log.info(`Short term capital loss carryover from 2019: f1040sd.L6=${f1040sd.L6}`);
  ws.L9 = math.abs("0"); // TODO 2019 loss from f1040sd.L15
  ws.L10 = "0"; // TODO 2019 gain from f1040sd.L7
  if (math.lt(ws.L10, "0")) ws.L10 = "0";
  ws.L11 = math.subToZero(ws.L4, ws.L5);
  ws.L12 = math.add(ws.L10, ws.L11);
  ws.L13 = math.subToZero(ws.L9, ws.L12);
  f1040sd.L14 = ws.L13;
  log.info(`Long term capital loss carryover from 2019: f1040sd.L14=${f1040sd.L14}`);

  f1040sd.L7 = math.add(
    f1040sd.L1ah, // simple no-f8949 gain/loss
    f1040sd.L1bh, // type-A gain/loss
    f1040sd.L2h,  // type-B gain/loss
    f1040sd.L3h,  // type-C gain/loss
    f1040sd.L4,    // gain/loss from f6252, f4684, f6781, f8824
    f1040sd.L5,    // gain/loss from f1065 schedule K-1
    f1040sd.L6,    // capital loss carryover from last year
  );
  log.info(`Net short-term capital gain/loss: ${f1040sd.L7}`);

  f1040sd.L15 = math.add(
    f1040sd.L8ah, // simple no-f8949 gain/loss
    f1040sd.L8bh, // type-D gain/loss
    f1040sd.L9h,  // type-E gain/loss
    f1040sd.L10h, // type-F gain/loss
    f1040sd.L11,   // gain/loss from f4797, f2439, f6252, f4684, f6781, f8824
    f1040sd.L12,   // gain/loss from f1065 schedule K-1
    f1040sd.L13,   // gain distributions
    f1040sd.L14,   // loss carryover from last year
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
    // should always be false, we still need to make amount optional on tax rows
    if (taxRows.filter(thisYear).filter(row => !row.amount).length > 1) {
      log.warn("NOT_IMPLEMENTED: 28% Rate Gain Worksheet");
    }
    if (!("f2555" in forms)) {
      if (math.eq(f1040sd.L18, "0") && math.eq(f1040sd.L19, "0")) {
        log.warn("NOT_IMPLEMENTED: Qualified Dividends and Capital Gain Tax Worksheet");
      } else {
        log.warn("NOT_IMPLEMENTED: Schedule D Tax Worksheet");
      }
    }
    next = "Done";
  }

  if (next === "L21") {
    f1040sd.L21 = math.max(
      f1040sd.L16, // capital loss
      personal.filingStatus === FilingStatuses.Separate ? "-1500" : "-3000",
    );
    f1040.L7 = f1040sd.L21;
  }

  if (next === "L22") {
    if (math.gt(f1040.L3a, "0")) {
      f1040sd.C22_Yes = true;
      log.warn("NOT_IMPLEMENTED: Qualified Dividends and Capital Gain Tax Worksheet");
    } else {
      f1040sd.C22_No = true;
    }
  }

  return { ...forms, f1040, f1040sd };
};
