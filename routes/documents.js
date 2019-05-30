const express = require('express'),
  router = express.Router(),
  path = require('path'),
  mongoose = require('mongoose'),
  Documents = require('../models/documents.js'),
  conf = require('../conf/conf.json'),
  dataTypes = require('../resources/dataTypes.json');

/* GET ALL Documents */
router.get('/', function(req, res, next) {
  Documents.find({}, function(err, post) {
    if (err) return next(err);
    res.render(path.join('documents', 'all'), { 'baseUrl' : conf.baseUrl, 'documents': post });
  });
});

/* GET SINGLE Document BY ID */
router.get('/:id', function(req, res, next) {
  Documents.findById(req.params.id, function(err, post) {
    if (err) return next(err);
    res.render(path.join('documents', post.status), { 'baseUrl' : conf.baseUrl, 'document': post, 'dataTypes': dataTypes, 'demo': process.env.DEMO });
  });
});

module.exports = router;