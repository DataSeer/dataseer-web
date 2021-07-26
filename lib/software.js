/*
 * @prettier
 */

'use strict';

const fetch = require(`node-fetch`);
const FormData = require(`form-data`);
const _ = require(`lodash`);

const Params = require(`./params.js`);

const service = require(`../conf/services/software.json`);

let Self = {};

/**
 * Send sentence to software service
 * @param {object} opts - Available options
 * @param {string} opts.sentence - Sentence that will be processed
 * @param {boolean} opts.disambiguate - Disambiguate
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: xml string OR undefined)
 * @returns {undefined} undefined
 */
Self.processSoftwareText = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(service, `processSoftwareText`) === `undefined`)
    return cb(new Error(`Missing required data: service.processSoftwareText`));
  // Convert opts.sentence value
  let text = Params.convertToString(opts.sentence);
  let disambiguate = Params.convertToBoolean(opts.disambiguate);
  if (typeof text === `undefined`) return cb(new Error(`Missing required data: opts.sentence`));
  // Build body
  const body = new URLSearchParams();
  body.append(`text`, text);
  if (disambiguate) body.append(`disambiguate`, 1);
  // Call "processSoftwareText" URL
  return fetch(service.processSoftwareText, {
    method: `post`,
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
    .then(function (json) {
      return cb(null, json);
    })
    .catch(function (err) {
      return cb(err);
    });
};

/**
 * Send PDF to software service
 * @param {object} opts - Available options
 * @param {buffer} opts.buffer - Buffer
 * @param {boolean} opts.disambiguate - Disambiguate
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: xml string OR undefined)
 * @returns {undefined} undefined
 */
Self.annotateSoftwarePDF = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(service, `annotateSoftwarePDF`) === `undefined`)
    return cb(new Error(`Missing required data: service.annotateSoftwarePDF`));
  if (!Buffer.isBuffer(opts.buffer)) return cb(new Error(`Missing required data: opts.buffer`));
  return sendFile(opts, service.annotateSoftwarePDF, cb);
};

/**
 * Send file to an URL
 * @param {object} opts - Available options
 * @param {buffer} opts.buffer - Buffer
 * @param {boolean} opts.disambiguate - Disambiguate
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: xml buffer OR undefined)
 * @returns {undefined} undefined
 */
const sendFile = function (opts = {}, url, cb) {
  let disambiguate = Params.convertToBoolean(opts.disambiguate);
  let form = new FormData();
  form.append(`input`, opts.buffer);
  if (disambiguate) form.append(`disambiguate`, 1);
  return fetch(url, {
    method: `post`,
    body: form.getBuffer(),
    headers: form.getHeaders()
  })
    .then(function (res) {
      // res.status >= 200 && res.status < 300
      if (res.ok) return res;
      throw new Error(res.statusText);
    })
    .then(function (res) {
      return res.buffer();
    })
    .then(function (buffer) {
      return cb(null, buffer);
    })
    .catch(function (err) {
      return cb(err);
    });
};

module.exports = Self;
