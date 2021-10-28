import { execFile, execFile } from "child_process";
import fs from "fs";
import path from "path";

import { Mapping } from "@valuemachine/types";
import { getLogger } from "@valuemachine/utils";
import { expect } from "chai";

import { MappingArchive, TaxYears } from "./mappings";
import { fetchUsaForm, fillForm, fillReturn } from "./pdf";
import { getPdftk } from "./pdftk";
import { getTestForm, getTestReturn, syncMapping } from "./utils";

const log = getLogger("warn", "Mappings");
const libs = { fs, execFile };
const pdftk = getPdftk(libs);
const root = path.join(__dirname, "..");

const getEmptyPdfPath = (year, form) =>
  `${root}/forms/${year}/${form}.pdf`;

const getMapping = async (year, form): Mapping => {
  if (MappingArchive[year][form]) return MappingArchive[year][form];
  const emptyPdf = getEmptyPdfPath(year, form);
  let mapping;
  try {
    mapping = await pdftk.getMapping(emptyPdf);
  } catch (e) {
    // Might have failed bc empty forms aren't available, fetch them and try again
    await fetchUsaForm(year, form, fs);
    mapping = await pdftk.getMapping(emptyPdf);
  }
  log.info(`Got a mapping w ${mapping.length} fields from ${emptyPdf}`);
  return mapping;
};

describe("Tax Form Mappings", () => {

  it(`should get a mapping even if we need to fetch a new empty form`, async () => {
    const [year, form] = [TaxYears.USA20, "f1040"];
    const mapping = getMapping(year, form);
    expect(mapping).to.be.ok;
  });

  it.skip(`should create any mapping files that don't exist yet`, async () => {
    for (const year of Object.keys(TaxYears)) {
      for (const form of Object.keys(MappingArchive[year])) {
        const emptyPdf = getEmptyPdfPath(year, form);
        // const mapping = await getMapping(year, form);
        const currentMapping = MappingArchive[year][form];
        const ts = await pdftk.getInterface(emptyPdf, form.toUpperCase(), currentMapping);
        const mappingFileContent = ts
          + `\n\nexport const ${form} = `
          + JSON.stringify(currentMapping, null, 2)
          + ";\n";
        const mappingPath = `${root}/src/mappings/${year}/${form}.ts`;
        log.info(`Writing file to ${mappingPath}:`);
        log.debug(mappingFileContent);
        fs.writeFileSync(mappingPath, mappingFileContent);
      }
    }
  });

  it(`should create & fix one form mapping`, async () => {
    const [year, form] = [TaxYears.USA20, "f1040"];
    const mapping = await getMapping(year, form);
    let currentMapping;
    if (MappingArchive[year]?.[form]) {
      currentMapping = MappingArchive[year][form];
      syncMapping(form, mapping, currentMapping);
    } else {
      currentMapping = mapping;
    }
    log.info(`Mapping for ${year} ${form} has ${currentMapping.length} entries`);
    // fs.writeFileSync(mappingPath, mapping);
  });

  it(`should build & fix all form mappings`, async () => {
    for (const year of Object.keys(TaxYears)) {
      if (!MappingArchive[year]) continue; // Skip if we don't support forms for this year
      for (const form of Object.keys(MappingArchive[year])) {
        const mapping = await getMapping(year, form);
        let currentMapping ;
        if (MappingArchive[year]?.[form]) {
          currentMapping = MappingArchive[year][form];
          syncMapping(form, mapping, currentMapping);
        } else {
          currentMapping = mapping;
        }
        log.info(`Mapping for ${year} ${form} has ${currentMapping.length} entries`);
        // fs.writeFileSync(mappingPath, JSON.stringify(currentMapping, null, 2));
      }
    }
  });

  it(`should fill all fields and check all boxes on one form`, async () => {
    const [year, form] = [TaxYears.USA20, "f1040"];
    const formData = getTestForm(MappingArchive?.[year]?.[form]);
    expect(await fillForm(year, form, formData, root, libs)).to.be.a("string");
  });

  it("should fill all fields and check all boxes on all forms", async () => {
    for (const year of Object.keys(TaxYears)) {
      const formData = getTestReturn(MappingArchive[year]);
      expect(await fillReturn(year, formData, root, libs)).to.be.a("string");
    }
  });

});
