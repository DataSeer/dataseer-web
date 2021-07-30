/*
 * @prettier
 */

'use strict';

const _ = require(`lodash`);
const urljoin = require(`url-join`);

const conf = require(`../conf/conf.json`);

const Self = {};

Self.build = function (url, params = {}, root = _.get(conf, `root`)) {
  if (typeof root === `undefined`) throw new Error(`Missing required data: root`);
  let fullUrl = urljoin(root, url);
  let result = new URL(fullUrl); // will contain the new URL
  // Add params into the new URL
  for (let key in params) {
    if (typeof params[key] !== `undefined`) result.searchParams.append(key, params[key]);
  }
  return result.href;
};

module.exports = Self;
