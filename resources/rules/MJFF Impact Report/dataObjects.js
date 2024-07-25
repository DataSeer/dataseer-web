/*
 * @prettier
 */

'use strict';

const rules = require(`./rules.js`);
const customChecks = require(`./customChecks.js`);
const status = require(`./status.js`);

let Self = { status: status };

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
  let defaultResult = { status: `unknow`, actionRequired: `unknow`, rule: `unknow` };
  let availableRules = rules.datasets[nbTest];
  if (!Array.isArray(availableRules) || availableRules.length <= 0) return defaultResult;
  let key = availableRules[0];
  let customCheck = customChecks.datasets.check(nbTest, object);
  if (availableRules.length > 1 && typeof customCheck === `number` && !isNaN(customCheck)) key = customCheck;
  let result =
    typeof status.datasets[key] === `object`
      ? {
        status: status.datasets[key].label,
        actionRequired: status.datasets[key].actionRequired,
        rule: object.kind ? `${object.kind}:${nbTest}[${key}]` : nbTest
      }
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
  let subType = object.dataType === `other` ? `` : object.subType;
  let nbTest = Self.booleanArrayToNumber(array);
  let defaultResult = { status: `unknow`, actionRequired: `unknow`, rule: `unknow` };
  let availableRules = rules.code[subType][nbTest];
  if (!Array.isArray(availableRules) || availableRules.length <= 0) return defaultResult;
  let key = availableRules[0];
  let customCheck = customChecks.code[subType].check(nbTest, object);
  if (availableRules.length > 1 && typeof customCheck === `number` && !isNaN(customCheck)) key = customCheck;
  let result =
    typeof status.code[subType][key] === `object`
      ? {
        status: status.code[subType][key].label,
        actionRequired: status.code[subType][key].actionRequired,
        rule: object.kind ? `${object.kind}.${subType}:${nbTest}[${key}]` : nbTest
      }
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
  let defaultResult = { status: `unknow`, actionRequired: `unknow`, rule: `unknow` };
  let availableRules = rules.software[subType][nbTest];
  if (!Array.isArray(availableRules) || availableRules.length <= 0) return defaultResult;
  let key = availableRules[0];
  let customCheck = customChecks.software[subType].check(nbTest, object);
  if (availableRules.length > 1 && typeof customCheck === `number` && !isNaN(customCheck)) key = customCheck;
  let result =
    typeof status.software[subType][key] === `object`
      ? {
        status: status.software[subType][key].label,
        actionRequired: status.software[subType][key].actionRequired,
        rule: object.kind ? `${object.kind}.${subType}:${nbTest}[${key}]` : nbTest
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
  let defaultResult = { status: `unknow`, actionRequired: `unknow`, rule: `unknow` };
  let availableRules = rules.reagents[nbTest];
  if (!Array.isArray(availableRules) || availableRules.length <= 0) return defaultResult;
  let key = availableRules[0];
  let customCheck = customChecks.reagents.check(nbTest, object);
  if (availableRules.length > 1 && typeof customCheck === `number` && !isNaN(customCheck)) key = customCheck;
  let result =
    typeof status.reagents[key] === `object`
      ? {
        status: status.reagents[key].label,
        actionRequired: status.reagents[key].actionRequired,
        rule: object.kind ? `${object.kind}:${nbTest}[${key}]` : nbTest
      }
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
  let defaultResult = { status: `unknow`, actionRequired: `unknow`, rule: `unknow` };
  let availableRules = rules.protocols[subType][nbTest];
  if (!Array.isArray(availableRules) || availableRules.length <= 0) return defaultResult;
  let key = availableRules[0];
  let customCheck = customChecks.protocols[subType].check(nbTest, object);
  if (availableRules.length > 1 && typeof customCheck === `number` && !isNaN(customCheck)) key = customCheck;
  let result =
    typeof status.protocols[subType][key] === `object`
      ? {
        status: status.protocols[subType][key].label,
        actionRequired: status.protocols[subType][key].actionRequired,
        rule: object.kind ? `${object.kind}.${subType}:${nbTest}[${key}]` : nbTest
      }
      : defaultResult;
  return result;
};

module.exports = Self;
