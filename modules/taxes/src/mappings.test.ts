import { execSync, execFile } from "child_process";
import fs from "fs";
import path from "path";

import { getLogger } from "@valuemachine/utils";
import { Iconv } from "iconv";
import { expect } from "chai";

import { FormArchive } from "./mappings";
import { fetchUsaForm, fillReturn, getMapping } from "./pdf";
import { getPdfUtils } from "./pdffiller";

const log = getLogger("info", "Mappings");
const pdf = getPdfUtils({ fs, execFile, Iconv });
const root = path.join(__dirname, "..");

describe("Tax Form Mappings", () => {

  it.skip(`should build & fix mappings for one form`, async () => {
    const [year, form] = ["2020", "f2210"];
    const emptyPdf = `${root}/forms/${year}/${form}.pdf`;
    if (fs.existsSync(emptyPdf)) {
      const mapping = await getMapping(year, form, pdf);
      expect(mapping).to.be.ok;
      log.info(mapping, `Got mapping for ${year} ${form}`);
    } else {
      log.info(`Empty pdf doesn't exist at ${emptyPdf}`);
      await fetchUsaForm(year, form, fs);
    }
  });

  it.only(`should build & fix all form mappings`, async () => {
    for (const year of ["2019", "2020"]) {
      if (!FormArchive[year]) continue; // Skip if we don't support forms for this year
      for (const form of Object.keys(FormArchive[year]).concat([])) {
        let fields;
        try {
          fields = Object.values(await getMapping(year, form, pdf) || {});
        } catch (e) {
          await fetchUsaForm(year, form, fs);
          fields = Object.values(await getMapping(year, form, pdf) || {});
        }
        expect(fields.length).to.be.ok; // the empty form should exist & have >0 forms
        log.info(`Got ${fields.length} entries of fdf data from empty ${year} ${form}.pdf file`);
        const getNickname = (field) => field.split(".").pop().replace(/]/g, "").replace(/\[/g, "_");
        const target = `${root}/src/mappings/${year}/${form}.json`;
        if (fs.existsSync(target)) {
          expect(FormArchive[year][form]).to.be.ok;
          const currentMappings = JSON.parse(fs.readFileSync(target));
          log.info(`Mappings w ${Object.keys(currentMappings).length} entries exist at ${target}`);
          for (const field of fields) {
            const mappedName = Object.entries(currentMappings).find(e => e[1] === field)?.[0];
            if (!mappedName) {
              log.warn(`Field ~${getNickname(field)} is not in ${form} mappings: ${field}`);
              currentMappings[getNickname(field)] = field;
            }
          }
          for (const entry of Object.entries(FormArchive[year][form])) {
            if (!fields.includes(entry[1])) {
              log.warn(`Field ${entry[0]} exists in mappings but not the empty pdf: ${entry[1]}`);
              delete currentMappings[entry[0]];
            }
          }
          fs.writeFileSync(target, JSON.stringify(currentMappings, null, 2));
          log.info(`Wrote ${Object.keys(currentMappings).length} updated mappings to ${target}`);
        } else {
          const data = fields.reduce((res, field) => ({ ...res, [getNickname(field)]: field }), {});
          log.warn(`Wrote ${Object.keys(data).length} new mappings to ${target}`);
          fs.writeFileSync(target, JSON.stringify(data, null, 2));
        }
      }
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
    log.debug(formData, "formData");
    expect(await fillReturn(year, formData, root, pdf, execSync)).to.be.a("string");
  });

  it("should fill out all fields for 2019 forms", async () => {
    const year = "2019";
    const formData = Object.keys(FormArchive[year] || {}).reduce((forms, form) => ({
      ...forms,
      [form]: Object.entries(FormArchive[year][form]).reduce((data, entry) => ({
        ...data,
        [entry[0]]: entry[1].includes("].c") ? true : entry[0],
      }), {}),
    }), {});
    log.debug(formData, "formData");
    expect(await fillReturn("2019", formData, root, pdf, execSync)).to.be.a("string");
  });

});

