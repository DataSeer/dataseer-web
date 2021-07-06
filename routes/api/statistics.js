/*
 * @prettier
 */

'use strict';

const express = require('express'),
  router = express.Router();

const Documents = require('../../models/documents.js');

const AccountsManager = require('../../lib/accounts.js'),
  date = require('../../lib/date.js');

const DocumentsDatasetsController = require('../../controllers/documents.datasets.js');

const conf = require('../../conf/conf.json');

/* GET ALL Documents */
router.get('/documents', function (req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccessRight(req.user))
    return res.status(401).send('Your current role does not grant you access to this part of the website');
  let limit = parseInt(req.query.limit),
    sort =
      typeof req.query.sort === 'string'
        ? req.query.sort === 'asc'
          ? 1
          : req.query.sort === 'desc'
          ? -1
          : undefined
        : undefined,
    skip = parseInt(req.query.skip),
    organisations = req.query.organisations ? req.query.organisations.split(',') : undefined,
    now = new Date(),
    upload_range = parseInt(req.query.upload_range),
    update_range = parseInt(req.query.update_range),
    uploaded_before = req.query.uploaded_before ? new Date(req.query.uploaded_before) : null,
    uploaded_after = req.query.uploaded_after ? new Date(req.query.uploaded_after) : null,
    updated_before = req.query.updated_before ? new Date(req.query.updated_before) : null,
    updated_after = req.query.updated_after ? new Date(req.query.updated_after) : null,
    query = {},
    isCuractor = AccountsManager.checkAccessRight(req.user, AccountsManager.roles.curator);
  if (isNaN(skip) || skip < 0) skip = 0;
  if (isNaN(limit) || limit < 0) limit = 20;
  let upload_range_date, update_range_date;
  if (Number.isInteger(upload_range) && upload_range > 0) {
    upload_range_date = new Date(now);
    upload_range_date.setDate(now.getDate() - upload_range);
  }
  if (Number.isInteger(update_range) && update_range > 0) {
    update_range_date = new Date(now);
    update_range_date.setDate(now.getDate() - update_range);
  }
  // Check update_range_date
  if (update_range_date instanceof Date) {
    if (typeof query['uploaded_at'] === 'undefined') query['uploaded_at'] = {};
    query['uploaded_at']['$gte'] = update_range_date.toISOString();
  }
  // Check upload_range_date
  if (upload_range_date instanceof Date) {
    if (typeof query['updated_at'] === 'undefined') query['updated_at'] = {};
    query['updated_at']['$gte'] = upload_range_date.toISOString();
  }
  // Check uploaded dates
  if (uploaded_before instanceof Date) {
    if (typeof query['uploaded_at'] === 'undefined') query['uploaded_at'] = {};
    query['uploaded_at']['$lte'] = uploaded_before.toISOString();
  }
  if (uploaded_after instanceof Date) {
    if (typeof query['uploaded_at'] === 'undefined') query['uploaded_at'] = {};
    query['uploaded_at']['$gte'] = uploaded_after.toISOString();
  }
  // Check updated dates
  if (updated_before instanceof Date) {
    if (typeof query['updated_at'] === 'undefined') query['updated_at'] = {};
    query['updated_at']['$lte'] = updated_before.toISOString();
  }
  if (updated_after instanceof Date) {
    if (typeof query['updated_at'] === 'undefined') query['updated_at'] = {};
    query['updated_at']['$gte'] = updated_after.toISOString();
  }
  if (organisations) query['organisation'] = { $in: organisations };
  // Annotators access is restricted
  if (!isCuractor) query['organisation'] = { $in: [req.user.organisation._id] };
  // Init transaction
  let transaction = Documents.find(query)
    .sort(typeof sort !== undefined ? { _id: sort } : {})
    .limit(limit)
    .skip(skip)
    .populate('metadata')
    .populate('datasets');
  // Execute transaction
  return transaction.exec(function (err, docs) {
    if (err) return res.json({ 'err': true, 'res': null, 'msg': err instanceof Error ? err.toString() : err });
    else if (!docs) return res.json({ 'err': true, 'res': null, 'msg': 'document(s) not found' });
    let stats = docs.map(function (doc) {
      return {
        _id: doc._id.toString(),
        doi: doc.metadata.doi,
        title: doc.metadata.article_title,
        uploaded_at: date.format(doc.uploaded_at),
        updated_at: date.format(doc.updated_at),
        status: doc.status === 'finish' ? 'processed' : 'processing'
      };
    });
    return res.json({ 'err': false, 'res': stats });
  });
});

/* GET SINGLE Document BY ID */
router.get('/documents/:id', function (req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccessRight(req.user))
    return res.status(401).send('Your current role does not grant you access to this part of the website');
  let query = {},
    isCuractor = AccountsManager.checkAccessRight(req.user, AccountsManager.roles.curator);
  if (!isCuractor) query['organisation'] = req.user.organisation._id;
  query['_id'] = req.params.id;
  // Init transaction
  let transaction = Documents.findOne(query).populate('metadata').populate('datasets');
  // Execute transaction
  return transaction.exec(function (err, doc) {
    if (err) return res.json({ 'err': true, 'res': null, 'msg': err instanceof Error ? err.toString() : err });
    else if (!doc) return res.json({ 'err': true, 'res': null, 'msg': 'document not found' });
    let datasets = doc.datasets.current.map(function (dataset) {
      let infos = DocumentsDatasetsController.getDataTypeInfos(dataset, req.app.get('dataTypes'));
      return {
        id: dataset.id,
        name: dataset.name,
        reuse: dataset.reuse,
        type: { name: infos.label, url: infos.url },
        validated: dataset.status === 'valid'
      };
    });
    return res.json({
      'err': false,
      'res': {
        _id: doc._id.toString(),
        doi: doc.metadata.doi,
        title: doc.metadata.article_title,
        uploaded_at: date.format(doc.uploaded_at),
        updated_at: date.format(doc.updated_at),
        datasets: datasets
      }
    });
  });
});

module.exports = router;
