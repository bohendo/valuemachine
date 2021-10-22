import { getLogger, round } from "@valuemachine/utils";
import * as pdf from "pdffiller";
//import axios from "axios";

import { mappings } from "./usa/mappings";

export const translate = (form, mapping): any => {
  const log = getLogger("warn", "PDF Translator");
  const newForm = {};
  for (const [key, value] of Object.entries(form)) {
    if (key === "default") { continue; }
    if (!mapping[key]) {
      log.warn(`Key ${key} exists in output data but not in ${form} mapping`);
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

export const fillForm = async (form: string, data: any): Promise<string> => {
  const sourcePath = `docs/forms/${form}.pdf`;
  const destinationPath = `${form}.pdf`;
  return new Promise((res, rej) => {
    pdf.fillForm(sourcePath, destinationPath, translate(data, mappings[form]), (err) => {
      if (err) rej(err);
      res(destinationPath);
    });
  });
};

export const mapForm = async (form: string): Promise<any> => {
  // 2nd arg sets the field name regex. Default: /FieldName: ([^\n]*)/
  return new Promise((res, rej) => {
    pdf.generateFDFTemplate(`docs/forms/${form}.pdf`, null, (err, fdfData) => {
      if (err) rej(err);
      res(fdfData);
    });
  });
};

/*
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
