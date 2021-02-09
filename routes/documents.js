/*
 * @prettier
 */

const express = require('express'),
  router = express.Router(),
  path = require('path'),
  mongoose = require('mongoose'),
  passport = require('passport'),
  AccountsManager = require('../lib/accountsManager.js'),
  extractor = require('../lib/extractor.js'),
  Organisations = require('../models/organisations.js'),
  Documents = require('../models/documents.js');

const conf = require('../conf/conf.json');

/* GET ALL Documents */
router.get('/', function (req, res, next) {
  if (
    typeof req.user === 'undefined' ||
    !AccountsManager.checkAccountAccessRight(req.user, AccountsManager.roles.annotator, AccountsManager.match.weight)
  )
    return res.status(401).send('Your current role do not grant access to this part of website');
  let limit = parseInt(req.query.limit),
    doi = req.query.doi,
    pmid = req.query.pmid,
    error = req.flash('error'),
    success = req.flash('success'),
    query = {};
  if (typeof doi !== 'undefined' && doi.length > 0) query['metadata.doi'] = doi;
  if (typeof pmid !== 'undefined' && pmid.length > 0) query['metadata.pmid'] = pmid;
  if (isNaN(limit)) limit = 20;
  if (AccountsManager.checkAccountAccessRight(req.user, AccountsManager.roles.annotator, AccountsManager.match.role))
    query['organisation'] = req.user.organisation; // if this is an annotator, then restrict access to his organisation only
  return Documents.find(query)
    .limit(limit)
    .exec(function (err, post) {
      if (err) return next(err);
      Organisations.find({}).exec(function (err, organisations) {
        if (err) return next(err);
        return res.render(path.join('documents', 'all'), {
          route: 'documents',
          root: conf.root,
          organisations: organisations,
          search: true,
          documents: post,
          current_user: req.user,
          error: Array.isArray(error) && error.length > 0 ? error : undefined,
          success: Array.isArray(success) && success.length > 0 ? success : undefined
        });
      });
    });
});

/* Update a document */
router.post('/', function (req, res, next) {
  if (
    typeof req.user === 'undefined' ||
    !AccountsManager.checkAccountAccessRight(req.user, AccountsManager.roles.curator)
  )
    return res.status(401).send('Your current role do not grant access to this part of website');
  if (typeof req.body.update !== 'undefined' && req.body.update === '') return updateDocument(req, res, next);
});

/* GET SINGLE Document BY ID */
router.get('/:id', function (req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccountAccessRight(req.user))
    return res.status(401).send('Your current role do not grant access to this part of website');
  let reloadMetadata = false,
    render = function (doc) {
      res.render(path.join('documents', doc.status), {
        route: 'documents/:id',
        root: conf.root,
        document: doc,
        demo: process.env.DEMO,
        current_user: req.user
      });
    };
  if (typeof req.query.reloadMetadata !== 'undefined') reloadMetadata = true;
  return Documents.findById(req.params.id, function (err, post) {
    if (err) return next(err);
    if (post === null) return res.status(400).send('error 404');
    if (reloadMetadata) {
      post.metadata = extractor.getMetadataFromStr(post.source);
      post.save(function (err) {
        if (err) return next(err);
        return render(post);
      });
    } else return render(post);
  });
});

let updateDocument = function (req, res, next) {
  if (typeof req.body.organisation !== 'string' || req.body.organisation.length <= 0) {
    req.flash('error', 'Incorrect organisation');
    return res.redirect('./documents');
  }
  if (typeof req.body.id !== 'string' || req.body.id.length <= 0) {
    req.flash('error', 'Incorrect _id');
    return res.redirect('./documents');
  }
  return Documents.findOne(
    {
      _id: req.body.id
    },
    function (err, doc) {
      if (err) {
        req.flash('error', err.message);
        return res.redirect('./documents');
      }
      doc.organisation = req.body.organisation;
      return doc.save(function (err) {
        if (err) {
          req.flash('error', err.message);
          return res.redirect('./documents');
        }
        req.flash('success', 'Organisation of document ' + doc.id + ' has been successfully updated');
        return res.redirect('./documents');
      });
    }
  );
};

module.exports = router;
