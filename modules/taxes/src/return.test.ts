import fs from "fs";
import { execFile } from "child_process";

import { Assets } from "@valuemachine/transactions";
import { EventTypes } from "@valuemachine/types";
import { expect } from "chai";

import { getEmptyForms, TaxYears } from "./mappings";
import { getTaxReturn } from "./return";
import { fillReturn } from "./pdf";

const year = TaxYears.USA20;

describe(`Tax Return`, () => {
  it.only(`should apply math instructions & ${TaxYears.USA19} tax laws properly`, async () => {
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
      cumulativeChange: "0",
      cumulativeIncome: "1000",
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
      cumulativeChange: "5000",
      cumulativeIncome: "1000",
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
      cumulativeChange: "6000",
      cumulativeIncome: "1000",
      tags: [],
    }];
    const forms = { ...getEmptyForms(year),
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
      },
      f1040s1: {
        L9: "9",
        L22: "22",
      },
    };
    const taxReturn = getTaxReturn(year, taxRows, forms);
    expect(taxReturn).to.be.ok;
    const path = await fillReturn(year, taxReturn, process.cwd(), { fs, execFile });
    expect(path).to.be.a("string");
  });
});

