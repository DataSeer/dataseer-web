/*
 * @prettier
 */

const express = require('express'),
  router = express.Router(),
  path = require('path'),
  mongoose = require('mongoose'),
  Documents = require('../models/documents.js');

/* GET ALL Documents */
router.get('/', function(req, res, next) {
  let limit = parseInt(req.query.limit);
  if (isNaN(limit)) limit = 20;
  Documents.find({})
    .limit(limit)
    .exec(function(err, post) {
      if (err) return next(err);
      return res.render(path.join('documents', 'all'), { 'documents': post });
    });
});

/* GET SINGLE Document BY ID */
router.get('/:id', function(req, res, next) {
  Documents.findById(req.params.id, function(err, post) {
    if (err) return next(err);
    if (post === null) return res.status(400).send('error 404');
    return res.render(path.join('documents', post.status), { 'document': post, 'demo': process.env.DEMO });
  });
});

module.exports = router;
