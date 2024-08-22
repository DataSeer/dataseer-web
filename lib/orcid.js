/*
 * @prettier
 */

'use strict';

const fetch = require(`node-fetch`);
const _ = require(`lodash`);
const jsdom = require(`jsdom`);
const { JSDOM } = jsdom;
const stringSimilarity = require(`string-similarity`);
const accents = require(`remove-accents`);

const path = require(`path`);

const Params = require(`./params.js`);
const Url = require(`./url.js`);
const XML = require(`./xml.js`);
const GoogleSheets = require(`./googleSheets.js`);

const service = require(`../conf/services/orcid.json`);
const conf = require(`../conf/orcid.json`);
const jsonASAPAuthors = require(`../resources/jsonASAPAuthors.json`);

let Self = {};

Self.ASAPAuthorsList = {
  data: [],
  raw: [],
  mappings: {
    name: {},
    ORCID: {}
  }
};
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
Self.findAuthorFromAPI = function (opts = {}, cb) {
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

/**
 * Return the current authors list
 * @returns {array} List of authors
 */
Self.getASAPAuthors = function () {
  return Self.ASAPAuthorsList.data;
};

/**
 * Return the given author
 * @param {integer} index - Author index
 * @returns {object} Given author or undefined
 */
Self.getASAPAuthorByIndex = function (index) {
  if (index < 0 || index > Self.ASAPAuthorsList.data.length - 1) return undefined;
  return Self.ASAPAuthorsList.data[index];
};

/**
 * Build the authors list
 * @returns {array} List of authors
 */
Self.buildAuthorsList = function (data) {
  Self.ASAPAuthorsList = {
    data: [],
    raw: [],
    mappings: {
      name: {},
      ORCID: {}
    }
  };
  Self.ASAPAuthorsList.data = data;
  for (let i = 0; i < Self.ASAPAuthorsList.data.length; i++) {
    let author = Self.ASAPAuthorsList.data[i];
    let name = `${author.firstname} ${author.lastname}`;
    let sanitizedName = accents.remove(name);
    let orcid = author.orcid;
    Self.ASAPAuthorsList.raw.push(sanitizedName);
    Self.ASAPAuthorsList.mappings.name[sanitizedName] = i;
    if (orcid) Self.ASAPAuthorsList.mappings.ORCID[orcid] = i;
  }
  return Self.ASAPAuthorsList.data;
};

/**
 * Refresh the authors list using the Googel Spreadsheet file
 * @returns {array} List of authors
 */
Self.refreshASAPAuthors = function (opts = {}, cb) {
  if (typeof opts !== `object`) opts = {};
  if (typeof opts.local === `undefined`) opts.local = false;
  if (typeof process.env.LOCAL_CUSTOM_ASAP_AUTHORS_LIST !== `undefined` || opts.local)
    return cb(null, Self.buildAuthorsList(jsonASAPAuthors));
  return GoogleSheets.getASAPAuthors(function (err, data) {
    if (err) return cb(err);
    return cb(err, Self.buildAuthorsList(data));
  });
};

/**
 * Try to find the given author in the ASAP authors list
 * @param {string} name - Author name
 * @returns {array} List of authors found
 */
Self.findAuthorFromASAPList = function (name) {
  const notFoundError = new Error(`Not found`);
  if (!name) return notFoundError;
  let sanitizedName = accents.remove(name);
  let matches = stringSimilarity.findBestMatch(sanitizedName, Self.ASAPAuthorsList.raw);
  if (matches.bestMatch.rating <= conf.ASAPAuthors.minRating) return notFoundError;
  return [].concat(
    matches.ratings
      .map((item, i) => {
        return item.rating >= conf.ASAPAuthors.minRating
          ? { index: i, target: item.item, rating: item.rating }
          : undefined;
      })
      .filter((item) => {
        return typeof item !== `undefined`;
      })
      .map((item) => {
        return Object.assign({}, Self.getASAPAuthorByIndex(item.index), { rating: item.rating });
      })
  );
};

module.exports = Self;
