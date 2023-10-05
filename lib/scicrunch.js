/*
 * @prettier
 */

'use strict';

const fetch = require(`node-fetch`);
const async = require(`async`);
const _ = require(`lodash`);
const cheerio = require(`cheerio`);

const URLMANAGER = require(`../lib/url.js`);

const service = require(`../conf/services/scicrunch.json`);

let Self = {};

/**
 * Process an entity with scicrunch service
 * @param {object} opts - Opts that will be sent to scicrunch service
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: xml string OR undefined)
 * @returns {undefined} undefined
 */
Self.getEntity = function (opts, cb) {
  if (typeof _.get(opts, `RRID`) === `undefined`) return cb(null, new Error(`Missing required data: opts.RRID`));
  // Build URL
  // searchRRID + ?rid=RRID
  const searchEntityURL = URLMANAGER.build(service.searchRRID + `/${opts.RRID}`, { key: service.auth }, service.root);
  return fetch(searchEntityURL, { method: `GET` })
    .then(function (res) {
      // res.status >= 200 && res.status < 300
      if (res.ok) return res;
      throw new Error(res.statusText);
    })
    .then(function (res) {
      return res.json();
    })
    .then(function (body) {
      if (!body.success) return cb(null, new Error(`Bad response`));
      let fields = {
        name: body.data.fields.filter((item) => {
          return item.field === `Resource Name`;
        })[0],
        URL: body.data.fields.filter((item) => {
          return item.field === `Resource URL`;
        })[0]
      };
      return cb(null, { name: fields.name.value, URL: fields.URL.value, RRID: opts.RRID });
    })
    .catch(function (err) {
      return cb(err);
    });
};

/**
 * Extract data from HTML (from softcite)
 * @param {string} source - Source of HTML
 * @param {string} htmlString - HTML string
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: xml string OR undefined)
 * @returns {undefined} undefined
 */
Self.extractDataFromHTML = function (source, htmlString) {
  const $ = cheerio.load(htmlString.replace(/\n\s*/gm, ``));
  if (!Object.keys($).length) return new Error(`Unable to process this HTML string`);
  return Self.extractDataFromSource(source, $);
};

/**
 * Extract data from loaded HTML (from softcite)
 * @param {string} source - Source of HTML
 * @param {object} $ - HTML document loaded by cheerio
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: xml string OR undefined)
 * @returns {undefined} undefined
 */
