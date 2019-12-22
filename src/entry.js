const csv = require('csv-parse/lib/sync');
const fs = require('fs');

const year = require('../package.json').year
const { add, mul, diff } = require("./math");

console.log('Lets go');
