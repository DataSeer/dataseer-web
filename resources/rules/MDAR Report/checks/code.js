/*
 * @prettier
 */

'use strict';

const Params = require(`../../../../lib/params.js`);

let Self = {};

Self.check = function (nbTest, object) {
  switch (nbTest) {
  case 4:
    if (Params.isGithubRepository(object.URL)) return 2;
    else return 0;
    break;
  default:
    return NaN;
  }
};

module.exports = Self;
