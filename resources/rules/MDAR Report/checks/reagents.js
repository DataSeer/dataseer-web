/*
 * @prettier
 */

'use strict';

let Self = {};

Self.check = function (nbTest, object) {
  switch (nbTest) {
  case 8:
  case 10:
  case 12:
  case 14:
  case 24:
  case 26:
  case 28:
  case 30:
  case 40:
  case 42:
  case 44:
  case 46:
  case 56:
  case 58:
  case 60:
  case 62:
  case 9:
  case 11:
  case 13:
  case 15:
  case 25:
  case 27:
  case 29:
  case 31:
  case 41:
  case 43:
  case 45:
  case 47:
  case 57:
  case 59:
  case 61:
  case 63:
    if (typeof object.RRID === `string` && object.RRID !== ``) return 0;
    else return object.reuse ? 3 : 4;
    break;
  default:
    return NaN;
  }
};

module.exports = Self;
