/*
 * @prettier
 */

'use strict';

const DocumentsDatasets = require('../models/documents.datasets.js');

const cheerio = require('cheerio');

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
 * @param {string} opts.dataInstance - DataInstance id
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
 * @returns {object} opts - JSON containing all data
 */
Self.createDataset = function (opts = {}) {
  return {
    id: opts.id, // id
    dataInstanceId: opts.dataInstanceId, // dataInstance id
    sentences: Array.isArray(opts.sentences) ? opts.sentences : [], // sentences
    reuse: opts.reuse ? opts.reuse : false, // dataset reuse
    highlight: opts.highlight ? opts.highlight : false, // dataset highlight
    notification: opts.notification ? opts.notification : '', // dataset notification
    cert: opts.cert ? opts.cert : 0, // cert value (between 0 and 1)
    dataType: opts.dataType ? opts.dataType : '', // dataType
    subType: opts.subType ? opts.subType : '', //  subType
    description: opts.description ? opts.description : '', // description
    bestDataFormatForSharing: opts.bestDataFormatForSharing ? opts.bestDataFormatForSharing : '', // best data format for sharing
    bestPracticeForIndicatingReUseOfExistingData: opts.bestPracticeForIndicatingReUseOfExistingData
      ? opts.bestPracticeForIndicatingReUseOfExistingData
      : '', // best practice for indicating re-use of existing data
    mostSuitableRepositories: opts.mostSuitableRepositories ? opts.mostSuitableRepositories : '', // most suitable repositories
    DOI: opts.DOI ? opts.DOI : '', // DOI
    name: opts.name ? opts.name : '', // name
    comments: opts.comments ? opts.comments : '', // comments
    status: opts.dataType && opts.name && (opts.DOI || opts.comments) ? 'valid' : 'saved' // text of sentence
  };
};

/**
 * Get Infos about dataType (or SubType) of datasets
 * @param {object} dataset - A dataset
 * @param {object} dataTypes - dataTypes object
 * @param {object} opts - options
 * @param {boolean} opts.convertHTML - options
 * @returns {object} sorted datasets
 */
Self.getDataTypeInfos = function (dataset = {}, dataTypes = {}, opts = {}) {
  let hasDataType = !!dataset.dataType;
  let hasSubType = !!dataset.subType;
  let dataTypeIsKnown =
    hasDataType && dataTypes.metadata[dataset.dataType] && dataTypes.metadata[dataset.dataType].label;
  let subTypeIsKnown = hasSubType && dataTypes.metadata[dataset.subType] && dataTypes.metadata[dataset.subType].label;
  let isCustom = !(dataTypeIsKnown || subTypeIsKnown);
  let type = hasSubType ? dataset.subType : dataset.dataType;
  let dataType = '';
  let subType = '';
  // case there is a dataType
  if (hasDataType) dataType = dataTypeIsKnown ? dataTypes.metadata[dataset.dataType].label : dataset.dataType;
  // case there is a subType
  if (hasSubType) subType = subTypeIsKnown ? dataTypes.metadata[dataset.subType].label : dataset.subType;
  // build label
  let label = subType ? `${dataType}: ${subType}` : dataType;
  let description =
    dataTypes.metadata[type] && dataTypes.metadata[type].description
      ? dataTypes.metadata[type].description
      : dataset.description;
  let bestDataFormatForSharing =
    dataTypes.metadata[type] && dataTypes.metadata[type].bestDataFormatForSharing
      ? dataTypes.metadata[type].bestDataFormatForSharing
      : dataset.bestDataFormatForSharing;
  let bestPracticeForIndicatingReUseOfExistingData =
    dataTypes.metadata[type] && dataTypes.metadata[type].bestPracticeForIndicatingReUseOfExistingData
      ? dataTypes.metadata[type].bestPracticeForIndicatingReUseOfExistingData
      : dataset.bestPracticeForIndicatingReUseOfExistingData;
  // case reuse => pick bestPracticeForIndicatingReUseOfExistingData and not bestDataFormatForSharing
  // bestDataFormatForSharing = dataset.reuse ? bestPracticeForIndicatingReUseOfExistingData : bestDataFormatForSharing;
  let mostSuitableRepositories =
    dataTypes.metadata[type] &&
    dataTypes.metadata[type].mostSuitableRepositories &&
    dataTypes.metadata[type].mostSuitableRepositories.default &&
    dataTypes.metadata[type].mostSuitableRepositories.reuse
      ? dataset.reuse
        ? dataTypes.metadata[type].mostSuitableRepositories.reuse
        : dataTypes.metadata[type].mostSuitableRepositories.default
      : dataset.mostSuitableRepositories;
  let url = dataTypes.metadata[type] && dataTypes.metadata[type].url ? dataTypes.metadata[type].url : '';
  return {
    isCustom: isCustom,
    url: url,
    label: label,
    dataType: dataType,
    subType: subType,
    description: opts.convertHTML ? Self.getTextOfHtml(description) : description,
    bestDataFormatForSharing: opts.convertHTML
      ? Self.getTextOfHtml(bestDataFormatForSharing)
      : bestDataFormatForSharing,
    bestPracticeForIndicatingReUseOfExistingData: opts.convertHTML
      ? Self.getTextOfHtml(bestPracticeForIndicatingReUseOfExistingData)
      : bestPracticeForIndicatingReUseOfExistingData,
    mostSuitableRepositories: opts.convertHTML ? Self.getTextOfHtml(mostSuitableRepositories) : mostSuitableRepositories
  };
};

/**
 * Get bestPractices of datasets
 * @param {array} datasets - Array of datasets
 * @param {object} dataTypes - dataTypes object
 * @param {object} opts - options
 * @param {boolean} opts.convertHTML - options
 * @returns {object} bestPractices
 */
Self.getBestPractices = function (datasets = [], dataTypes = {}, opts = {}) {
  return datasets.reduce(
    function (acc, item) {
      let infos = Self.getDataTypeInfos(item, dataTypes, opts);
      if (typeof acc.key[infos.label] === 'undefined') {
        acc.key[infos.label] = true;
        acc.data.push(infos);
      }
      return acc;
    },
    { key: {}, data: [] }
  );
};

/**
 * Get summary of datasets
 * @param {array} datasetsInfos - Array of datasetsInfos
 * @returns {array} summary
 */
Self.getDatasetsSummary = function (datasetsInfos = []) {
  let datatypes = {};
  let result = [];
  datasetsInfos.reduce(function (acc, item) {
    if (typeof acc[item.dataType] === 'undefined')
      acc[item.dataType] = { key: item.dataType, label: item.type.dataType, count: 0, subTypes: {} };
    acc[item.dataType].count++;
    if (item.subType) {
      if (typeof acc[item.dataType].subTypes[item.subType] === 'undefined')
        acc[item.dataType].subTypes[item.subType] = { key: item.subType, label: item.type.subType, count: 0 };
      acc[item.dataType].subTypes[item.subType].count++;
    }
    return acc;
  }, datatypes);
  for (let key in datatypes) {
    let item = {
      key: datatypes[key].key,
      count: datatypes[key].count,
      label: datatypes[key].label,
      subTypes: []
    };
    for (let k in datatypes[key].subTypes) {
      item.subTypes.push(datatypes[key].subTypes[k]);
    }
    result.push(item);
  }
  return result;
};

/**
 * Get text of an HTML string
 * @param {string} htmlString - HTML string
 * @returns {string} text
 */
Self.getTextOfHtml = function (htmlString) {
  let $ = cheerio.load(htmlString);
  return `${$('p').text()}`;
};

module.exports = Self;
