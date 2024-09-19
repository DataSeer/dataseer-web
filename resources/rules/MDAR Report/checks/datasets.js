/*
 * @prettier
 */

'use strict';

let Self = {};

Self.check = function (nbTest, object) {
  switch (nbTest) {
  case 1:
  case 3:
  case 5:
  case 7:
  case 9:
  case 11:
  case 13:
  case 15:
    if (typeof object.PID === `string` && object.PID !== ``) return 0;
    else return object.reuse ? 4 : 5;
    break;
  case 2:
  case 6:
  case 10:
  case 14:
    if (typeof object.URL === `string` && object.URL !== ``) return 0;
    else return object.reuse ? 4 : 5;
    break;
  default:
    return NaN;
  }
};

module.exports = Self;
