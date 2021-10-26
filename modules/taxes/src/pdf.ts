import { Guards } from "@valuemachine/transactions";
import { ValueMachine, Prices } from "@valuemachine/types";
import { getLogger, round } from "@valuemachine/utils";
import axios from "axios";

import { getPdfUtils } from "./pdfUtils";
import { getEmptyForms, Forms, FormArchive, TaxYear } from "./mappings";
import { getTaxReturn } from "./return";
import { getTaxRows } from "./utils";

const log = getLogger("info", "PDF Translator");

export const fillForm = async (
  taxYear: TaxYear,
  form: string,
  data: any,
  dir: string,
  libs: { fs: any; execFile: any; },
): Promise<string> => {
  const translate = (form, mapping): any => {
    const newForm = {};
    for (const [key, value] of Object.entries(form)) {
      if (!mapping[key]) {
        log.warn(`Key ${key} exists in output data but not in mapping`);
      }
      if (
        !["_dec", "_int"].some(suffix => key.endsWith(suffix)) &&
        key.match(/L[0-9]/) &&
        typeof value === "string" &&
        value.match(/^-?[0-9.]+$/)
      ) {
        newForm[mapping[key]] = round(value, 2);
        if (newForm[mapping[key]].startsWith("-")) {
          newForm[mapping[key]] = `(${newForm[mapping[key]].substring(1)})`;
        }
      } else {
        newForm[mapping[key]] = value;
      }
    }
    return newForm;
  };
  const cwd = process.cwd();
  const srcPath = cwd.endsWith("taxes") ? `${cwd}/forms/${taxYear}/${form}.pdf`
    : `${cwd}/node_modules/@valuemachine/taxes/forms/${taxYear}/${form}.pdf`;
  const destPath = `${dir || "/tmp"}/${form}-${taxYear}.pdf`;
  const res = await getPdfUtils(libs).fillForm(
    srcPath,
    destPath,
    translate(data, FormArchive[taxYear][form]),
  );
  if (res) log.info(`Successfully filled in pdf & saved it to ${res}`);
  return res || "";
};

export const fillReturn = async (
  taxYear: TaxYear,
  forms: any,
  dir: string,
  libs: { fs: any; execFile: any; },
): Promise<string> => {
  const { execFile } = libs;
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
  const output = `${dir || "/tmp"}/tax-return-${taxYear}.pdf`;
  // TODO: sort pages based on attachment index?
  const cmd = `pdftk ${pages.join(" ")} cat output ${output}`;
  log.info(`Running command: "${cmd}" from current dir ${process.cwd()}`);
  return new Promise((res, rej) => {
    const stdout = execFile("pdftk", [...pages, "cat", "output", output], (err) => {
      if (err) rej(err);
      log.info(`Got output from ${cmd}: ${stdout}`);
      res(output);
    });
  });
};

export const requestFilledForm = async (
  taxYear: TaxYear,
  form: string,
  data: any,
  window: any,
): Promise<void> => {
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
): Promise<void> => {
  if (!formData) {
    log.warn(`Missing form data, not requesting tax return`);
    return;
  } else {
    const taxRows = getTaxRows({ guard, prices, vm, taxYear });
    log.info(`Fetching ${guard} tax return for ${taxYear} w ${Object.keys(formData).length} forms`);
    const forms = guard === Guards.USA ? await getTaxReturn(taxYear, taxRows, formData)
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
): Promise<any> => {
  const emptyPdf = `${process.cwd()}/forms/${taxYear}/${form}.pdf`;
  const mapping = await getPdfUtils(libs).generateMapping(emptyPdf);
  log.info(`Got mapping w ${Object.keys(mapping).length} entries from empty pdf at ${emptyPdf}`);
  return mapping;
};

export const fetchUsaForm = async (
  taxYear: TaxYear,
  form: string,
  fs: any,
): Promise<boolean> => {
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
