/*
 * @prettier
 */

'use strict';

const express = require('express'),
  router = express.Router(),
  async = require('async'),
  path = require('path'),
  fs = require('fs');

const Accounts = require('../../models/accounts.js'),
  DocumentsDatasets = require('../../models/documents.datasets.js'),
  DocumentsMetadata = require('../../models/documents.metadata.js'),
  DocumentsFiles = require('../../models/documents.files.js'),
  DocumentsLogs = require('../../models/documents.logs.js'),
  Documents = require('../../models/documents.js');

const AccountsManager = require('../../lib/accounts.js'),
  DocX = require('../../lib/docx.js'),
  Mailer = require('../../lib/mailer.js');

const DocumentsFilesController = require('../../controllers/documents.files.js'),
  DocumentsController = require('../../controllers/documents.js'),
  DocumentsDatasetsController = require('../../controllers/documents.datasets.js');

const conf = require('../../conf/conf.json');

/* POST new Document */
router.post('/', function (req, res, next) {
  let opts = DocumentsController.getUploadParams(Object.assign({ files: req.files }, req.body), req.user),
    mute =
      req.user && AccountsManager.checkAccessRight(req.user, AccountsManager.roles.curator)
        ? req.body && req.body.mute
        : false; // Send mails by default. If mute is set by curator then do not send its
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
      if (err) return res.json({ 'err': true, 'res': null, 'msg': err instanceof Error ? err.toString() : err });
      if (!doc) return res.json({ 'err': true, 'res': null, 'msg': 'Error while uploading document !' });
      // Get the uploader account
      return Accounts.findOne({ _id: doc.uploaded_by }).exec(function (err, account) {
        if (err) return res.json({ 'err': true, 'res': null, 'msg': err instanceof Error ? err.toString() : err });
        else if (!account) return res.json({ 'err': true, 'res': null, 'msg': 'account not found' });
        // Send upload email to curators
        if (!mute) Mailer.sendDocumentUploadMail(doc, opts, account.username);
        return res.json({ 'err': false, 'res': doc });
      });
    }
  );
});

/* GET SINGLE Document BY ID */
router.get('/:id', function (req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccessRight(req.user))
    return res.status(401).send('Your current role does not grant you access to this part of the website');
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
    if (err) return res.json({ 'err': true, 'res': null, 'msg': err instanceof Error ? err.toString() : err });
    else if (!doc) return res.json({ 'err': true, 'res': null, 'msg': 'document not found' });
    else return res.json({ 'err': false, 'res': doc });
  });
});

/* DELETE SINGLE Document BY ID */
router.delete('/:id', function (req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccessRight(req.user, AccountsManager.roles.curator))
    return res.status(401).send('Your current role does not grant you access to this part of the website');
  return DocumentsController.delete(req.params.id, function (err) {
    if (err) return res.json({ 'err': true, 'res': null, 'msg': err instanceof Error ? err.toString() : err });
    else return res.json({ 'err': false, 'res': true });
  });
});

/* Extract metadata from XML */
router.post('/:id/update', function (req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccessRight(req.user, AccountsManager.roles.curator))
    return res.status(401).send('Your current role does not grant you access to this part of the website');
  return Documents.findOne({ _id: req.params.id })
    .populate('pdf')
    .populate('tei')
    .exec(function (err, doc) {
      if (err) return res.json({ 'err': true, 'res': null, 'msg': err instanceof Error ? err.toString() : err });
      else if (!doc) return res.json({ 'err': true, 'res': null, 'msg': 'document not found' });
      let updates = {
        tei: doc.tei ? !doc.tei.metadata || doc.tei.metadata.version !== 2 : false,
        pdf: doc.pdf ? !doc.pdf.metadata || doc.pdf.metadata.version !== 2 : false
      };
      return async.mapSeries(
        [
          // update TEI file
          function (next) {
            if (!updates.tei) return next();
            return DocumentsController.updateTEI(doc, req.user, function (err, isUpdated) {
              return next(err);
            });
          },
          // update datasets
          function (next) {
            if (!updates.tei) return next();
            return DocumentsController.refreshDatasets(req.user, doc, req.app.get('dataTypes'), function (err) {
              return next(err);
            });
          },
          // update PDF file
          function (next) {
            if (!updates.pdf) return next();
            return DocumentsController.updatePDF(doc, req.user, function (err, isUpdated) {
              return next(err);
            });
          }
        ],
        function (action, next) {
          return action(function (err) {
            return next(err);
          });
        },
        function (err) {
          if (err) return res.json({ 'err': true, 'res': null, 'msg': err instanceof Error ? err.toString() : err });
          return res.json({ 'err': false, 'res': true });
        }
      );
    });
});

