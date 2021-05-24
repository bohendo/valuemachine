import { BigNumber as BN } from "@ethersproject/bignumber";
import { MaxUint256, Zero } from "@ethersproject/constants";
import { formatUnits, parseUnits } from "@ethersproject/units";
import { HexString } from "@finances/types";

////////////////////////////////////////
// Internal Helpers

const precision = 36;

const fromRay = (n: BN | string): string => formatUnits((n || "0").toString(), precision);

const toRay = (n: BN | string): BN => {
  const str = (n || "0").toString();
  if (!str.includes(".")) return parseUnits(str, precision);
  const split = str.split(".");
  // Truncate decimals to prevent underflow errors (will NOT round excess precision properly)
  return parseUnits(`${split[0]}.${split[1].substring(0, precision)}`, precision);
};

const floor = (decStr: string): string => decStr.substring(0, decStr.indexOf("."));

const roundInt = (decStr: string): string => 
  toRay(decStr).lt(toRay("0"))
    ? floor(fromRay(toRay(decStr).sub(toRay("0.5"))).toString())
    : floor(fromRay(toRay(decStr).add(toRay("0.5"))).toString());

////////////////////////////////////////
// Exports

export const toBN = (n: BN | number | string | { _hex: HexString }): BN =>
  BN.from(
    (n && (n as { _hex: HexString })._hex)
      ? (n as { _hex: HexString })._hex
      : n.toString(),
  );

export const eq = (a, b): boolean => toRay(a).eq(toRay(b));
export const gt = (a, b): boolean => toRay(a).gt(toRay(b));
export const lt = (a, b): boolean => toRay(a).lt(toRay(b));

export const max = (...lon: string[]): string =>
  lon.reduce(
    (max: any, current: any) => gt(max, current) ? max : current,
    "-" + MaxUint256.toString(),
  );

export const min = (...lon: string[]): string =>
  lon.reduce(
    (min: any, current: any) => (lt(min, current) ? min : current),
    MaxUint256.toString(),
  );

export const add = (...lon: string[]): string =>
  lon.reduce((sum, current) => fromRay(toRay(sum).add(toRay(current))), "0");

export const mul = (...lon: string[]): string =>
  lon.reduce(
    (product, current) => fromRay(roundInt(fromRay(toRay(product).mul(toRay(current))))),
    "1",
  );

export const div = (a: string, b: string): string =>
  fromRay(toRay(toRay(a)).div(toRay(b)));

export const sub = (a: string, b: string): string =>
  fromRay(toRay(a).sub(toRay(b)));

export const subToZero = (a: string, b: string): string => {
  const diff = toRay(a).sub(toRay(b));
  return diff.gt(Zero) ? fromRay(diff) : "0";
};

export const abs = (a: string): string =>
  toRay(a).gt(Zero) ? a : mul(a, "-1");

// absolute value of subtracting a and b
export const diff = (a: string, b: string): string =>
  abs(sub(a, b));

// Round to n decimal places
export const round = (decStr: string, n = 2): string => {
  if (n <= 0) { return roundInt(decStr); }
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

// Round so that there are at least n significant figures available
export const sigfigs = (decStr: string, n = 3): string => {
  if (!decStr.includes(".") || decStr.split(".")[0] !== "0") { return round(decStr, n); }
  const dec = decStr.split(".")[1];
  const leadingZeros = dec.length - dec.replace(/^0+/, "").length;
  return round(decStr, leadingZeros + n);
};