Self.extractDataFromSource = function (source, $) {
  switch (source) {
  case `searchResources`:
    return $(`.inner-results`)
      .map((i, e) => {
        let element = $(e);
        let header = element.find(`.the-title > ul > h3 > a`).text().replace(/\s+/gm, ` `);
        let split = header.split(`, (RRID:`);
        let RRID = split[1].substring(0, split[1].length - 2);
        let suggestedEntity = split[0].trim();
        let suggestedURL = element.children(`a`).first().attr(`href`);
        let suggestedRRID = `${suggestedEntity} (RRID:${RRID})`;
        return { RRID, suggestedEntity, suggestedURL, suggestedRRID };
      })
      .get();
    break;
  case `searchAntibody`:
    return $(`.inner-results`)
      .map((i, e) => {
        let element = $(e);
        let RRID = element
          .find(`.the-title > ul > h4`)
          .text()
          .replace(/\s+/gm, ` `)
          .replace(/RRID(:)?/gm, ``)
          .trim();
        let suggestedEntity = element.find(`.the-title > ul > h3 > div > a`).text().replace(/\s+/gm, ` `).trim();
        let suggestedURL = element.find(`p:nth-of-type(1) > a`).text().trim();
        let suggestedRRID = `${suggestedEntity} (RRID:${RRID})`;
        return { RRID, suggestedEntity, suggestedURL, suggestedRRID };
      })
      .get();
    break;
  case `searchPlasmid`:
    return $(`.inner-results`)
      .map((i, e) => {
        let element = $(e);
        let RRID = element
          .find(`.the-title > ul > h4`)
          .text()
          .replace(/\s+/gm, ` `)
          .replace(/RRID(:)?/gm, ``)
          .trim();
        let suggestedEntity = element.find(`.the-title > ul > h3 > div > a`).text().replace(/\s+/gm, ` `).trim();
        let suggestedURL = element.find(`p:nth-of-type(1) > a`).text().trim();
        let suggestedRRID = `${suggestedEntity} (RRID:${RRID})`;
        return { RRID, suggestedEntity, suggestedURL, suggestedRRID };
      })
      .get();
    break;
  case `searchOrganism`:
    return $(`.inner-results`)
      .map((i, e) => {
        let element = $(e);
        let RRID = element
          .find(`.the-title > ul > h4`)
          .text()
          .replace(/\s+/gm, ` `)
          .replace(/RRID(:)?/gm, ``)
          .trim();
        let suggestedEntity = element.find(`.the-title > ul > h3 > div > a`).text().replace(/\s+/gm, ` `).trim();
        let suggestedURL = element.find(`p:nth-of-type(1) > a`).text().trim();
        let suggestedRRID = `${suggestedEntity} (RRID:${RRID})`;
        return { RRID, suggestedEntity, suggestedURL, suggestedRRID };
      })
      .get();
    break;
  case `searchCellLine`:
    return $(`.inner-results`)
      .map((i, e) => {
        let element = $(e);
        let RRID = element
          .find(`.the-title > ul > h4`)
          .text()
          .replace(/\s+/gm, ` `)
          .replace(/RRID(:)?/gm, ``)
          .trim();
        let suggestedEntity = element.find(`.the-title > ul > h3 > div > a`).text().replace(/\s+/gm, ` `).trim();
        let suggestedURL = element.find(`p:nth-of-type(1) > a`).text().trim();
        let suggestedRRID = `${suggestedEntity} (RRID:${RRID})`;
        return { RRID, suggestedEntity, suggestedURL, suggestedRRID };
      })
      .get();
    break;
  case `searchTool`:
    return $(`.inner-results`)
      .map((i, e) => {
        let element = $(e);
        let RRID = element
          .find(`.the-title > .list-inline > h4`)
          .text()
          .replace(/\s+/gm, ` `)
          .replace(/RRID(:)?/gm, ``)
          .trim();
        let suggestedEntity = element
          .find(`.the-title > .list-inline > h3 > div > a`)
          .text()
          .replace(/\s+/gm, ` `)
          .trim();
        let suggestedURL = element.find(`p:nth-of-type(1) > a`).text().replace(/\s+/gm, ` `).trim();
        let suggestedRRID = `${suggestedEntity} (RRID:${RRID})`;
        return { RRID, suggestedEntity, suggestedURL, suggestedRRID };
      })
      .get();
    break;
  case `searchBiosamples`:
    return $(`.inner-results`)
      .map((i, e) => {
        let element = $(e);
        let RRID = element
          .find(`.the-title > ul > h4`)
          .text()
          .replace(/\s+/gm, ` `)
          .replace(/RRID(:)?/gm, ``)
          .trim();
        let suggestedEntity = element.find(`.the-title > ul > h3 > div > a`).text().replace(/\s+/gm, ` `).trim();
        let suggestedURL = element.find(`p:nth-of-type(1) > a`).text().trim();
        let suggestedRRID = `${suggestedEntity} (RRID:${RRID})`;
        return { RRID, suggestedEntity, suggestedURL, suggestedRRID };
      })
      .get();
    break;
  default:
    return new Error(`Unable to extract data from this source`);
    break;
  }
};

/**
 * Search an entity with scicrunch service
 * @param {object} opts - Opts that will be sent to scicrunch service
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: xml string OR undefined)
 * @returns {undefined} undefined
 */
Self.searchEntity = function (opts, cb) {
  if (typeof _.get(opts, `entity`) === `undefined`) return cb(null, new Error(`Missing required data: opts.entity`));
  // Build URLs
  let URLs = {
    'searchResources': URLMANAGER.build(service.searchResources, { q: opts.entity, l: opts.entity }, service.root),
    'searchAntibody': URLMANAGER.build(service.searchAntibody, { q: opts.entity, l: opts.entity }, service.root),
    'searchTool': URLMANAGER.build(service.searchTool, { q: opts.entity, l: opts.entity }, service.root),
    'searchPlasmid': URLMANAGER.build(service.searchPlasmid, { q: opts.entity, l: opts.entity }, service.root),
    'searchOrganism': URLMANAGER.build(service.searchOrganism, { q: opts.entity, l: opts.entity }, service.root),
    'searchCellLine': URLMANAGER.build(service.searchCellLine, { q: opts.entity, l: opts.entity }, service.root),
    'searchBiosamples': URLMANAGER.build(service.searchBiosamples, { q: opts.entity, l: opts.entity }, service.root)
  };
  let results = {};
  return async.map(
    Object.keys(URLs),
    function (key, next) {
      return fetch(URLs[key], { method: `GET` })
        .then(function (res) {
          // res.status >= 200 && res.status < 300
          if (res.ok) return res;
          throw new Error(res.statusText);
        })
        .then(function (res) {
          return res.text();
        })
        .then(function (html) {
          let data = Self.extractDataFromHTML(key, html);
          if (data instanceof Error) return next(data);
          results[key] = data;
          return next();
        })
        .catch(function (err) {
          return next(err);
        });
    },
    function (err) {
      return cb(err, {
        resources: results.searchResources,
        antibody: results.searchAntibody,
        tool: results.searchTool,
        plasmid: results.searchPlasmid,
        organism: results.searchOrganism,
        cellLine: results.searchCellLine,
        biosamples: results.searchBiosamples
      });
    }
  );
};

