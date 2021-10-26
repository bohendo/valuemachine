import { expect } from "chai";

import { getEmptyForms, TaxYears } from "./mappings";
import { getTaxReturn } from "./return";

const year = TaxYears.USA19;

describe(`Tax Return`, () => {
  it(`should apply math instructions & ${TaxYears.USA19} tax laws properly`, async () => {
    const taxRows = [];
    const taxReturn = getTaxReturn(year, taxRows, getEmptyForms(year));
    expect(taxReturn).to.be.ok;
  });
});

