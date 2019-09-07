/*
 * @prettier
 */

const express = require('express'),
  router = express.Router(),
  extractor = require('../lib/extractor.js'),
  Documents = require('../models/documents.js'),
  path = require('path'),
  request = require('request'),
  async = require('async'),
  md5 = require('md5'),
  conf = require('../conf/conf.json');

/* UPLOAD Document */
router.get('/upload', function(req, res, next) {
  return res.render(path.join('backoffice', 'upload'), {
    'title': 'DataSeer',
    'backoffice': true
  });
});

/* UPLOAD Document */
router.post('/upload', function(req, res, next) {
  let results = { 'errors': [], 'successes': [] },
    uploadedFiles = null,
    dataseerML = '';
  if (!req.files) {
    results.errors.push({ 'msg': 'You must send at least one file' });
    return res.status(400).render(path.join('backoffice', 'results'), { 'backoffice': true, 'results': results });
  }
  if (Object.keys(req.files).length == 0) {
    results.errors.push({ 'msg': 'No file(s) were uploaded' });
    return res.status(400).render(path.join('backoffice', 'results'), { 'backoffice': true, 'results': results });
  }
  uploadedFiles = Array.isArray(req.files['uploadedFiles']) ? req.files['uploadedFiles'] : [req.files['uploadedFiles']];
  dataseerML = req.body.dataseerML;
  async.each(
    uploadedFiles,
    function(file, callback) {
      // Perform operation on file here.
      return processFile(file, dataseerML, function(error, result) {
        if (error) results.errors.push(error);
        if (result) results.successes.push(result);
        return callback();
      });
    },
    function(err) {
      // if any of the file processing produced an error, err would equal that error
      if (err) return console.log(err);
      return res.render(path.join('backoffice', 'results'), {
        'backoffice': true,
        'results': results
      });
    }
  );
});

function processFile(file, calledProcess, cb) {
  if (!file) return cb({ 'msg': 'No files were uploaded' });
  if (!file.mimetype) return cb({ 'filename': file.name, 'msg': 'Mimetype unknow' });
  if (file.mimetype !== 'text/xml' && file.mimetype !== 'application/pdf')
    return cb({ 'filename': file.name, 'msg': 'Mimetype must be text/xml or application/pdf' });
  // case send file will be not process
  if (!calledProcess) {
    return buildDocument(file.name, file.data, cb);
  }
  // case send file will be send to dataseer-ml
  if (calledProcess === 'dataseer-ml') {
    return callDataseerML(file, function(err, res) {
      if (err) return cb(err);
      return buildDocument(file.name, res, cb);
    });
  }
}

function callDataseerML(file, cb) {
  let dataseerURL = '';
  if (file.mimetype === 'text/xml') dataseerURL = '/processDataseerTEI';
  else if (file.mimetype === 'application/pdf') dataseerURL = '/processDataseerPDF';
  else return cb({ 'filename': file.name, 'msg': 'Application do not handle this mimetype : ' + file.mimetype });
  return request.post(
    {
      'headers': {
        'enctype': 'multipart/form-data'
      },
      'url': conf.services['dataseer-ml'] + dataseerURL,
      'formData': {
        'input': {
          'value': file.data,
          'options': {
            'filename': file.name,
            'contentType': file.mimetype
          }
        }
      }
    },
    function(error, response, body) {
      if (!error && response.statusCode == 200) {
        return cb(null, body);
      } else if (error) {
        return cb({ 'filename': file.name, 'msg': error.toString() });
      } else {
        return cb({ 'filename': file.name, 'msg': 'unspecified error' });
      }
    }
  );
}

function buildDocument(name, data, cb) {
  let newFile = {
      'data': data,
      'md5': md5(data)
    },
    newDocument = extractor.getNewDocumentFromFile(newFile, extractor.types.TEI);
  Documents.create(newDocument, function(err, post) {
    if (err) return cb({ 'filename': name, 'msg': err.toString() });
    return cb(null, { 'filename': name, 'document': post });
  });
}

module.exports = router;
