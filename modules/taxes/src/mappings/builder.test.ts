import { execFile } from "child_process";
import fs from "fs";
import path from "path";

import { Mapping } from "@valuemachine/types";
import { getLogger } from "@valuemachine/utils";
import { expect } from "chai";

import { fetchUsaForm } from "../pdf";
import { getPdftk } from "../pdftk";

import { buildMappingFile } from "./builder";

import { MappingArchive, TaxYears } from ".";

const log = getLogger("info", "Builder");
const libs = { fs, execFile };
const pdftk = getPdftk(libs);
const root = path.join(__dirname, "../..");

const getDefaultMapping = async (year, form): Mapping => {
  const emptyPdf = `${root}/forms/${year}/${form}.pdf`;
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

const buildMapping = async (year, form) => {
  const defaultMapping = await getDefaultMapping(year, form);
  const mappingFileContent = await buildMappingFile(year, form, defaultMapping);
  const mappingFilePath = `${root}/src/mappings/${year}/${form}.ts`;
  expect(mappingFileContent).to.be.a("string");
  expect(mappingFilePath).to.be.a("string");
  if (fs.existsSync(mappingFilePath)) {
    const oldContent = fs.readFileSync(mappingFilePath, "utf8");
    if (oldContent !== mappingFileContent) {
      log.warn(`Writing modified mapping to ${mappingFilePath}`);
      fs.writeFileSync(mappingFilePath, mappingFileContent);
    } else {
      log.info(`Old mapping at ${mappingFilePath} is up to date`);
    }
  } else {
    log.warn(`Writing new mapping file to ${mappingFilePath}`);
    fs.writeFileSync(mappingFilePath, mappingFileContent);
  }
};

describe("Mappings Builder", () => {
  it(`should build & fix one form mapping`, async () => {
    const [year, form] = [TaxYears.USA20, "f2210"];
    await buildMapping(year, form);
  });

  it.only(`should build & fix all form mappings`, async () => {
    for (const year of Object.keys(TaxYears)) {
      for (const form of Object.keys(MappingArchive[year])) {
        await buildMapping(year, form);
      }
    }
  });
});

