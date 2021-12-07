import { EventTypes } from "@valuemachine/core";
import { Assets } from "@valuemachine/transactions";
import { ExpenseTypes, IncomeTypes } from "@valuemachine/types";
import { getLogger } from "@valuemachine/utils";
import { expect } from "chai";

import { TaxYears } from "../../mappings";

import { getTaxReturn } from ".";

const taxYear = TaxYears.USA2020;
const log = getLogger("warn", `Test${taxYear}Filers`);

const travel = [{
  enterDate: "2000-01-01",
  leaveDate: "2040-12-01",
  country: "IND",
}];
const income = {
  date: "2020-01-01T00:00:00",
  action: EventTypes.Income,
  amount: "100",
  asset: Assets.ETH,
  price: "1000",
  value: "100000",
  receivePrice: "1000",
  receiveDate: "2020-01-01T00:00:00",
  capitalChange: "0",
  tag: { incomeType: IncomeTypes.Business },
  taxYear,
};
const tax = {
  date: "2020-02-01T00:00:00",
  action: EventTypes.Expense,
  amount: "20000",
  asset: Assets.USD,
  price: "1",
  value: "20000",
  receivePrice: "1",
  receiveDate: "2020-01-01T00:00:00",
  capitalChange: "0",
  tag: { expenseType: ExpenseTypes.Tax },
  taxYear,
};

describe(`${taxYear} Filers`, () => {
  it(`should include f1040 + schedules 1-3 by default `, async () => {
    const defaultReturn = getTaxReturn({}, [], log);
    log.info(`Tax return includes forms: ${Object.keys(defaultReturn)}`);
    const defaultPages = ["f1040", "f1040s1", "f1040s2", "f1040s3"];
    expect(defaultReturn).to.have.all.keys(...defaultPages);
    expect(Object.keys(defaultReturn).length).to.equal(defaultPages.length);
  });

  it(`should include f1040sc & f1040sse iff there's enough self employment income`, async () => {
    const taxReturn = getTaxReturn({ business: { name: "Bo & Co" } }, [income, tax, {
      date: "2020-02-01T00:00:00",
      action: EventTypes.Expense,
      amount: "1",
      asset: Assets.ETH,
      price: "1000",
      value: "1000",
      receivePrice: "1000",
      receiveDate: "2020-01-01T00:00:00",
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
      date: "2020-12-01T00:00:00",
      action: EventTypes.Trade,
      amount: "10",
      asset: Assets.ETH,
      price: "600",
      value: "6000",
      receivePrice: "100",
      receiveDate: "2020-01-01T00:00:00",
      capitalChange: "5000",
      tag: {},
      taxYear,
    }, {
      // Long-term trade
      date: "2020-12-02T00:00:00",
      action: EventTypes.Trade,
      amount: "100",
      asset: "GME",
      price: "15",
      value: "1500",
      receivePrice: "5",
      receiveDate: "2019-01-01T00:00:00",
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
      { ...income, date: "2019-01-15", receiveDate: "2019-01-15", amount: "40", value: "40000", taxYear: "USA2019" },
      { ...income, date: "2019-04-15", receiveDate: "2019-04-15", amount: "40", value: "40000", taxYear: "USA2019" },
      // Enough income this year that we'd get a penalty for not paying them
      { ...income, date: "2020-01-15", receiveDate: "2020-01-15", amount: "40", value: "40000" },
      { ...income, date: "2020-04-15", receiveDate: "2020-04-15", amount: "25", value: "25000" },
      { ...income, date: "2020-08-15", receiveDate: "2020-08-15", amount: "20", value: "20000" },
      { ...income, date: "2020-12-15", receiveDate: "2020-12-15", amount: "15", value: "15000" },
    ], log);
    expect("f2210" in taxReturn).to.be.true;
    log.info(taxReturn.f2210, "f2210");
  });

});

