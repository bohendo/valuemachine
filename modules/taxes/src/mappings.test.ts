import fs from "fs";
import path from "path";

import { getLogger } from "@valuemachine/utils";
import * as pdf from "pdffiller";
import { expect } from "chai";

import { mappings } from "./mappings";
import { fillForm, mapForm } from "./pdf";

const log = getLogger("info", "Mappings");

const mappingsDir = path.join(__dirname, "mappings");

describe("Tax Form Mappings", () => {

  it.only("should fill out all f1040 fields", async () => {
    const form = "f1040";
    expect(await fillForm(
      form,
      Object.keys(mappings[form] || {}).reduce((test, field) => ({ ...test, [field]: field }), {}),
      pdf
    )).to.be.a("string");
  });

  it.skip("should fetch & save new mappings", async () => {
    const form = "f1040s1";
    const target = `${mappingsDir}/${form}.json`;
    if (fs.existsSync(target)) {
      log.warn(`Mappings already exist at ${target}`);
    } else {
      log.info(`Writing new mappings to ${target}`);
      const fdfData = await mapForm(form, pdf);
      log.info(fdfData, `${form} fdf data`);
      // fs.writeFileSync(target, JSON.stringify(fdfData));
      expect(fdfData).to.be.ok;

    }
  });

});

