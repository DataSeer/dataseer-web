/*
 * @prettier
 */

'use strict';

const HTML = require(`./html.js`);

let Self = {};

/**
 * Get Info about dataType (or SubType) of dataObjects
 * @param {object} dataset - A dataset
 * @param {object} dataTypes - dataTypes object
 * @param {object} opts - options
 * @param {boolean} opts.convertHTML - options
 * @returns {object} DataObjects info
 */
Self.getDataTypeInfo = function (dataset = {}, dataTypes = {}, opts = {}) {
  let hasDataType = !!dataset.dataType;
  let hasSubType = !!dataset.subType;
  let dataTypeIsKnown =
    hasDataType && dataTypes.metadata[dataset.dataType] && dataTypes.metadata[dataset.dataType].label;
  let subTypeIsKnown = hasSubType && dataTypes.metadata[dataset.subType] && dataTypes.metadata[dataset.subType].label;
  let isCustom = !(dataTypeIsKnown || subTypeIsKnown);
  let type = hasSubType ? dataset.subType : dataset.dataType;
  let dataType = ``;
  let subType = ``;
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
  let url = dataTypes.metadata[type] && dataTypes.metadata[type].url ? dataTypes.metadata[type].url : ``;
  return {
    isCustom: isCustom,
    url: url,
    label: label,
    dataType: dataType,
    subType: subType,
    description: opts.convertHTML ? HTML.getText(description, `p`) : description,
    bestDataFormatForSharing: opts.convertHTML ? HTML.getText(bestDataFormatForSharing, `p`) : bestDataFormatForSharing,
    bestPracticeForIndicatingReUseOfExistingData: opts.convertHTML
      ? HTML.getText(bestPracticeForIndicatingReUseOfExistingData, `p`)
      : bestPracticeForIndicatingReUseOfExistingData,
    mostSuitableRepositories: opts.convertHTML ? HTML.getText(mostSuitableRepositories, `p`) : mostSuitableRepositories
  };
};

/**
 * Get bestPractices of dataObjects
 * @param {array} dataObjects - Array of dataObjects
 * @param {object} dataTypes - dataTypes object
 * @param {object} opts - options
 * @param {boolean} opts.convertHTML - options
 * @returns {object} bestPractices
 */
Self.getBestPractices = function (dataObjects = [], dataTypes = {}, opts = {}) {
  return dataObjects.reduce(
    function (acc, item) {
      let infos = Self.getDataTypeInfo(item, dataTypes, opts);
      if (typeof acc.key[infos.label] === `undefined`) {
        acc.key[infos.label] = true;
        acc.data.push(infos);
      }
      return acc;
    },
    { key: {}, data: [] }
  );
};

/**
 * Get summary of dataObjects
 * @param {array} dataObjectsInfo - Array of dataObjectsInfo
 * @returns {array} summary
 */
Self.getDataObjectsSummary = function (dataObjectsInfo = [], dataTypes = {}) {
  let data = {};
  let result = [];
  dataObjectsInfo.reduce(function (acc, item) {
    if (typeof acc[item.dataType] === `undefined`)
      acc[item.dataType] = {
        key: item.dataType,
        count: 0,
        list: [],
        type: Self.getDataTypeInfo({ dataType: item.dataType }, dataTypes),
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
