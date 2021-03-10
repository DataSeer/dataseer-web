/*
 * @prettier
 */

'use strict';

const express = require('express'),
  router = express.Router(),
  fs = require('fs');

const DocumentsDatasets = require('../../models/documents.datasets.js'),
  DocumentsMetadata = require('../../models/documents.metadata.js'),
  DocumentsFiles = require('../../models/documents.files.js'),
  DocumentsLogs = require('../../models/documents.logs.js'),
  Documents = require('../../models/documents.js');

const AccountsManager = require('../../lib/accounts.js'),
  Mailer = require('../../lib/mailer.js');

const DocumentsFilesController = require('../../controllers/documents.files.js'),
  DocumentsController = require('../../controllers/documents.js'),
  DocumentsDatasetsController = require('../../controllers/documents.datasets.js');

const conf = require('../../conf/conf.json');

/* GET ALL Documents */
router.get('/', function (req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccessRight(req.user))
    return res.status(401).send('Your current role do not grant access to this part of website');
  let limit = parseInt(req.query.limit),
    skip = parseInt(req.query.skip),
    query = {};
  if (isNaN(limit)) limit = 20;
  if (isNaN(skip)) skip = 0;
  // Init transaction
  let transaction = Documents.find(query).skip(skip).limit(limit);
  // Populate dependings on the parameters
  if (req.query.pdf) transaction.populate('pdf');
  if (req.query.tei) transaction.populate('tei');
  if (req.query.files) transaction.populate('files');
  if (req.query.metadata) transaction.populate('metadata');
  if (req.query.datasets) transaction.populate('datasets');
  return transaction.exec(function (err, doc) {
    if (err) return res.json({ 'err': true, 'res': null, 'msg': err });
    else if (!doc) return res.json({ 'err': true, 'res': null, 'msg': 'document not found' });
    return res.json({ 'err': false, 'res': doc });
  });
});

/* POST new Document */
router.post('/', function (req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccessRight(req.user, AccountsManager.roles.curator))
    return res.status(401).send('Your current role do not grant access to this part of website');
  let opts = DocumentsController.getUploadParams(Object.assign({ files: req.files }, req.body), req.user),
    mute = req.body && req.body.mute; // Send mails by default. If mute is set then do not send its
  if (opts instanceof Error) return res.json({ 'err': true, 'res': null, 'msg': opts.toString() });
  opts.privateKey = req.app.get('private.key');
  opts.dataTypes = req.app.get('dataTypes');
  return DocumentsController.upload(
    opts,
    {
      onCreatedAccount: function (account) {
        if (!mute) return Mailer.sendAccountCreationMail(account, req.app.get('private.key'));
      }
    },
    function (err, doc) {
      // Send upload email to curators
      if (!mute) Mailer.sendDocumentUploadMail(doc, opts, req.user.username);
      // If any of the file processing produced an error, err would equal that error
      if (err) return res.json({ 'err': true, 'res': null, 'msg': 'Error while uploading document !' });
      else res.json({ 'err': false, 'res': doc });
    }
  );
});

/* GET SINGLE Document BY ID */
router.get('/:id', function (req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccessRight(req.user))
    return res.status(401).send('Your current role do not grant access to this part of website');
  // Init transaction
  let transaction = Documents.findOne({ _id: req.params.id });
  // Populate dependings on the parameters
  if (req.query.pdf) transaction.populate('pdf');
  if (req.query.tei) transaction.populate('tei');
  if (req.query.files) transaction.populate('files');
  if (req.query.metadata) transaction.populate('metadata');
  if (req.query.datasets) transaction.populate('datasets');
  // Execute transaction
  return transaction.exec(function (err, doc) {
    if (err) return res.json({ 'err': true, 'res': null, 'msg': err });
    else if (!doc) return res.json({ 'err': true, 'res': null, 'msg': 'document not found' });
    else return res.json({ 'err': false, 'res': doc });
  });
});

/* GET PDF of document */
router.get('/:id/pdf', function (req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccessRight(req.user))
    return res.status(401).send('Your current role do not grant access to this part of website');
  // Init transaction
  let transaction = Documents.findOne({ _id: req.params.id });
  // Execute transaction
  return transaction.exec(function (err, doc) {
    if (err) return res.json({ 'err': true, 'res': null, 'msg': err });
    else if (!doc) return res.json({ 'err': true, 'res': null, 'msg': 'document not found' });
    else
      return DocumentsFiles.findById(doc.pdf).exec(function (err, file) {
        if (err) return res.json({ 'err': true, 'res': null, 'msg': err });
        else if (!file) return res.json({ 'err': true, 'res': null, 'msg': 'file not found' });
        else return res.json({ 'err': false, 'res': file });
      });
  });
});

