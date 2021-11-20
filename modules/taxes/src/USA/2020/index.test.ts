import { Assets } from "@valuemachine/transactions";
import { EventTypes, ExpenseTypes, IncomeTypes } from "@valuemachine/types";
import { getLogger } from "@valuemachine/utils";
import { expect } from "chai";

import { TaxYears } from "../../mappings";

import { getTaxReturn } from ".";

const taxYear = TaxYears.USA2020;
const log = getLogger("warn", `Test${taxYear}Filers`);

const travel = [{
  enterDate: "2020-01-01",
  leaveDate: "2020-12-01",
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
  taxYear: "USA2020",
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
  taxYear: "USA2020",
};

describe(`${taxYear} Filers`, () => {
  it(`should include f1040 + schedules 1-3 by default `, async () => {
    const defaultReturn = getTaxReturn({}, [], log);
    log.info(`Tax return includes forms: ${Object.keys(defaultReturn)}`);
    const defaultPages = ["f1040", "f1040s1", "f1040s2", "f1040s3"];
    expect(defaultReturn).to.have.all.keys(...defaultPages);
    expect(Object.keys(defaultReturn).length).to.equal(defaultPages.length);
  });

  it(`should include f2555 iff lots of travel outside the US was provided`, async () => {
    const f2555Return = getTaxReturn({ travel }, [income, tax], log);
    log.info(`Tax return includes forms: ${Object.keys(f2555Return)}`);
    expect("f2555" in f2555Return).to.be.true;
    expect(f2555Return.f2555.L18b_R1).to.be.a("string");
    log.info(f2555Return.f2555);
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
      taxYear: "USA2020",
    }], log);
    log.info(`Tax return includes forms: ${Object.keys(taxReturn)}`);
    expect("f1040sc" in taxReturn).to.be.true;
    expect(taxReturn.f1040sc.L20a).to.equal("1000.0");
    log.info(taxReturn.f1040sc);
  });

  it(`should include f8949 & f1040d iff there are >0 trades`, async () => {
    const taxReturn = getTaxReturn({ travel }, [{
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
      taxYear: "USA2020",
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
      taxYear: "USA2020",
    }], log);
    log.info(`Tax return includes forms: ${Object.keys(taxReturn)}`);
    expect("f8949" in taxReturn).to.be.true;
    expect("f1040sd" in taxReturn).to.be.true;
    expect(taxReturn.f8949.length).to.equal(1);
    log.info(taxReturn.f8949);
    log.info(taxReturn.f1040sd);
  });

  it(`should include f2210 iff we have not paid enough taxes`, async () => {
    const taxReturn = getTaxReturn({ travel }, [
      { ...income, date: "2019-01-15", receiveDate: "2019-01-15", amount: "40", value: "40000" },
      { ...income, date: "2020-01-15", receiveDate: "2020-01-15", amount: "40", value: "40000" },
      { ...income, date: "2020-04-15", receiveDate: "2020-04-15", amount: "25", value: "25000" },
      { ...income, date: "2020-08-15", receiveDate: "2020-08-15", amount: "20", value: "20000" },
      { ...income, date: "2020-12-15", receiveDate: "2020-12-15", amount: "15", value: "15000" },
    ], log);
    log.info(`Tax return includes forms: ${Object.keys(taxReturn)}`);
    expect("f2210" in taxReturn).to.be.true;
    // log.info(taxReturn.f2210);
  });

  it(`should implement ${taxYear} math instructions correctly`, async () => {
    const taxRows = [{
      date: "2020-01-01T00:00:00",
      action: EventTypes.Income,
      amount: "100",
      asset: Assets.ETH,
      price: "1000",
      value: "100000",
      receivePrice: "1000",
      receiveDate: "2020-01-01T00:00:00",
      capitalChange: "0",
      tag: {},
      taxYear: "USA2020",
    }, {
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
      taxYear: "USA2020",
    }, {
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
      taxYear: "USA2020",
    }];
    const input = {
      travel,
      forms: {
        f1040: {
          FirstNameMI: "Bo",
          MarriedSeparate: true,
          LastName: "Hendo",
          SSN: "137035999",
          L1: "1",
          L2b: "2",
          L3b: "3",
          L4b: "4",
          L5b: "5",
          L6b: "6",
          L7: "7",
          L8: "8",
          L19: "19",
          L25a: "25",
          L26: "26",
          L27: "27",
          L28: "28",
          L29: "29",
          L30: "30",
        },
        f1040s1: {
          L1: "1",
          L2a: "2",
          L5: "5",
          L7: "7",
          L8: "8",
          L9: "9",
          L10: "10",
          L15: "15",
          L16: "16",
          L17: "17",
          L19: "19",
          L20: "20",
          L22: "22",
        },
        f1040s2: {
          L1: "1",
          L2: "2",
        },
        f1040s3: {
          L1: "1",
          L6: "6",
          L9: "9",
          L12d: "12",
        },
      },
    };
    const taxReturn = getTaxReturn(input, taxRows, log);
    expect(taxReturn).to.be.ok;
  });
});