/* Extract metadata from XML */
router.post('/:id/updatePDF', function (req, res, next) {
  if (
    typeof req.user === 'undefined' ||
    !AccountsManager.checkAccessRight(req.user, AccountsManager.roles.annotator, AccountsManager.match.weight)
  )
    return res.status(401).send('Your current role does not grant you access to this part of the website');
  return Documents.findOne({ _id: req.params.id }).exec(function (err, doc) {
    if (err) return res.json({ 'err': true, 'res': null, 'msg': err instanceof Error ? err.toString() : err });
    else if (!doc) return res.json({ 'err': true, 'res': null, 'msg': 'document not found' });
    return DocumentsController.updatePDF(doc, req.user, function (err, isUpdated) {
      if (err) return res.json({ 'err': true, 'res': null, 'msg': err instanceof Error ? err.toString() : err });
      else return res.json({ 'err': false, 'res': isUpdated });
    });
  });
});

/* update XML of TEI file */
router.post('/:id/updateTEI', function (req, res, next) {
  if (
    typeof req.user === 'undefined' ||
    !AccountsManager.checkAccessRight(req.user, AccountsManager.roles.annotator, AccountsManager.match.weight)
  )
    return res.status(401).send('Your current role does not grant you access to this part of the website');
  return Documents.findOne({ _id: req.params.id }).exec(function (err, doc) {
    if (err) return res.json({ 'err': true, 'res': null, 'msg': err instanceof Error ? err.toString() : err });
    else if (!doc) return res.json({ 'err': true, 'res': null, 'msg': 'document not found' });
    return DocumentsController.updateTEI(doc, req.user, function (err, isUpdated) {
      if (err) return res.json({ 'err': true, 'res': null, 'msg': err instanceof Error ? err.toString() : err });
      else return res.json({ 'err': false, 'res': isUpdated });
    });
  });
});

/* GET PDF of document */
router.get('/:id/pdf', function (req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccessRight(req.user))
    return res.status(401).send('Your current role does not grant you access to this part of the website');
  // Init transaction
  let transaction = Documents.findOne({ _id: req.params.id });
  // Execute transaction
  return transaction.exec(function (err, doc) {
    if (err) return res.json({ 'err': true, 'res': null, 'msg': err instanceof Error ? err.toString() : err });
    else if (!doc) return res.json({ 'err': true, 'res': null, 'msg': 'document not found' });
    else
      return DocumentsFiles.findById(doc.pdf).exec(function (err, file) {
        if (err) return res.json({ 'err': true, 'res': null, 'msg': err instanceof Error ? err.toString() : err });
        else if (!file) return res.json({ 'err': true, 'res': null, 'msg': 'file not found' });
        else return res.json({ 'err': false, 'res': file });
      });
  });
});

