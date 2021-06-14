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
  if (!req.body.sentence || typeof req.body.sentence !== 'object')
    return res.json({ 'err': true, 'res': null, 'msg': 'sentence must be defined' });
  return DocumentsController.newDataset(
    { user: req.user, datasetsId: req.params.id, dataset: req.body.dataset, sentence: req.body.sentence },
    function (err, result) {
      if (err) return res.json({ 'err': true, 'res': null, 'msg': err instanceof Error ? err.toString() : err });
      else return res.json({ 'err': false, 'res': result.mongo });
    }
  );
});

/* PUT dataset of datasets */
router.put('/:id/dataset', function (req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccessRight(req.user))
    return res.status(401).send('Your current role does not grant you access to this part of the website');
  if (!req.body.dataset || typeof req.body.dataset !== 'object')
    return res.json({ 'err': true, 'res': null, 'msg': 'dataset must be defined' });
  return DocumentsController.updateDataset(
    { user: req.user, datasetsId: req.params.id, dataset: req.body.dataset, fromAPI: true },
    function (err, result) {
      if (err) return res.json({ 'err': true, 'res': null, 'msg': err instanceof Error ? err.toString() : err });
      else return res.json({ 'err': false, 'res': result.mongo });
    }
  );
});

/* DELETE dataset of datasets */
router.delete('/:id/dataset', function (req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccessRight(req.user))
    return res.status(401).send('Your current role does not grant you access to this part of the website');
  if (!req.body.dataset || typeof req.body.dataset !== 'object')
    return res.json({ 'err': true, 'res': null, 'msg': 'dataset must be defined' });
  return DocumentsController.deleteDataset(
    { user: req.user, datasetsId: req.params.id, dataset: req.body.dataset },
    function (err, result) {
      if (err) return res.json({ 'err': true, 'res': null, 'msg': err instanceof Error ? err.toString() : err });
      else return res.json({ 'err': false, 'res': result.mongo });
    }
  );
});

/* POST link of datasets */
router.post('/:id/link', function (req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccessRight(req.user))
    return res.status(401).send('Your current role does not grant you access to this part of the website');
  if (!req.body.link || typeof req.body.link !== 'object')
    return res.json({ 'err': true, 'res': null, 'msg': 'link must be defined' });
  return DocumentsController.linkSentence(
    { user: req.user, datasetsId: req.params.id, link: req.body.link },
    function (err, result) {
      if (err) return res.json({ 'err': true, 'res': null, 'msg': err instanceof Error ? err.toString() : err });
      else return res.json({ 'err': false, 'res': result.mongo });
    }
  );
});

/* DELETE link of datasets */
router.delete('/:id/unlink', function (req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccessRight(req.user))
    return res.status(401).send('Your current role does not grant you access to this part of the website');
  if (!req.body.link || typeof req.body.link !== 'object')
    return res.json({ 'err': true, 'res': null, 'msg': 'link must be defined' });
  return DocumentsController.unlinkSentence(
    { user: req.user, datasetsId: req.params.id, link: req.body.link },
    function (err, result) {
      if (err) return res.json({ 'err': true, 'res': null, 'msg': err instanceof Error ? err.toString() : err });
      else return res.json({ 'err': false, 'res': result.mongo });
    }
  );
});

module.exports = router;
