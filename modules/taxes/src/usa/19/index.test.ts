import { Assets } from "@valuemachine/transactions";
import { EventTypes } from "@valuemachine/types";
import { getLogger } from "@valuemachine/utils";
import { expect } from "chai";

import { getEmptyForms, TaxYears } from "../../mappings";

import { getTaxReturn } from ".";

const taxYear = TaxYears.USA19;
const logger = getLogger("warn", `Test${taxYear}`);

describe(`${taxYear} Filers`, () => {
  it(`should fill ${taxYear} forms correctly`, async () => {
    const taxRows = [{
      date: "2019-01-01T00:00:00",
      action: EventTypes.Income,
      amount: "10",
      asset: Assets.ETH,
      price: "100",
      value: "1000",
      receivePrice: "100",
      receiveDate: "2019-01-01T00:00:00",
      capitalChange: "0",
      tag: {},
    }, {
      date: "2019-12-01T00:00:00",
      action: EventTypes.Trade,
      amount: "10",
      asset: Assets.ETH,
      price: "600",
      value: "6000",
      receivePrice: "100",
      receiveDate: "2019-01-01T00:00:00",
      capitalChange: "5000",
      tag: {},
    }, {
      date: "2019-12-02T00:00:00",
      action: EventTypes.Trade,
      amount: "100",
      asset: "GME",
      price: "15",
      value: "1500",
      receivePrice: "5",
      receiveDate: "2018-01-01T00:00:00",
      capitalChange: "1000",
      tag: {},
    }];
    const forms = { ...getEmptyForms(taxYear),
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
    };
    const taxReturn = getTaxReturn(forms, taxRows, logger);
    expect(taxReturn).to.be.ok;
  });
});

