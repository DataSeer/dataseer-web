/*
 * @prettier
 */

'use strict';

const symbols = require(`../resources/symbols.json`);

let Self = {};

Self.fix = function (str, encode = false) {
  let result = `${str}`;
  for (let key in symbols) {
    let encoded = symbols[key].encoded;
    let char = symbols[key].binary;
    let utf8 = symbols[key].utf8;
    let replace = symbols[key].replace;
    if (encode) result = result.split(encoded).join(replace);
    else result = result.split(char).join(utf8);
  }
  return result;
};

module.exports = Self;
