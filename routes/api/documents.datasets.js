/*
 * @prettier
 */

const express = require('express'),
  router = express.Router();

const AccountsManager = require('../../lib/accounts.js');

const DocumentsDatasets = require('../../models/documents.datasets.js');

const DocumentsDatasetsController = require('../../controllers/documents.datasets.js');

/* PUT on datasets */
router.put('/:id', function (req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccessRight(req.user, AccountsManager.roles.curator))
    return res.status(401).send('Your current role do not grant access to this part of website');
  return DocumentsDatasets.findOne({ _id: req.params.id }, function (err, datasets) {
    if (err) return res.json({ 'err': true, 'res': null, 'msg': err });
    else if (!datasets) res.json({ 'err': true, 'res': null, 'msg': 'datasets not found' });
    datasets.current = req.body.current;
    datasets.deleted = req.body.deleted;
    datasets.extracted = req.body.extracted;
    return datasets.save(function (err) {
      if (err) return res.json({ 'err': true, 'res': null, 'msg': err });
      else return res.json({ 'err': false, 'res': true });
    });
  });
});

/* POST check validation of datasets */
router.post('/:id/checkValidation', function (req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccessRight(req.user))
    return res.status(401).send('Your current role do not grant access to this part of website');
  return DocumentsDatasetsController.checkValidation(req.params.id, function (err, check) {
    if (err) return res.json({ 'err': true, 'res': null, 'msg': err });
    else return res.json({ 'err': false, 'res': check });
  });
});

/* POST dataset of datasets */
router.post('/:id/dataset', function (req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccessRight(req.user))
    return res.status(401).send('Your current role do not grant access to this part of website');
  if (!req.body.dataset || typeof req.body.dataset !== 'object')
    return res.json({ 'err': true, 'res': null, 'msg': 'dataset must be defined' });
  return DocumentsDatasetsController.newDataset(
    { datasetsId: req.params.id, dataset: req.body.dataset },
    function (err) {
      if (err) return res.json({ 'err': true, 'res': null, 'msg': err });
      else return res.json({ 'err': false, 'res': true });
    }
  );
});

/* PUT dataset of datasets */
router.put('/:id/dataset', function (req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccessRight(req.user))
    return res.status(401).send('Your current role do not grant access to this part of website');
  return DocumentsDatasetsController.updateDataset(
    { datasetsId: req.params.id, dataset: req.body.dataset },
    function (err) {
      if (err) return res.json({ 'err': true, 'res': null, 'msg': err });
      else return res.json({ 'err': false, 'res': true });
    }
  );
});

/* DELETE dataset of datasets */
router.delete('/:id/dataset', function (req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccessRight(req.user))
    return res.status(401).send('Your current role do not grant access to this part of website');
  return DocumentsDatasetsController.deleteDataset(
    { datasetsId: req.params.id, dataset: req.body.dataset },
    function (err) {
      if (err) return res.json({ 'err': true, 'res': null, 'msg': err });
      else return res.json({ 'err': false, 'res': true });
    }
  );
});

/* POST corresp of datasets */
router.post('/:id/corresp', function (req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccessRight(req.user))
    return res.status(401).send('Your current role do not grant access to this part of website');
  return DocumentsDatasetsController.newCorresp(
    { datasetsId: req.params.id, dataset: req.body.dataset },
    function (err) {
      if (err) return res.json({ 'err': true, 'res': null, 'msg': err });
      else return res.json({ 'err': false, 'res': true });
    }
  );
});

/* DELETE corresp of datasets */
router.delete('/:id/corresp', function (req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccessRight(req.user))
    return res.status(401).send('Your current role do not grant access to this part of website');
  return DocumentsDatasetsController.deleteCorresp(
    { datasetsId: req.params.id, dataset: req.body.dataset },
    function (err) {
      if (err) return res.json({ 'err': true, 'res': null, 'msg': err });
      else return res.json({ 'err': false, 'res': true });
    }
  );
});

module.exports = router;
