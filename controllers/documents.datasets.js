/*
 * @prettier
 */

'use strict';

const DocumentsDatasets = require('../models/documents.datasets.js');

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
    highlight: opts.highlight ? opts.highlight : false, // dataset highlight
    notification: opts.notification, // dataset notification
    cert: opts.cert, // cert value (between 0 and 1)
    dataType: opts.dataType, // dataType
    subType: opts.subType, //  subType
    description: opts.description, // description
    bestDataFormatForSharing: opts.bestDataFormatForSharing, // best data format for sharing
    bestPracticeForIndicatingReUseOfExistingData: opts.bestPracticeForIndicatingReUseOfExistingData, // best practice for indicating re-use of existing data
    mostSuitableRepositories: opts.mostSuitableRepositories, // most suitable repositories
    DOI: opts.DOI, // DOI
    name: opts.name, // name
    comments: opts.comments, // comments
    text: opts.text, // text of sentence
    status: opts.dataType && opts.name && (opts.DOI || opts.comments) ? 'valid' : 'saved' // text of sentence
  };
};

module.exports = Self;
