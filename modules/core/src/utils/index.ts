import { TimestampString } from "@finances/types";

export * from "./math";
export * from "./logger";

export const toFormDate = (date: TimestampString): string => {
  const pieces = date.split("T")[0].split("-");
  return `${pieces[1]}, ${pieces[2]}, ${pieces[0]}`;
};
