const express = require('express'),
  router = express.Router(),
  extractor = require('../lib/extractor.js'),
  Documents = require('../models/documents.js'),
  path = require('path');

/* UPLOAD Document */
router.get('/upload', function(req, res, next) {
  res.render(path.join('backoffice', 'upload'), { 'title': 'DataSeer' });
});

/* UPLOAD Document */
router.post('/upload', function(req, res, next) {
  if (Object.keys(req.files).length == 0) {
    return res.status(400).send('No files were uploaded.');
  }
  const uploadedFile = req.files['uploadedFile'];
  if (uploadedFile) {
    let newDocument = extractor.getNewDocumentFromFile(uploadedFile, extractor.types.TEI);
    Documents.create(newDocument, function(err, post) {
      if (err) return res.status(400).json(err);
      res.json(post);
    });
  } else {
    return res.status(400).send('No files were uploaded');
  }
});

module.exports = router;