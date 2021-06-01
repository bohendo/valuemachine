export const sm = (str: string): string =>
  str.toLowerCase();

export const smeq = (str1: string, str2: string): boolean =>
  sm(str1) === sm(str2);
