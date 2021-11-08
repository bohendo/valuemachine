import { Assets } from "@valuemachine/transactions";
import { EventTypes } from "@valuemachine/types";
import { getLogger, math } from "@valuemachine/utils";
import { expect } from "chai";

import { getEmptyForms, TaxYears } from "../../mappings";

import { getTaxReturn } from ".";

const taxYear = TaxYears.USA20;
const log = getLogger("warn", `Test${taxYear}Filers`);

describe(`${taxYear} Filers`, () => {
  it(`should include f1040 + schedules 1-3 by default `, async () => {
    const defaultReturn = getTaxReturn({}, [], log);
    log.info(`Tax return includes forms: ${Object.keys(defaultReturn)}`);
    const defaultPages = ["f1040", "f1040s1", "f1040s2", "f1040s3"];
    expect(defaultReturn).to.have.all.keys(...defaultPages);
    expect(Object.keys(defaultReturn).length).to.equal(defaultPages.length);
  });

  it(`should include f2555 iff lots of travel outside the US was provided`, async () => {
    const travel = [{
      enterDate: "2020-01-01",
      leaveDate: "2020-02-31",
      country: "IND",
      usaIncomeEarned: "0",
    }];
    const noF2555Return = getTaxReturn({ travel }, [], log);
    log.info(`Tax return includes forms: ${Object.keys(noF2555Return)}`);
    expect("f2555" in noF2555Return).to.be.false; // not enough time outside the US
    travel[0].leaveDate = "2020-12-31";
    const f2555Return = getTaxReturn({ travel }, [], log);
    log.info(`Tax return includes forms: ${Object.keys(f2555Return)}`);
    expect("f2555" in f2555Return).to.be.true;
    expect(f2555Return.f2555.L18b_R1).to.be.a("string");
  });

  it(`should include f1040sc iff business info is provided`, async () => {
    const taxReturn = getTaxReturn({ business: { name: "Bo & Co", industry: "misc" } }, [], log);
    log.info(`Tax return includes forms: ${Object.keys(taxReturn)}`);
    expect("f1040sc" in taxReturn).to.be.true;
  });

  it(`should include f8949 & f1040d iff there are >0 trades`, async () => {
    const taxReturn = getTaxReturn({}, [{
      date: "2020-12-01T00:00:00",
      action: EventTypes.Trade,
      amount: "10",
      asset: Assets.ETH,
      price: "600",
      value: "6000",
      receivePrice: "100",
      receiveDate: "2020-01-01T00:00:00",
      capitalChange: "5000",
      tags: [],
    }], log);
    log.info(`Tax return includes forms: ${Object.keys(taxReturn)}`);
    expect("f8949" in taxReturn).to.be.true;
    expect("f1040sd" in taxReturn).to.be.true;
  });

  it(`should implement ${taxYear} math instructions correctly`, async () => {
    const taxRows = [{
      date: "2020-01-01T00:00:00",
      action: EventTypes.Income,
      amount: "10",
      asset: Assets.ETH,
      price: "100",
      value: "1000",
      receivePrice: "100",
      receiveDate: "2020-01-01T00:00:00",
      capitalChange: "0",
      tags: [],
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
      tags: [],
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
      tags: [],
    }];
    const input = {
      forms: {
        ...getEmptyForms(taxYear),
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
    expect(taxReturn.f1040.L14).to.equal(math.add(taxReturn.f1040.L12, taxReturn.f1040.L13));
  });
});

