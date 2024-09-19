/*
 * @prettier
 */

'use strict';

let Self = {};

Self.check = function (nbTest, object) {
  switch (nbTest) {
  case 1:
  case 3:
    if (typeof object.DOI === `string` && object.DOI !== ``) return 0;
    else return 1;
    break;
    break;
  case 2:
    if (typeof object.URL === `string` && object.URL !== ``) return 0;
    else return 1;
    break;
    break;
  default:
    return NaN;
  }
};

module.exports = Self;
