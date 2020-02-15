export * from "./math";
export * from "./forms";

export const getDateString = (date: Date): string => {
  if (isNaN(date.getUTCFullYear())) {
    return "";
  }
  const year = date.getUTCFullYear().toString().substring(2,4);
  const month = date.getUTCMonth().toString().padStart(2, "0");
  const day = date.getUTCDate().toString().padStart(2, "0");
  const hour = date.getUTCHours().toString().padStart(2, "0");
  const minute = date.getUTCMinutes().toString().padStart(2, "0");
  const second = date.getUTCSeconds().toString().padStart(2, "0");
  return `${year}${month}${day}-${hour}${minute}${second}`;
};
