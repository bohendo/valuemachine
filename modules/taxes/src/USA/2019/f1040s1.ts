import { Logger } from "@valuemachine/types";

import {
  Forms,
  IncomeTypes,
  math,
  processIncome,
  TaxRows,
} from "./utils";

export const f1040s1 = (forms: Forms, taxRows: TaxRows, logger: Logger): Forms => {
  const log = logger.child({ name: "f1040s1" });
  const { f1040, f1040s1 } = forms;

  f1040s1.Name = `${f1040.FirstNameMI} ${f1040.LastName}`;
  f1040s1.SSN = f1040.SSN;

  let prizeMoney = "0";
  processIncome(taxRows, (income, value): void => {
    if (income.tag.incomeType === IncomeTypes.Prize) {
      prizeMoney = math.add(prizeMoney, value);
      log.info(`Adding income of ${value}`);
    }
  });
  prizeMoney = math.round(prizeMoney);
  log.info(`Earned ${prizeMoney} in prizes`);

  f1040s1.L8R2 = f1040s1.L8R2.split(", ").concat(`prizes ${prizeMoney}`).join(", ");
  f1040s1.L8 = math.add(f1040s1.L8, prizeMoney);

  f1040s1.L9 = math.add(
    f1040s1.L1, f1040s1.L2a, f1040s1.L3, f1040s1.L4,
    f1040s1.L5, f1040s1.L6, f1040s1.L7, f1040s1.L8,
  );
  f1040.L7a = f1040s1.L9;

  f1040s1.L22 = math.add(
    f1040s1.L10, f1040s1.L11, f1040s1.L12, f1040s1.L13,
    f1040s1.L14, f1040s1.L15, f1040s1.L16, f1040s1.L17,
    f1040s1.L18a, f1040s1.L19, f1040s1.L20, f1040s1.L21,
  );
  f1040.L8a = f1040s1.L22;

  return { ...forms, f1040, f1040s1 };
};
