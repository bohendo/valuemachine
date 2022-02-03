import { execFile } from "child_process";
import fs from "fs";
import path from "path";

import { getLogger } from "@valuemachine/utils";
import { expect } from "chai";

import { MappingArchive, TaxYears } from "./mappings";
import { fillReturn } from "./pdf";

const log = getLogger("warn", "TestMappings");
const libs = { fs, execFile };
const root = path.join(__dirname, "..");

const getTestForm = mapping =>
  mapping.reduce((form, entry) => ({
    ...form,
    [entry.nickname]: entry.checkmark ? true : entry.nickname,
  }), {});

const getTestReturn = mappings =>
  Object.keys(mappings).reduce((forms, form) => ({
    ...forms,
    [form]: getTestForm(mappings[form]),
  }), {});

describe("Tax Form Mappings", () => {

  // Creates test returns where every checkbox is checked & every field is filled with it's nickname
  it.skip("should fill all fields and check all boxes on all forms", async () => {
    for (const year of [TaxYears.USA2021]) {
      const formData = getTestReturn(MappingArchive[year]);
      expect(await fillReturn(year, formData, root, libs, log)).to.be.a("string");
    }
  });

});
