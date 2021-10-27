import { execFile, execFile } from "child_process";
import fs from "fs";
import path from "path";

import { getLogger } from "@valuemachine/utils";
import { expect } from "chai";

import { FormArchive, TaxYears } from "./mappings";
import { fetchUsaForm, fillForm, fillReturn } from "./pdf";
import { getPdftk, getFieldNickname } from "./pdftk";

const log = getLogger("info", "Mappings");
const libs = { fs, execFile };
const pdftk = getPdftk(libs);
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

  it.only(`should build & fix all form mappings`, async () => {
    for (const year of Object.keys(TaxYears)) {
      if (!FormArchive[year]) continue; // Skip if we don't support forms for this year
      for (const form of Object.keys(FormArchive[year])) {
        let mapping;
        try {
          mapping = await pdftk.dumpFields(`${root}/forms/${year}/${form}.pdf`);
        } catch (e) {
          // Might have failed bc empty forms aren't available, fetch them and try again
          await fetchUsaForm(year, form, fs);
          mapping = await pdftk.dumpFields(`${root}/forms/${year}/${form}.pdf`);
        }
        expect(mapping.length).to.be.ok; // the empty form should exist & have >0 forms
        log.info(`Got ${mapping.length} entries of fdf data from empty ${year} ${form}.pdf file`);
        log.debug(mapping);
        log.warn("Returning early");
        return;
        const target = `${root}/src/mappings/${year}/${form}.json`;
        if (fs.existsSync(target)) {
          expect(FormArchive[year][form]).to.be.ok;
          const currentMappings = JSON.parse(fs.readFileSync(target)) as any;
          if (currentMappings?.length) {
            log.info(`Current mappings are an array of length ${currentMappings.length}`);
          } else {

            log.info(`Mappings w ${Object.keys(currentMappings).length} entries exist at ${target}`);
            for (const field of mapping.map(m => m.fieldName)) {
              const mappedName = Object.entries(currentMappings).find(e => e[1] === field)?.[0];
              if (!mappedName) {
                log.warn(`Field ~${getFieldNickname(field)} is not in ${form} mappings: ${field}`);
                currentMappings[getFieldNickname(field)] = field;
              }
            }
            for (const entry of Object.entries(FormArchive[year][form])) {
              if (!mapping.some(entry => entry.fieldName === entry[1])) {
                log.warn(`Field ${entry[0]} exists in mappings but not the empty pdf: ${entry[1]}`);
                delete currentMappings[entry[0]];
              }
            }
            fs.writeFileSync(target, JSON.stringify(currentMappings, null, 2));
            log.info(`Wrote ${Object.keys(currentMappings).length} updated mappings to ${target}`);

          }
          // log.warn(`Returning early`); return; // TODO: rm
        } else {
          fs.writeFileSync(target, JSON.stringify(mapping, null, 2));
          log.warn(`Wrote new mapping w ${mapping.length} fields to ${target}`);
        }
      }
    }
  });

  // This test can be used to fetch a new empty form & init mappings: set a new year + form then run
  it.skip(`should build & fix a mapping for one form`, async () => {
    const [year, form] = [TaxYears.USA19, "f1040"];
    // Get mapping from empty form (and fetch empty form if not present)
    const emptyPdf = `${root}/forms/${year}/${form}.pdf`;
    let mapping;
    if (fs.existsSync(emptyPdf)) {
      mapping = await pdftk.dumpFields(`${root}/forms/${year}/${form}.pdf`);
    } else {
      log.info(`Empty pdf doesn't exist at ${emptyPdf}`);
      await fetchUsaForm(year, form, fs);
      mapping = await pdftk.dumpFields(`${root}/forms/${year}/${form}.pdf`);
    }
    expect(mapping).to.be.ok;
    log.info(`Found ${mapping.length} fields in empty ${year} ${form}`);
    // Get mapping values (generate from empty form if not available)
    let currentMapping = FormArchive?.[year]?.[form];
    if (!currentMapping) {
      const target = `${root}/src/mappings/${year}/${form}.json`;
      log.warn(`No mapping exist for ${year} ${form} yet`);
      currentMapping = mapping.reduce((res, entry) => ({
        ...res,
        [entry.nickname]: entry.fieldName,
      }), {});
      fs.writeFileSync(target, JSON.stringify(currentMapping, null, 2));
      log.warn(`Wrote new mapping w ${Object.keys(currentMapping).length} fields to ${target}`);
    }
    expect(currentMapping).to.be.ok;
    // Fill form with default values
    expect(await fillForm(
      year,
      form,
      getDefaultForm(currentMapping),
      process.cwd(),
      libs,
    )).to.be.a("string");
  });

});
