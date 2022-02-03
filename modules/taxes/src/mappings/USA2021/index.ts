import { f1040, F1040 } from "./f1040";

export const Mappings_USA2021 = {
  /*seq no 0  */ f1040,
} as const;

export type F1040_USA2021 = F1040;

// Multiple pages are expected for forms with array type
export type Forms_USA2021 = {
  f1040?: F1040_USA2021,
};
