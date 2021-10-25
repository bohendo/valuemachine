import { Guards } from "@valuemachine/transactions";
import { ValueMachine, Prices } from "@valuemachine/types";
import { getLogger, round } from "@valuemachine/utils";
import axios from "axios";

import { Forms, FormArchive } from "./mappings";
import { getEmptyForms, getTaxReturn } from "./usa";

const log = getLogger("info", "PDF Translator");

export const fillForm = async (
  year: string,
  form: string,
  data: any,
  dir: string,
  pdf: any,
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
  const sourcePath = cwd.endsWith("taxes") ? `${cwd}/forms/${year ? `${year}/` : ""}${form}.pdf`
    : `${cwd}/node_modules/@valuemachine/taxes/forms/${form}.pdf`;
  const destinationPath = `${dir || "/tmp"}/${form}${year ? `-${year}` : ""}.pdf`;
  return new Promise((res, rej) => {
    log.info(`Translating ${form} data`);
    pdf.fillFormWithFlatten(
      sourcePath,
      destinationPath,
      translate(data, FormArchive[year][form]),
      false,
      err => err ? rej(err) : res(destinationPath),
    );
  });
};

export const fillReturn = async (
  year: string,
  forms: any,
  dir: string,
  pdf: any,
  execSync: any,
): Promise<string> => {
  const pages = [] as string[];
  for (const entry of Object.entries(forms)) {
    const name = entry[0] as string;
    const data = entry[1] as any;
    if (data?.length) {
      for (const page of data) {
        log.info(`Filing page of ${name} with ${Object.keys(data).length} fields`);
        pages.push(await fillForm(
          year,
          name,
          page,
          "/tmp",
          pdf,
        ));
      }
    } else {
      log.info(`Filing ${name} with ${Object.keys(data).length} fields`);
      pages.push(await fillForm(
        year,
        name,
        data,
        "/tmp",
        pdf,
      ));
    }
  }
  const output = `${dir || "/tmp"}/tax-return${year ? `-${year}` : ""}.pdf`;
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
  year: string,
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
    log.info(`Fetching ${guard} tax return for ${year} w ${Object.keys(formData).length} forms`);
    const forms = guard === Guards.USA ? await getTaxReturn(year, vm, prices, formData)
      : getEmptyForms(year);
    return new Promise((res, rej) => {
      axios({
        url: `/api/taxes`,
        method: "post",
        responseType: "blob",
        data: { forms, year },
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

export const mapForm = async (year: string, form: string, pdf: any): Promise<any> => {
  // 2nd arg sets the field name regex. Default: /FieldName: ([^\n]*)/
  const pdfPath = `${process.cwd()}/forms/${year}/${form}.pdf`;
  log.debug(`Mapping pdf at ${pdfPath}`);
  return new Promise((res, rej) => {
    pdf.generateFDFTemplate(
      `${process.cwd()}/forms/${year}/${form}.pdf`,
      null,
      (err, fdf) => err ? rej(err) : res(fdf),
    );
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
