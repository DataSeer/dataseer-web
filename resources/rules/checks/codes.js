/*
 * @prettier
 */

'use strict';

const Params = require(`../../../lib/params.js`);

let Self = {};

Self.check = function (key, value, nbTest) {
  switch (key) {
  case `URL`:
    switch (nbTest) {
    case `16`:
    case `17`:
    case `18`:
    case `19`:
    case `20`:
    case `21`:
    case `22`:
    case `23`:
    case `48`:
    case `49`:
    case `50`:
    case `51`:
    case `52`:
    case `53`:
    case `54`:
    case `55`:
      return Params.isGithubRepository(value);
      break;
    default:
      return true;
    }
    break;
  default:
    return true;
    break;
  }
};

module.exports = Self;
