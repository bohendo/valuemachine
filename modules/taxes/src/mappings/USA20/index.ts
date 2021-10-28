import f1040s1 from "./f1040s1.json";
import { f1040, F1040 } from "./f1040";
import f1040s2 from "./f1040s2.json";
import f1040s3 from "./f1040s3.json";
import f1040sa from "./f1040sa.json";
import f1040sb from "./f1040sb.json";
import f1040sc from "./f1040sc.json";
import f1040sd from "./f1040sd.json";
import f1040sse from "./f1040sse.json";
import f2210 from "./f2210.json";
import f2555 from "./f2555.json";
import f8949 from "./f8949.json";

// The order here is the default order in which pages will be merged
// Sort them according to the Sequence Attachment No in the top right corner of each form
export const Mappings = {
  /*seq no 0  */ f1040,
  /*seq no 1  */ f1040s1,
  /*seq no 2  */ f1040s2,
  /*seq no 3  */ f1040s3,
  /*seq no 6  */ f2210,
  /*seq no 7  */ f1040sa,
  /*seq no 8  */ f1040sb,
  /*seq no 9  */ f1040sc,
  /*seq no 12 */ f1040sd,
  /*seq no 12a*/ f8949,
  /*seq no 17 */ f1040sse,
  /*seq no 34 */ f2555,
} as const;

// Multiple pages are expected for these forms
// const multiPageForms = ["f8949"];

export type Forms = {
  f1040: F1040;
};
