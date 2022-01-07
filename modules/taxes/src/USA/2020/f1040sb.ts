import { Logger } from "@valuemachine/types";

import {
  Forms,
  strcat,
  TaxInput,
  TaxRows,
} from "./utils";

export const f1040sb = (
  forms: Forms,
  input: TaxInput,
  rows: TaxRows,
  logger: Logger,
): Forms => {
  const log = logger.child({ name: "f1040sb" });
  const { f1040sb } = forms;
  const personal = input.personal || {};
  const inputForms = input.forms || {};

  if (!inputForms || !("f1040sb" in inputForms)) {
    delete forms.f1040sb;
    return forms;
  }

  log.info(`Including custom interest & dividends`);

  f1040sb.Name = strcat([personal.firstName, personal.lastName]);
  f1040sb.SSN = personal.SSN;

  return { ...forms, f1040sb };
};
