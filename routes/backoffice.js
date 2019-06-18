const express = require('express'),
  router = express.Router(),
  extractor = require('../lib/extractor.js'),
  Documents = require('../models/documents.js'),
  path = require('path'),
  request = require('request'),
  md5 = require('md5'),
  conf = require('../conf/conf.json');

/* UPLOAD Document */
router.get('/upload', function(req, res, next) {
  return res.render(path.join('backoffice', 'upload'), { 'title': 'DataSeer' });
});

/* UPLOAD Document */
router.post('/upload', function(req, res, next) {
  if (Object.keys(req.files).length == 0) {
    return res.status(400).send('No files were uploaded.');
  }
  const uploadedFile = req.files['uploadedFile'];
  if (uploadedFile) {
    if (!uploadedFile.mimetype) return res.json({ 'error': 'Mimetype unknow' });
    let dataseerURL = '';
    if (uploadedFile.mimetype === 'text/xml') dataseerURL = '/processDataseerTEI';
    else if (uploadedFile.mimetype === 'application/pdf') dataseerURL = '/processDataseerPDF';
    else return res.json({ 'error': 'Application do not handle this mimetype : ' + uploadedFile.mimetype });
    return request.post(
      {
        'headers': { 'enctype': 'multipart/form-data' },
        'url': conf.services['dataseer-ml'] + dataseerURL,
        'formData': {
          'input': {
            'value': uploadedFile.data,
            'options': {
              'filename': uploadedFile.name,
              'contentType': uploadedFile.mimetype
            }
          }
        }
      },
      function(error, response, body) {
        if (!error && response.statusCode == 200) {
          let newFile = { 'data': body, 'md5': md5(body) },
            newDocument = extractor.getNewDocumentFromFile(newFile, extractor.types.TEI);
          Documents.create(newDocument, function(err, post) {
            if (err) return res.status(400).json(err);
            return res.json(post);
          });
        } else {
          return next(error);
        }
      }
    );
  } else {
    return res.status(400).send('No files were uploaded');
  }
});

module.exports = router;
