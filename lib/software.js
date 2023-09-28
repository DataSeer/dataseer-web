/*
 * @prettier
 */

'use strict';

const stringSimilarity = require(`string-similarity`);
const accents = require(`remove-accents`);

const GoogleSheets = require(`./googleSheets.js`);

const conf = require(`../conf/software.custom.json`);

let Self = {};

Self.customList = {
  data: [],
  raw: [],
  mappings: {
    name: {}
  }
};

/**
 * Return the current software list
 * @returns {array} List of software
 */
Self.getCustomSoftware = function () {
  return Self.customList.data;
};

/**
 * Return the given software
 * @param {integer} index - Author index
 * @returns {object} Given software or undefined
 */
Self.getCustomSoftwareByIndex = function (index) {
  if (index < 0 || index > Self.customList.data.length - 1) return undefined;
  return Self.customList.data[index];
};

/**
 * Build the software list
 * @returns {array} List of software
 */
Self.buildCustomList = function (data) {
  Self.customList = {
    data: [],
    raw: [],
    mappings: {
      name: {}
    }
  };
  Self.customList.data = data;
  for (let i = 0; i < Self.customList.data.length; i++) {
    let software = Self.customList.data[i];
    let sanitizedName = accents.remove(software.name);
    Self.customList.raw.push(software.name);
    Self.customList.mappings.name[sanitizedName] = i;
  }
  return Self.customList.data;
};

/**
 * Refresh the software list using the Googel Spreadsheet file
 * @returns {array} List of software
 */
Self.refreshCustomList = function (cb) {
  return GoogleSheets.getCustomSoftware(function (err, data) {
    if (err) return cb(err);
    return cb(err, Self.buildCustomList(data));
  });
};

/**
 * Try to find the given software in the ASAP software list
 * @param {string} name - Author name
 * @returns {array} List of software found
 */
Self.findSoftwareFromCustomList = function (name) {
  const notFoundError = new Error(`Not found`);
  if (!name) return notFoundError;
  let sanitizedName = accents.remove(name);
  let matches = stringSimilarity.findBestMatch(sanitizedName, Self.customList.raw);
  if (matches.bestMatch.rating <= conf.settings.minRating) return notFoundError;
  return [].concat(
    matches.ratings
      .map((item, i) => {
        return item.rating >= conf.settings.minRating
          ? { index: i, target: item.item, rating: item.rating }
          : undefined;
      })
      .filter((item) => {
        return typeof item !== `undefined`;
      })
      .map((item) => {
        return Object.assign({}, Self.getCustomSoftwareByIndex(item.index), { rating: item.rating });
      })
  );
};

module.exports = Self;
