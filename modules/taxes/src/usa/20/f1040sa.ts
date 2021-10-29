import {
  Forms,
  Logger,
  TaxInput,
  TaxRow,
} from "./utils";

export const f1040sa = (
  forms: Forms,
  input: TaxInput,
  taxRows: TaxRow[],
  logger: Logger,
): Forms => {
  const log = logger.child({ module: "f1040sa" });
  const { f1040sa } = forms;
  const { forms: inputForms } = input;

  if (!inputForms || !("f1040sa" in inputForms)) {
    delete forms.f1040sa;
    return forms;
  }

  log.info(`Using itemized deductions instead of the standard`);

  const { personal } = input;
  f1040sa.Name = `${personal?.firstName} ${personal?.middleInitial} ${personal?.lastName}`;
  f1040sa.SSN = personal?.SSN;

  return { ...forms, f1040sa };
};
