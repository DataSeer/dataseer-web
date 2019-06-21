const express = require('express'),
  router = express.Router(),
  path = require('path'),
  mongoose = require('mongoose'),
  Documents = require('../models/documents.js');

/* GET ALL Documents */
router.get('/', function(req, res, next) {
  Documents.find({}, function(err, post) {
    if (err) return next(err);
    return res.render(path.join('documents', 'all'), { 'documents': post });
  });
});

/* GET SINGLE Document BY ID */
router.get('/:id', function(req, res, next) {
  Documents.findById(req.params.id, function(err, post) {
    if (err) return next(err);
    return res.render(path.join('documents', post.status), { 'document': post, 'demo': process.env.DEMO });
  });
});

module.exports = router;
