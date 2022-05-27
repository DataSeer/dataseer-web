/*
 * @prettier
 */

'use strict';

const fetch = require(`node-fetch`);
const _ = require(`lodash`);

const URLMANAGER = require(`../lib/url.js`);

const service = require(`../conf/services/scicrunch.json`);

let Self = {};

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
