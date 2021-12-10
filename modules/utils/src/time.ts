import {
  DateString,
  DateTimeString,
  IntString,
  Year,
} from "@valuemachine/types";

export const msPerDay = 1000 * 60 * 60 * 24;

export const msPerYear = msPerDay * 365;

export const toTime = (
  d?: DateString | DateTimeString,
): number =>
  new Date(d).getTime();

export const toISOString = (
  d?: DateString | DateTimeString,
): DateTimeString =>
  new Date(d).toISOString();

// returns true if d1 is before d2
export const before = (
  d1: DateString | DateTimeString,
  d2: DateString | DateTimeString,
): boolean =>
  toTime(d1) < toTime(d2);

// returns true if d1 is after d2
export const after = (
  d1: DateString | DateTimeString,
  d2: DateString | DateTimeString,
): boolean =>
  toTime(d1) > toTime(d2);

export const msDiff = (
  d1: DateString | DateTimeString,
  d2: DateString | DateTimeString,
): number =>
  Math.abs(Math.round(toTime(d1) - toTime(d2)));

export const daysInYear = (
  year: Year,
): IntString => {
  const y = parseInt(year);
  return y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0) ? "366" : "365";
};

export const chrono = (
  d1: { date: DateTimeString; },
  d2: { date: DateTimeString; },
): number =>
  toTime(d1.date) - toTime(d2.date);
