var express = require('express');
var router = express.Router();
var path = require('path');
var mongoose = require('mongoose');
var Documents = require('../models/documents.js');
var dataTypes = require('../resources/dataTypes.json');

/* GET ALL Documents */
router.get('/', function(req, res, next) {
  Documents.find({}, function(err, post) {
    if (err) return next(err);
    res.render(path.join('documents', 'all'), { documents: post });
  });
});

/* GET SINGLE Document BY ID */
router.get('/:id', function(req, res, next) {
  Documents.findById(req.params.id, function(err, post) {
    if (err) return next(err);
    res.render(path.join('documents', post.status), { document: post, dataTypes: dataTypes, demo: process.env.DEMO });
  });
});

module.exports = router;