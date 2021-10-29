import {
  Forms,
  Logger,
  math,
  TaxRow,
} from "./utils";

const { add, gt, mul, round, sub, subToZero } = math;

export const f8889 = (forms: Forms, _taxRows: TaxRow[], logger: Logger): Forms => {
  const log = logger.child({ module: "f8889" });
  const { f1040s1, f1040s2, f8889 } = forms;

  f8889.Name = `${forms.f1040.FirstNameMI} ${forms.f1040.LastName}`;
  f8889.SSN = forms.f1040.SSN;

  f8889.L5 = subToZero(f8889.L3, f8889.L4);
  f8889.L6 = f8889.L5;
  f8889.L8 = add(f8889.L6, f8889.L7);
  f8889.L11 = add(f8889.L9, f8889.L10);
  f8889.L12 = subToZero(f8889.L8, f8889.L11);
  f8889.L13 = gt(f8889.L2, f8889.L12) ? f8889.L12 : f8889.L2;

  f8889.L14c = sub(f8889.L14a, f8889.L14b);

  log.debug(`${f8889.L14a} - ${f8889.L14b} = ${f8889.L14c}`);

  f8889.L16 = subToZero(f8889.L14c, f8889.L15);

  if (gt(f8889.L16, "0")) {
    f8889.L17b = round(mul(f8889.L16, "0.2"));

    const description = `HSA ${f8889.L17b}`;
    f1040s1.L8 = add(f1040s2.L8, f8889.L17b);
    f1040s1.L8R1 = description;

    f1040s2.L8 = add(f1040s2.L8, f8889.L17b);
    f1040s2.C8c = true;
    f1040s2.L8c = description;
  }

  f8889.L20 = add(f8889.L18, f8889.L19);
  if (gt(f8889.L20, "0")) {
    log.warn(`Required but not implemented: part 3 of f8889`);
  }

  return { ...forms, f1040s1, f1040s2, f8889 };
};
