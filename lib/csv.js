/*
 * @prettier
 */

'use strict';

const _ = require(`lodash`);

let Self = {};

/**
 * Build CSV of all datasets of given documents
 * @param {object} documents - List of documents
 * @returns {buffer} buffer
 */
Self.buildDatasets = function (documents, outputStream) {
  const SEPARATOR = `\t`;
  let result = [
    Self.buildLine(
      [`document`, `organizations`, `datatype`, `subtype`, `name`, `doi`, `sentences`, `comments`, `reuse`, `status`],
      SEPARATOR
    )
  ];
  for (let i = 0; i < documents.length; i++) {
    let doc = documents[i];
    let id = doc.name ? `${doc._id.toString()} (${doc.name})` : doc._id.toString();
    let organizations = doc.organizations
      .map(function (item) {
        if (typeof _.get(item, `name`) === `undefined`) return item.toString();
        else return `${item._id.toString()} (${item.name})`;
      })
      .join(`,`);
    if (Array.isArray(_.get(doc, `datasets.current`)))
      for (let j = 0; j < doc.datasets.current.length; j++) {
        let dataset = doc.datasets.current[j];
        let sentences = dataset.sentences
          .map(function (item) {
            return item.text;
          })
          .join(``);
        result.push(
          Self.buildLine(
            [
              id,
              organizations,
              dataset.dataType,
              dataset.subType,
              dataset.name,
              dataset.DOI,
              sentences,
              dataset.comments,
              dataset.reuse ? `true` : `false`,
              dataset.status
            ],
            SEPARATOR
          )
        );
      }
  }
  return Buffer.from(result.join(`\n`).toString(`utf-8`), `utf-8`);
};

/**
 * Build a CSV line
 * @param {array} data - Array of data
 * @param {string} separator - Separator
 * @returns {string} The CSV line
 */
Self.buildLine = function (data, separator) {
  const regExpSeparator = new RegExp(separator, `gm`);
  const regExpSpecialChars = /\n*/gm;
  return data
    .map(function (item) {
      return item.toString(`utf-8`).replace(regExpSpecialChars, ``).replace(regExpSeparator, ``);
    })
    .join(separator);
};

module.exports = Self;
