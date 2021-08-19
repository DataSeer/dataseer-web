/*
 * @prettier
 */

'use strict';

const symbols = require(`../resources/symbols.json`);

let Self = {};

Self.fix = function (str) {
  let result = `${str}`;
  for (let key in symbols) {
    let encoded = symbols[key].encoded;
    let char = symbols[key].binary;
    let utf8 = symbols[key].utf8;
    let replace = symbols[key].replace;
    result = result.split(encoded).join(replace);
    result = result.split(char).join(utf8);
  }
  return result;
};

module.exports = Self;
