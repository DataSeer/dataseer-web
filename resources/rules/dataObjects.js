/*
 * @prettier
 */

'use strict';

const rules = require(`./rules.js`);
const customCheck = require(`./customCheck.js`);
const status = require(`./status.js`);

let Self = {};

/**
 * Convert a boolean Array to a Number
 * @param {array} booleans - Array of booleans
 * @returns {number} The given number
 */
Self.booleanArrayToNumber = function (booleans = []) {
  if (!Array.isArray(booleans) || booleans.length <= 0) return;
  let result = 0;
  for (let i = booleans.length - 1; i >= 0; i--) {
    if (!!booleans[i]) result += Math.pow(2, i);
  }
  return result;
};

/**
 * Get the status of the given data object
 * @param {object} object - Data Object
 * @returns {string} The given status
 */
Self.getDatasetStatus = function (object) {
  // issue  reuse QC  REP URL PID
  let keys = [`issues`, `reuse`, `qc`, `representativeImage`, `URL`, `PID`];
  let array = [];
  for (let i = keys.length - 1; i >= 0; i--) {
    array.push(object[keys[i]]);
  }
  let nbTest = Self.booleanArrayToNumber(array);
  let postCheck = true;
  for (let i = keys.length - 1; i >= 0; i--) {
    postCheck = postCheck && customCheck.datasets.check(keys[i], object[keys[i]], nbTest);
    if (!postCheck) break;
  }
  let defaultResult = { status: `unknow`, actionRequired: `unknow` };
  if (!postCheck) return `unknow`;
  let key = rules.datasets[nbTest];
  let result =
    typeof status.datasets[key] === `object`
      ? { status: status.datasets[key].label, actionRequired: status.datasets[key].actionRequired }
      : defaultResult;
  return result;
};

/**
 * Get the status of the given data object
 * @param {object} object - Data Object
 * @returns {string} The given status
 */
Self.getCodeStatus = function (object) {
  let keys = [`issues`, `reuse`, `version`, `URL`, `DOI`, `suggestedEntity`, `suggestedRRID`, `suggestedURL`];
  let array = [];
  for (let i = keys.length - 1; i >= 0; i--) {
    array.push(object[keys[i]]);
  }
  let nbTest = Self.booleanArrayToNumber(array);
  let postCheck = true;
  for (let i = keys.length - 1; i >= 0; i--) {
    postCheck = postCheck && customCheck.codes.check(keys[i], object[keys[i]], nbTest);
    if (!postCheck) break;
  }
  let defaultResult = { status: `unknow`, actionRequired: `unknow` };
  if (!postCheck) return `unknow`;
  let key = rules.codes[nbTest];
  let result =
    typeof status.codes[key] === `object`
      ? { status: status.codes[key].label, actionRequired: status.codes[key].actionRequired }
      : defaultResult;
  return result;
};

/**
 * Get the status of the given data object
 * @param {object} object - Data Object
 * @returns {string} The given status
 */
Self.getSoftwareStatus = function (object) {
  let keys = [`issues`, `reuse`, `version`, `URL`, `RRID`, `suggestedEntity`, `suggestedRRID`, `suggestedURL`];
  let array = [];
  for (let i = keys.length - 1; i >= 0; i--) {
    array.push(object[keys[i]]);
  }
  let subType = object.dataType === `other` ? `` : object.subType;
  let nbTest = Self.booleanArrayToNumber(array);
  let postCheck = true;
  for (let i = keys.length - 1; i >= 0; i--) {
    postCheck = postCheck && customCheck.softwares[subType].check(keys[i], object[keys[i]], nbTest);
    if (!postCheck) break;
  }
  let defaultResult = { status: `unknow`, actionRequired: `unknow` };
  if (!postCheck) return `unknow`;
  let key = rules.softwares[subType][nbTest];
  let result =
    typeof status.softwares[subType][key] === `object`
      ? {
        status: status.softwares[subType][key].label,
        actionRequired: status.softwares[subType][key].actionRequired
      }
      : defaultResult;
  return result;
};

/**
 * Get the status of the given data object
 * @param {object} object - Data Object
 * @returns {string} The given status
 */
Self.getMaterialStatus = function (object) {
  let keys = [`issues`, `reuse`, `source`, `catalogNumber`, `RRID`, `suggestedEntity`, `suggestedRRID`];
  let array = [];
  for (let i = keys.length - 1; i >= 0; i--) {
    array.push(object[keys[i]]);
  }
  let nbTest = Self.booleanArrayToNumber(array);
  let postCheck = true;
  for (let i = keys.length - 1; i >= 0; i--) {
    postCheck = postCheck && customCheck.reagents.check(keys[i], object[keys[i]], nbTest);
    if (!postCheck) break;
  }
  let defaultResult = { status: `unknow`, actionRequired: `unknow` };
  if (!postCheck) return `unknow`;
  let key = rules.reagents[nbTest];
  let result =
    typeof status.reagents[key] === `object`
      ? { status: status.reagents[key].label, actionRequired: status.reagents[key].actionRequired }
      : defaultResult;
  return result;
};

/**
 * Get the status of the given data object
 * @param {object} object - Data Object
 * @returns {string} The given status
 */
Self.getProtocolStatus = function (object) {
  let keys = [`issues`, `reuse`, `URL`, `DOI`];
  let array = [];
  for (let i = keys.length - 1; i >= 0; i--) {
    array.push(object[keys[i]]);
  }
  let subType = object.dataType === `other` ? `` : object.subType;
  let nbTest = Self.booleanArrayToNumber(array);
  let postCheck = true;
  for (let i = keys.length - 1; i >= 0; i--) {
    postCheck = postCheck && customCheck.protocols[subType].check(keys[i], object[keys[i]], nbTest);
    if (!postCheck) break;
  }
  let defaultResult = { status: `unknow`, actionRequired: `unknow` };
  if (!postCheck) return `unknow`;
  let key = rules.protocols[subType][nbTest];
  let result =
    typeof status.protocols[subType][key] === `object`
      ? {
        status: status.protocols[subType][key].label,
        actionRequired: status.protocols[subType][key].actionRequired
      }
      : defaultResult;
  return result;
};

module.exports = Self;
