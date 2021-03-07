/*
 * @prettier
 */

const DocumentsDatasets = require('../models/documents.datasets.js'),
  Accounts = require('../models/accounts.js'),
  Documents = require('../models/documents.js');

const DocumentsController = require('../controllers/documents.js');

const JWT = require('../lib/jwt.js');

let Self = {};

/**
 * Authenticate account with JWT (documentToken)
 * @param {Object} req req
 * @param {Object} res res
 * @param {Function} next
 * @returns {undefined} undefined
 */
Self.authenticate = function (req, res, next) {
  // If user is already authenticated with session, just go next
  if (req.user) return next();
  // Get token
  let token = req.query.documentToken;
  if (!token) return next();
  // Just try to authenticate. If it fail, just go next
  else
    return JWT.check(token, req.app.get('private.key'), {}, function (err, decoded) {
      if (err || !decoded) return next();
      return Accounts.findOne({ _id: decoded.accountId }, function (err, user) {
        if (err || !user) return next();
        return DocumentsDatasets.findOne({ document: decoded.documentId }, function (err, datasets) {
          if (err || !datasets) return next();
          if (datasets.document.toString() === decoded.documentId) {
            req.user = user; // Set user
            res.locals = { useDocumentToken: true };
          }
          return next();
        });
      });
    });
};

/**
 * Check validation of datasets
 * @param {mongoose.Schema.Types.ObjectId} id Datasets id
 * @param {Function} cb Callback function(err, res) (err: error process OR null, res: true if it can be validated OR false)
 * @returns {undefined} undefined
 */
Self.checkValidation = function (id, cb) {
  // Init transaction
  let transaction = DocumentsDatasets.findOne({ _id: id });
  // Execute transaction
  return transaction.exec(function (err, datasets) {
    if (err) return cb(err);
    else if (!datasets) return cb(true);
    let result = true;
    for (let i = 0; i < datasets.current.length; i++) {
      if (datasets.current[i].status !== 'valid') {
        result = false;
        break;
      }
    }
    return cb(null, result);
  });
};

/**
 * Create new dataset
 * @param {Object} opts JSON containing all data
 * @param {String} opts.datasetsId Datasets id
 * @param {String} opts.dataset.id Datset id
 * @param {String} opts.dataset.sentenceId Datset sentence id
 * @param {String} opts.dataset.cert Datset cert value (between 0 and 1)
 * @param {String} opts.dataset.dataType Datset dataType
 * @param {String} opts.dataset.subType Datset subType
 * @param {String} opts.dataset.description Datset description
 * @param {String} opts.dataset.bestDataFormatForSharing Datset best data format for sharing
 * @param {String} opts.dataset.mostSuitableRepositories Datset most suitable repositories
 * @param {String} opts.dataset.DOI Datset DOI
 * @param {String} opts.dataset.name Datset name
 * @param {String} opts.dataset.comments Datset comments
 * @param {String} opts.dataset.text Datset text of sentence
 * @param {Function} cb Callback function(err, res) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.newDataset = function (opts = {}, cb) {
  // If there is not enough data to create new dataset
  if (!opts.dataset || !opts.dataset.id) return cb(new Error('Not enough data'));
  // Init transaction
  let transaction = DocumentsDatasets.findOne({ _id: opts.datasetsId });
  // Execute transaction
  return transaction.exec(function (err, datasets) {
    if (err) return cb(err);
    else if (!datasets) return cb(new Error('Datasets not found'));
    // Check dataset with opts.id already exist
    for (let i = 0; i < datasets.current.length; i++) {
      if (datasets.current[i].id === opts.dataset.id) {
        return cb(new Error('Datasets id already exist'));
      }
    }
    // add new dataset
    datasets.current.push(Self.createDataset(opts.dataset));
    return datasets.save(function () {
      if (err) return cb(err);
      return DocumentsController.addDatasetInTEI(
        {
          documentId: datasets.document,
          dataset: {
            sentenceId: opts.dataset.sentenceId,
            id: opts.dataset.id,
            type: opts.dataset.subType ? opts.dataset.dataType + ':' + opts.dataset.subType : opts.dataset.dataType,
            cert: opts.dataset.cert
          }
        },
        function (err, res) {
          if (err) return cb(err);
          return cb(null);
        }
      );
    });
  });
};

/**
 * Update dataset
 * @param {Object} opts JSON containing all data
 * @param {String} opts.datasetsId Datasets id
 * @param {String} opts.dataset.id Datset id
 * @param {String} opts.dataset.sentenceId Datset sentence id
 * @param {String} opts.dataset.cert Datset cert value (between 0 and 1)
 * @param {String} opts.dataset.dataType Datset dataType
 * @param {String} opts.dataset.subType Datset subType
 * @param {String} opts.dataset.description Datset description
 * @param {String} opts.dataset.bestDataFormatForSharing Datset best data format for sharing
 * @param {String} opts.dataset.mostSuitableRepositories Datset most suitable repositories
 * @param {String} opts.dataset.DOI Datset DOI
 * @param {String} opts.dataset.name Datset name
 * @param {String} opts.dataset.comments Datset comments
 * @param {String} opts.dataset.text Datset text of sentence
 * @param {Function} cb Callback function(err, res) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.updateDataset = function (opts = {}, cb) {
  // If there is not enough data to create new dataset
  if (!opts.dataset || !opts.dataset.id) return cb(new Error('Not enough data'));
  // Init transaction
  let transaction = DocumentsDatasets.findOne({ _id: opts.datasetsId });
  // Execute transaction
  return transaction.exec(function (err, datasets) {
    if (err) return cb(err);
    else if (!datasets) return cb(new Error('Datasets not found'));
    // Check dataset with opts.id already exist
    let updated = false;
    for (let i = 0; i < datasets.current.length; i++) {
      // update dataset
      if (datasets.current[i].id === opts.dataset.id) {
        updated = true;
        datasets.current[i] = Self.createDataset(opts.dataset);
      }
    }
    if (!updated) return cb(new Error('Dataset not updated'));
    else
      return datasets.save(function (err, res) {
        if (err) return cb(err);
        return cb(null);
      });
  });
};

/**
 * Delete dataset
 * @param {Object} opts JSON containing all data
 * @param {String} opts.datasetsId Datasets id
 * @param {String} opts.dataset.id Datset id
 * @returns {undefined} undefined
 */
