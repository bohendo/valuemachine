import { execFile } from "child_process";
import fs from "fs";
import path from "path";

import { expect } from "chai";

import { MappingArchive, TaxYears } from "./mappings";
import { fillReturn } from "./pdf";
import { getTestReturn } from "./utils";

const libs = { fs, execFile };
const root = path.join(__dirname, "..");

describe("Tax Form Mappings", () => {

  it("should fill all fields and check all boxes on all forms", async () => {
    for (const year of Object.keys(TaxYears)) {
      const formData = getTestReturn(MappingArchive[year]);
      expect(await fillReturn(year, formData, root, libs)).to.be.a("string");
    }
  });

});
