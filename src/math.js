const { Zero } = require('ethers/constants');
const { formatUnits, parseUnits } = require('ethers/utils');

const fromWad = n => formatUnits(n.toString(), 18);

const toWad = n => parseUnits((n || "0").toString(), 18);

const floor = (decStr) => decStr.substring(0, decStr.indexOf("."))

const round = decStr =>
  floor(fromWad(toWad(decStr).add(toWad("0.5"))).toString());

const mul = (a, b) =>
  fromWad(round(fromWad(toWad(a).mul(toWad(b)))));

const div = (a, b) =>
  fromWad(round(fromWad(toWad(toWad(a)).div(toWad(b)))));

const add = (a, b) => 
  fromWad(toWad(a).add(toWad(b)))

const sub = (a, b) =>
  fromWad(toWad(a).sub(toWad(b)))

// absolute value of subtracting a and b
const diff = (a, b) => toWad(sub(a,b)).gt(Zero) ? sub(a,b) : sub(b,a)

module.exports = {
  add,
  diff,
  div,
  mul,
  sub,
};
