import { Zero } from "ethers/constants";
import { BigNumber as BN, formatUnits, parseUnits } from "ethers/utils";

////////////////////////////////////////
// Internal Helpers

const fromWad = (n: BN | string): string => formatUnits((n || "0").toString(), 18);

const toWad = (n: BN | string): BN => parseUnits((n || "0").toString(), 18);

const floor = (decStr: string): string => decStr.substring(0, decStr.indexOf("."));

const roundInt = (decStr: string): string => 
  toWad(decStr).lt(toWad("0"))
    ? floor(fromWad(toWad(decStr).sub(toWad("0.5"))).toString())
    : floor(fromWad(toWad(decStr).add(toWad("0.5"))).toString());

////////////////////////////////////////
// Exports

export const eq = (a, b): boolean => toWad(a).eq(toWad(b));
export const gt = (a, b): boolean => toWad(a).gt(toWad(b));
export const lt = (a, b): boolean => toWad(a).lt(toWad(b));

export const add = (...lon: string[]): string =>
  lon.reduce((sum, current) => fromWad(toWad(sum).add(toWad(current))), "0");

export const mul = (...lon: string[]): string =>
  lon.reduce(
    (product, current) => fromWad(roundInt(fromWad(toWad(product).mul(toWad(current))))),
    "1",
  );

export const div = (a: string, b: string): string =>
  fromWad(toWad(toWad(a)).div(toWad(b)));

export const sub = (a: string, b: string): string =>
  fromWad(toWad(a).sub(toWad(b)));

export const subToZero = (a: string, b: string): string => {
  const diff = toWad(a).sub(toWad(b));
  return diff.gt(Zero) ? fromWad(diff) : "0";
};

export const abs = (a: string): string =>
  toWad(a).gt(Zero) ? a : mul(a, "-1");

// absolute value of subtracting a and b
export const diff = (a: string, b: string): string =>
  abs(sub(a, b));

export const round = (decStr: string, n = 2): string => {
  if (!n) { return roundInt(decStr); }
  const power = `1${"0".repeat(n)}`;
  let out = div(roundInt(mul(decStr, power)), power);
  // Pad with extra zeros if needed
  if (out.indexOf(".") === -1) { out = `${out}.`; }
  if (out.substring(out.indexOf(".")).length - 1 < n) {
    out = `${out}${"0".repeat(n - out.substring(out.indexOf(".")).length + 1)}`;
  }
  // console.log(`Rounded ${decStr} to ${n || 0} decimals: ${out}`);
  return out;
};
