/*
 * @prettier
 */

const express = require('express'),
  router = express.Router(),
  AccountsManager = require('../../lib/accountsManager.js'),
  Documents = require('../../models/documents.js');

/* GET ALL Documents */
router.get('/', function(req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccountAccessRight(req.user))
    return res.status(401).send('Your current role do not grant access to this part of website');
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
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccountAccessRight(req.user))
    return res.status(401).send('Your current role do not grant access to this part of website');
  Documents.findById(req.params.id, function(err, post) {
    if (err) return next(err);
    return res.json(post);
  });
});

/* SAVE Document */
router.post('/', function(req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccountAccessRight(req.user))
    return res.status(401).send('Your current role do not grant access to this part of website');
  Documents.create(req.body, function(err, post) {
    if (err) return next(err);
    return res.json(post);
  });
});

/* UPDATE Document */
router.put('/:id', function(req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccountAccessRight(req.user))
    return res.status(401).send('Your current role do not grant access to this part of website');
  Documents.findByIdAndUpdate(req.params.id, req.body, function(err, post) {
    if (err) return next(err);
    return res.json(post);
  });
});

/* DELETE Document */
router.delete('/:id', function(req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccountAccessRight(req.user))
    return res.status(401).send('Your current role do not grant access to this part of website');
  Documents.findByIdAndRemove(req.params.id, req.body, function(err, post) {
    if (err) return next(err);
    return res.json(post);
  });
});

module.exports = router;
