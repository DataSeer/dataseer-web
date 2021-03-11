/*
 * @prettier
 */

'use strict';

const request = require('request'),
  path = require('path');

const FilesController = require('../controllers/documents.files.js');

const conf = require('../conf/conf.json');

let Self = {};

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
