import { execFile } from "child_process";
import fs from "fs";
import path from "path";

import { TaxYear } from "@valuemachine/types";
import { getLogger } from "@valuemachine/utils";
import { expect } from "chai";

import { fetchUsaForm } from "../pdf";
import { getPdftk } from "../pdftk";

import { buildMappingFile } from "./builder";

import { MappingArchive, TaxYears } from ".";

const log = getLogger("warn", "TestBuilder");
const libs = { fs, execFile };
const pdftk = getPdftk(libs);
const root = path.join(__dirname, "../..");

const buildMapping = async (taxYear: TaxYear, form: string) => {
  const emptyPdf = `${root}/forms/${taxYear}/${form}.pdf`;
  let defaultMapping;
  try {
    defaultMapping = await pdftk.getMapping(emptyPdf);
  } catch (e) {
    // Might have failed bc empty forms isn't available, fetch it and try again
    log.warn(`Failed to get mapping from ${emptyPdf}, fetching empty form & trying again..`);
    await fetchUsaForm(taxYear, form, fs, log);
    defaultMapping = await pdftk.getMapping(emptyPdf);
  }
  log.info(`Got a mapping w ${defaultMapping.length} fields from ${emptyPdf}`);
  const mappingFileContent = await buildMappingFile(taxYear, form, defaultMapping, log);
  const mappingFilePath = `${root}/src/mappings/${taxYear}/${form}.ts`;
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
    const [taxYear, form] = [TaxYears.USA2021, "f1040s1"];
    await buildMapping(taxYear, form);
  });

  it(`should build & fix all form mappings`, async () => {
    for (const taxYear of Object.keys(TaxYears)) {
      for (const form of Object.keys(MappingArchive[taxYear])) {
        await buildMapping(taxYear, form);
      }
    }
  });
});

