/*
 * @prettier
 */

'use strict';

const request = require('request'),
  path = require('path');

const FilesController = require('../controllers/documents.files.js');

const conf = require('../conf/conf.json');

const DATATYPE_PROPERTIES = {
  mesh_id: true,
  url: true,
  description: true,
  count: true,
  label: true
};

let Self = {};

/**
 * Extract datatype of subpart of dataseerML JSON datatypes
 * @param {object} key - key
 * @param {object} obj - obj
 * @param {object} result - result
 * @param {object} parent - parent
 * @param {object} deep - deep
 * @return {object} Objet JSON Object of dataTypes
 */
Self.extractDataTypes = function (key, obj, result, parent, deep = 0) {
  let keys = Object.keys(obj);
  result.metadata[key] = {
    mesh_id: obj.mesh_id,
    url: obj.url,
    description: Self.parseUrls(obj.description),
    bestDataFormatForSharing: Self.parseUrls(obj.best_practice),
    mostSuitableRepositories: Self.parseUrls(obj.most_suitable_repositories),
    label: obj.label,
    count: obj.count
  };
  if (typeof parent !== 'undefined') {
    if (typeof result.dataTypes[parent] === 'undefined') result.dataTypes[parent] = [];
    result.dataTypes[parent].push(key);
    result.subTypes[key] = parent;
  } else if (typeof result.dataTypes[key] === 'undefined') result.dataTypes[key] = [];
  for (let i = 0; i < keys.length; i++) {
    if (typeof DATATYPE_PROPERTIES[keys[i]] === 'undefined' && typeof obj[keys[i]] === 'object') {
      Self.extractDataTypes(keys[i], obj[keys[i]], result, deep > 1 ? key + ':' + keys[i] : key, deep + 1);
    }
  }
};

/**
 * Parse string returned by dataseer-ml service & try to replace URL BB code by HTML a element
 * @param {string} data - data
 * @return {object} Same string but with HTML link
 */
Self.parseUrls = function (data) {
  if (typeof data !== 'string') return data;
  let begin = data.indexOf('[['),
    end = data.indexOf(']]');
  while (begin > 0 && end > 0) {
    data = Self.replaceUrl(data, data.substring(begin + 2, end));
    begin = data.indexOf('[[');
    end = data.indexOf(']]');
  }
  return data;
};

/**
 * Parse string returned by dataseer-ml service & try to replace URL BB code by HTML a element
 * @param {string} str - String where URL will be replaced
 * @param {string} url - URL value
 * @return {object} Same string but with HTML link
 */
Self.replaceUrl = function (str, url) {
  let split = url.split('|'),
    href = split[0],
    txt = split.length === 2 ? split[1] : href;
  str = str.replace('[[' + url + ']]', '<a href="' + href + '">' + txt + '</a>');
  return str;
};

/**
 * Build dataTypes with data from dataseerML service
 * @param {object} data - Data from dataseerML service
 * @return {object} Objet JSON Object of dataTypes
 */
Self.buildDataTypes = function (data) {
  let result = {
      subTypes: {},
      dataTypes: {},
      metadata: {}
    },
    keys = Object.keys(data);
  for (let i = 0; i < keys.length; i++) {
    Self.extractDataTypes(keys[i], data[keys[i]], result);
  }
  return result;
};

Self.resyncJsonDataTypes = function () {};

/**
 * Send sentence to dataseer-ml service
 * @param {string} sentence - Sentence that will be processed
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: xml string OR undefined)
 * @returns {undefined} undefined
 */
Self.processSentence = function (sentence, cb) {
  return request.post(
    {
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      url: conf.services['dataseer-ml'] + '/processDataseerSentence',
      body: 'text=' + encodeURIComponent(sentence)
    },
    function (error, response, body) {
      if (!error && response.statusCode == 200) {
        return cb(null, body);
      } else if (error) {
        return cb(error);
      } else {
        return cb(new Error('unspecified error'));
      }
    }
  );
};

/**
 * Send file to dataseer-ml service
 * @param {object} file - File object
 * @param {string} file.mimetype - File mimetype
 * @param {string} file.name - File name
 * @param {buffer} file.data - File data (Buffer)
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: xml string OR undefined)
 * @returns {undefined} undefined
 */
Self.processFile = function (file, cb) {
  // If mimetype is not
  if (!FilesController.isXML(file.mimetype) && !FilesController.isPDF(file.mimetype))
    return cb(new Error('Bad content type'));
  return request.post(
    {
      headers: {
        enctype: 'multipart/form-data'
      },
      url:
        conf.services['dataseer-ml'] +
        (FilesController.isXML(file.mimetype) ? '/processDataseerJATS' : '/processDataseerPDF'),
      formData: {
        input: {
          value: file.data,
          options: {
            filename: file.name,
            contentType: file.mimetype
          }
        }
      }
    },
    function (error, response, body) {
      if (!error && response.statusCode == 200) {
        return cb(null, body);
      } else if (error) {
        return cb(error, body);
      } else {
        return cb(new Error('unspecified error'), body);
      }
    }
  );
};

module.exports = Self;
