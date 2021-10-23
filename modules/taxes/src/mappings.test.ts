import { execSync } from "child_process";
import fs from "fs";
import path from "path";

import { getLogger } from "@valuemachine/utils";
import * as pdf from "pdffiller";
import { expect } from "chai";

import { FormMappings } from "./mappings";
import { fillForm, fillReturn, mapForm } from "./pdf";

const log = getLogger("info", "Mappings");

describe("Tax Form Mappings", () => {

  it("should fill out one form", async () => {
    const form = "f1040";
    expect(await fillForm(
      form,
      Object.keys(FormMappings[form]).reduce((data, field) => ({ ...data, [field]: field }), {}),
      pdf,
      "/tmp",
    )).to.be.a("string");
  });

  it("should fill out all fields", async () => {
    const formData = Object.keys(FormMappings).reduce((forms, form) => ({
      ...forms,
      [form]: Object.keys(FormMappings[form]).reduce((data, field) => ({
        ...data,
        [field]: field.startsWith("c") ? "1" : field,
      }), {}),
    }), {});
    log.info(formData, "formData");
    expect(await fillReturn(formData, pdf, execSync, "/tmp")).to.be.a("string");
  });

  // TODO: re-fetch all mappings w field names that don't discard any
  // Change formName then unskip to add a new form mapping
  // then add the new mapping to the index & create a new form filer
  it.skip("should fetch & save new mappings", async () => {
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

});

