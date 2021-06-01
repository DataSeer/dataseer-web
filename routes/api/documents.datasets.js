/*
 * @prettier
 */

'use strict';

const express = require('express'),
  router = express.Router();

const AccountsManager = require('../../lib/accounts.js');

const DocumentsDatasets = require('../../models/documents.datasets.js');

const DocumentsController = require('../../controllers/documents.js'),
  DocumentsDatasetsController = require('../../controllers/documents.datasets.js');

/* PUT on datasets */
router.put('/:id', function (req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccessRight(req.user, AccountsManager.roles.curator))
    return res.status(401).send('Your current role does not grant you access to this part of the website');
  return DocumentsDatasets.findOne({ _id: req.params.id }, function (err, datasets) {
    if (err) return res.json({ 'err': true, 'res': null, 'msg': err instanceof Error ? err.toString() : err });
    else if (!datasets) return res.json({ 'err': true, 'res': null, 'msg': 'datasets not found' });
    if (req.body.current) datasets.current = req.body.current;
    if (req.body.deleted) datasets.deleted = req.body.deleted;
    if (req.body.extracted) datasets.extracted = req.body.extracted;
    return datasets.save(function (err) {
      if (err) return res.json({ 'err': true, 'res': null, 'msg': err instanceof Error ? err.toString() : err });
      else return res.json({ 'err': false, 'res': true });
    });
  });
});

/* POST check validation of datasets */
router.post('/:id/checkValidation', function (req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccessRight(req.user))
    return res.status(401).send('Your current role does not grant you access to this part of the website');
  return DocumentsDatasetsController.checkValidation(req.params.id, function (err, check) {
    if (err) return res.json({ 'err': true, 'res': null, 'msg': err instanceof Error ? err.toString() : err });
    else return res.json({ 'err': false, 'res': check });
  });
});

/* POST dataset of datasets */
router.post('/:id/dataset', function (req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccessRight(req.user))
    return res.status(401).send('Your current role does not grant you access to this part of the website');
  if (!req.body.dataset || typeof req.body.dataset !== 'object')
    return res.json({ 'err': true, 'res': null, 'msg': 'dataset must be defined' });
  return DocumentsController.newDataset(
    { user: req.user, datasetsId: req.params.id, dataset: req.body.dataset },
    function (err, dataset) {
      if (err) return res.json({ 'err': true, 'res': null, 'msg': err instanceof Error ? err.toString() : err });
      else return res.json({ 'err': false, 'res': dataset });
    }
  );
});

/* PUT dataset of datasets */
router.put('/:id/dataset', function (req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccessRight(req.user))
    return res.status(401).send('Your current role does not grant you access to this part of the website');
  return DocumentsController.updateDataset(
    { user: req.user, datasetsId: req.params.id, dataset: req.body.dataset },
    function (err, dataset) {
      if (err) return res.json({ 'err': true, 'res': null, 'msg': err instanceof Error ? err.toString() : err });
      else return res.json({ 'err': false, 'res': dataset });
    }
  );
});

/* DELETE dataset of datasets */
router.delete('/:id/dataset', function (req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccessRight(req.user))
    return res.status(401).send('Your current role does not grant you access to this part of the website');
  return DocumentsController.deleteDataset(
    { user: req.user, datasetsId: req.params.id, dataset: req.body.dataset },
    function (err) {
      if (err) return res.json({ 'err': true, 'res': null, 'msg': err instanceof Error ? err.toString() : err });
      else return res.json({ 'err': false, 'res': true });
    }
  );
});

/* POST link of datasets */
router.post('/:id/link', function (req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccessRight(req.user))
    return res.status(401).send('Your current role does not grant you access to this part of the website');
  return DocumentsController.linkSentence(
    { user: req.user, datasetsId: req.params.id, dataset: req.body.dataset, sentence: req.body.sentence },
    function (err) {
      if (err) return res.json({ 'err': true, 'res': null, 'msg': err instanceof Error ? err.toString() : err });
      else return res.json({ 'err': false, 'res': true });
    }
  );
});

/* DELETE link of datasets */
router.delete('/:id/unlink', function (req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccessRight(req.user))
    return res.status(401).send('Your current role does not grant you access to this part of the website');
  return DocumentsController.unlinkSentence(
    { user: req.user, datasetsId: req.params.id, dataset: req.body.dataset, sentence: req.body.sentence },
    function (err) {
      if (err) return res.json({ 'err': true, 'res': null, 'msg': err instanceof Error ? err.toString() : err });
      else return res.json({ 'err': false, 'res': true });
    }
  );
});

module.exports = router;
