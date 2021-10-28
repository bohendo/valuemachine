import { execFile } from "child_process";
import fs from "fs";
import path from "path";

import { expect } from "chai";

import { MappingArchive, TaxYears } from "./mappings";
import { fillForm, fillReturn } from "./pdf";
import { getTestForm, getTestReturn } from "./utils";

const libs = { fs, execFile };
const root = path.join(__dirname, "..");

describe("Tax Form Mappings", () => {

  it(`should fill all fields and check all boxes on one form`, async () => {
    const [year, form] = [TaxYears.USA20, "f1040"];
    const formData = getTestForm(MappingArchive?.[year]?.[form]);
    expect(await fillForm(year, form, formData, root, libs)).to.be.a("string");
  });

  it("should fill all fields and check all boxes on all forms", async () => {
    for (const year of Object.keys(TaxYears)) {
      const formData = getTestReturn(MappingArchive[year]);
      expect(await fillReturn(year, formData, root, libs)).to.be.a("string");
    }
  });

});
