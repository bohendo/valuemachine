import { Guards } from "@valuemachine/transactions";
import { ValueMachine, Prices } from "@valuemachine/types";
import { getLogger, round } from "@valuemachine/utils";
import axios from "axios";

import { Forms, Mappings } from "./mappings";
import { getEmptyForms, getTaxReturn } from "./usa";

const log = getLogger("info", "PDF Translator");

export const fillForm = async (
  form: string,
  data: any,
  pdf: any,
  dir?: string,
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
  // We should manage pdf files better w hash suffix
  const cwd = process.cwd();
  const sourcePath = cwd.endsWith("taxes") ? `${cwd}/forms/${form}.pdf`
    : `${process.cwd()}/node_modules/@valuemachine/taxes/forms/${form}.pdf`;
  const destinationPath = `${dir || "/tmp"}/${form}.pdf`;
  return new Promise((res, rej) => {
    log.info(`Translating ${form} data`);
    pdf.fillFormWithFlatten(
      sourcePath,
      destinationPath,
      translate(data, Mappings[form]),
      false,
      err => err ? rej(err) : res(destinationPath),
    );
  });
};

export const fillReturn = async (
  forms: any,
  pdf: any,
  execSync: any,
  dir?: string,
): Promise<string> => {
  const pages = [] as string[];
  for (const entry of Object.entries(forms)) {
    const name = entry[0] as string;
    const data = entry[1] as any;
    if (data?.length) {
      for (const page of data) {
        log.info(`Filing page of ${name} with ${Object.keys(data).length} fields`);
        pages.push(await fillForm(name, page, pdf, dir));
      }
    } else {
      log.info(`Filing ${name} with ${Object.keys(data).length} fields`);
      pages.push(await fillForm(name, data, pdf, dir));
    }
  }
  const output = `${dir || "/tmp"}/tax-return.pdf`;
  // TODO: sort pages based on attachment index
  const cmd = `pdftk ${pages.join(" ")} cat output ${output}`;
  log.info(`Running command: "${cmd}" from current dir ${process.cwd()}`);
  const stdout = execSync(cmd);
  log.info(`Got output from ${cmd}: ${stdout}`);
  return output;
};

export const requestFilledForm = async (form: string, data: any, window: any): Promise<void> => {
  if (!data) {
    log.warn(`Missing data, not requesting ${form}`);
    return;
  } else {
    return new Promise((res, rej) => {
      axios({
        url: `/api/taxes/${form}`,
        method: "post",
        responseType: "blob",
        data: { data },
      }).then((response) => {
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
  guard: string,
  taxYear: string,
  vm: ValueMachine,
  prices: Prices,
  formData: Forms,
  window: any,
): Promise<void> => {
  if (!formData) {
    log.warn(`Missing form data, not requesting tax return`);
    return;
  } else {
    log.info(`Fetching ${guard} tax return for ${taxYear} w ${Object.keys(formData).length} forms`);
    const forms = guard === Guards.USA ? await getTaxReturn(taxYear, vm, prices, formData)
      : getEmptyForms();
    return new Promise((res, rej) => {
      axios({
        url: `/api/taxes`,
        method: "post",
        responseType: "blob",
        data: { forms },
      }).then((response) => {
        const url = window.URL.createObjectURL(new window.Blob([response.data]));
        const link = window.document.createElement("a");
        link.href = url;
        link.setAttribute("download", `tax-return.pdf`);
        window.document.body.appendChild(link);
        link.click();
        res();
      }).catch(rej);
    });
  }
};

export const mapForm = async (form: string, pdf: any): Promise<any> => {
  // 2nd arg sets the field name regex. Default: /FieldName: ([^\n]*)/
  return new Promise((res, rej) => {
    pdf.generateFDFTemplate(`${process.cwd()}/forms/${form}.pdf`, null, (err, fdfData) => {
      if (err) rej(err);
      res(fdfData);
    });
  });
};

/*
path = "__filename/.."
export const fetchForm = async (form: string): Promise<boolean> => {
  return new Promise((res, rej) => {
    axios({
      url: `https://www.irs.gov/pub/irs-pdf/${name}.pdf`,
      method: "get",
      responseType: "blob",
    }).then((response) => {
    }).catch(e => rej(e));
  });
};
*/
