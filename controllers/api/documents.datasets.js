/*
 * @prettier
 */

'use strict';

const _ = require(`lodash`);

const DocumentsDatasets = require(`../../models/documents.datasets.js`);

const Params = require(`../../lib/params.js`);

let Self = {};

// Dataset Status
Self.status = {
  valid: `valid`,
  saved: `saved`
};

/**
 * Check validation of datasets
 * @param {object} opts.data - Options available
 * @param {string} opts.data.id - Datasets id
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: true if it can be validated OR false)
 * @returns {undefined} undefined
 */
Self.checkValidation = function (opts = {}, cb) {
  if (typeof _.get(opts, `data`) === `undefined`) return cb(new Error(`Missing required data: opts.data`));
  if (typeof _.get(opts, `data.id`) === `undefined`) return cb(new Error(`Missing required data: opts.data.id`));
  // Init transaction
  let transaction = DocumentsDatasets.findOne({ _id: opts.data.id });
  // Execute transaction
  return transaction.exec(function (err, datasets) {
    if (err) return cb(err);
    else if (!datasets) return cb(true);
    let result = true;
    for (let i = 0; i < datasets.current.length; i++) {
      if (datasets.current[i].status !== Self.status.valid) {
        result = false;
        break;
      }
    }
    return cb(null, result);
  });
};

/**
 * Merge datasetse
 * @param {object} opts - JSON containing all data
 * @param {string} opts.current - Current datasets
 * @param {string} opts.datasets - Datasets that should be merged
 * @returns {object} JSON containing all data
 */
Self.mergeDatasets = function (currents = [], datasets = []) {
  let result = [].concat(currents);
  for (let i = 0; i < datasets.length; i++) {
    let shouldMerge = currents.filter(function (item) {
      return item.sentences.filter(function (sentence) {
        return (
          datasets[i].filter(function (s) {
            return s.text === sentence.text;
          }).length > 0
        );
      });
    });
    if (shouldMerge) {
    } else {
      result.push(currents[i]);
    }
  }
};

/**
 * Check if a given dataset already exist in the collection
 * @param {object} opts - JSON containing all data
 * @param {string} opts.current - Current datasets
 * @param {string} opts.dataset - Dataset that should checked
 * @returns {object} JSON containing all data
 */
Self.datasetAlreadyExist = function (currents = [], dataset = {}, match) {
  return (
    currents.filter(function (item) {
      if (dataset.dataType === item.dataType && dataset.subType === item.subType) {
        return (
          item.sentences.filter(function (sentence) {
            return (
              dataset.sentences.filter(function (s) {
                return match(s.text, sentence.text);
              }).length > 0
            );
          }).length > 0
        );
      } else return false;
    }).length > 0
  );
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
 * @returns {object} JSON containing all data
 */
Self.createDataset = function (opts = {}) {
  let reuse = Params.convertToBoolean(opts.reuse);
  let kind = `unknow`;
  if (opts.dataType === `protocols` || (opts.dataType === `other` && opts.subType === `protocol`)) kind = `protocol`;
  else if (
    (opts.dataType === `other` && opts.subType === `code`) ||
    (opts.dataType === `code software` && opts.subType === `custom scripts` && !reuse)
  )
    kind = `code`;
  else if (
    (opts.dataType === `code software` && opts.subType === `custom scripts` && reuse) ||
    (opts.dataType === `code software` && opts.subType !== `custom scripts`)
  )
    kind = `software`;
  else if ((opts.dataType === `other` && opts.subType === `reagent`) || opts.dataType === `lab materials`)
    kind = `reagent`;
  else if (
    opts.dataType !== `other` &&
    opts.dataType !== `code software` &&
    opts.dataType !== `lab materials` &&
    opts.dataType !== `protocol`
  )
    kind = `dataset`;
  return {
    id: opts.id, // id
    dataInstanceId: opts.dataInstanceId, // dataInstance id
    kind: kind, // kind
    sentences: Array.isArray(opts.sentences) ? opts.sentences : [], // sentences
    name: opts.name ? opts.name : ``, // name
    reuse: reuse ? true : false, // dataset reuse
    qc: Params.convertToBoolean(opts.qc) ? true : false, // dataset qc
    representativeImage: Params.convertToBoolean(opts.representativeImage) ? true : false, // dataset representativeImage
    issues: typeof opts.issues === `object` ? opts.issues : null, // dataset issues
    flagged: Params.convertToBoolean(opts.flagged) ? true : false, // dataset flagged
    cert: opts.cert ? opts.cert : 0, // cert value (between 0 and 1)
    dataType: opts.dataType ? opts.dataType : ``, // dataType
    subType: opts.subType ? opts.subType : ``, //  subType
    source: opts.source ? opts.source : ``, // source
    version: opts.version ? opts.version : ``, // version
    DOI: opts.DOI ? opts.DOI : ``, // DOI
    PID: opts.PID ? opts.PID : ``, // PID
    RRID: opts.RRID ? opts.RRID : ``, // RRID
    catalogNumber: opts.catalogNumber ? opts.catalogNumber : ``, // catalog number
    suggestedEntity: opts.suggestedEntity ? opts.suggestedEntity : ``, // suggested entity
    suggestedURL: opts.suggestedURL ? opts.suggestedURL : ``, // suggested URL
    suggestedRRID: opts.suggestedRRID ? opts.suggestedRRID : ``, // suggested RRID
    comments: opts.comments ? opts.comments : ``, // comments
    status:
      opts.dataType && opts.name && (opts.DOI || opts.source || opts.comments) ? Self.status.valid : Self.status.saved // status of the dataset
  };
};

/**
 * Get summary of datasets
 * @param {array} datasetsInfos - Array of datasetsInfos
 * @param {object} dataTypes - All dataTypes
 * @returns {array} summary
 */
Self.getSummary = function (datasetsInfos = [], dataTypes = {}) {
  let data = {};
  let result = [];
  datasetsInfos.reduce(function (acc, item) {
    if (typeof acc[item.dataType] === `undefined`)
      acc[item.dataType] = {
        key: item.dataType,
        count: 0,
        list: [],
        type: Self.getDataTypeInfos({ dataType: item.dataType }, dataTypes),
        subTypes: {}
      };
    acc[item.dataType].count++;
    acc[item.dataType].list.push(item);
    if (item.subType) {
      if (typeof acc[item.dataType].subTypes[item.subType] === `undefined`)
        acc[item.dataType].subTypes[item.subType] = { key: item.subType, type: item.type, count: 0 };
      acc[item.dataType].subTypes[item.subType].count++;
    }
    return acc;
  }, data);
  for (let key in data) {
    let item = {
      key: data[key].key,
      count: data[key].count,
      type: data[key].type,
      subTypes: [],
      list: data[key].list
    };
    for (let k in data[key].subTypes) {
      item.subTypes.push(data[key].subTypes[k]);
    }
    result.push(item);
  }
  return result;
};

module.exports = Self;