Self.deleteDataset = function (opts = {}, cb) {
  // If there is not enough data to create new dataset
  if (!opts.dataset || !opts.dataset.id) return cb(new Error('Not enough data'));
  // Init transaction
  let transaction = DocumentsDatasets.findOne({ _id: opts.datasetsId });
  // Execute transaction
  return transaction.exec(function (err, datasets) {
    if (err) return cb(err);
    else if (!datasets) return cb(new Error('Datasets not found'));
    // Check dataset with opts.id already exist
    let deleted = false,
      sentenceId;
    for (let i = 0; i < datasets.current.length; i++) {
      // update dataset
      if (datasets.current[i].id === opts.dataset.id) {
        datasets.deleted.push(datasets.current.splice(i, 1)[0]);
        sentenceId = datasets.deleted[datasets.deleted.length - 1].sentenceId;
        deleted = true;
      }
    }
    if (!deleted || !sentenceId) return cb(new Error('Dataset not found'));
    else
      return datasets.save(function () {
        if (err) return cb(err);
        return DocumentsController.deleteDatasetInTEI(
          {
            documentId: datasets.document,
            dataset: { sentenceId: sentenceId }
          },
          function (err, res) {
            if (err) return cb(err);
            return cb(null);
          }
        );
      });
  });
};

/**
 * Create new corresp
 * @param {Object} opts JSON containing all data
 * @param {String} opts.datasetsId Datasets id
 * @param {String} opts.dataset.id Datset id
 * @param {String} opts.dataset.sentenceId Datset sentence id
 * @param {Function} cb Callback function(err, res) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.newCorresp = function (opts = {}, cb) {
  // If there is not enough data to create new dataset
  if (!opts.dataset || !opts.dataset.id) return cb(new Error('Not enough data'));
  // Init transaction
  let transaction = DocumentsDatasets.findOne({ _id: opts.datasetsId });
  // Execute transaction
  return transaction.exec(function (err, datasets) {
    if (err) return cb(err);
    else if (!datasets) return cb(new Error('Datasets not found'));
    return DocumentsController.addCorrespInTEI(
      {
        documentId: datasets.document,
        dataset: {
          sentenceId: opts.dataset.sentenceId,
          id: opts.dataset.id
        }
      },
      function (err, res) {
        if (err) return cb(err);
        return cb(null);
      }
    );
  });
};

/**
 * Delete corresp
 * @param {Object} opts JSON containing all data
 * @param {String} opts.datasetsId Datasets id
 * @param {String} opts.dataset.id Datset id
 * @param {String} opts.dataset.sentenceId Datset sentence id
 * @param {Function} cb Callback function(err, res) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.deleteCorresp = function (opts = {}, cb) {
  // If there is not enough data to create new dataset
  if (!opts.dataset || !opts.dataset.id) return cb(new Error('Not enough data'));
  // Init transaction
  let transaction = DocumentsDatasets.findOne({ _id: opts.datasetsId });
  // Execute transaction
  return transaction.exec(function (err, datasets) {
    if (err) return cb(err);
    else if (!datasets) return cb(new Error('Datasets not found'));
    return DocumentsController.deleteCorrespInTEI(
      {
        documentId: datasets.document,
        dataset: {
          sentenceId: opts.dataset.sentenceId,
          id: opts.dataset.id
        }
      },
      function (err, res) {
        if (err) return cb(err);
        return cb(null);
      }
    );
  });
};

/**
 * Create new dataset JSON object
 * @param {Object} opts JSON containing all data
 * @param {String} opts.dataset.id Datset id
 * @param {String} opts.dataset.sentenceId Datset sentence id
 * @param {String} opts.dataset.cert Datset cert value (between 0 and 1)
 * @param {String} opts.dataset.dataType Datset dataType
 * @param {String} opts.dataset.subType Datset subType
 * @param {String} opts.dataset.description Datset description
 * @param {String} opts.dataset.bestDataFormatForSharing Datset best data format for sharing
 * @param {String} opts.dataset.mostSuitableRepositories Datset most suitable repositories
 * @param {String} opts.dataset.DOI Datset DOI
 * @param {String} opts.dataset.name Datset name
 * @param {String} opts.dataset.comments Datset comments
 * @param {String} opts.dataset.text Datset text of sentence
 * @returns {Object} opts JSON containing all data
 */
Self.createDataset = function (opts = {}) {
  return {
    id: opts.id, // id
    sentenceId: opts.sentenceId, // sentence id
    cert: opts.cert, // cert value (between 0 and 1)
    dataType: opts.dataType, // dataType
    subType: opts.subType, //  subType
    description: opts.description, // description
    bestDataFormatForSharing: opts.bestDataFormatForSharing, // best data format for sharing
    mostSuitableRepositories: opts.mostSuitableRepositories, // most suitable repositories
    DOI: opts.DOI, // DOI
    name: opts.name, // name
    comments: opts.comments, // comments
    text: opts.text, // text of sentence
    status: 'saved' // text of sentence
  };
};

module.exports = Self;
