import { execFile, execFile } from "child_process";
import fs from "fs";
import path from "path";

import { getLogger } from "@valuemachine/utils";
import { expect } from "chai";

import { FormArchive, TaxYears } from "./mappings";
import { fetchUsaForm, fillForm, fillReturn } from "./pdf";
import { getPdftk } from "./pdftk";

const log = getLogger("info", "Mappings");
const libs = { fs, execFile };
const pdftk = getPdftk(libs);
const root = path.join(__dirname, "..");

const getDefaultForm = mapping =>
  Object.entries(mapping).reduce((form, entry) => ({
    ...form,
    [entry[0]]: entry[1].includes("].c") ? true : entry[0], // TODO: set type according to the mapping
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
        const target = `${root}/src/mappings/${year}/${form}.json`;
        if (fs.existsSync(target)) {
          // expect(FormArchive[year][form]).to.be.ok;
          const currentMapping = JSON.parse(fs.readFileSync(target)) as any;
          if (!currentMapping?.length) {
            log.warn(`Invalid mappings format, expected an array`);
            return;
          }
          log.info(`Current mappings contain ${currentMapping.length} fields`);

          for (const entry of mapping) {
            const currentEntry = currentMapping.find(e => e.fieldName === entry.fieldName);
            // Make sure all fields except nickname equal the values from the empty pdf
            if (!currentEntry) {
              log.warn(`Adding new entry for ${entry.fieldName} to ${form} mappings`);
              currentMapping.push(entry);
            } else if (currentEntry.fieldType !== entry.fieldType) {
              log.warn(`Replacing ${form}.${currentEntry.nickname}.fieldType with ${entry.fieldType}`);
              currentEntry.fieldType = entry.fieldType;
            } else if (currentEntry.checkmark && !entry.checkmark) {
              log.warn(`Removing ${form}.${currentEntry.nickname} checkmark`);
              delete currentEntry.checkmark;
            } else if (currentEntry.checkmark !== entry.checkmark) {
              log.warn(`Replacing ${form}.${currentEntry.nickname} checkmark with ${entry.checkmark}`);
              currentEntry.checkmark = entry.checkmark;
            }
          }

          for (const i in currentMapping) {
            const currentEntry = currentMapping[i];
            if (!mapping.find(entry => entry.fieldName === currentEntry.fieldName)) {
              log.warn(`Removing ${currentEntry.nickname} from ${form} mappings`);
              currentMapping.splice(i, 1);
            }
          }

          fs.writeFileSync(target, JSON.stringify(currentMapping, null, 2));
          log.info(`Wrote ${Object.keys(currentMapping).length} updated mappings to ${target}`);

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
