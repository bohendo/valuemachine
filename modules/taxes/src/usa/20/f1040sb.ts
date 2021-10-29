import {
  Forms,
  Logger,
  TaxInput,
  TaxRow,
} from "./utils";

export const f1040sb = (
  forms: Forms,
  input: TaxInput,
  taxRows: TaxRow[],
  logger: Logger,
): Forms => {
  const log = logger.child({ module: "f1040sb" });
  const { f1040sb } = forms;
  const { forms: inputForms } = input;

  if (!inputForms || !("f1040sb" in inputForms)) {
    delete forms.f1040sb;
    return forms;
  }

  log.info(`Including custom interest & dividends`);

  const { personal } = input;
  f1040sb.Name = `${personal?.firstName} ${personal?.middleInitial} ${personal?.lastName}`;
  f1040sb.SSN = personal?.SSN;

  return { ...forms, f1040sb };
};