/* GET PDF of document */
router.get('/:id/pdf/content', function (req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccessRight(req.user))
    return res.status(401).send('Your current role do not grant access to this part of website');
  // Init transaction
  let transaction = Documents.findOne({ _id: req.params.id });
  // Execute transaction
  return transaction.exec(function (err, doc) {
    if (err) return res.json({ 'err': true, 'res': null, 'msg': err });
    else if (!doc) return res.json({ 'err': true, 'res': null, 'msg': 'document not found' });
    else
      return DocumentsFiles.findById(doc.pdf)
        .select('+path') // path is not returned by default
        .exec(function (err, file) {
          if (err) return res.json({ 'err': true, 'res': null, 'msg': err });
          else if (!file) return res.json({ 'err': true, 'res': null, 'msg': 'file not found' });
          let stream = fs.createReadStream(file.path),
            stat = fs.statSync(file.path);
          res.setHeader('Content-Length', stat.size);
          res.setHeader('Content-Type', 'application/pdf');
          return stream.pipe(res);
        });
  });
});

/* GET TEI of document */
router.get('/:id/tei/', function (req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccessRight(req.user))
    return res.status(401).send('Your current role do not grant access to this part of website');
  // Init transaction
  let transaction = Documents.findOne({ _id: req.params.id });
  // Execute transaction
  return transaction.exec(function (err, doc) {
    if (err) return res.json({ 'err': true, 'res': null, 'msg': err });
    else if (!doc) return res.json({ 'err': true, 'res': null, 'msg': 'document not found' });
    else
      return DocumentsFiles.findById(doc.tei).exec(function (err, file) {
        if (err) return res.json({ 'err': true, 'res': null, 'msg': err });
        else if (!file) return res.json({ 'err': true, 'res': null, 'msg': 'file not found' });
        else return res.json({ 'err': false, 'res': file });
      });
  });
});

/* GET TEI of document */
router.get('/:id/tei/content', function (req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccessRight(req.user))
    return res.status(401).send('Your current role do not grant access to this part of website');
  // Init transaction
  let transaction = Documents.findOne({ _id: req.params.id });
  // Execute transaction
  return transaction.exec(function (err, doc) {
    if (err) return res.json({ 'err': true, 'res': null, 'msg': err });
    else if (!doc) return res.json({ 'err': true, 'res': null, 'msg': 'document not found' });
    else
      return DocumentsFilesController.readFile(doc.tei, function (err, data) {
        if (err) return res.json({ 'err': true, 'res': null, 'msg': err });
        return res.end(data);
      });
  });
});

/* GET metadata of document */
router.get('/:id/metadata', function (req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccessRight(req.user))
    return res.status(401).send('Your current role do not grant access to this part of website');
  // Init transaction
  let transaction = DocumentsMetadata.findOne({ document: req.params.id });
  // Execute transaction
  return transaction.exec(function (err, metadata) {
    if (err) return res.json({ 'err': true, 'res': null, 'msg': err });
    else if (!metadata) return res.json({ 'err': true, 'res': null, 'msg': 'metadata not found' });
    else return res.json({ 'err': false, 'res': metadata });
  });
});

/* POST validate metadata of document */
router.post('/:id/metadata/validate', function (req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccessRight(req.user))
    return res.status(401).send('Your current role do not grant access to this part of website');
  // Init transaction
  let transaction = Documents.findOne({ _id: req.params.id });
  // Execute transaction
  return transaction.exec(function (err, doc) {
    if (err) return res.json({ 'err': true, 'res': null, 'msg': err });
    else if (!doc) return res.json({ 'err': true, 'res': null, 'msg': 'document not found' });
    doc.status = 'datasets';
    doc.save(function (err) {
      if (err) return res.json({ 'err': true, 'res': null, 'msg': err });
      // Create logs
      else
        return DocumentsLogs.create(
          {
            document: doc._id,
            user: req.user._id,
            action: 'VALIDATE METADATA'
          },
          function (err, log) {
            if (err) return res.json({ 'err': true, 'res': null, 'msg': err });
            doc.logs.push(log._id);
            return doc.save(function (err) {
              if (err) return res.json({ 'err': true, 'res': null, 'msg': err });
              else return res.json({ 'err': false, 'res': true });
            });
          }
        );
    });
  });
});

/* GET datasets of document */
router.get('/:id/datasets', function (req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccessRight(req.user))
    return res.status(401).send('Your current role do not grant access to this part of website');
  // Init transaction
  let transaction = DocumentsDatasets.find({ document: req.params.id });
  // Execute transaction
  return transaction.exec(function (err, datasets) {
    if (err) return res.json({ 'err': true, 'res': null, 'msg': err });
    else if (!datasets) return res.json({ 'err': true, 'res': null, 'msg': 'datasets not found' });
    else return res.json({ 'err': false, 'res': datasets });
  });
});

