import { getLogger, round } from "@valuemachine/utils";

import { Forms, mappings } from "./mappings";

const log = getLogger().child({ module: "Taxes" }, { level: "debug" });

export const translate = (form, mapping): any => {
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

export const buildF1040 = (formData: Forms["f1040"], fs: any, execSync: any): string => {
  log.info(`Building tax forms for ${formData.FirstNameMI} ${formData.LastName}`);

  const filename = `/tmp/f1040.json`;
  log.info(`Saving f1040 to disk as ${filename}`);
  fs.writeFileSync(filename, JSON.stringify(translate(formData, mappings.f1040)));

  const cmd = "bash node_modules/@valuemachine/taxes/ops/fill-form.sh f1040";
  log.info(`Running command: "${cmd}" from current dir ${process.cwd()}`);
  const stdout = execSync(cmd);
  log.info(`Got output from ${cmd}: ${stdout}`);
  return "/tmp/f1040.pdf";

};
