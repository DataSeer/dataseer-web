/*
 * @prettier
 */

'use strict';

const _ = require(`lodash`);
const urljoin = require(`url-join`);

const conf = require(`../conf/conf.json`);

const Self = {};

const symbolsMatch = /[\(\)\[\]]+/gm;

Self.build = function (url, params = {}, root = _.get(conf, `root`)) {
  if (typeof root === `undefined`) throw new Error(`Missing required data: root`);
  let fullUrl = urljoin(root, url);
  let result = new URL(fullUrl); // will contain the new URL
  // Add params into the new URL
  for (let key in params) {
    if (typeof params[key] !== `undefined`) {
      if (Array.isArray(params[key])) {
        for (let i = 0; i < params[key].length; i++) {
          result.searchParams.append(key, params[key][i]);
        }
      } else if (typeof params[key] !== `object`) result.searchParams.append(key, params[key]);
    }
  }
  return result.href;
};

Self.sanitize = function (string) {
  return string.replace(symbolsMatch, ``);
};

module.exports = Self;
