import { BigNumber as BN } from "@ethersproject/bignumber";
import { MaxUint256, Zero } from "@ethersproject/constants";
import { commify as defaultCommify, formatUnits, parseUnits } from "@ethersproject/units";
import { Asset, DecString, HexString } from "@valuemachine/types";

////////////////////////////////////////
// Internal Helpers

const precision = 36;

const fromRay = (n: BN | DecString): DecString => formatUnits((n || "0").toString(), precision);

const toRay = (n: BN | DecString): BN => {
  const str = (n || "0").toString();
  if (!str.includes(".")) return parseUnits(str, precision);
  const split = str.split(".");
  // Truncate decimals to prevent underflow errors (will NOT round excess precision properly)
  return parseUnits(`${split[0]}.${split[1].substring(0, precision)}`, precision);
};

const floor = (decStr: DecString): DecString => decStr.substring(0, decStr.indexOf("."));

const roundInt = (decStr: DecString): DecString =>
  toRay(decStr).lt(toRay("0"))
    ? floor(fromRay(toRay(decStr).sub(toRay("0.5"))).toString())
    : floor(fromRay(toRay(decStr).add(toRay("0.5"))).toString());

////////////////////////////////////////
// Exports

export const toBN = (n: BN | number | DecString | { _hex: HexString }): BN =>
  BN.from(
    (n && (n as { _hex: HexString })._hex)
      ? (n as { _hex: HexString })._hex
      : typeof n === "number" ? n.toFixed(18) : n.toString(),
  );

export const toNum = (n: BN | DecString | number): number =>
  toBN(n).toNumber();

export const eq = (a, b): boolean => toRay(a).eq(toRay(b));
export const gt = (a, b): boolean => toRay(a).gt(toRay(b));
export const lt = (a, b): boolean => toRay(a).lt(toRay(b));

export const isNeg = (a): boolean => lt(a, "0");

export const max = (...lon: DecString[]): DecString =>
  lon.reduce(
    (max: any, current: any) => gt(max, current) ? max : current,
    "-" + MaxUint256.toString(),
  );

export const min = (...lon: DecString[]): DecString =>
  lon.reduce(
    (min: any, current: any) => (lt(min, current) ? min : current),
    MaxUint256.toString(),
  );

export const add = (...lon: DecString[]): DecString =>
  lon.reduce((sum, current) => fromRay(toRay(sum).add(toRay(current))), "0");

export const mul = (...lon: DecString[]): DecString =>
  lon.reduce(
    (product, current) => fromRay(roundInt(fromRay(toRay(product).mul(toRay(current))))),
    "1",
  );

export const div = (a: DecString, b: DecString): DecString =>
  fromRay(toRay(toRay(a)).div(toRay(b)));

export const inv = (n: DecString): DecString =>
  div("1", n);

export const sub = (a: DecString, b: DecString): DecString =>
  fromRay(toRay(a).sub(toRay(b)));

export const subToZero = (a: DecString, b: DecString): DecString => {
  const diff = toRay(a).sub(toRay(b));
  return diff.gt(Zero) ? fromRay(diff) : "0";
};

export const abs = (a: DecString): DecString =>
  toRay(a).gt(Zero) ? a : mul(a, "-1");

// absolute value of subtracting a and b
export const diff = (a: DecString, b: DecString): DecString =>
  abs(sub(a, b));

// Round to n decimal places
export const round = (decStr: DecString, n?: number, stripTrailingZeros?: boolean): DecString => {
  if (n <= 0) { return roundInt(decStr); }
  if (n === undefined) {
    n = n || ( // If n is not provided, set it based on the magnitude of the input
      gt(abs(decStr), "1") ? 2
      : gt(abs(decStr), "0.01") ? 4
      : gt(abs(decStr), "0.0001") ? 6
      : 18
    );
    stripTrailingZeros = true;
  }
  const power = `1${"0".repeat(n)}`;
  let out = div(roundInt(mul(decStr, power)), power);
  // Pad with extra zeros if needed
  if (out.indexOf(".") === -1) { out = `${out}.`; }
  if (out.substring(out.indexOf(".")).length - 1 < n) {
    out = `${out}${"0".repeat(n - out.substring(out.indexOf(".")).length + 1)}`;
  }
  return stripTrailingZeros ? out.replace(/0+$/, "0") : out;
};

// Round so that there are at least n significant figures available
export const sigfigs = (decStr: DecString, n = 3): DecString => {
  if (!decStr.includes(".") || decStr.split(".")[0] !== "0") { return round(decStr, n); }
  const dec = decStr.split(".")[1];
  const leadingZeros = dec.length - dec.replace(/^0+/, "").length;
  return round(decStr, leadingZeros + n);
};

// Locale-dependent rounding & commification
export const commify = (num: DecString, decimals?: number, asset?: Asset): DecString => {
  let rounded = round(
    num,
    typeof decimals === "number" ? decimals : (asset === "INR" || asset === "USD" ? 2 : undefined),
    true,
  );
  if (asset !== "INR") {
    return defaultCommify(rounded);
  }
  const isNegative = rounded.startsWith("-");
  if (isNegative) {
    rounded = rounded.substring(1);
  }
  // derived from https://github.com/roy2393/format-numerals/blob/master/src/index.ts#L20
  let afterPoint = "";
  if (rounded.indexOf(".") > 0) {
    afterPoint = rounded.substring(rounded.indexOf("."), rounded.length);
    rounded = rounded.substring(0, rounded.indexOf("."));
  }
  let lastThree = rounded.substring(rounded.length - 3);
  const otherNumbers = rounded.substring(0, rounded.length - 3);
  // 1st comma added after the 3rd digit from right
  if (otherNumbers !== "") lastThree = `,${lastThree}`;
  // regex to add , after every 2nd number
  const result =
    (isNegative ? "-" : "") +
    otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") +
    lastThree +
    afterPoint;
  return result;
};