/* GET PDF of document */
router.get('/:id/pdf/content', function (req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccessRight(req.user))
    return res.status(401).send('Your current role does not grant you access to this part of the website');
  // Init transaction
  let transaction = Documents.findOne({ _id: req.params.id });
  // Execute transaction
  return transaction.exec(function (err, doc) {
    if (err) return res.json({ 'err': true, 'res': null, 'msg': err instanceof Error ? err.toString() : err });
    else if (!doc) return res.json({ 'err': true, 'res': null, 'msg': 'document not found' });
    else
      return DocumentsFiles.findById(doc.pdf)
        .select('+path') // path is not returned by default
        .exec(function (err, file) {
          if (err) return res.json({ 'err': true, 'res': null, 'msg': err instanceof Error ? err.toString() : err });
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
    return res.status(401).send('Your current role does not grant you access to this part of the website');
  // Init transaction
  let transaction = Documents.findOne({ _id: req.params.id });
  // Execute transaction
  return transaction.exec(function (err, doc) {
    if (err) return res.json({ 'err': true, 'res': null, 'msg': err instanceof Error ? err.toString() : err });
    else if (!doc) return res.json({ 'err': true, 'res': null, 'msg': 'document not found' });
    else
      return DocumentsFiles.findById(doc.tei).exec(function (err, file) {
        if (err) return res.json({ 'err': true, 'res': null, 'msg': err instanceof Error ? err.toString() : err });
        else if (!file) return res.json({ 'err': true, 'res': null, 'msg': 'file not found' });
        else return res.json({ 'err': false, 'res': file });
      });
  });
});

/* GET TEI of document */
router.get('/:id/tei/content', function (req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccessRight(req.user))
    return res.status(401).send('Your current role does not grant you access to this part of the website');
  // Init transaction
  let transaction = Documents.findOne({ _id: req.params.id });
  // Execute transaction
  return transaction.exec(function (err, doc) {
    if (err) return res.json({ 'err': true, 'res': null, 'msg': err instanceof Error ? err.toString() : err });
    else if (!doc) return res.json({ 'err': true, 'res': null, 'msg': 'document not found' });
    else
      return DocumentsFilesController.readFile(doc.tei, function (err, data) {
        if (err) return res.json({ 'err': true, 'res': null, 'msg': err instanceof Error ? err.toString() : err });
        return res.end(data);
      });
  });
});

/* GET metadata of document */
router.get('/:id/metadata', function (req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccessRight(req.user))
    return res.status(401).send('Your current role does not grant you access to this part of the website');
  // Init transaction
  let transaction = DocumentsMetadata.findOne({ document: req.params.id });
  // Execute transaction
  return transaction.exec(function (err, metadata) {
    if (err) return res.json({ 'err': true, 'res': null, 'msg': err instanceof Error ? err.toString() : err });
    else if (!metadata) return res.json({ 'err': true, 'res': null, 'msg': 'metadata not found' });
    else return res.json({ 'err': false, 'res': metadata });
  });
});

/* POST metadata of document */
router.post('/:id/sendDocumentURLToAuthors', function (req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccessRight(req.user, AccountsManager.roles.curator))
    return res.status(401).send('Your current role does not grant you access to this part of the website');
  // Init transaction
  let transaction = Documents.findOne({ _id: req.params.id }).populate('metadata');
  // Execute transaction
  return transaction.exec(function (err, doc) {
    if (err) return res.json({ 'err': true, 'res': null, 'msg': err instanceof Error ? err.toString() : err });
    else if (!doc) return res.json({ 'err': true, 'res': null, 'msg': 'document not found' });
    else if (!doc.metadata) return res.json({ 'err': true, 'res': null, 'msg': 'metadata not found' });
    else
      return Mailer.sendDocumentURLToAuthorsMail(
        doc,
        {
          authors: doc.metadata.authors.map(function (item) {
            return item.email;
          })
        },
        function (err) {
          if (err) return res.json({ 'err': true, 'res': null, 'msg': err instanceof Error ? err.toString() : err });
          else
            return DocumentsLogs.create(
              {
                document: doc._id,
                user: req.user._id,
                action: 'SEND EMAILS TO AUTHORS'
              },
              function (err, log) {
                if (err)
                  return res.json({ 'err': true, 'res': null, 'msg': err instanceof Error ? err.toString() : err });
                doc.logs.push(log._id);
                return doc.save(function (err) {
                  if (err)
                    return res.json({ 'err': true, 'res': null, 'msg': err instanceof Error ? err.toString() : err });
                  else return res.json({ 'err': false, 'res': true });
                });
              }
            );
        }
      );
  });
});

