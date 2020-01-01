const { parseF1040 } = require("./f1040");
const { parseF1040s1 } = require("./f1040s1");
const { parseF1040s2 } = require("./f1040s2");
const { parseF1040s3 } = require("./f1040s3");
const { parseF1040sc } = require("./f1040sc");
const { parseF1040sd } = require("./f1040sd");
const { parseF1040sse } = require("./f1040sse");
const { parseF8949 } = require("./f8949");

module.exports = {
  f1040: parseF1040,
  f1040s1: parseF1040s1,
  f1040s2: parseF1040s2,
  f1040s3: parseF1040s3,
  f1040sc: parseF1040sc,
  f1040sd: parseF1040sd,
  f1040sse: parseF1040sse,
  f8949: parseF8949,
}
