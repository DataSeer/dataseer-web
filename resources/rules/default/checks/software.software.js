/*
 * @prettier
 */

'use strict';

let Self = {};

Self.check = function (nbTest, object) {
  switch (nbTest) {
  case 84:
  case 85:
  case 86:
  case 87:
  case 116:
  case 117:
  case 118:
  case 119:
    if (object.suggestedEntity === `n/a`) return 0;
    else return 2;
    break;
  default:
    return NaN;
  }
};

module.exports = Self;
