const { Zero } = require('ethers/constants');
const { formatUnits, parseUnits } = require('ethers/utils');

const fromWad = n => formatUnits(n.toString(), 18);

const toWad = n => parseUnits((n || "0").toString(), 18);

const floor = (decStr) => decStr.substring(0, decStr.indexOf("."))

const roundInt = (decStr) => 
  floor(fromWad(toWad(decStr).add(toWad("0.5"))).toString())

const eq = (a, b) => toWad(a).eq(toWad(b));
const gt = (a, b) => toWad(a).gt(toWad(b));
const lt = (a, b) => toWad(a).lt(toWad(b));

const mul = (a, b) =>
  fromWad(roundInt(fromWad(toWad(a).mul(toWad(b)))));

const div = (a, b) =>
  fromWad(toWad(toWad(a)).div(toWad(b)))

const add = (a, b) => 
  fromWad(toWad(a).add(toWad(b)))

const sub = (a, b) =>
  fromWad(toWad(a).sub(toWad(b)))

// absolute value of subtracting a and b
const diff = (a, b) => toWad(sub(a,b)).gt(Zero) ? sub(a,b) : sub(b,a)

const round = (decStr, n) => {
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

module.exports = {
  add,
  diff,
  div,
  eq,
  gt,
  lt,
  mul,
  round,
  sub,
};
