/*
 * @prettier
 */

'use strict';

const fetch = require(`node-fetch`);
const FormData = require(`form-data`);
const _ = require(`lodash`);
const async = require(`async`);

const Params = require(`./params.js`);

const service = require(`../conf/services/dataseer-ml.json`);
const conf = require(`../conf/conf.json`);

const maxDataSize = isNaN(conf.maxFileUploadSize) ? 262144000 : conf.maxFileUploadSize;

let Self = {};

/**
 * Send sentence to dataseer-ml service
 * @param {string} sentence - Sentence that will be processed
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: xml string OR undefined)
 * @returns {undefined} undefined
 */
Self.processDataseerSentence = function (sentence, cb) {
  // Check all required data
  if (typeof _.get(service, `processDataseerSentence`) === `undefined`)
    return cb(new Error(`Missing required data: service.processDataseerSentence`));
  // Convert sentence value
  let text = Params.convertToString(sentence);
  if (typeof text === `undefined`) return cb(new Error(`Missing required data: sentence`));
  // Build body
  const body = new URLSearchParams();
  body.append(`text`, text);
  // Call "processDataseerSentence" URL
  return fetch(service.processDataseerSentence, {
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
 * Send sentences to dataseer-ml service
 * @param {string} sentences - Array of sentences that will be processed
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: xml string OR undefined)
 * @returns {undefined} undefined
 */
Self.processDataseerSentences = function (sentences, cb) {
  // Check all required data
  if (typeof _.get(service, `processDataseerSentence`) === `undefined`)
    return cb(new Error(`Missing required data: service.processDataseerSentence`));
  // Convert sentence value
  let list = Array.isArray(sentences) ? sentences : [];
  if (list.length <= 0) return cb(new Error(`Missing required data: sentences`));
  let results = [];
  return async.mapLimit(
    list,
    service.limit,
    function (sentence, next) {
      return Self.processDataseerSentence(sentence, function (err, res) {
        if (err) results.push({ sentence: sentence, res: null });
        else results.push({ sentence: sentence, res: res });
        return next();
      });
    },
    function (err) {
      if (err) return cb(err);
      return cb(null, results);
    }
  );
};

/**
 * Send XML to dataseer-ml service
 * @param {buffer} buffer
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: xml string OR undefined)
 * @returns {undefined} undefined
 */
Self.processXML = function (buffer, cb) {
  // Check all required data
  if (typeof _.get(service, `processFile.xml`) === `undefined`)
    return cb(new Error(`Missing required data: service.processFile.xml`));
  if (!Buffer.isBuffer(buffer)) return cb(new Error(`Missing required data: buffer`));
  return sendFile(buffer, service.processFile.xml, cb);
};

/**
 * Send PDF to dataseer-ml service
 * @param {buffer} buffer
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: xml string OR undefined)
 * @returns {undefined} undefined
 */
Self.processPDF = function (buffer, cb) {
  // Check all required data
  if (typeof _.get(service, `processFile.pdf`) === `undefined`)
    return cb(new Error(`Missing required data: service.processFile.pdf`));
  if (!Buffer.isBuffer(buffer)) return cb(new Error(`Missing required data: buffer`));
  return sendFile(buffer, service.processFile.pdf, cb);
};

/**
 * Send file to an URL
 * @param {buffer} buffer
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: xml buffer OR undefined)
 * @returns {undefined} undefined
 */
const sendFile = function (buffer, url, cb) {
  let form = new FormData({ maxDataSize: maxDataSize });
  form.append(`input`, buffer);
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
