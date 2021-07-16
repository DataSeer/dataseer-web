/*
 * @prettier
 */

'use strict';

const request = require('request');

const FilesController = require('../controllers/documents.files.js');

const conf = require('../conf/conf.json');

let Self = {};

/**
 * Send sentence to dataseer-ml service
 * @param {object} opts - Opts that will be sent to RepoRecommender
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: xml string OR undefined)
 * @returns {undefined} undefined
 */
Self.findRepo = function (opts, cb) {
  let dataType = opts.dataType ? opts.dataType : 'None of these options';
  let subType = opts.subType ? opts.subType : 'None of these options';
  console.log(dataType, subType);
  let url = `${conf.services['repoRecommender']}?data_type=${dataType}&sub_type=${subType}&sa_1=NULL&sa_2=NULL&sa_3=NULL&sa_4=NULL&sa_5=NULL&sa_6=NULL&sa_7=NULL&sa_8=NULL&sa_9=NULL&sa_10=NULL&sa_11=NULL&taxa=NULL&journal=None%20of%20these%20options&funder=None%20of%20these%20options&taxa_score=500&j_score=10&f_score=10&subtype_score=50&type_score=50`;
  return request.get(url, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      return cb(null, body);
    } else if (error) {
      return cb(error);
    } else {
      return cb(new Error('unspecified error'));
    }
  });
};

module.exports = Self;
