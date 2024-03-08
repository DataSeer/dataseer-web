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
    if (Array.isArray(_.get(doc, `dataObjects.current`)))
      for (let j = 0; j < doc.dataObjects.current.length; j++) {
        let dataset = doc.dataObjects.current[j];
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
 * Build CSV of all untrusted changes
 * @param {object} documents - List of documents
 * @returns {buffer} buffer
 */
Self.buildDataObjectsUntrustedChanges = function (data) {
  let result = [
    Self.buildLine(
      [
        `Manuscript URL`,
        `Manuscript ID`,
        `Change Type`,
        `Notes`,
        `User making change (date)`,
        `Last Annotator change (date)`,
        `User making change`,
        `Last Annotator change`,
        `Kind`,
        `Name (user)`,
        `Name (annotator)`,
        `Associated Text (user)`,
        `Associated Text (annotator)`,
        `Object Type (user)`,
        `Object Type (annotator)`,
        `Object Subtype (user)`,
        `Object Subtype (annotator)`,
        `Reuse (user)`,
        `Reuse (annotator)`,
        `Object Identifier (user)`,
        `Object Identifier (annotator)`,
        `Object URL (user)`,
        `Object URL (annotator)`,
        `Comments (user)`,
        `Comments (annotator)`,
        `actionRequired (user)`,
        `actionRequired (annotator)`
      ],
      SEPARATOR
    )
  ];
  for (var i = 0; i < data.length; i++) {
    let query = data[i];
    if (query.err) continue;
    let d = query.res;
    if (d.dataObjects.trusted === null && d.dataObjects.untrusted === null) continue;
    let documentUrl = Url.build(`/documents/${d.document.id}`, {
      view: `datasets`,
      selectedDataObjectId: d.dataObjects.untrusted._id.toString(),
      token: d.document.token
    });
    let changesType = `n/a`;
    let changesNotes = ``;
    if (d.changes !== null) {
      let sentencesChanges = Object.keys(d.changes.sentences);
      let propertiesChanges = Object.keys(d.changes.properties);
      if (sentencesChanges.length > 0) changesNotes += `${sentencesChanges.length} sentence(s) modified. `;
      if (propertiesChanges.length > 0) {
        changesNotes += `${propertiesChanges.length} properties modified. `;
        for (let k in d.changes.properties) {
          changesNotes += `"${k}" : "${d.changes.properties[k].__old}" changed to "${d.changes.properties[k].__new}". `;
        }
      }
    }
    if (d.dataObjects.untrusted !== null && d.dataObjects.trusted !== null) {
      changesType = d.dataObjects.untrusted.deleted ? `remove` : `modify`;
    } else changesType = d.dataObjects.untrusted.deleted ? `remove` : `add`;
    let identifiers = { trusted: `n/a`, untrusted: `n/a` };
    if (d.dataObjects.untrusted !== null)
      identifiers.untrusted = d.dataObjects.untrusted.DOI
        ? `(DOI) ${d.dataObjects.untrusted.DOI}`
        : d.dataObjects.untrusted.PID
          ? `(PID) ${d.dataObjects.untrusted.PID}`
          : d.dataObjects.untrusted.RRID
            ? `(RRID) ${d.dataObjects.untrusted.RRID}`
            : d.dataObjects.untrusted.catalogNumber
              ? `(catalogNumber) ${d.dataObjects.untrusted.catalogNumber}`
              : d.dataObjects.untrusted.source
                ? `(source) ${d.dataObjects.untrusted.source}`
                : `n/a`;
    if (d.dataObjects.trusted !== null)
      identifiers.trusted = d.dataObjects.trusted.DOI
        ? `(DOI) ${d.dataObjects.trusted.DOI}`
        : d.dataObjects.trusted.PID
          ? `(PID) ${d.dataObjects.trusted.PID}`
          : d.dataObjects.trusted.RRID
            ? `(RRID) ${d.dataObjects.trusted.RRID}`
            : d.dataObjects.trusted.catalogNumber
              ? `(catalogNumber) ${d.dataObjects.trusted.catalogNumber}`
              : d.dataObjects.trusted.source
                ? `(source) ${d.dataObjects.trusted.source}`
                : `n/a`;
    let dates = { trusted: null, untrusted: null };
    if (d.dates.untrusted) dates.untrusted = new Date(d.dates.untrusted);
    if (d.dates.trusted) dates.trusted = new Date(d.dates.trusted);
    let line = [
      documentUrl,
      d.document.name,
      changesType,
      changesNotes,
      dates.untrusted
        ? `=DATE(${dates.untrusted.getFullYear()};${dates.untrusted.getMonth() + 1};${dates.untrusted.getDate()})`
        : `n/a`,
      dates.trusted
        ? `=DATE(${dates.trusted.getFullYear()};${dates.trusted.getMonth() + 1};${dates.trusted.getDate()})`
        : `n/a`,
      d.modifiers.untrusted ? d.modifiers.untrusted.username : `n/a`,
      d.modifiers.trusted ? d.modifiers.trusted.username : `n/a`,
      d.dataObjects.untrusted ? d.dataObjects.untrusted.kind : `n/a`,
      d.dataObjects.untrusted ? d.dataObjects.untrusted.name : `n/a`,
      d.dataObjects.trusted ? d.dataObjects.trusted.name : `n/a`,
      d.dataObjects.untrusted && Array.isArray(d.dataObjects.untrusted.sentences)
        ? d.dataObjects.untrusted.sentences
          .map(function (item) {
            return item.text;
          })
          .join(``)
        : `n/a`,
      d.dataObjects.trusted && Array.isArray(d.dataObjects.trusted.sentences)
        ? d.dataObjects.trusted.sentences
          .map(function (item) {
            return item.text;
          })
          .join(``)
        : `n/a`,
      d.dataObjects.untrusted ? d.dataObjects.untrusted.dataType : `n/a`,
      d.dataObjects.trusted ? d.dataObjects.trusted.dataType : `n/a`,
      d.dataObjects.untrusted ? d.dataObjects.untrusted.subType : ``,
      d.dataObjects.trusted ? d.dataObjects.trusted.subType : ``,
      d.dataObjects.untrusted ? !!d.dataObjects.untrusted.reuse : `n/a`,
      d.dataObjects.trusted ? !!d.dataObjects.trusted.reuse : `n/a`,
      identifiers.untrusted,
      identifiers.trusted,
      d.dataObjects.untrusted ? d.dataObjects.untrusted.URL : `n/a`,
      d.dataObjects.trusted ? d.dataObjects.trusted.URL : `n/a`,
      d.dataObjects.untrusted ? d.dataObjects.untrusted.comments : `n/a`,
      d.dataObjects.trusted ? d.dataObjects.trusted.comments : `n/a`,
      d.dataObjects.untrusted ? d.dataObjects.untrusted.actionRequired : `n/a`,
      d.dataObjects.trusted ? d.dataObjects.trusted.actionRequired : `n/a`
    ];
    result.push(Self.buildLine(line, SEPARATOR));
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
