import { Zero } from 'ethers/constants';
import { formatUnits, parseUnits } from 'ethers/utils';

////////////////////////////////////////
// Internal Helpers

const fromWad = n => formatUnits(n.toString(), 18);

const toWad = n => parseUnits((n || "0").toString(), 18);

const floor = (decStr) => decStr.substring(0, decStr.indexOf("."))

const roundInt = (decStr) => 
  floor(fromWad(toWad(decStr).add(toWad("0.5"))).toString())

////////////////////////////////////////
// Exports

export const eq = (a, b) => toWad(a).eq(toWad(b));
export const gt = (a, b) => toWad(a).gt(toWad(b));
export const lt = (a, b) => toWad(a).lt(toWad(b));

export const mul = (a, b) =>
  fromWad(roundInt(fromWad(toWad(a).mul(toWad(b)))));

export const div = (a, b) =>
  fromWad(toWad(toWad(a)).div(toWad(b)))

export const add = (a, b) => 
  fromWad(toWad(a).add(toWad(b)))

export const sub = (a, b) =>
  fromWad(toWad(a).sub(toWad(b)))

// absolute value of subtracting a and b
export const diff = (a, b) => toWad(sub(a,b)).gt(Zero) ? sub(a,b) : sub(b,a)

export const round = (decStr, n?) => {
  if (!n) { return roundInt(decStr); }
  const power = `1${'0'.repeat(n || 0)}`
  let out = div(roundInt(mul(decStr, power)), power);
  // Pad with extra zeros if needed
  if (out.indexOf('.') === -1) { out = `${out}.`; }
  if (out.substring(out.indexOf('.')).length - 1 < n) {
    out = `${out}${'0'.repeat(n - out.substring(out.indexOf('.')).length + 1)}`;
  }
  // console.log(`Rounded ${decStr} to ${n || 0} decimals: ${out}`);
  return out;
}
