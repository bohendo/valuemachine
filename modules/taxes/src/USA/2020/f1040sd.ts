import { Logger } from "@valuemachine/types";

import { lastYear, thisYear } from "./const";
import {
  FilingStatuses,
  Forms,
  getTotalCapitalChange,
  getTotalTaxableIncome,
  IncomeTypes,
  math,
  strcat,
  sumIncome,
  sumLongTermTrades,
  sumShortTermTrades,
  sumTrades,
  TaxInput,
  TaxRows,
} from "./utils";

export const f1040sd = (
  forms: Forms,
  input: TaxInput,
  rows: TaxRows,
  logger: Logger,
): Forms => {
  const log = logger.child({ module: "f1040sd" });
  const f1040sd = forms.f1040sd || {};
  const personal = input.personal || {};

  f1040sd.Name = strcat([personal.firstName, personal.lastName]);
  f1040sd.SSN = personal.SSN;

  ////////////////////////////////////////
  // Parts I & II - Sum up all gains/losses

  ////////////////////////////////////////
  // Double check Parts I & II
  const f8949 = forms.f8949 || [];

  f8949.forEach(page => {
    for (const col of ["d", "e", "g", "h"]) {
      log.info(`Adding f8949.L3${col}=${page[`P1L2${col}`]} to f1040sd.L3${col}=${f1040sd[`L3${col}`]}`);
      f1040sd[`L3${col}`] = math.add(
        f1040sd[`L3${col}`],
        page[`P1L2${col}`],
      );
    }
    for (const col of ["d", "e", "g", "h"]) {
      log.info(`Adding f8949.L10${col}=${page[`P2L2${col}`]} to f1040sd.L10${col}=${f1040sd[`L10${col}`]}`);
      f1040sd[`L10${col}`] = math.add(
        f1040sd[`L10${col}`],
        page[`P2L2${col}`],
      );
    }
  });

  const shortProceeds = sumShortTermTrades(thisYear, rows, row => row.value);
  if (!math.eq(shortProceeds, f1040sd.L3d)) log.warn(
    `DOUBLE_CHECK_FAILED: f1040sd.L3d=${f1040sd.L3d} !== shortProceeds=${shortProceeds}`
  );

  const shortCost = sumShortTermTrades(thisYear, rows, row =>
    math.mul(row.amount, row.receivePrice)
  );
  if (!math.eq(shortCost, f1040sd.L3e)) log.warn(
    `DOUBLE_CHECK_FAILED: f1040sd.L3e=${f1040sd.L3e} !== shortCost=${shortCost}`
  );

  const shortChange = sumShortTermTrades(thisYear, rows, row => row.capitalChange);
  if (!math.eq(shortChange, f1040sd.L3h)) log.warn(
    `DOUBLE_CHECK_FAILED: f1040sd.L3h=${f1040sd.L3h} !== shortChange=${shortChange}`
  );

  const longProceeds = sumLongTermTrades(thisYear, rows, row => row.value);
  if (!math.eq(longProceeds, f1040sd.L10d)) log.warn(
    `DOUBLE_CHECK_FAILED: f1040sd.L10d=${f1040sd.L10d} !== longProceeds=${longProceeds}`
  );

  const longCost = sumLongTermTrades(thisYear, rows, row => math.mul(row.amount, row.receivePrice));
  if (!math.eq(longCost, f1040sd.L10e)) log.warn(
    `DOUBLE_CHECK_FAILED: f1040sd.L10e=${f1040sd.L10e} !== longCost=${longCost}`
  );

  const longChange = sumLongTermTrades(thisYear, rows, row => row.capitalChange);
  if (!math.eq(longChange, f1040sd.L10h)) log.warn(
    `DOUBLE_CHECK_FAILED: f1040sd.L10h=${f1040sd.L10h} !== longChange=${longChange}`
  );

  ////////////////////////////////////////
  // Capital Loss Carryover Worksheet i1040sd pg 11
  const ws = {} as any;

  const fmtLoss = amt => math.abs(math.min("0", amt));
  const fmtGain = amt => math.max("0", amt);

  if ("f4797" in forms) log.warn(`NOT_IMPLEMENTED: f4797 income in capital loss carryover`);
  if ("f1040se" in forms) log.warn(`NOT_IMPLEMENTED: f1040se income in capital loss carryover`);
  if ("f1040sf" in forms) log.warn(`NOT_IMPLEMENTED: f1040sf income in capital loss carryover`);

  // ws.L1 = USA2019.f1040.L11b
  ws.L1 = getTotalTaxableIncome(lastYear, input, rows);
  log.info(`2019 total taxable income: ${ws.L1}`);

  // ws.L2 = USA2019.f1040sd.L21
  ws.L2 = fmtLoss(sumTrades(lastYear, rows));
  log.info(`2019 total capital loss: ${ws.L2}`);
  ws.L3 = fmtGain(math.add(ws.L1, ws.L2));
  // instructions say smaller of L2 & L3b.. where's L3b tho?
  ws.L4 = math.min(ws.L2, ws.L3);
  // ws.L5 = USA2019.f1040sd.L7
  ws.L5 = fmtLoss(sumShortTermTrades(lastYear, rows));
  log.info(`2019 total short term capital loss: ${ws.L5}`);
  // 2019 long term gain from f1040sd.L15
  ws.L6 = fmtGain(sumLongTermTrades(lastYear, rows));
  log.info(`2019 total long term capital gain: ${ws.L6}`);
  if (math.lt(ws.L6, "0")) ws.L6 = "0";
  ws.L7 = math.add(ws.L4, ws.L6);
  ws.L8 = math.subToZero(ws.L5, ws.L7);
  f1040sd.L6 = ws.L8;
  log.info(`Short term capital loss carryover from 2019: f1040sd.L6=${f1040sd.L6}`);

  // 2019 long term loss from f1040sd.L15
  ws.L9 = fmtLoss(sumLongTermTrades(lastYear, rows));
  log.info(`2019 total long term capital loss: ${ws.L9}`);
  // 2019 short term gain from f1040sd.L7
  ws.L10 = fmtGain(sumShortTermTrades(lastYear, rows));
  log.info(`2019 total short term capital gain: ${ws.L10}`);
  if (math.lt(ws.L10, "0")) ws.L10 = "0";
  ws.L11 = math.subToZero(ws.L4, ws.L5);
  ws.L12 = math.add(ws.L10, ws.L11);
  ws.L13 = math.subToZero(ws.L9, ws.L12);
  f1040sd.L14 = ws.L13;
  log.info(`Long term capital loss carryover from 2019: f1040sd.L14=${f1040sd.L14}`);

  f1040sd.L7 = math.add(
    f1040sd.L1ah, // simple gain/loss
    f1040sd.L1bh, // type-A gain/loss
    f1040sd.L2h,  // type-B gain/loss
    f1040sd.L3h,  // type-C gain/loss
    f1040sd.L4,   // gain/loss from f6252, f4684, f6781, f8824
    f1040sd.L5,   // gain/loss from f1065 schedule K-1
    math.mul("-1", f1040sd.L6),    // capital loss carryover from last year
  );
  log.info(`Net short-term capital gain/loss: ${f1040sd.L7}`);

  f1040sd.L15 = math.add(
    f1040sd.L8ah, // simple gain/loss
    f1040sd.L8bh, // type-D gain/loss
    f1040sd.L9h,  // type-E gain/loss
    f1040sd.L10h, // type-F gain/loss
    f1040sd.L11,   // gain/loss from f4797, f2439, f6252, f4684, f6781, f8824
    f1040sd.L12,   // gain/loss from f1065 schedule K-1
    f1040sd.L13,   // gain distributions
    math.mul("-1", f1040sd.L14),   // loss carryover from last year
  );
  log.info(`Net long-term capital gain/loss: ${f1040sd.L15}`);

  ////////////////////////////////////////
  // Parts III - Summary

  const totalCapitalChange = getTotalCapitalChange(thisYear, input, rows);

  f1040sd.L16 = math.add(
    f1040sd.L7,  // Net short-term gain/loss
    f1040sd.L15, // Net long-term gain/loss
  );

  let next: string;

  if (math.gt(f1040sd.L16, "0")) {
    if (!math.eq(totalCapitalChange, f1040sd.L16)) log.warn(
      `DOUBLE_CHECK_FAILED: f1040sd.L16=${f1040sd.L16} !== totalCapitalChange=${totalCapitalChange}`
    );
    next = "L17";
  } else if (math.lt(f1040sd.L16, "0")) {
    next = "L21";
  } else if (math.eq(f1040sd.L16, "0")) {
    if (!math.eq(totalCapitalChange, "0")) log.warn(
      `DOUBLE_CHECK_FAILED: f1040sd.L16=${f1040sd.L16} !== totalCapitalChange=${totalCapitalChange}`
    );
    delete forms.f1040sd; // Not needed, aborting
    return forms;
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
    if (rows.filter(row => row.taxYear.endsWith(thisYear)).filter(row => !row.amount).length > 1) {
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
    if (!math.eq(totalCapitalChange, f1040sd.L21)) log.warn(
      `DOUBLE_CHECK_FAILED: f1040sd.L21=${f1040sd.L21} !== totalCapitalChange=${totalCapitalChange}`
    );
  }

  if (next === "L22") {
    const exemptDividends = sumIncome(
      thisYear,
      rows.filter(row => row.tag.exempt),
      IncomeTypes.Dividend
    );
    if (math.gt(exemptDividends, "0")) {
      f1040sd.C22_Yes = true;
      log.warn("NOT_IMPLEMENTED: Qualified Dividends and Capital Gain Tax Worksheet");
    } else {
      f1040sd.C22_No = true;
    }
  }


  return { ...forms, f1040sd };
};
