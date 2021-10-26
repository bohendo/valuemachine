import {
  math,
  TaxRow,
} from "./utils";

const { add, gt, lt, mul, round } = math;

export const f1040sse = (taxRows: TaxRow[], oldForms: any): any => {
  const forms = JSON.parse(JSON.stringify(oldForms)) as any;
  const { f1040s1, f1040s2, f1040sse } = forms;

  f1040sse.P1_Name = `${forms.f1040.FirstNameMI} ${forms.f1040.LastName}`;
  f1040sse.P1_SSN = forms.f1040.SSN;
  f1040sse.P2_Name = f1040sse.P1_Name;
  f1040sse.P2_SSN = f1040sse.P1_SSN;

  f1040sse.P1L3 = round(add(f1040sse.P1L1a, f1040sse.P1L1b, f1040sse.P1L2));
  f1040sse.P1L4 = round(mul(f1040sse.P1L3, "0.9235"));

  if (lt(f1040sse.P1L4, "400")) {
    return forms; // Don't need to file this form
  }

  f1040sse.P1L5 = round(
    gt(f1040sse.P1L4, "132900")
      ? add(mul(f1040sse.P1L4, "0.029"), "16479.60")
      : mul(f1040sse.P1L4, "0.153"),
  );
  f1040s2.L4 = f1040sse.P1L5;

  f1040sse.P1L6 = round(mul(f1040sse.P1L5, "0.5"));
  f1040s1.L14 = f1040sse.P1L6;

  return { ...forms, f1040s1, f1040s2, f1040sse };
};
