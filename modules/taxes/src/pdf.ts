import { Guards } from "@valuemachine/transactions";
import { ValueMachine, Prices } from "@valuemachine/types";
import { getLogger, round } from "@valuemachine/utils";
import axios from "axios";

import { mappings, Forms, getEmptyForms, getTaxReturn } from "./usa";

const log = getLogger("info", "PDF Translator");

export const translate = (form, mapping): any => {
  const newForm = {};
  for (const [key, value] of Object.entries(form)) {
    if (key === "default") { continue; }
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

export const fillForm = async (form: string, data: any, pdf: any): Promise<string> => {
  // We should manage pdf files better w hash suffix
  const sourcePath = `${process.cwd()}/node_modules/@valuemachine/taxes/docs/forms/${form}.pdf`;
  const destinationPath = `${process.cwd()}/${form}.pdf`;
  return new Promise((res, rej) => {
    log.info(`Translating ${form} data`);
    pdf.fillForm(sourcePath, destinationPath, translate(data, mappings[form]), (err) => {
      if (err) rej(err);
      res(destinationPath);
    });
  });
};

export const fillReturn = async (forms: any, pdf: any, execSync: any): Promise<string> => {
  const pages = [] as string[];
  for (const entry of Object.entries(forms)) {
    const name = entry[0] as string;
    const data = entry[1] as any;
    if (data?.length) {
      log.info(`Filing ${name} with ${data.length} pages`);
      for (const page of data) {
        pages.push(await fillForm(name, page, pdf));
      }
    } else {
      log.info(`Filing ${name} with ${Object.keys(data)} fields`);
      pages.push(await fillForm(name, data, pdf));
    }
  }
  const output = `${process.cwd()}/tax-return.pdf`;
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
    pdf.generateFDFTemplate(`${process.cwd()}/docs/forms/${form}.pdf`, null, (err, fdfData) => {
      if (err) rej(err);
      res(fdfData);
    });
  });
};

/*
path = "__filename/../docs"
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
