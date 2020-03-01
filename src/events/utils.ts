import { DecimalString, Event } from "../types";
import {
  add,
  diff,
  div,
  lt,
  mul,
} from "../utils";

export const amountsAreClose = (a1: DecimalString, a2: DecimalString): boolean =>
  lt(div(mul(diff(a1, a2), "200"), add([a1, a2])), "1");

export const insertionSort = (events: Event[], newEvent: Event): Event[] => {
  return [...events, newEvent];
};
