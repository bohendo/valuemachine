const year = require('../package.json').year

const f1040s3Mappings = require('./mappings/f1040s3.json');
const { add, eq, gt, lt, mul, round, sub } = require('./math');
const { emptyForm, mergeForms } = require('./utils');

const debugMode = false;

const parseF1040s3 = (personal) => {
  const f1040s3 = mergeForms(emptyForm(f1040s3Mappings), personal.f1040s3 || {});

  return [f1040s3]
}

module.exports = { parseF1040s3 }
