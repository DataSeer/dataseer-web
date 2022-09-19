/*
 * @prettier
 */

'use strict';

const _ = require(`lodash`);

const conf = require(`../../conf/dataTypes.json`);

const DocumentsDatasets = require(`../../models/documents.datasets.js`);

const Params = require(`../../lib/params.js`);

let Self = {};

// Dataset Status
Self.status = {
  valid: `valid`,
  saved: `saved`
};

// Dataset Status
Self.dataTypes = {};

/**
 * Refresh dataTypes
 * @param {object} dataTypes - JSON containing all dataTypes
 * @returns {object} Refreshed dataTypes
 */
Self.refreshDataTypes = function (dataTypes = {}) {
  Self.dataTypes = Object.assign({}, dataTypes);
  return Self.dataTypes;
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
 * Fix dataset JSON object
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
 * @param {object} dataTypes - JSON containing all dataTypes & subTypes
 * @returns {object} JSON containing all data
 */
Self.fixDataset = function (opts = {}) {
  let dataset = Object.assign({}, opts);
  let dataTypeIsEmpty =
    typeof dataset.dataType !== `string` ||
    !dataset.dataType ||
    typeof Self.dataTypes.metadata[dataset.dataType] !== `object`;
  let subTypeIsEmpty =
    typeof dataset.subType !== `string` ||
    !dataset.subType ||
    typeof Self.dataTypes.metadata[dataset.subType] !== `object`;
  // Case there is no datatype & no subtype
  if (dataTypeIsEmpty) {
    // Case subtype is empty
    if (subTypeIsEmpty) {
      dataset.dataType = conf.defaultDataType;
      dataset.subType = conf.defaultSubType;
      dataset.cert = `0`;
      return dataset;
    }
    // Case there is no datatype but a subtype
    dataset.dataType = dataset.subType;
    dataset.subType = ``;
    subTypeIsEmpty = true;
    dataTypeIsEmpty = false;
  }
  // Check datatype & subtype
  let dataTypeExist = Array.isArray(Self.dataTypes.dataTypes[dataset.dataType]);
  let subTypeExist = !subTypeIsEmpty && typeof Self.dataTypes.subTypes[dataset.subType] === `string`;
  // Case there is a correct datatype
  if (dataTypeExist) {
    if (subTypeIsEmpty) return dataset;
    if (!subTypeExist) dataset.subType = ``;
    return dataset;
  }
  // Case there is a correct subtype
  if (subTypeExist) {
    dataset.dataType = Self.dataTypes.subTypes[dataset.subType];
    return dataset;
  }
  // Case there is an incorrect datatype & subtype
  let dataTypeIsSubtype = typeof Self.dataTypes.subTypes[dataset.dataType] === `string`;
  // Case datatype is a subtype
  if (dataTypeIsSubtype) {
    dataset.subType = dataset.dataType;
    dataset.dataType = Self.dataTypes.subTypes[dataset.dataType];
    return dataset;
  }
  // Default case, return default dataset
  dataset.dataType = conf.defaultDataType;
  dataset.subType = conf.defaultSubType;
  dataset.cert = `0`;
  return dataset;
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
 * @param {object} dataTypes - JSON containing all dataTypes & subTypes
 * @returns {object} JSON containing all data
 */
Self.createDataset = function (opts = {}) {
  let reuse = Params.convertToBoolean(opts.reuse);
  let kind = `unknow`;
  let dataset = Self.fixDataset(opts);
  if (dataset.dataType === `protocol` || (dataset.dataType === `other` && dataset.subType === `protocol`))
    kind = `protocol`;
  else if (
    (dataset.dataType === `other` && dataset.subType === `code`) ||
    (dataset.dataType === `code software` && dataset.subType === `custom scripts` && !reuse)
  )
    kind = `code`;
  else if (
    (dataset.dataType === `code software` && dataset.subType === `custom scripts` && reuse) ||
    (dataset.dataType === `code software` && dataset.subType !== `custom scripts`)
  )
    kind = `software`;
  else if ((dataset.dataType === `other` && dataset.subType === `reagent`) || dataset.dataType === `lab materials`)
    kind = `reagent`;
  else if (
    dataset.dataType !== `other` &&
    dataset.dataType !== `code software` &&
    dataset.dataType !== `lab materials` &&
    dataset.dataType !== `protocol`
  )
    kind = `dataset`;
  return {
    id: dataset.id, // id
    dataInstanceId: dataset.dataInstanceId, // dataInstance id
    kind: kind, // kind
    sentences: Array.isArray(dataset.sentences) ? dataset.sentences : [], // sentences
    name: dataset.name ? dataset.name : ``, // name
    reuse: reuse ? true : false, // dataset reuse
    qc: Params.convertToBoolean(dataset.qc) ? true : false, // dataset qc
    representativeImage: Params.convertToBoolean(dataset.representativeImage) ? true : false, // dataset representativeImage
    issues: typeof dataset.issues === `object` ? dataset.issues : null, // dataset issues
    flagged: Params.convertToBoolean(dataset.flagged) ? true : false, // dataset flagged
    cert: dataset.cert ? dataset.cert : 0, // cert value (between 0 and 1)
    dataType: dataset.dataType ? dataset.dataType : ``, // dataType
    subType: dataset.subType ? dataset.subType : ``, //  subType
    source: dataset.source ? dataset.source : ``, // source
    version: dataset.version ? dataset.version : ``, // version
    DOI: dataset.DOI ? dataset.DOI : ``, // DOI
    URL: dataset.URL ? dataset.URL : ``, // URL
    PID: dataset.PID ? dataset.PID : ``, // PID
    RRID: dataset.RRID ? dataset.RRID : ``, // RRID
    catalogNumber: dataset.catalogNumber ? dataset.catalogNumber : ``, // catalog number
    suggestedEntity: dataset.suggestedEntity ? dataset.suggestedEntity : ``, // suggested entity
    suggestedURL: dataset.suggestedURL ? dataset.suggestedURL : ``, // suggested URL
    suggestedRRID: dataset.suggestedRRID ? dataset.suggestedRRID : ``, // suggested RRID
    comments: dataset.comments ? dataset.comments : ``, // comments
    status:
      dataset.dataType && dataset.name && (dataset.DOI || dataset.PID || dataset.source || dataset.comments)
        ? Self.status.valid
        : Self.status.saved // status of the dataset
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
