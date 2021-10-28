import { Guards } from "@valuemachine/transactions";
import { Logger, Prices, ValueMachine } from "@valuemachine/types";
import { getLogger, round } from "@valuemachine/utils";
import axios from "axios";

import { getPdftk } from "./pdftk";
import { getEmptyForms, Forms, MappingArchive, TaxYear } from "./mappings";
import { getTaxReturn } from "./return";
import { getTaxRows } from "./rows";

export const fillForm = async (
  taxYear: TaxYear,
  form: string,
  data: any,
  dir: string,
  libs: { fs: any; execFile: any; },
  logger?: Logger,
): Promise<string> => {
  const log = (logger || getLogger()).child({ module: "FillForm" });
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
        mappedData[entry.fieldName] = round(value, 2);
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
  const destPath = `${dir || "/tmp"}/${form}-${taxYear}.pdf`;
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
  forms: any,
  dir: string,
  libs: { fs: any; execFile: any; },
  logger?: Logger,
): Promise<string> => {
  const log = (logger || getLogger()).child({ module: "FillReturn" });
  const pages = [] as string[];
  for (const entry of Object.entries(forms)) {
    const name = entry[0] as string;
    const data = entry[1] as any;
    if (data?.length) {
      for (const page of data) {
        log.info(`Filing page of ${name} with ${Object.keys(data).length} fields`);
        pages.push(await fillForm(
          taxYear,
          name,
          page,
          "/tmp",
          libs,
        ));
      }
    } else {
      log.info(`Filing ${name} with ${Object.keys(data).length} fields`);
      pages.push(await fillForm(
        taxYear,
        name,
        data,
        "/tmp",
        libs,
      ));
    }
  }
  return getPdftk(libs).cat(
    pages,
    `${dir || "/tmp"}/tax-return-${taxYear}.pdf`,
  );
};

export const requestFilledForm = async (
  taxYear: TaxYear,
  form: string,
  data: any,
  window: any,
  logger?: Logger,
): Promise<void> => {
  const log = (logger || getLogger()).child({ module: "RequestForm" });
  if (!data) {
    log.warn(`Missing data, not requesting ${form}`);
    return;
  } else {
    return new Promise((res, rej) => {
      axios({
        url: `/api/taxes/${form}`,
        method: "post",
        responseType: "blob",
        data: { data, taxYear },
      }).then((response: any) => {
        const url = window.URL.createObjectURL(new window.Blob([response.data]));
        const link = window.document.createElement("a");
        link.href = url;
        link.setAttribute("download", `${form}.pdf`);
        window.document.body.appendChild(link);
        link.click();
        res();
      }).catch(rej);
    });
  }
};

export const requestTaxReturn = async (
  taxYear: TaxYear,
  guard: string,
  vm: ValueMachine,
  prices: Prices,
  formData: Forms,
  window: any,
  logger?: Logger,
): Promise<void> => {
  const log = (logger || getLogger()).child({ module: "RequestReturn" });
  if (!formData) {
    log.warn(`Missing form data, not requesting tax return`);
    return;
  } else {
    const taxRows = getTaxRows({ guard, prices, vm, taxYear });
    log.info(`Fetching ${guard} tax return for ${taxYear} w ${Object.keys(formData).length} forms`);
    const forms = guard === Guards.USA ? await getTaxReturn(taxYear, formData, taxRows)
      : getEmptyForms(taxYear);
    return new Promise((res, rej) => {
      axios({
        url: `/api/taxes`,
        method: "post",
        responseType: "blob",
        data: { forms, taxYear },
      }).then((response) => {
        const url = window.URL.createObjectURL(new window.Blob([response.data]));
        const link = window.document.createElement("a");
        link.href = url;
        link.setAttribute("download", `tax-return-${taxYear}.pdf`);
        window.document.body.appendChild(link);
        link.click();
        res();
      }).catch(rej);
    });
  }
};

export const getMapping = async (
  taxYear: TaxYear,
  form: string,
  libs: { fs: any; execFile: any; },
  logger?: Logger,
): Promise<any> => {
  const log = (logger || getLogger()).child({ module: "GetMapping" });
  const emptyPdf = `${process.cwd()}/forms/${taxYear}/${form}.pdf`;
  const mapping = await getPdftk(libs).getMapping(emptyPdf);
  log.info(`Got mapping w ${Object.keys(mapping).length} entries from empty pdf at ${emptyPdf}`);
  return mapping;
};

export const fetchUsaForm = async (
  taxYear: TaxYear,
  form: string,
  fs: any,
  logger?: Logger,
): Promise<boolean> => {
  const log = (logger || getLogger()).child({ module: "FetchUsaForm" });
  const url = taxYear.endsWith((new Date().getFullYear() - 1).toString().substring(2))
    ? `https://www.irs.gov/pub/irs-pdf/${form}.pdf`
    : `https://www.irs.gov/pub/irs-prior/${form}--20${taxYear.substring(3)}.pdf`;
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
      writer.on("error", rej);
    }).catch(e => rej(e));
  });
};
