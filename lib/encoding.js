/*
 * @prettier
 */

'use strict';

const symbols = require(`../resources/symbols.json`);

let Self = {};

Self.fix = function (str, encode = false) {
  let result = `${str}`;
  for (let i = 0; i < symbols.length; i++) {
    let encoded = symbols[i].encoded;
    let char = symbols[i].binary;
    let utf8 = symbols[i].utf8;
    let replace = symbols[i].replace;
    if (encode) result = result.split(encoded).join(replace);
    else result = result.split(char).join(utf8);
  }
  return result;
};

module.exports = Self;
