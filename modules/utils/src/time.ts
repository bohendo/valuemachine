import {
  DateString,
  DateTimeString,
  IntString,
  Year,
} from "@valuemachine/types";

type Dateish = DateString | DateTimeString | number;

export const msPerDay = 1000 * 60 * 60 * 24;

export const msPerYear = msPerDay * 365;

export const toTime = (d?: Dateish): number =>
  (d || d === 0) ? new Date(d).getTime() : Date.now();

export const toISOString = (d?: Dateish): DateTimeString =>
  (d || d === 0) ? new Date(d).toISOString() : new Date().toISOString();

// returns true if d1 is before d2
export const before = (d1: Dateish, d2: Dateish): boolean =>
  toTime(d1) < toTime(d2);

// returns true if d1 is after d2
export const after = (d1: Dateish, d2: Dateish): boolean =>
  toTime(d1) > toTime(d2);

export const msDiff = (d1: Dateish, d2: Dateish): number =>
  Math.abs(Math.round(toTime(d1) - toTime(d2)));

export const daysInYear = (year: Year): IntString => {
  const y = parseInt(year);
  return y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0) ? "366" : "365";
};

export const chrono = (d1: { date: Dateish; }, d2: { date: Dateish; }): number =>
  toTime(d1.date) - toTime(d2.date);
