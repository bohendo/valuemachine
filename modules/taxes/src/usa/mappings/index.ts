import * as f1040 from "./f1040.json";
import * as f1040s1 from "./f1040s1.json";
import * as f1040s2 from "./f1040s2.json";
import * as f1040s3 from "./f1040s3.json";
import * as f2555 from "./f2555.json";
import * as f8949 from "./f8949.json";

export const mappings = {
  f1040,
  f1040s1,
  f1040s2,
  f1040s3,
  f2555,
  f8949,
};

// No array: only one page is allowed, else multiple pages are expected
export type Forms = {
  f1040?: { [key in keyof typeof mappings.f1040]?: any; };
  f1040s1?: { [key in keyof typeof mappings.f1040s1]?: any; };
  f1040s2?: { [key in keyof typeof mappings.f1040s2]?: any; };
  f1040s3?: { [key in keyof typeof mappings.f1040s3]?: any; };
  f2555?: { [key in keyof typeof mappings.f2555]?: any; };
  f8949?: Array<{ [key in keyof typeof mappings.f8949]?: any; }>;
}
