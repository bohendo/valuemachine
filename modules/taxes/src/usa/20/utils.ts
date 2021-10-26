import { MaxUint256 } from "@ethersproject/constants";
import { getLogger, math } from "@valuemachine/utils";

export const logger = getLogger("info", "USAUtils20");

export const getIncomeTax = (taxableIncome: string, filingStatus: string): string => {
  const inf = MaxUint256.toString();
  const taxBrackets19 = [
    { rate: "0.10", single: "9700",   joint: "19400",  head: "13850" },
    { rate: "0.12", single: "39475",  joint: "78950",  head: "52850" },
    { rate: "0.22", single: "84200",  joint: "168400", head: "84200" },
    { rate: "0.24", single: "160725", joint: "321450", head: "160700" },
    { rate: "0.32", single: "204100", joint: "408200", head: "204100" },
    { rate: "0.35", single: "510300", joint: "612350", head: "510300" },
    { rate: "0.37", single: inf, joint: inf, head: inf },
  ];
  let incomeTax = "0";
  let prevThreshold = "0";
  taxBrackets19.forEach(bracket => {
    const threshold = bracket[filingStatus];
    if (math.lt(taxableIncome, prevThreshold)) {
      return;
    } else if (math.lt(taxableIncome, threshold)) {
      incomeTax = math.add(
        incomeTax,
        math.mul(
          bracket.rate,
          math.sub(taxableIncome, prevThreshold),
        ),
      );
    } else {
      incomeTax = math.add(
        incomeTax,
        math.mul(
          bracket.rate,
          math.sub(threshold, prevThreshold),
        ),
      );
    }
    prevThreshold = threshold;
  });
  return incomeTax;
};
