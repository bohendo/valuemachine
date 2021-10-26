import f1040 from "./f1040.json";
import f1040s1 from "./f1040s1.json";
import f1040s2 from "./f1040s2.json";
import f1040s3 from "./f1040s3.json";
import f1040sa from "./f1040sa.json";
import f1040sb from "./f1040sb.json";
import f1040sc from "./f1040sc.json";
import f1040sd from "./f1040sd.json";
import f1040sse from "./f1040sse.json";
import f2210 from "./f2210.json";
import f2555 from "./f2555.json";
import f8889 from "./f8889.json";
import f8949 from "./f8949.json";

export const Mappings = {
  f1040,
  f1040s1,
  f1040s2,
  f1040s3,
  f1040sa,
  f1040sb,
  f1040sc,
  f1040sd,
  f1040sse,
  f2210,
  f2555,
  f8889,
  f8949,
} as const;

// No array: only one page is allowed, else multiple pages are expected
export type Forms = {
  f1040?: { [key in keyof typeof Mappings.f1040]?: any; };
  f1040s1?: { [key in keyof typeof Mappings.f1040s1]?: any; };
  f1040s2?: { [key in keyof typeof Mappings.f1040s2]?: any; };
  f1040s3?: { [key in keyof typeof Mappings.f1040s3]?: any; };
  f1040sa?: { [key in keyof typeof Mappings.f1040sa]?: any; };
  f1040sb?: { [key in keyof typeof Mappings.f1040sb]?: any; };
  f1040sc?: { [key in keyof typeof Mappings.f1040sc]?: any; };
  f1040sd?: { [key in keyof typeof Mappings.f1040sd]?: any; };
  f1040sse?: { [key in keyof typeof Mappings.f1040sse]?: any; };
  f2210?: { [key in keyof typeof Mappings.f2210]?: any; };
  f2555?: { [key in keyof typeof Mappings.f2555]?: any; };
  f8889?: { [key in keyof typeof Mappings.f8889]?: any; };
  f8949?: Array<{ [key in keyof typeof f8949]?: any; }>;
};
