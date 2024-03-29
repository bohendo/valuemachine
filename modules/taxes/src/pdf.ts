import { Logger, TaxYear } from "@valuemachine/types";
import { getLogger, math } from "@valuemachine/utils";
import axios from "axios";

import { getPdftk } from "./pdftk";
import { Forms, Form, MappingArchive } from "./mappings";
import { getTaxYearError, splitTaxYear } from "./utils";

const fillForm = async (
  taxYear: TaxYear,
  form: string,
  page: number,
  data: Form,
  dir: string,
  libs: { fs: any; execFile: any; },
  logger?: Logger,
): Promise<string> => {
  const log = (logger || getLogger()).child({ name: "FillForm" });
  const mapping = MappingArchive[taxYear][form];
  const mappedData = {};
  for (const [key, value] of Object.entries(data)) {
    const entry = mapping.find(entry => entry.nickname === key);
    if (!entry) {
      log.warn(`Key ${key} exists in output data but not in ${form} mapping`);
    } else if (typeof value === "boolean" && entry.checkmark) {
      mappedData[entry.fieldName] = value ? entry.checkmark : undefined;
    } else if (typeof value === "string" && !entry.checkmark) {
      // Round decimal strings
      if (value.match(/^-?[0-9]+\.[0-9]+$/)) {
        mappedData[entry.fieldName] = math.round(value, 2);
      } else {
        mappedData[entry.fieldName] = value;
      }
      // Use accounting notation for negative values
      if (mappedData[entry.fieldName].startsWith("-")) {
        mappedData[entry.fieldName] = `(${mappedData[entry.fieldName].substring(1)})`;
      }
    } else {
      log.warn(`Skipping field of type ${typeof value} bc it ${
        !entry.checkmark ? "doesn't have a checkmark" : `has checkmark=${entry.checkmark}`
      }: ${form}.${key} = ${typeof value === "string" ? `"${value}"` : value}`);
    }
  }
  const cwd = process.cwd();
  const srcPath = cwd.endsWith("taxes") ? `${cwd}/forms/${taxYear}/${form}.pdf`
    : `${cwd}/node_modules/@valuemachine/taxes/forms/${taxYear}/${form}.pdf`;
  const destPath = `${dir || "/tmp"}/${form}-${taxYear}${page ? `-${page}` : ""}.pdf`;
  const res = await getPdftk(libs).fill(
    srcPath,
    destPath,
    mappedData,
  );
  if (res) log.info(`Successfully filled in pdf & saved it to ${res}`);
  return res || "";
};

export const fillReturn = async (
  taxYear: TaxYear,
  forms: Forms,
  dir: string,
  libs: { fs: any; execFile: any; },
  logger?: Logger,
): Promise<string> => {
  const log = (logger || getLogger()).child({ name: "FillReturn" });
  const pages = [] as string[];
  for (const form of Object.keys(forms)) {
    const fields = forms[form];
    if ("length" in fields) {
      let p = 1;
      for (const page of fields) {
        log.info(`Filing ${taxYear} page ${p} of ${form} with ${Object.keys(page).length} fields`);
        pages.push(await fillForm(
          taxYear,
          form,
          p++,
          page,
          "/tmp",
          libs,
          log,
        ));
      }
    } else {
      log.info(`Filing ${taxYear} ${form} with ${Object.keys(fields).length} fields`);
      pages.push(await fillForm(
        taxYear,
        form,
        0,
        fields,
        "/tmp",
        libs,
        log,
      ));
    }
  }
  return getPdftk(libs).cat(
    pages,
    `${dir || "/tmp"}/${taxYear}-tax-return.pdf`,
  );
};

export const fetchUsaForm = async (
  taxYear: TaxYear,
  form: string,
  fs: any,
  logger?: Logger,
): Promise<boolean> => {
  const error = getTaxYearError(taxYear);
  if (error) throw new Error(error);
  const log = (logger || getLogger()).child({ name: "FetchUsaForm" });
  const [guard, year] = splitTaxYear(taxYear);
  if (guard !== "USA") throw new Error(`Can only fetch USA forms, not ${guard}`);
  const url = year !== new Date().getFullYear().toString()
    ? `https://www.irs.gov/pub/irs-pdf/${form}.pdf`
    : `https://www.irs.gov/pub/irs-prior/${form}--${year}.pdf`;
  log.info(`Fetching ${taxYear} ${form} from ${url}`);
  const emptyPdf = `${process.cwd()}/forms/${taxYear}/${form}.pdf`;
  const writer = fs.createWriteStream(emptyPdf);
  return new Promise((res, rej) => {
    axios({ url, method: "get", responseType: "stream" }).then((response: any) => {
      response.data.pipe(writer);
      writer.on("finish", () => {
        log.info(`Finished writing pdf file to ${emptyPdf}`);
        res(true);
      });
      writer.on("error", e => {
        log.error(`Failed to write response: ${e.message}`);
        rej(e);
      });
    }).catch(e => {
      log.error(`Failed to fetch ${taxYear} ${form}: ${e.message}`);
      rej(e);
    });
  });
};
