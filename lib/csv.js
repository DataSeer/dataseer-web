/*
 * @prettier
 */

'use strict';

const _ = require(`lodash`);

const Url = require(`./url.js`);

let Self = {};
const SEPARATOR = `\t`;

/**
 * Build CSV of all datasets of given documents
 * @param {object} documents - List of documents
 * @returns {buffer} buffer
 */
Self.buildDataObjects = function (documents) {
  let result = [
    Self.buildLine(
      [
        `document`,
        `organizations`,
        `name`,
        `kind`,
        `dataType`,
        `subType`,
        `reuse`,
        `DOI`,
        `URL`,
        `PID`,
        `RRID`,
        `version`,
        `catalogNumber`,
        `source`,
        `suggestedEntity`,
        `suggestedURL`,
        `suggestedRRID`,
        `comments`,
        `sentences`,
        `status`,
        `actionRequired`,
        `DS URL`,
        `PDF`,
        `TEI`
      ],
      SEPARATOR
    )
  ];
  for (let i = 0; i < documents.length; i++) {
    let doc = documents[i];
    let id = doc.name ? `${doc._id.toString()} (${doc.name})` : doc._id.toString();
    let pdfUrl = Url.build(`api/documents/${doc._id.toString()}/pdf/content`, {
      token: doc.token
    });
    let teiUrl = Url.build(`api/documents/${doc._id.toString()}/tei/content`, {
      token: doc.token
    });
    let organizations = doc.organizations
      .map(function (item) {
        if (typeof _.get(item, `name`) === `undefined`) return item.toString();
        else return `${item._id.toString()} (${item.name})`;
      })
      .join(`,`);
    if (Array.isArray(_.get(doc, `datasets.current`)))
      for (let j = 0; j < doc.datasets.current.length; j++) {
        let dataset = doc.datasets.current[j];
        let documentUrl = Url.build(`/documents/${doc._id.toString()}`, {
          token: doc.token,
          view: `datasets`,
          selectedDataObjectId: dataset.id
        });
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
              dataset.name,
              dataset.kind,
              dataset.dataType,
              dataset.subType,
              dataset.reuse ? `true` : `false`,
              dataset.DOI,
              dataset.URL,
              dataset.PID,
              dataset.RRID,
              dataset.version,
              dataset.catalogNumber,
              dataset.source,
              dataset.suggestedEntity,
              dataset.suggestedURL,
              dataset.suggestedRRID,
              dataset.comments,
              sentences,
              dataset.status,
              dataset.actionRequired,
              documentUrl,
              pdfUrl,
              teiUrl
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
  const regExpSeparator = new RegExp(`${separator}+`, `gm`);
  const regExpSpecialChars = /\n+/gm;
  return data
    .map(function (item) {
      return item.toString(`utf-8`).replace(regExpSpecialChars, ` `).replace(regExpSeparator, ` `);
    })
    .join(separator);
};

module.exports = Self;
