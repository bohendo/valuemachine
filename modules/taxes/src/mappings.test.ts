import { execSync } from "child_process";
import fs from "fs";
import path from "path";

import { getLogger } from "@valuemachine/utils";
import * as pdf from "pdffiller";
import { expect } from "chai";

import { FormArchive } from "./mappings";
import { fillReturn, mapForm } from "./pdf";

const log = getLogger("info", "Mappings");

describe("Tax Form Mappings", () => {

  // TODO: re-fetch all mappings w field names that don't discard any
  // TODO: insert any new fields that don't exist in the file yet?
  // Change formName then unskip to add a new form mapping
  // then add the new mapping to the index & create a new form filer
  it.skip("should fetch & save new mappings", async () => {
    // const year = "2020";
    const formName = "f1040";
    const target = `${path.join(__dirname, "mappings")}/${formName}.json`;
    if (fs.existsSync(target)) {
      log.warn(`Aborting, mappings already exist at ${target}`);
    } else {
      log.info(`Writing new mappings to ${target}`);
      fs.writeFileSync(target, JSON.stringify(
        Object.keys(await mapForm(formName, pdf)).reduce((res, field) => ({
          ...res,
          [field.split(".").pop().split("[")[0]]: field,
        }), {}),
        null,
        2,
      ));
    }
  });

  it("should fill out all fields for 2020 forms", async () => {
    const year = "2020";
    const formData = Object.keys(FormArchive[year]).reduce((forms, form) => ({
      ...forms,
      [form]: Object.keys(FormArchive[year][form]).reduce((data, field) => ({
        ...data,
        [field]: field.startsWith("C") ? "1" : field,
      }), {}),
    }), {});
    log.info(formData, "formData");
    expect(await fillReturn(
      year,
      formData,
      process.cwd(),
      pdf,
      execSync,
    )).to.be.a("string");
  });

  it.only("should fill out all fields for 2019 forms", async () => {
    const year = "2019";
    const formData = Object.keys(FormArchive[year] || {}).reduce((forms, form) => ({
      ...forms,
      [form]: Object.keys(FormArchive[year][form]).reduce((data, field) => ({
        ...data,
        [field]: field.startsWith("C") ? "1" : field,
      }), {}),
    }), {});
    log.info(formData, "formData");
    expect(await fillReturn(
      "2019",
      formData,
      process.cwd(),
      pdf,
      execSync,
    )).to.be.a("string");
  });

});