/**
 * Process an entity with scicrunch service
 * @param {object} opts - Opts that will be sent to scicrunch service
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: xml string OR undefined)
 * @returns {undefined} undefined
 */
Self.getRRID = function (opts, cb) {
  if (typeof _.get(opts, `entity`) === `undefined`) return cb(null, new Error(`Missing required data: opts.entity`));
  // Build URL
  // searchEntity + ?field=Resource%20Name&value=ENTITY
  const searchEntityURL = URLMANAGER.build(
    service.searchEntity,
    { field: `Resource Name`, value: opts.entity, key: service.auth },
    service.root
  );
  return fetch(searchEntityURL, { method: `GET` })
    .then(function (res) {
      // res.status >= 200 && res.status < 300
      if (res.ok) return res;
      throw new Error(res.statusText);
    })
    .then(function (res) {
      return res.json();
    })
    .then(function (body) {
      if (!body.success) return cb(null, new Error(`Bad response`));
      let RRIDsMap = {};
      if (Array.isArray(body.data) && body.data.length > 0) {
        for (let i = 0; i < body.data.length; i++) {
          RRIDsMap[body.data[i].rid] = body.data[i];
        }
      }
      let RRIDs = Object.keys(RRIDsMap);
      let results = {
        'entity': {
          'value': opts.entity,
          'URLs': {
            'API': searchEntityURL,
            'resources': URLMANAGER.build(service.searchResources, { q: opts.entity, l: opts.entity }, service.root),
            'antibody': URLMANAGER.build(service.searchAntibody, { q: opts.entity, l: opts.entity }, service.root),
            'plasmid': URLMANAGER.build(service.searchPlasmid, { q: opts.entity, l: opts.entity }, service.root),
            'organism': URLMANAGER.build(service.searchOrganism, { q: opts.entity, l: opts.entity }, service.root),
            'cellLine': URLMANAGER.build(service.searchCellLine, { q: opts.entity, l: opts.entity }, service.root),
            'tool': URLMANAGER.build(service.searchTool, { q: opts.entity, l: opts.entity }, service.root),
            'biosamples': URLMANAGER.build(service.searchBiosamples, { q: opts.entity, l: opts.entity }, service.root)
          }
        },
        'RRIDs': {
          values: RRIDsMap,
          'URLs': {
            'API': {},
            'resources': {},
            'antibody': {},
            'plasmid': {},
            'organism': {},
            'cellLine': {},
            'tool': {},
            'biosamples': {}
          }
        }
      };
      // Build URLs
      for (let i = 0; i < RRIDs.length; i++) {
        let RRID = RRIDs[i];
        // searchRRID + /RRID
        results.RRIDs.URLs.API[RRID] = URLMANAGER.build(`${service.searchRRID}/${RRID}`, {}, service.root);
        // ?q=SCR_018685&l=SCR_018685
        results.RRIDs.URLs.resources[RRID] = URLMANAGER.build(
          service.searchResources,
          { q: RRID, l: RRID },
          service.root
        );
        results.RRIDs.URLs.antibody[RRID] = URLMANAGER.build(
          service.searchAntibody,
          { q: RRID, l: RRID },
          service.root
        );
        results.RRIDs.URLs.plasmid[RRID] = URLMANAGER.build(service.searchPlasmid, { q: RRID, l: RRID }, service.root);
        results.RRIDs.URLs.organism[RRID] = URLMANAGER.build(
          service.searchOrganism,
          { q: RRID, l: RRID },
          service.root
        );
        results.RRIDs.URLs.cellLine[RRID] = URLMANAGER.build(
          service.searchCellLine,
          { q: RRID, l: RRID },
          service.root
        );
        results.RRIDs.URLs.tool[RRID] = URLMANAGER.build(service.searchTool, { q: RRID, l: RRID }, service.root);
        results.RRIDs.URLs.biosamples[RRID] = URLMANAGER.build(
          service.searchBiosamples,
          { q: RRID, l: RRID },
          service.root
        );
      }
      return cb(null, results);
    })
    .catch(function (err) {
      return cb(err);
    });
};

module.exports = Self;
