import { execFile, execFile } from "child_process";
import fs from "fs";
import path from "path";

import { getLogger } from "@valuemachine/utils";
import { expect } from "chai";

import { FormArchive, TaxYears } from "./mappings";
import { fetchUsaForm, fillForm, fillReturn, getMapping } from "./pdf";
import { getPdfUtils, getFieldNickname } from "./pdfUtils";

const log = getLogger("info", "Mappings");
const libs = { fs, execFile };
const pdf = getPdfUtils(libs);
const root = path.join(__dirname, "..");

const getDefaultForm = mapping =>
  Object.entries(mapping).reduce((form, entry) => ({
    ...form,
    [entry[0]]: entry[1].includes("].c") ? true : entry[0],
  }), {});

const getDefaultReturn = mappings =>
  Object.keys(mappings).reduce((forms, form) => ({
    ...forms,
    [form]: getDefaultForm(mappings[form]),
  }), {});

describe("Tax Form Mappings", () => {

  it("should fill all fields and check all boxes on all forms", async () => {
    for (const year of Object.keys(TaxYears)) {
      const formData = getDefaultReturn(FormArchive[year]);
      log.debug(formData, "formData");
      expect(await fillReturn(year, formData, root, libs)).to.be.a("string");
    }
  });

  it(`should build & fix all form mappings`, async () => {
    for (const year of Object.keys(TaxYears)) {
      if (!FormArchive[year]) continue; // Skip if we don't support forms for this year
      for (const form of Object.keys(FormArchive[year])) {
        let fields;
        try {
          fields = Object.values(await getMapping(year, form, libs) || {});
        } catch (e) {
          log.warn(e.message);
          // Might have failed bc empty forms aren't available, fetch them and try again
          await fetchUsaForm(year, form, fs);
          fields = Object.values(await getMapping(year, form, libs) || {});
        }
        expect(fields.length).to.be.ok; // the empty form should exist & have >0 forms
        log.info(`Got ${fields.length} entries of fdf data from empty ${year} ${form}.pdf file`);
        const target = `${root}/src/mappings/${year}/${form}.json`;
        if (fs.existsSync(target)) {
          expect(FormArchive[year][form]).to.be.ok;
          const currentMappings = JSON.parse(fs.readFileSync(target));
          log.info(`Mappings w ${Object.keys(currentMappings).length} entries exist at ${target}`);
          for (const field of fields) {
            const mappedName = Object.entries(currentMappings).find(e => e[1] === field)?.[0];
            if (!mappedName) {
              log.warn(`Field ~${getFieldNickname(field)} is not in ${form} mappings: ${field}`);
              currentMappings[getFieldNickname(field)] = field;
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
          const data = fields.reduce((res, field) => ({
            ...res,
            [getFieldNickname(field)]: field,
          }), {});
          log.warn(`Wrote ${Object.keys(data).length} new mappings to ${target}`);
          fs.writeFileSync(target, JSON.stringify(data, null, 2));
        }
      }
    }
  });

  // This test can be used to fetch a new empty form & init mappings: set a new year + form then run
  it.skip(`should build & fix a mapping for one form`, async () => {
    const [year, form] = [TaxYears.USA19, "f1040"];
    // Get fields from empty form (and fetch empty form if not present)
    const emptyPdf = `${root}/forms/${year}/${form}.pdf`;
    let fields;
    if (fs.existsSync(emptyPdf)) {
      fields = Object.values(await getMapping(year, form, pdf));
    } else {
      log.info(`Empty pdf doesn't exist at ${emptyPdf}`);
      await fetchUsaForm(year, form, fs);
      fields = Object.values(await getMapping(year, form, pdf));
    }
    expect(fields).to.be.ok;
    log.info(`Found ${fields.length} fields in empty ${year} ${form}`);
    // Get mapping values (generate from empty form if not available)
    let mapping = FormArchive?.[year]?.[form];
    if (!mapping) {
      const target = `${root}/src/mappings/${year}/${form}.json`;
      log.warn(`No mapping exist for ${year} ${form} yet`);
      mapping = fields.reduce((res, field) => ({
        ...res,
        [getFieldNickname(field)]: field,
      }), {});
      fs.writeFileSync(target, JSON.stringify(mapping, null, 2));
      log.warn(`Wrote ${Object.keys(mapping).length} new mapping to ${target}`);
    }
    expect(mapping).to.be.ok;
    // Fill form with default values
    expect(await fillForm(
      year,
      form,
      getDefaultForm(mapping),
      process.cwd(),
      libs,
    )).to.be.a("string");
  });

});
