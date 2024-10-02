/*
 * @prettier
 */

'use strict';

const conf = require(`../conf/dataTypes.json`);

const Params = require(`./params.js`);
const { extractIdentifiers } = require(`./krt.js`);
const Software = require(`./software.js`);

const RULES = require(`../resources/rules/rules.js`);
const availableRules = require(`../resources/rules/rules.json`);

let Self = {};

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
 * Check if a given dataObject already exist in the collection
 * @param {array} list - Current datasets
 * @param {string} dataObject - dataObject that should checked
 * @param {function} match - matching function
 * @returns {boolean} Return true if the dataObject already exist, else false
 */
Self.dataObjectsAlreadyExist = function (list = [], dataObject = {}, match) {
  return (
    list.filter(function (item) {
      if (dataObject.dataType === item.dataType && dataObject.subType === item.subType) {
        return (
          item.sentences.filter(function (sentence) {
            return (
              dataObject.sentences.filter(function (s) {
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
 * Fix dataObject JSON object
 * @param {object} opts - JSON containing all data
 * @param {object} dataTypes - JSON containing all dataTypes & subTypes
 * @returns {object} JSON containing all data
 */
Self.fix = function (opts = {}) {
  let dataObject = JSON.parse(JSON.stringify(opts));
  let dataTypeIsEmpty =
    typeof dataObject.dataType !== `string` ||
    !dataObject.dataType ||
    typeof Self.dataTypes.metadata[dataObject.dataType] !== `object`;
  let subTypeIsEmpty =
    typeof dataObject.subType !== `string` ||
    !dataObject.subType ||
    typeof Self.dataTypes.metadata[dataObject.subType] !== `object`;
  // Case there is no datatype & no subtype
  if (dataTypeIsEmpty) {
    // Case subtype is empty
    if (subTypeIsEmpty) {
      dataObject.dataType = conf.defaultDataType;
      dataObject.subType = conf.defaultSubType;
      dataObject.cert = `0`;
      return dataObject;
    }
    // Case there is no datatype but a subtype
    dataObject.dataType = dataObject.subType;
    dataObject.subType = ``;
    subTypeIsEmpty = true;
    dataTypeIsEmpty = false;
  }
  // Check datatype & subtype
  let dataTypeExist = Array.isArray(Self.dataTypes.dataTypes[dataObject.dataType]);
  let subTypeExist = !subTypeIsEmpty && typeof Self.dataTypes.subTypes[dataObject.subType] === `string`;
  // Case there is a correct datatype
  if (dataTypeExist) {
    if (subTypeIsEmpty) return dataObject;
    if (!subTypeExist) dataObject.subType = ``;
    return dataObject;
  }
  // Case there is a correct subtype
  if (subTypeExist) {
    dataObject.dataType = Self.dataTypes.subTypes[dataObject.subType];
    return dataObject;
  }
  // Case there is an incorrect datatype & subtype
  let dataTypeIsSubtype = typeof Self.dataTypes.subTypes[dataObject.dataType] === `string`;
  // Case datatype is a subtype
  if (dataTypeIsSubtype) {
    dataObject.subType = dataObject.dataType;
    dataObject.dataType = Self.dataTypes.subTypes[dataObject.dataType];
    return dataObject;
  }
  // Default case, return default dataObject
  dataObject.dataType = conf.defaultDataType;
  dataObject.subType = conf.defaultSubType;
  dataObject.cert = `0`;
  return dataObject;
};

/**
 * Create new dataObject JSON object
 * @param {object} opts - JSON containing all data
 * @param {boolean} autoPopulate - AutoPopulate properties based on text sentences
 * @returns {object} JSON containing all data
 */
Self.create = function (opts = {}, autoPopulate = false) {
  let reuse = Params.convertToBoolean(opts.reuse);
  let kind = `unknow`;
  let dataObject = Self.fix(opts);
  if (dataObject.dataType === `protocol` || (dataObject.dataType === `other` && dataObject.subType === `protocol`))
    kind = `protocol`;
  else if (
    (dataObject.dataType === `other` && dataObject.subType === `code` && !reuse) ||
    (dataObject.dataType === `code software` && !reuse)
  )
    kind = `code`;
  else if (
    (dataObject.dataType === `other` && dataObject.subType === `code` && reuse) ||
    (dataObject.dataType === `code software` && reuse)
  )
    kind = `software`;
  else if (
    (dataObject.dataType === `other` && dataObject.subType === `reagent`) ||
    dataObject.dataType === `lab materials`
  )
    kind = `reagent`;
  else if (
    (dataObject.dataType === `other` && dataObject.subType === ``) ||
    (dataObject.dataType !== `code software` &&
      dataObject.dataType !== `lab materials` &&
      dataObject.dataType !== `protocol`)
  )
    kind = `dataset`;
  if (dataObject.sentences.length > 0) {
    let text = dataObject.sentences
      .map(function (item) {
        return item.text;
      })
      .join(`\n`);
    if (autoPopulate) {
      let { URL, DOI, RRID, catalogNumber, CAS, accessionNumber, PID } = extractIdentifiers(text);
      if (!dataObject.URL) dataObject.URL = URL.join(`; `);
      if (!dataObject.DOI) dataObject.DOI = DOI.join(`; `);
      if (!dataObject.RRID) dataObject.RRID = RRID.join(`; `);
      // if (!dataObject.catalogNumber)
      //   dataObject.catalogNumber = [].concat(catalogNumber, CAS, accessionNumber).flat().join(` ;`);
      // if (!dataObject.PID) dataObject.PID = PID.join(`; `);
    }
  }
  let result = {
    _id: dataObject._id, // dataObject id
    document: dataObject.document, // document id
    dataInstanceId: dataObject.dataInstanceId, // dataInstance id
    kind: kind, // kind
    headSentence: dataObject.headSentence ? dataObject.headSentence : ``, // dataObject head sentence content
    sentences: Array.isArray(dataObject.sentences) ? dataObject.sentences : [], // sentences
    name: dataObject.name ? dataObject.name : ``, // name
    reuse: reuse ? true : false, // dataObject reuse
    optional: Params.convertToBoolean(dataObject.optional) ? true : false, // dataObject optional
    hasReadMe: Params.convertToBoolean(dataObject.hasReadMe) ? true : false, // dataObject hasReadMe
    qc: Params.convertToBoolean(dataObject.qc) ? true : false, // dataObject qc
    representativeImage: Params.convertToBoolean(dataObject.representativeImage) ? true : false, // dataObject representativeImage
    issues: typeof dataObject.issues === `object` ? dataObject.issues : null, // dataObject issues
    flagged: Params.convertToBoolean(dataObject.flagged) ? true : false, // dataObject flagged
    cert: dataObject.cert ? dataObject.cert : 0, // cert value (between 0 and 1)
    dataType: dataObject.dataType ? dataObject.dataType : ``, // dataType
    subType: dataObject.subType ? dataObject.subType : ``, //  subType
    source: dataObject.source ? dataObject.source : ``, // source
    version: dataObject.version ? dataObject.version : ``, // version
    DOI: dataObject.DOI ? dataObject.DOI : ``, // DOI
    URL: dataObject.URL ? dataObject.URL : ``, // URL
    PID: dataObject.PID ? dataObject.PID : ``, // PID
    RRID: dataObject.RRID ? dataObject.RRID : ``, // RRID
    associatedFigureOrTable: dataObject.associatedFigureOrTable ? dataObject.associatedFigureOrTable : ``, // associated figure or table
    associatedReference: dataObject.associatedReference ? dataObject.associatedReference : ``, // associated reference
    catalogNumber: dataObject.catalogNumber ? dataObject.catalogNumber : ``, // catalog number
    suggestedEntity: dataObject.suggestedEntity ? dataObject.suggestedEntity : ``, // suggested entity
    suggestedURL: dataObject.suggestedURL ? dataObject.suggestedURL : ``, // suggested URL
    suggestedRRID: dataObject.suggestedRRID ? dataObject.suggestedRRID : ``, // suggested RRID
    comments: dataObject.comments ? dataObject.comments : ``, // comments
    rule: `unknow`,
    status: `unknow`,
    actionRequired: `unknow`,
    index: dataObject.index,
    rules: {}
  };
  for (let key in availableRules) {
    result.rules[key] = Self.getStatus(key, result);
  }
  result.rule = result.rules.default.rule;
  result.status = result.rules.default.status;
  result.actionRequired = result.rules.default.actionRequired;
  return result;
};

/**
 * Get the status of the given data object
 * @param {string} key - Key of rules used
 * @param {object} object - Data Object
 * @returns {string} The given status
 */
Self.getStatus = function (key, object) {
  let codeStatus, softwareStatus, reagentStatus, protocolStatus, datasetStatus;
  switch (object.kind) {
  case `code`:
    return RULES[key].getCodeStatus(object);
  case `software`:
    return RULES[key].getSoftwareStatus(object);
  case `reagent`:
    return RULES[key].getMaterialStatus(object);
  case `protocol`:
    return RULES[key].getProtocolStatus(object);
  case `dataset`:
    return RULES[key].getDatasetStatus(object);
  default:
    return new Error(`Not handled : unknow dataType`);
  }
};

module.exports = Self;
