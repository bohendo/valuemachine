import { f1040, F1040 } from "./f1040";
import { f1040s1, F1040S1 } from "./f1040s1";
import { f1040s2, F1040S2 } from "./f1040s2";
import { f1040s3, F1040S3 } from "./f1040s3";
import { f1040sc, F1040SC } from "./f1040sc";
import { f1040sd, F1040SD } from "./f1040sd";
import { f1040sse, F1040SSE } from "./f1040sse";
import { f2210, F2210 } from "./f2210";
import { f2555, F2555 } from "./f2555";
import { f8949, F8949 } from "./f8949";

// The order here is the default order in which pages will be merged
// Sort them according to the Sequence Attachment No in the top right corner of each form
export const Mappings_USA2021 = {
  /*seq no 0  */ f1040,
  /*seq no 1  */ f1040s1,
  /*seq no 2  */ f1040s2,
  /*seq no 3  */ f1040s3,
  /*seq no 6  */ f2210,
  /*seq no 9  */ f1040sc,
  /*seq no 12  */ f1040sd,
  /*seq no 12a  */ f8949,
  /*seq no 17  */ f1040sse,
  /*seq no 34  */ f2555,
} as const;

export type F1040_USA2021 = F1040;
export type F1040S1_USA2021 = F1040S1;
export type F1040S2_USA2021 = F1040S2;
export type F1040S3_USA2021 = F1040S3;
export type F1040SC_USA2021 = F1040SC;
export type F1040SD_USA2021 = F1040SD;
export type F1040SSE_USA2021 = F1040SSE;
export type F2210_USA2021 = F2210;
export type F2555_USA2021 = F2555;
export type F8949_USA2021 = F8949;

// Multiple pages are expected for forms with array type
export type Forms_USA2021 = {
  f1040?: F1040_USA2021,
  f1040s1?: F1040S1_USA2021,
  f1040s2?: F1040S2_USA2021,
  f1040s3?: F1040S3_USA2021,
  f1040sc?: F1040SC_USA2021,
  f1040sd?: F1040SD_USA2021,
  f1040sse?: F1040SSE_USA2021,
  f2210?: F2210_USA2021,
  f2555?: F2555_USA2021,
  f8949?: F8949_USA2021[],
};
