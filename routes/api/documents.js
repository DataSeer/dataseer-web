/*
 * @prettier
 */

const express = require('express'),
  router = express.Router(),
  mongoose = require('mongoose'),
  Documents = require('../../models/documents.js');

/* GET ALL Documents */
router.get('/', function(req, res, next) {
  let limit = parseInt(req.query.limit);
  if (isNaN(limit)) limit = 20;
  Documents.find({})
    .limit(limit)
    .exec(function(err, post) {
      if (err) return next(err);
      return res.json(post);
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