/* POST validate datasets of document */
router.post('/:id/datasets/validate', function (req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccessRight(req.user))
    return res.status(401).send('Your current role do not grant access to this part of website');
  // Init transaction
  let transaction = Documents.findOne({ _id: req.params.id });
  // Execute transaction
  return transaction.exec(function (err, doc) {
    if (err) return res.json({ 'err': true, 'res': null, 'msg': err });
    else if (!doc) return res.json({ 'err': true, 'res': null, 'msg': 'document not found' });
    else
      return DocumentsDatasetsController.checkValidation(doc.datasets, function (err, check) {
        if (err) return res.json({ 'err': true, 'res': null, 'msg': err });
        else if (!AccountsManager.checkAccessRight(req.user, AccountsManager.roles.curator) && !check)
          return res.json({ 'err': true, 'res': null, 'msg': 'datasets not valid (at least one of them)' });
        doc.status = 'finish';
        doc.save(function (err) {
          if (err) return res.json({ 'err': true, 'res': null, 'msg': err });
          // Create logs
          else
            return DocumentsLogs.create(
              {
                document: doc._id,
                user: req.user._id,
                action: 'VALIDATE DATASETS'
              },
              function (err, log) {
                if (err) return res.json({ 'err': true, 'res': null, 'msg': err });
                doc.logs.push(log._id);
                return doc.save(function (err) {
                  if (err) return res.json({ 'err': true, 'res': null, 'msg': err });
                  else return res.json({ 'err': false, 'res': true });
                });
              }
            );
        });
      });
  });
});

/* POST backToMetadata document */
router.post('/:id/datasets/backToMetadata', function (req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccessRight(req.user))
    return res.status(401).send('Your current role do not grant access to this part of website');
  // Init transaction
  let transaction = Documents.findOne({ _id: req.params.id });
  // Execute transaction
  return transaction.exec(function (err, doc) {
    if (err) return res.json({ 'err': true, 'res': null, 'msg': err });
    else if (!doc) return res.json({ 'err': true, 'res': null, 'msg': 'document not found' });
    doc.status = 'metadata';
    doc.save(function (err) {
      if (err) return res.json({ 'err': true, 'res': null, 'msg': err });
      // Create logs
      else
        return DocumentsLogs.create(
          {
            document: doc._id,
            user: req.user._id,
            action: 'BACK TO METADATA VALIDATION'
          },
          function (err, log) {
            if (err) return res.json({ 'err': true, 'res': null, 'msg': err });
            doc.logs.push(log._id);
            return doc.save(function (err) {
              if (err) return res.json({ 'err': true, 'res': null, 'msg': err });
              else return res.json({ 'err': false, 'res': true });
            });
          }
        );
    });
  });
});

/* POST reopen document */
router.post('/:id/finish/reopen', function (req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccessRight(req.user))
    return res.status(401).send('Your current role do not grant access to this part of website');
  // Init transaction
  let transaction = Documents.findOne({ _id: req.params.id });
  // Execute transaction
  return transaction.exec(function (err, doc) {
    if (err) return res.json({ 'err': true, 'res': null, 'msg': err });
    else if (!doc) return res.json({ 'err': true, 'res': null, 'msg': 'document not found' });
    doc.status = 'metadata';
    doc.save(function (err) {
      if (err) return res.json({ 'err': true, 'res': null, 'msg': err });
      // Create logs
      else
        return DocumentsLogs.create(
          {
            document: doc._id,
            user: req.user._id,
            action: 'REOPEN DOCUMENT'
          },
          function (err, log) {
            if (err) return res.json({ 'err': true, 'res': null, 'msg': err });
            doc.logs.push(log._id);
            return doc.save(function (err) {
              if (err) return res.json({ 'err': true, 'res': null, 'msg': err });
              else return res.json({ 'err': false, 'res': true });
            });
          }
        );
    });
  });
});

/* GET files of document */
router.get('/:id/files', function (req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccessRight(req.user))
    return res.status(401).send('Your current role do not grant access to this part of website');
  // Init transaction
  let transaction = DocumentsFiles.find({ document: req.params.id });
  // Execute transaction
  return transaction.exec(function (err, file) {
    if (err) return res.json({ 'err': true, 'res': null, 'msg': err });
    else if (!file) return res.json({ 'err': true, 'res': null, 'msg': 'file not found' });
    else return res.json({ 'err': false, 'res': file });
  });
});

module.exports = router;
