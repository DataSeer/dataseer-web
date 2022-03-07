/*
 * @prettier
 */

'use strict';

const fetch = require(`node-fetch`);
const _ = require(`lodash`);
const jsdom = require(`jsdom`);
const { JSDOM } = jsdom;

const path = require(`path`);

const Params = require(`./params.js`);
const Url = require(`./url.js`);
const XML = require(`./xml.js`);

const service = require(`../conf/services/orcid.json`);

let Self = {};

/**
 * Find an authors
 * @param {object} opts - Available options
 * @param {string} opts.family-name - Family name of the author // family-name => author > persName > surename
 * @param {string} opts.given-name - Given name of the author // given-name => author > persName > forename[type="first"]
 * @param {string} opts.other-name - Given name of the author // other-name =>
 * @param {string} opts.digital-object-ids - DOI // digital-object-ids =>
 * @param {string} opts.pmid - PMID // pmid =>
 * @param {string} opts.isbn - ISBN // isbn =>
 * @param {string} opts.institution-name - Institution Name // institution-name
 * @param {string} opts.affiliation-org-name - Affiliation Organization Name // affiliation-org-name
 * @param {string} opts.pmid-self - PMID // pmid-self =>
 * @param {string} opts.doi-self - DOI // doi-self =>
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: json response OR undefined)
 * @returns {undefined} undefined
 */
Self.findAuthor = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(service, `root`) === `undefined`) return cb(new Error(`Missing required data: service.root`));
  if (typeof _.get(service, `path`) === `undefined`) return cb(new Error(`Missing required data: service.path`));
  let query = Self.buildQuery(opts);
  let url = Url.build(`${service.path}?q=${query}`, {}, service.root);
  return fetch(url, {
    method: `GET`,
    headers: { 'Content-type': `application/json` }
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
 * Find all authors
 * @param {object} opts - Available options
 * @returns {undefined} undefined
 */
Self.buildQuery = function (opts = {}) {
  let q = [];
  for (let key in opts) {
    if (typeof opts[key] === `string` && opts[key]) q.push(`${key}:(${opts[key]})`);
  }
  return q.join(`+AND+`);
};

/**
 * Extract authors from TEI
 * @param {string} xmlStr - XML string
 * @returns {array} List of authors
 */
Self.extractAuthorsFromTEI = function (xmlStr) {
  let $ = XML.load(xmlStr);
  if (!$) return [];
  let ids = {};
  $(`TEI > teiHeader > fileDesc > sourceDesc > biblStruct > idno`).map(function (i, el) {
    let elem = $(el);
    let type = elem.attr(`type`).toLowerCase();
    ids[type] = elem.text();
  });
  let authors = $(`TEI > teiHeader > fileDesc > sourceDesc > biblStruct > analytic > author`)
    .map(function (i, el) {
      let elem = $(el);
      return {
        'family-name': elem.find(`persName > surname`).text(),
        'given-names': elem.find(`persName > forename[type="first"]`).text()
        // 'other-name': elem.find(`persName > forename[type="middle"]`).text(),
        // 'email': elem.find(`email`).text(),
        // 'digital-object-ids': ids[`doi`],
        // 'pmid': ids[`pmid`],
        // 'isbn': ids[`isbn`]
      };
    })
    .get();
  return authors;
};

module.exports = Self;
