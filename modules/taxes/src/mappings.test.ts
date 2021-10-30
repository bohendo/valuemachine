import { execFile } from "child_process";
import fs from "fs";
import path from "path";

import { getLogger } from "@valuemachine/utils";
import { expect } from "chai";

import { MappingArchive, TaxYears } from "./mappings";
import { fillReturn } from "./pdf";
import { getTestReturn } from "./utils";

const log = getLogger("warn", "TestMappings");
const libs = { fs, execFile };
const root = path.join(__dirname, "..");

describe("Tax Form Mappings", () => {

  // Creates test returns where every checkbox is checked & every field is filled with it's nickname
  it.skip("should fill all fields and check all boxes on all forms", async () => {
    for (const year of [TaxYears.USA20]) { // Object.keys(TaxYears)) {
      const formData = getTestReturn(MappingArchive[year]);
      expect(await fillReturn(year, formData, root, libs, log)).to.be.a("string");
    }
  });

});
