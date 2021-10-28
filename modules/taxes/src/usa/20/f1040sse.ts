import {
  Forms,
  logger,
  math,
  TaxRow,
} from "./utils";

const log = logger.child({ module: "f1040sse" });
const { add, eq, gt, lt, min, mul, sub } = math;

export const f1040sse = (forms: Forms, _taxRows: TaxRow[]): Forms => {
  const { f1040s1, f1040s2, f1040s3, f1040sse } = forms;

  f1040sse.Name = `${forms.f1040.FirstNameMI} ${forms.f1040.LastName}`;
  f1040sse.SSN = forms.f1040.SSN;

  f1040sse.L3 = add(f1040sse.L1a, f1040sse.L1b, f1040sse.L2);

  f1040sse.L4a = gt(f1040sse.L3, "0") ? mul(f1040sse.L3, "0.9235"): f1040sse.L3;
  f1040sse.L4c = add(f1040sse.L4a, f1040sse.L4b);

  if (lt(f1040sse.L4c, "400")) {
    return { ...forms, f1040sse: {} }; // We don't need to file this form
  }


  f1040sse.L5b = mul(f1040sse.L5a, "0.9235");
  if (math.lt(f1040sse.L5b, "100")) {
    f1040sse.L5b = "0";
  }

  f1040sse.L6 = add(f1040sse.L4c, f1040sse.L5b);
  f1040sse.L8d = add(f1040sse.L8a, f1040sse.L8b, f1040sse.L8c);
  f1040sse.L9 = sub(f1040sse.L7, f1040sse.L8d);
  f1040sse.L10 = mul(math.min(f1040sse.L6, f1040sse.L9), "0.124");
  f1040sse.L11 = mul(f1040sse.L6, "0.029");
  f1040sse.L12 = add(f1040sse.L10, f1040sse.L11);
  f1040sse.L13 = mul(f1040sse.L12, "0.5");

  f1040s2.L4 = f1040sse.L12;
  f1040s1.L14 = f1040sse.L13;

  if (eq(f1040sse.L4c, "0")) {
    f1040sse.L21 = "0";
  } else {
    log.warn(`Using 75% instead of calculating share of income from March-December`);
    f1040sse.L18 = mul(f1040sse.L3, "0.75") ;
    f1040sse.L19 = gt(f1040sse.L18, "0") ? mul(f1040sse.L18, "0.9235") : f1040sse.L18;
    f1040sse.L20 = mul(add(f1040sse.L15, f1040sse.L17), "0.75");
    f1040sse.L21 = add(f1040sse.L19, f1040sse.L20);
  }

  if (eq(f1040sse.L5b, "0")) {
    f1040sse.L23 = "0";
  } else {
    log.warn(`Using 75% instead of calculating share of income from March-December`);
    f1040sse.L22 = mul(f1040sse.L5a, "0.75");
    f1040sse.L23 = mul(f1040sse.L22, "0.9235");
  }

  f1040sse.L24 = add(f1040sse.L21, f1040sse.L23);
  f1040sse.L25 = min(f1040sse.L9, f1040sse.L24);
  f1040sse.L26 = mul(f1040sse.L25, "0.062");

  if (!eq(f1040sse.L26, "0")) {
    log.warn(`See instructions re: f1040sse L26 & f1040s3 L12e`);
    f1040s3.L26 = f1040s3.L12e;
  }

  return { ...forms, f1040s1, f1040s2, f1040sse };
};
