/*
 * @prettier
 */

'use strict';

let Self = {};

Self.check = function (nbTest, object) {
  switch (nbTest) {
  case 16:
    let match = object.comments.match(/(Non PPMI)/gim);
    if (match && match.length > 0) return 6;
    else return 5;
    break;
  default:
    return NaN;
  }
};

module.exports = Self;
