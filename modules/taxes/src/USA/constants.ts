import { MaxUint256 } from "@ethersproject/constants";
import { Guards } from "@valuemachine/transactions";
import { DecString, IntString, Year } from "@valuemachine/types";

export const USA = Guards.USA;
export const maxint = MaxUint256.toString();
export const msPerDay = 1000 * 60 * 60 * 24;
export const msPerYear = msPerDay * 365;

export const getMaxFeie = (year: Year) => {
  // should we log a warning or something if we're returning a guess?
  const y = parseInt(year);
  if (y >= 2020) { // If too new, use the most recent supported bracket
    return "107600";
  } else if (y <= 2019) { // If too old, use the oldest supported bracket
    return "105900";
  } else {
    return "0";
  }
};

// should we log a warning or something if we're returning a guess?
export const getTaxBrackets = (year: Year): Array<{
  rate: DecString;
  single: IntString;
  joint: IntString;
  head: IntString;
}> => {
  const y = parseInt(year);
  // from https://taxfoundation.org/2021-tax-brackets/
  return y >= 2021 ? [ // If too new, use the most recent supported bracket
    { rate: "0.10", single: "9950",   joint: "19900",  head: "14200" },
    { rate: "0.12", single: "40525",  joint: "81050",  head: "54200" },
    { rate: "0.22", single: "86375",  joint: "172750", head: "86350" },
    { rate: "0.24", single: "164925", joint: "329850", head: "164900" },
    { rate: "0.32", single: "209425", joint: "418850", head: "209400" },
    { rate: "0.35", single: "523600", joint: "628300", head: "523600" },
    { rate: "0.37", single: maxint, joint: maxint, head: maxint },

  // from https://files.taxfoundation.org/20191114132604/2020-Tax-Brackets-PDF.pdf
  ] : y === 2020 ? [
    { rate: "0.10", single: "9875",   joint: "19750",  head: "14100" },
    { rate: "0.12", single: "40125",  joint: "80250",  head: "53700" },
    { rate: "0.22", single: "85525",  joint: "171050", head: "85500" },
    { rate: "0.24", single: "160725", joint: "321450", head: "160700" },
    { rate: "0.32", single: "207350", joint: "414700", head: "207350" },
    { rate: "0.35", single: "518400", joint: "622050", head: "518400" },
    { rate: "0.37", single: maxint, joint: maxint, head: maxint },

  // from https://files.taxfoundation.org/20190416151624/Tax-Foundation-FF6241.pdf
  ] : y <= 2019 ? [ // If too old, use the oldest supported bracket
    { rate: "0.10", single: "9700",   joint: "19400",  head: "13850" },
    { rate: "0.12", single: "39475",  joint: "78950",  head: "52850" },
    { rate: "0.22", single: "84200",  joint: "168400", head: "84200" },
    { rate: "0.24", single: "160725", joint: "321450", head: "160700" },
    { rate: "0.32", single: "204100", joint: "408200", head: "204100" },
    { rate: "0.35", single: "510300", joint: "612350", head: "510300" },
    { rate: "0.37", single: maxint, joint: maxint, head: maxint },
  ] : [
    { rate: "0.0", single: maxint, joint: maxint, head: maxint },
  ];
};
