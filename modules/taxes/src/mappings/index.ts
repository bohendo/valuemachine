import * as f1040 from "./f1040.json";
import * as f1040s1 from "./f1040s1.json";
import * as f1040s2 from "./f1040s2.json";
import * as f1040s3 from "./f1040s3.json";
import * as f1040sa from "./f1040sa.json";
import * as f1040sb from "./f1040sb.json";
import * as f1040sc from "./f1040sc.json";
import * as f1040sd from "./f1040sd.json";
import * as f1040sse from "./f1040sse.json";
import * as f2555 from "./f2555.json";
import * as f8949 from "./f8949.json";

export const FormMappings = {
  f1040,
  f1040s1,
  f1040s2,
  f1040s3,
  f1040sa,
  f1040sb,
  f1040sc,
  f1040sd,
  f1040sse,
  f2555,
  f8949,
} as const;

// No array: only one page is allowed, else multiple pages are expected
export type Forms = {
  f1040?: { [key in keyof typeof FormMappings.f1040]?: any; };
  f1040s1?: { [key in keyof typeof FormMappings.f1040s1]?: any; };
  f1040s2?: { [key in keyof typeof FormMappings.f1040s2]?: any; };
  f1040s3?: { [key in keyof typeof FormMappings.f1040s3]?: any; };
  f1040sa?: { [key in keyof typeof FormMappings.f1040sa]?: any; };
  f1040sb?: { [key in keyof typeof FormMappings.f1040sb]?: any; };
  f1040sc?: { [key in keyof typeof FormMappings.f1040sc]?: any; };
  f1040sd?: { [key in keyof typeof FormMappings.f1040sd]?: any; };
  f1040sse?: { [key in keyof typeof FormMappings.f1040sse]?: any; };
  f2555?: { [key in keyof typeof FormMappings.f2555]?: any; };
  f8949?: Array<{ [key in keyof typeof FormMappings.f8949]?: any; }>;
};
