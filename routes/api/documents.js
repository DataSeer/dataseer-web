const express = require('express'),
  router = express.Router(),
  mongoose = require('mongoose'),
  Documents = require('../../models/documents.js');

/* GET ALL Documents */
router.get('/', function(req, res, next) {
  Documents.find(function(err, documents) {
    if (err) return next(err);
    return res.json(documents);
  });
});

/* GET SINGLE Document BY ID */
router.get('/:id', function(req, res, next) {
  Documents.findById(req.params.id, function(err, post) {
    if (err) return next(err);
    return res.json(post);
  });
});

/* SAVE Document */
router.post('/', function(req, res, next) {
  Documents.create(req.body, function(err, post) {
    if (err) return next(err);
    return res.json(post);
  });
});

/* UPDATE Document */
router.put('/:id', function(req, res, next) {
  Documents.findByIdAndUpdate(req.params.id, req.body, function(err, post) {
    if (err) return next(err);
    return res.json(post);
  });
});

/* DELETE Document */
router.delete('/:id', function(req, res, next) {
  Documents.findByIdAndRemove(req.params.id, req.body, function(err, post) {
    if (err) return next(err);
    return res.json(post);
  });
});

module.exports = router;
