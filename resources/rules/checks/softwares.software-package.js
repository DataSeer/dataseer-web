/*
 * @prettier
 */

'use strict';

let Self = {};

Self.check = function (key, value) {
  switch (key) {
  case `suggestedEntity`:
    switch (value) {
    case `84`:
    case `85`:
    case `86`:
    case `87`:
    case `116`:
    case `117`:
    case `118`:
    case `119`:
      return value === `n/a`;
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
