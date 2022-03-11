/*
 * @prettier
 */

'use strict';

const fetch = require(`node-fetch`);

const service = require(`../conf/services/repoRecommender.json`);

let Self = {};

/**
 * Send sentence to repoRecommender service
 * @param {object} opts - Opts that will be sent to RepoRecommender
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: xml string OR undefined)
 * @returns {undefined} undefined
 */
Self.findRepo = function (opts, cb) {
  let dataType = opts.dataType ? opts.dataType : ``;
  let subType = opts.subType ? opts.subType : ``;
  let url = `${service.findRepo}?data_type=${dataType}&sub_type=${subType}&sa_1=NULL&sa_2=NULL&sa_3=NULL&sa_4=NULL&sa_5=NULL&sa_6=NULL&sa_7=NULL&sa_8=NULL&sa_9=NULL&sa_10=NULL&sa_11=NULL&taxa=NULL&journal=None%20of%20these%20options&funder=None%20of%20these%20options&taxa_score=500&j_score=10&f_score=10&subtype_score=50&type_score=50`;
  return fetch(url, {
    method: `get`
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
