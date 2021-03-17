/*
 * @prettier
 */

'use strict';

const express = require('express'),
  router = express.Router(),
  path = require('path');

const AccountsManager = require('../lib/accounts.js');

const Organisations = require('../models/organisations.js'),
  DocumentsLogs = require('../models/documents.logs.js'),
  Documents = require('../models/documents.js');

const DocumentsController = require('../controllers/documents.js');

const conf = require('../conf/conf.json');

/* GET on all documents page */
router.get('/', function (req, res, next) {
  if (
    typeof req.user === 'undefined' ||
    !AccountsManager.checkAccessRight(req.user, AccountsManager.roles.annotator, AccountsManager.match.weight)
  )
    return res.status(401).send('Your current role do not grant access to this part of website');
  let limit = parseInt(req.query.limit),
    skip = parseInt(req.query.skip),
    query = {};
  if (isNaN(skip)) skip = 0;
  if (isNaN(limit)) limit = 20;
  // Init transaction
  let transaction = Documents.find(query)
    .skip(skip)
    .limit(limit)
    .select('+logs')
    .populate('organisation')
    .populate('metadata')
    .populate('owner')
    .populate('tei')
    .populate('pdf')
    .populate('logs');
  // Execute transaction
  return transaction.exec(function (err, documents) {
    if (err) return next(err);
    Organisations.find({}).exec(function (err, organisations) {
      if (err) return next(err);
      let error = req.flash('error'),
        success = req.flash('success');
      return res.render(path.join('documents', 'all'), {
        route: 'documents',
        conf: conf,
        organisations: organisations,
        search: true,
        documents: documents,
        current_user: req.user,
        error: Array.isArray(error) && error.length > 0 ? error : undefined,
        success: Array.isArray(success) && success.length > 0 ? success : undefined
      });
    });
  });
});

/* POST on all documents page */
router.post('/', function (req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccessRight(req.user, AccountsManager.roles.curator))
    return res.status(401).send('Your current role do not grant access to this part of website');
  if (typeof req.body.update !== 'undefined' && req.body.update === '') {
    if (typeof req.body.organisation !== 'string' || req.body.organisation.length <= 0) {
      req.flash('error', 'Incorrect organisation');
      return res.redirect('./documents');
    }
    if (typeof req.body.id !== 'string' || req.body.id.length <= 0) {
      req.flash('error', 'Incorrect document');
      return res.redirect('./documents');
    }
    return Documents.findOne({ _id: req.body.id }, function (err, doc) {
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
        req.flash('success', 'Organisation of document ' + doc._id + ' has been successfully updated');
        return res.redirect('./documents');
      });
    });
  }
});

/* GET on given document metadata page */
router.get('/:id/metadata', function (req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccessRight(req.user))
    return res.status(401).send('Your current role do not grant access to this part of website');
  // Init transaction
  let transaction = Documents.findOne({ _id: req.params.id }).populate('metadata');
  // Execute transaction
  return transaction.exec(function (err, doc) {
    if (err || !doc) return res.status(404).send('Document not found');
    if (doc.status !== 'metadata') return res.redirect(`./${doc.status}` + AccountsManager.addTokenInURL(req.query));
    else
      return res.render(path.join('documents', 'metadata'), {
        route: 'documents/:id/metadata',
        publicURL: conf.root + 'documents/' + req.params.id + '?documentToken=' + doc.token,
        conf: conf,
        document: doc,
        current_user: req.user
      });
  });
});

/* POST on given document metadata page */
router.post('/:id/metadata', function (req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccessRight(req.user))
    return res.status(401).send('Your current role do not grant access to this part of website');
  // Init transaction
  let transaction = Documents.findOne({ _id: req.params.id });
  // Execute transaction
  return transaction.exec(function (err, doc) {
    return DocumentsController.updateMetadata(doc, req.user._id, function (err) {
      if (err || !doc) return res.status(404).send('Document not found');
      return res.redirect(`./${doc.status}` + AccountsManager.addTokenInURL(req.query));
    });
  });
});

/* GET on given document datasets page */
router.get('/:id/datasets', function (req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccessRight(req.user))
    return res.status(401).send('Your current role do not grant access to this part of website');
  // Init transaction
  let transaction = Documents.findOne({ _id: req.params.id }).populate('datasets');
  // Execute transaction
  return transaction.exec(function (err, doc) {
    if (err || !doc) return res.status(404).send('Document not found');
    if (doc.status !== 'datasets') return res.redirect(`./${doc.status}` + AccountsManager.addTokenInURL(req.query));
    else
      return res.render(path.join('documents', 'datasets'), {
        route: 'documents/:id/datasets',
        conf: conf,
        document: doc,
        current_user: req.user
      });
  });
});

/* GET on given document finish page */
router.get('/:id/finish', function (req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccessRight(req.user))
    return res.status(401).send('Your current role do not grant access to this part of website');
  // Init transaction
  let transaction = Documents.findOne({ _id: req.params.id }).populate('metadata').populate('datasets');
  // Execute transaction
  return transaction.exec(function (err, doc) {
    if (err || !doc) return res.status(404).send('Document not found');
    if (doc.status !== 'finish') return res.redirect(`./${doc.status}` + AccountsManager.addTokenInURL(req.query));
    else
      return res.render(path.join('documents', 'finish'), {
        route: 'documents/:id/finish',
        conf: conf,
        document: doc,
        current_user: req.user
      });
  });
});

/* GET SINGLE Document BY ID */
router.get('/:id', function (req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccessRight(req.user))
    return res.status(401).send('Your current role do not grant access to this part of website');
  // Init transaction
  let transaction = Documents.findOne({ _id: req.params.id }).populate('metadata');
  // Execute transaction
  return transaction.exec(function (err, doc) {
    if (err || !doc) return res.status(404).send('Document not found');
    return res.redirect(`./${req.params.id}/${doc.status}` + AccountsManager.addTokenInURL(req.query));
  });
});

module.exports = router;
