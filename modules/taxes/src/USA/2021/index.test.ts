import { EventTypes } from "@valuemachine/core";
import { Assets, ExpenseTypes, IncomeTypes } from "@valuemachine/transactions";
import { getLogger } from "@valuemachine/utils";
import { expect } from "chai";

import { TaxYears } from "../../mappings";

import { thisYear, lastYear } from "./const";

import { getTaxReturn } from ".";

const taxYear = TaxYears.USA2021;
const log = getLogger("warn", `Test${taxYear}Filers`);

const travel = [{
  enterDate: "2000-01-01",
  leaveDate: "2040-12-01",
  country: "IND",
}];
const income = {
  date: `${thisYear}-01-01T00:00:00`,
  action: EventTypes.Income,
  amount: "100",
  asset: Assets.ETH,
  price: "1000",
  value: "100000",
  receivePrice: "1000",
  receiveDate: `${thisYear}-01-01T00:00:00`,
  capitalChange: "0",
  tag: { incomeType: IncomeTypes.Business },
  taxYear,
};
const tax = {
  date: `${thisYear}-02-01T00:00:00`,
  action: EventTypes.Expense,
  amount: "20000",
  asset: Assets.USD,
  price: "1",
  value: "20000",
  receivePrice: "1",
  receiveDate: `${thisYear}-01-01T00:00:00`,
  capitalChange: "0",
  tag: { expenseType: ExpenseTypes.Tax },
  taxYear,
};

describe(`${taxYear} Filers`, () => {
  it(`should include f1040 + schedules 1-3 by default `, async () => {
    const defaultReturn = getTaxReturn({}, [], log);
    log.info(`Tax return includes forms: ${Object.keys(defaultReturn)}`);
    const defaultPages = ["f1040"];
    expect(defaultReturn).to.have.all.keys(...defaultPages);
    expect(Object.keys(defaultReturn).length).to.equal(defaultPages.length);
  });

  it(`should include f1040sc & f1040sse iff there's enough self employment income`, async () => {
    const taxReturn = getTaxReturn({ business: { name: "Bo & Co" } }, [income, tax, {
      date: `${thisYear}-02-01T00:00:00`,
      action: EventTypes.Expense,
      amount: "1",
      asset: Assets.ETH,
      price: "1000",
      value: "1000",
      receivePrice: "1000",
      receiveDate: `${thisYear}-01-01T00:00:00`,
      capitalChange: "0",
      tag: { expenseType: ExpenseTypes.EquipmentRental },
      taxYear,
    }], log);
    expect("f1040sc" in taxReturn).to.be.true;
    expect(taxReturn.f1040sc.L20a).to.equal("1000.0");
    log.info(taxReturn.f1040sc, "f1040sc");
  });

  // Requires schedule d tax worksheet
  it.skip(`should include f8949 & f1040d iff there are >0 trades`, async () => {
    const taxReturn = getTaxReturn({}, [{
      // Short-term trade
      date: `${thisYear}-12-01T00:00:00`,
      action: EventTypes.Trade,
      amount: "10",
      asset: Assets.ETH,
      price: "600",
      value: "6000",
      receivePrice: "100",
      receiveDate: `${thisYear}-01-01T00:00:00`,
      capitalChange: "5000",
      tag: {},
      taxYear,
    }, {
      // Long-term trade
      date: `${thisYear}-12-02T00:00:00`,
      action: EventTypes.Trade,
      amount: "100",
      asset: "GME",
      price: "15",
      value: "1500",
      receivePrice: "5",
      receiveDate: `${lastYear}-01-01T00:00:00`,
      capitalChange: "1000",
      tag: {},
      taxYear,
    }], log);
    expect("f8949" in taxReturn).to.be.true;
    expect("f1040sd" in taxReturn).to.be.true;
    expect(taxReturn.f8949.length).to.equal(1);
    log.info(taxReturn.f8949, "f8949");
    log.info(taxReturn.f1040sd, "f1040sd");
  });

  it(`should include f2555 iff lots of travel outside the US was provided`, async () => {
    const f2555Return = getTaxReturn({ travel }, [income, tax], log);
    expect("f2555" in f2555Return).to.be.true;
    expect(f2555Return.f2555.L18b_R1).to.be.a("string");
    log.info(f2555Return.f2555, "f2555");
  });

  it(`should include f2210 iff we have not paid enough taxes`, async () => {
    const taxReturn = getTaxReturn({}, [
      // Enough income last year that estimated payments are due this year
      { ...income, date: `${lastYear}-01-15`, receiveDate: `${lastYear}-01-15`, amount: `40`, value: `40000`, taxYear: `USA${lastYear}` },
      { ...income, date: `${lastYear}-04-15`, receiveDate: `${lastYear}-04-15`, amount: `40`, value: `40000`, taxYear: `USA${lastYear}` },
      // Enough income this year that we'd get a penalty for not paying them
      { ...income, date: `${thisYear}-01-15`, receiveDate: `${thisYear}-01-15`, amount: `40`, value: `40000` },
      { ...income, date: `${thisYear}-04-15`, receiveDate: `${thisYear}-04-15`, amount: `25`, value: `25000` },
      { ...income, date: `${thisYear}-08-15`, receiveDate: `${thisYear}-08-15`, amount: `20`, value: `20000` },
      { ...income, date: `${thisYear}-12-15`, receiveDate: `${thisYear}-12-15`, amount: `15`, value: `15000` },
    ], log);
    expect("f2210" in taxReturn).to.be.true;
    log.info(taxReturn.f2210, "f2210");
  });

});

