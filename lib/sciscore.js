/*
 * @prettier
 */

'use strict';

const fetch = require(`node-fetch`);

const service = require(`../conf/services/sciscore.json`);

let Self = {};

/**
 * Process file with sciscore service
 * @param {object} opts - Opts that will be sent to sciscore service
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: xml string OR undefined)
 * @returns {undefined} undefined
 */
Self.processFile = function (opts, cb) {
  // Build body
  const body = new URLSearchParams();
  body.append(`filePath`, opts.filePath);
  return fetch(service.processFile, {
    method: `POST`,
    body: body,
    headers: { 'Content-Type': `application/x-www-form-urlencoded` }
  })
    .then(function (res) {
      // res.status >= 200 && res.status < 300
      if (res.ok) return res;
      throw new Error(res.statusText);
    })
    .then(function (res) {
      return res.json();
    })
    .then(function (body) {
      return cb(null, body);
    })
    .catch(function (err) {
      return cb(err);
    });
};

module.exports = Self;
