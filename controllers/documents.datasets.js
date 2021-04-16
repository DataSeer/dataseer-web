/*
 * @prettier
 */

'use strict';

const DocumentsDatasets = require('../models/documents.datasets.js');

const DocumentsController = require('../controllers/documents.js');

let Self = {};

/**
 * Check validation of datasets
 * @param {mongoose.Schema.Types.ObjectId} id - Datasets id
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: true if it can be validated OR false)
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
 * @param {object} opts - JSON containing all data
 * @param {string} opts.datasetsId - Datasets id
 * @param {string} opts.dataset.id - Dataset id
 * @param {string} opts.dataset.sentenceId - Dataset sentence id
 * @param {boolean} opts.dataset.reuse - Dataset reuse property
 * @param {string} opts.dataset.cert - Dataset cert value (between 0 and 1)
 * @param {string} opts.dataset.dataType - Dataset dataType
 * @param {string} opts.dataset.subType - Dataset subType
 * @param {string} opts.dataset.description - Dataset description
 * @param {string} opts.dataset.bestDataFormatForSharing - Dataset best data format for sharing
 * @param {string} opts.dataset.mostSuitableRepositories - Dataset most suitable repositories
 * @param {string} opts.dataset.DOI - Dataset DOI
 * @param {string} opts.dataset.name - Dataset name
 * @param {string} opts.dataset.comments - Dataset comments
 * @param {string} opts.dataset.text - Dataset text of sentence
 * @param {function} cb - Callback function(err, res) (err: error process OR null)
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
            reuse: opts.dataset.reuse ? opts.dataset.reuse : false,
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
 * @param {object} opts - JSON containing all data
 * @param {string} opts.datasetsId - Datasets id
 * @param {string} opts.dataset.id - Dataset id
 * @param {string} opts.dataset.sentenceId - Dataset sentence id
 * @param {boolean} opts.dataset.reuse - Dataset reuse property
 * @param {string} opts.dataset.cert - Dataset cert value (between 0 and 1)
 * @param {string} opts.dataset.dataType - Dataset dataType
 * @param {string} opts.dataset.subType - Dataset subType
 * @param {string} opts.dataset.description - Dataset description
 * @param {string} opts.dataset.bestDataFormatForSharing - Dataset best data format for sharing
 * @param {string} opts.dataset.mostSuitableRepositories - Dataset most suitable repositories
 * @param {string} opts.dataset.DOI - Dataset DOI
 * @param {string} opts.dataset.name - Dataset name
 * @param {string} opts.dataset.comments - Dataset comments
 * @param {string} opts.dataset.text - Dataset text of sentence
 * @param {function} cb - Callback function(err, res) (err: error process OR null)
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
        return DocumentsController.updateDatasetInTEI(
          {
            documentId: datasets.document,
            dataset: {
              sentenceId: opts.dataset.sentenceId,
              id: opts.dataset.id,
              reuse: opts.dataset.reuse ? opts.dataset.reuse : false,
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
 * Delete dataset
 * @param {object} opts - JSON containing all data
 * @param {string} opts.datasetsId - Datasets id
 * @param {string} opts.dataset.id - Dataset id
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
 * @param {object} opts - JSON containing all data
 * @param {string} opts.datasetsId - Datasets id
 * @param {string} opts.dataset.id - Dataset id
 * @param {string} opts.dataset.sentenceId - Dataset sentence id
 * @param {function} cb - Callback function(err, res) (err: error process OR null)
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
 * @param {object} opts - JSON containing all data
 * @param {string} opts.datasetsId - Datasets id
 * @param {string} opts.dataset.id - Dataset id
 * @param {string} opts.dataset.sentenceId - Dataset sentence id
 * @param {function} cb - Callback function(err, res) (err: error process OR null)
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
 * @param {object} opts - JSON containing all data
 * @param {string} opts.id - Dataset id
 * @param {string} opts.sentenceId - Dataset sentence id
 * @param {string} opts.reuse - Dataset reuse
 * @param {string} opts.notification - Dataset notification
 * @param {string} opts.cert - Dataset cert value (between 0 and 1)
 * @param {string} opts.dataType - Dataset dataType
 * @param {string} opts.subType - Dataset subType
 * @param {string} opts.description - Dataset description
 * @param {string} opts.bestDataFormatForSharing - Dataset best data format for sharing
 * @param {string} opts.mostSuitableRepositories - Dataset most suitable repositories
 * @param {string} opts.DOI - Dataset DOI
 * @param {string} opts.name - Dataset name
 * @param {string} opts.comments - Dataset comments
 * @param {string} opts.text - Dataset text of sentence
 * @returns {object} opts - JSON containing all data
 */
Self.createDataset = function (opts = {}) {
  return {
    id: opts.id, // id
    sentenceId: opts.sentenceId, // sentence id
    reuse: opts.reuse ? opts.reuse : false, // dataset reuse
    notification: opts.notification, // dataset notification
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
    status: opts.status === 'valid' && opts.name && (opts.DOI || opts.comments) ? 'valid' : 'saved' // text of sentence
  };
};

module.exports = Self;