/* POST validate metadata of document */
router.post('/:id/metadata/validate', function (req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccessRight(req.user))
    return res.status(401).send('Your current role does not grant you access to this part of the website');
  // Init transaction
  let transaction = Documents.findOne({ _id: req.params.id });
  // Execute transaction
  return transaction.exec(function (err, doc) {
    if (err) return res.json({ 'err': true, 'res': null, 'msg': err instanceof Error ? err.toString() : err });
    else if (!doc) return res.json({ 'err': true, 'res': null, 'msg': 'document not found' });
    doc.status = 'datasets';
    return doc.save(function (err) {
      if (err) return res.json({ 'err': true, 'res': null, 'msg': err instanceof Error ? err.toString() : err });
      // Create logs
      else
        return DocumentsLogs.create(
          {
            document: doc._id,
            user: req.user._id,
            action: 'VALIDATE METADATA'
          },
          function (err, log) {
            if (err) return res.json({ 'err': true, 'res': null, 'msg': err instanceof Error ? err.toString() : err });
            doc.logs.push(log._id);
            return doc.save(function (err) {
              if (err)
                return res.json({ 'err': true, 'res': null, 'msg': err instanceof Error ? err.toString() : err });
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
    return res.status(401).send('Your current role does not grant you access to this part of the website');
  // Init transaction
  let transaction = DocumentsDatasets.findOne({ document: req.params.id });
  // Execute transaction
  return transaction.exec(function (err, datasets) {
    if (err) return res.json({ 'err': true, 'res': null, 'msg': err instanceof Error ? err.toString() : err });
    else if (!datasets) return res.json({ 'err': true, 'res': null, 'msg': 'datasets not found' });
    else return res.json({ 'err': false, 'res': datasets });
  });
});

/* POST validate datasets of document */
router.post('/:id/datasets/validate', function (req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccessRight(req.user))
    return res.status(401).send('Your current role does not grant you access to this part of the website');
  // Init transaction
  let transaction = Documents.findOne({ _id: req.params.id });
  // Execute transaction
  return transaction.exec(function (err, doc) {
    if (err) return res.json({ 'err': true, 'res': null, 'msg': err instanceof Error ? err.toString() : err });
    else if (!doc) return res.json({ 'err': true, 'res': null, 'msg': 'document not found' });
    else
      return DocumentsDatasetsController.checkValidation(doc.datasets, function (err, check) {
        if (err) return res.json({ 'err': true, 'res': null, 'msg': err instanceof Error ? err.toString() : err });
        else if (!AccountsManager.checkAccessRight(req.user, AccountsManager.roles.curator) && !check)
          return res.json({ 'err': true, 'res': null, 'msg': 'datasets not valid (at least one of them)' });
        doc.status = 'finish';
        return doc.save(function (err) {
          if (err) return res.json({ 'err': true, 'res': null, 'msg': err instanceof Error ? err.toString() : err });
          // Create logs
          else
            return DocumentsLogs.create(
              {
                document: doc._id,
                user: req.user._id,
                action: 'VALIDATE DATASETS'
              },
              function (err, log) {
                if (err)
                  return res.json({ 'err': true, 'res': null, 'msg': err instanceof Error ? err.toString() : err });
                doc.logs.push(log._id);
                return doc.save(function (err) {
                  if (err)
                    return res.json({ 'err': true, 'res': null, 'msg': err instanceof Error ? err.toString() : err });
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
    return res.status(401).send('Your current role does not grant you access to this part of the website');
  // Init transaction
  let transaction = Documents.findOne({ _id: req.params.id });
  // Execute transaction
  return transaction.exec(function (err, doc) {
    if (err) return res.json({ 'err': true, 'res': null, 'msg': err instanceof Error ? err.toString() : err });
    else if (!doc) return res.json({ 'err': true, 'res': null, 'msg': 'document not found' });
    doc.status = 'metadata';
    return doc.save(function (err) {
      if (err) return res.json({ 'err': true, 'res': null, 'msg': err instanceof Error ? err.toString() : err });
      // Create logs
      else
        return DocumentsLogs.create(
          {
            document: doc._id,
            user: req.user._id,
            action: 'BACK TO METADATA VALIDATION'
          },
          function (err, log) {
            if (err) return res.json({ 'err': true, 'res': null, 'msg': err instanceof Error ? err.toString() : err });
            doc.logs.push(log._id);
            return doc.save(function (err) {
              if (err)
                return res.json({ 'err': true, 'res': null, 'msg': err instanceof Error ? err.toString() : err });
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
    return res.status(401).send('Your current role does not grant you access to this part of the website');
  // Init transaction
  let transaction = Documents.findOne({ _id: req.params.id });
  // Execute transaction
  return transaction.exec(function (err, doc) {
    if (err) return res.json({ 'err': true, 'res': null, 'msg': err instanceof Error ? err.toString() : err });
    else if (!doc) return res.json({ 'err': true, 'res': null, 'msg': 'document not found' });
    doc.status = 'metadata';
    return doc.save(function (err) {
      if (err) return res.json({ 'err': true, 'res': null, 'msg': err instanceof Error ? err.toString() : err });
      // Create logs
      else
        return DocumentsLogs.create(
          {
            document: doc._id,
            user: req.user._id,
            action: 'REOPEN DOCUMENT'
          },
          function (err, log) {
            if (err) return res.json({ 'err': true, 'res': null, 'msg': err instanceof Error ? err.toString() : err });
            doc.logs.push(log._id);
            return doc.save(function (err) {
              if (err)
                return res.json({ 'err': true, 'res': null, 'msg': err instanceof Error ? err.toString() : err });
              else return res.json({ 'err': false, 'res': true });
            });
          }
        );
    });
  });
});

/* GET report document */
router.get('/:id/finish/report', function (req, res, next) {
  if (
    typeof req.user === 'undefined' ||
    !AccountsManager.checkAccessRight(req.user, AccountsManager.roles.annotator, AccountsManager.match.weight)
  )
    return res.status(401).send('Your current role does not grant you access to this part of the website');
  // Init transaction
  let dataTypes = req.app.get('dataTypes');
  let transaction = Documents.findOne({ _id: req.params.id })
    .populate('metadata')
    .populate('datasets')
    .populate('tei')
    .populate('pdf');
  // Execute transaction
  return transaction.exec(function (err, doc) {
    if (err) return res.json({ 'err': true, 'res': null, 'msg': err instanceof Error ? err.toString() : err });
    else if (!doc) return res.json({ 'err': true, 'res': null, 'msg': 'document not found' });
    else {
      return DocX.create(DocX.getData(doc, dataTypes), function (err, buffer) {
        if (err) return res.json({ 'err': true, 'res': null, 'msg': err instanceof Error ? err.toString() : err });
        res.writeHead(200, [
          ['Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
          ['Content-Disposition', 'attachment; filename=' + `${doc._id.toString()}-report.docx`]
        ]);
        res.end(buffer);
      });
    }
  });
});

/* GET report document */
router.get('/:id/report', function (req, res, next) {
  if (
    typeof req.user === 'undefined' ||
    !AccountsManager.checkAccessRight(req.user, AccountsManager.roles.standard_user, AccountsManager.match.weight)
  )
    return res.status(401).send('Your current role does not grant you access to this part of the website');
  // Init transaction
  let transaction = Documents.findOne({ _id: req.params.id })
    .populate('metadata')
    .populate('datasets')
    .populate('tei')
    .populate('pdf');
  // Execute transaction
  return transaction.exec(function (err, doc) {
    let sortedDatasets = DocumentsController.getSortedDatasets(doc, req.app.get('dataTypes'));
    if (err || !doc) return res.status(404).send('Document not found');
    else {
      let publicURL = conf.root + 'documents/' + req.params.id + '?documentToken=' + doc.token;
      return res.render(path.join('reports', 'report-1'), {
        publicURL: publicURL,
        conf: conf,
        document: doc,
        sortedDatasets: sortedDatasets,
        datasetsSummary: DocumentsDatasetsController.getDatasetsSummary(sortedDatasets.all, req.app.get('dataTypes')),
        bestPractices: DocumentsDatasetsController.getBestPractices(
          [].concat(sortedDatasets.protocols, sortedDatasets.datasets, sortedDatasets.codes, sortedDatasets.reagents),
          req.app.get('dataTypes')
        ),
        current_user: req.user
      });
    }
  });
});
/* GET files of document */
router.get('/:id/files', function (req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccessRight(req.user))
    return res.status(401).send('Your current role does not grant you access to this part of the website');
  // Init transaction
  let transaction = DocumentsFiles.find({ document: req.params.id });
  // Execute transaction
  return transaction.exec(function (err, file) {
    if (err) return res.json({ 'err': true, 'res': null, 'msg': err instanceof Error ? err.toString() : err });
    else if (!file) return res.json({ 'err': true, 'res': null, 'msg': 'file not found' });
    else return res.json({ 'err': false, 'res': file });
  });
});

module.exports = router;
