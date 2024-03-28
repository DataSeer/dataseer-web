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
 * Build CSV of all dataObjects changes
 * @param {object} documents - List of documents
 * @returns {buffer} buffer
 */
Self.formatDataObjectsChangesToCSV = function (data) {
  let result = [
    Self.buildLine(
      [
        `Manuscript URL`,
        `Manuscript ID`,
        `Change Type`,
        `Notes`,
        `Annotator making change (date)`,
        `Last Curator change (date)`,
        `Annotator making change`,
        `Last Curator change`,
        `Kind`,
        `Name (Annotator)`,
        `Name (Curator)`,
        `Associated Text (Annotator)`,
        `Associated Text (Curator)`,
        `Object Type (Annotator)`,
        `Object Type (Curator)`,
        `Object Subtype (Annotator)`,
        `Object Subtype (Curator)`,
        `Reuse (Annotator)`,
        `Reuse (Curator)`,
        `DOI (Annotator)`,
        `DOI (Curator)`,
        `PID (Annotator)`,
        `PID (Curator)`,
        `RRID (Annotator)`,
        `RRID (Curator)`,
        `catalogNumber (Annotator)`,
        `catalogNumber (Curator)`,
        `source (Annotator)`,
        `source (Curator)`,
        `Object URL (Annotator)`,
        `Object URL (Curator)`,
        `Comments (Annotator)`,
        `Comments (Curator)`,
        `actionRequired (Annotator)`,
        `actionRequired (Curator)`,
        `QC (Annotator)`,
        `QC (Curator)`,
        `REP (Annotator)`,
        `REP (Curator)`,
        `Issue (Annotator)`,
        `Issue (Curator)`,
        `Suggested Name (Annotator)`,
        `Suggested Name (Curator)`,
        `Suggested URL (Annotator)`,
        `Suggested URL (Curator)`,
        `Suggested RRID (Annotator)`,
        `Suggested RRID (Curator)`
      ],
      SEPARATOR
    )
  ];
  for (let i = 0; i < data.length; i++) {
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
      d.dataObjects.untrusted ? d.dataObjects.untrusted.subType : `n/a`,
      d.dataObjects.trusted ? d.dataObjects.trusted.subType : `n/a`,
      d.dataObjects.untrusted ? !!d.dataObjects.untrusted.reuse : `n/a`,
      d.dataObjects.trusted ? !!d.dataObjects.trusted.reuse : `n/a`,
      d.dataObjects.untrusted ? d.dataObjects.untrusted.DOI : `n/a`,
      d.dataObjects.trusted ? d.dataObjects.trusted.DOI : `n/a`,
      d.dataObjects.untrusted ? d.dataObjects.untrusted.PID : `n/a`,
      d.dataObjects.trusted ? d.dataObjects.trusted.PID : `n/a`,
      d.dataObjects.untrusted ? d.dataObjects.untrusted.RRID : `n/a`,
      d.dataObjects.trusted ? d.dataObjects.trusted.RRID : `n/a`,
      d.dataObjects.untrusted ? d.dataObjects.untrusted.catalogNumber : `n/a`,
      d.dataObjects.trusted ? d.dataObjects.trusted.catalogNumber : `n/a`,
      d.dataObjects.untrusted ? d.dataObjects.untrusted.source : `n/a`,
      d.dataObjects.trusted ? d.dataObjects.trusted.source : `n/a`,
      d.dataObjects.untrusted ? d.dataObjects.untrusted.URL : `n/a`,
      d.dataObjects.trusted ? d.dataObjects.trusted.URL : `n/a`,
      d.dataObjects.untrusted ? d.dataObjects.untrusted.comments : `n/a`,
      d.dataObjects.trusted ? d.dataObjects.trusted.comments : `n/a`,
      d.dataObjects.untrusted ? d.dataObjects.untrusted.actionRequired : `n/a`,
      d.dataObjects.trusted ? d.dataObjects.trusted.actionRequired : `n/a`,
      d.dataObjects.untrusted ? !!d.dataObjects.untrusted.qc : `n/a`,
      d.dataObjects.trusted ? !!d.dataObjects.trusted.qc : `n/a`,
      d.dataObjects.untrusted ? !!d.dataObjects.untrusted.representativeImage : `n/a`,
      d.dataObjects.trusted ? !!d.dataObjects.trusted.representativeImage : `n/a`,
      d.dataObjects.untrusted ? !!d.dataObjects.untrusted.issues : `n/a`,
      d.dataObjects.trusted ? !!d.dataObjects.trusted.issues : `n/a`,
      d.dataObjects.untrusted ? d.dataObjects.untrusted.suggestedEntity : `n/a`,
      d.dataObjects.trusted ? d.dataObjects.trusted.suggestedEntity : `n/a`,
      d.dataObjects.untrusted ? d.dataObjects.untrusted.suggestedURL : `n/a`,
      d.dataObjects.trusted ? d.dataObjects.trusted.suggestedURL : `n/a`,
      d.dataObjects.untrusted ? d.dataObjects.untrusted.suggestedRRID : `n/a`,
      d.dataObjects.trusted ? d.dataObjects.trusted.suggestedRRID : `n/a`
    ];
    result.push(Self.buildLine(line, SEPARATOR));
  }
  return Buffer.from(result.join(`\n`).toString(`utf-8`), `utf-8`);
};

/**
 * Build CSV of all dataObjects changes
 * @param {object} documents - List of documents
 * @returns {buffer} buffer
 */
Self.formatDataObjectsHistoriesToCSV = function (data) {
  let result = [
    Self.buildLine(
      [
        `Manuscript URL`,
        `Manuscript ID`,
        `Change Type`,
        `Notes`,
        `First change (date)`,
        `Last change (date)`,
        `User making First change`,
        `User making Last change`,
        `Kind`,
        `Name (First change)`,
        `Name (Last change)`,
        `Associated Text (First change)`,
        `Associated Text (Last change)`,
        `Object Type (First change)`,
        `Object Type (Last change)`,
        `Object Subtype (First change)`,
        `Object Subtype (Last change)`,
        `Reuse (First change)`,
        `Reuse (Last change)`,
        `DOI (First change)`,
        `DOI (Last change)`,
        `PID (First change)`,
        `PID (Last change)`,
        `RRID (First change)`,
        `RRID (Last change)`,
        `catalogNumber (First change)`,
        `catalogNumber (Last change)`,
        `source (First change)`,
        `source (Last change)`,
        `Object URL (First change)`,
        `Object URL (Last change)`,
        `Comments (First change)`,
        `Comments (Last change)`,
        `actionRequired (First change)`,
        `actionRequired (Last change)`,
        `QC (First change)`,
        `QC (Last change)`,
        `REP (First change)`,
        `REP (Last change)`,
        `Issue (First change)`,
        `Issue (Last change)`,
        `Suggested Name (First change)`,
        `Suggested Name (Last change)`,
        `Suggested URL (First change)`,
        `Suggested URL (Last change)`,
        `Suggested RRID (First change)`,
        `Suggested RRID (Last change)`
      ],
      SEPARATOR
    )
  ];
  for (let i = 0; i < data.length; i++) {
    let query = data[i];
    if (query.err) continue;
    let d = query.res;
    if (d.dataObjects.last === null && d.dataObjects.first === null) continue;
    let documentUrl = Url.build(`/documents/${d.document.id}`, {
      view: `datasets`,
      selectedDataObjectId: d.dataObjects.first._id.toString(),
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
    if (d.dataObjects.first !== null && d.dataObjects.last !== null) {
      changesType = d.dataObjects.last.deleted ? `remove` : `modify`;
    } else changesType = d.dataObjects.last && d.dataObjects.last.deleted ? `remove` : `add`;
    let dates = { last: null, first: null };
    if (d.dates.first) dates.first = new Date(d.dates.first);
    if (d.dates.last) dates.last = new Date(d.dates.last);
    let line = [
      documentUrl,
      d.document.name,
      changesType,
      changesNotes,
      dates.first
        ? `=DATE(${dates.first.getFullYear()};${dates.first.getMonth() + 1};${dates.first.getDate()})`
        : `n/a`,
      dates.last ? `=DATE(${dates.last.getFullYear()};${dates.last.getMonth() + 1};${dates.last.getDate()})` : `n/a`,
      d.modifiers.first ? d.modifiers.first.username : `n/a`,
      d.modifiers.last ? d.modifiers.last.username : `n/a`,
      d.dataObjects.first ? d.dataObjects.first.kind : `n/a`,
      d.dataObjects.first ? d.dataObjects.first.name : `n/a`,
      d.dataObjects.last ? d.dataObjects.last.name : `n/a`,
      d.dataObjects.first && Array.isArray(d.dataObjects.first.sentences)
        ? d.dataObjects.first.sentences
          .map(function (item) {
            return item.text;
          })
          .join(``)
        : `n/a`,
      d.dataObjects.last && Array.isArray(d.dataObjects.last.sentences)
        ? d.dataObjects.last.sentences
          .map(function (item) {
            return item.text;
          })
          .join(``)
        : `n/a`,
      d.dataObjects.first ? d.dataObjects.first.dataType : `n/a`,
      d.dataObjects.last ? d.dataObjects.last.dataType : `n/a`,
      d.dataObjects.first ? d.dataObjects.first.subType : `n/a`,
      d.dataObjects.last ? d.dataObjects.last.subType : `n/a`,
      d.dataObjects.first ? !!d.dataObjects.first.reuse : `n/a`,
      d.dataObjects.last ? !!d.dataObjects.last.reuse : `n/a`,
      d.dataObjects.first ? d.dataObjects.first.DOI : `n/a`,
      d.dataObjects.last ? d.dataObjects.last.DOI : `n/a`,
      d.dataObjects.first ? d.dataObjects.first.PID : `n/a`,
      d.dataObjects.last ? d.dataObjects.last.PID : `n/a`,
      d.dataObjects.first ? d.dataObjects.first.RRID : `n/a`,
      d.dataObjects.last ? d.dataObjects.last.RRID : `n/a`,
      d.dataObjects.first ? d.dataObjects.first.catalogNumber : `n/a`,
      d.dataObjects.last ? d.dataObjects.last.catalogNumber : `n/a`,
      d.dataObjects.first ? d.dataObjects.first.source : `n/a`,
      d.dataObjects.last ? d.dataObjects.last.source : `n/a`,
      d.dataObjects.first ? d.dataObjects.first.URL : `n/a`,
      d.dataObjects.last ? d.dataObjects.last.URL : `n/a`,
      d.dataObjects.first ? d.dataObjects.first.comments : `n/a`,
      d.dataObjects.last ? d.dataObjects.last.comments : `n/a`,
      d.dataObjects.first ? d.dataObjects.first.actionRequired : `n/a`,
      d.dataObjects.last ? d.dataObjects.last.actionRequired : `n/a`,
      d.dataObjects.first ? !!d.dataObjects.first.qc : `n/a`,
      d.dataObjects.last ? !!d.dataObjects.last.qc : `n/a`,
      d.dataObjects.first ? !!d.dataObjects.first.representativeImage : `n/a`,
      d.dataObjects.last ? !!d.dataObjects.last.representativeImage : `n/a`,
      d.dataObjects.first ? !!d.dataObjects.first.issues : `n/a`,
      d.dataObjects.last ? !!d.dataObjects.last.issues : `n/a`,
      d.dataObjects.first ? d.dataObjects.first.suggestedEntity : `n/a`,
      d.dataObjects.last ? d.dataObjects.last.suggestedEntity : `n/a`,
      d.dataObjects.first ? d.dataObjects.first.suggestedURL : `n/a`,
      d.dataObjects.last ? d.dataObjects.last.suggestedURL : `n/a`,
      d.dataObjects.first ? d.dataObjects.first.suggestedRRID : `n/a`,
      d.dataObjects.last ? d.dataObjects.last.suggestedRRID : `n/a`
    ];
    result.push(Self.buildLine(line, SEPARATOR));
  }
  return Buffer.from(result.join(`\n`).toString(`utf-8`), `utf-8`);
};

/**
 * Build CSV of all dataObjects changes
 * @param {object} documents - List of documents
 * @returns {buffer} buffer
 */
Self.formatDataObjectsChangesFromReportsToCSV = function (data) {
  let result = [
    Self.buildLine(
      [
        `DS Document Name (old)`,
        `DS Document Name (new)`,
        `Report (old)`,
        `Report (new)`,
        `Date (old)`,
        `Date (new)`,
        `Change Type`,
        `Change Notes`,
        `Kind`,
        `Section (old)`,
        `Section (new)`,
        `Name (old)`,
        `Name (new)`,
        `Associated Text (old)`,
        `Associated Text (new)`,
        `Object Type (old)`,
        `Object Type (new)`,
        `Action Required (old)`,
        `Action Required (new)`,
        `ReUse (old)`,
        `ReUse (new)`,
        `QC (old)`,
        `QC (new)`,
        `Representative Image (old)`,
        `Representative Image (new)`,
        `Issues (old)`,
        `Issues (new)`,
        `Identifier (old)`,
        `Identifier (new)`,
        `URL (old)`,
        `URL (new)`,
        `DOI (old)`,
        `DOI (new)`,
        `RRID (old)`,
        `RRID (new)`,
        `Catalog Number (old)`,
        `Catalog Number (new)`,
        `Source (old)`,
        `Source (new)`,
        `Version (old)`,
        `Version (new)`,
        `Suggested Entity (old)`,
        `Suggested Entity (new)`,
        `Suggested RRID (old)`,
        `Suggested RRID (new)`,
        `Suggested URL (old)`,
        `Suggested URL (new)`,
        `Notes (old)`,
        `Notes (new)`
      ],
      SEPARATOR
    )
  ];
  for (let kind in data.dataObjects) {
    for (let name in data.dataObjects[kind]) {
      let dataObject = data.dataObjects[kind][name];
      if (dataObject.change === `none`) continue;
      let changesNotes = ``;
      if (dataObject.change === `modify`) {
        let propertiesChanges = Object.keys(dataObject.diff);
        if (propertiesChanges.length > 0) {
          changesNotes += `${propertiesChanges.length} properties modified. `;
          for (let k in dataObject.diff) {
            changesNotes += `"${k}" : "${dataObject.diff[k].__old}" changed to "${dataObject.diff[k].__new}". `;
          }
        }
      }
      let line = [
        data.metadata.old.name,
        data.metadata.new.name,
        data.metadata.old.report,
        data.metadata.new.report,
        `=DATE(${data.metadata.old.date.getFullYear()};${
          data.metadata.old.date.getMonth() + 1
        };${data.metadata.old.date.getDate()})`,
        `=DATE(${data.metadata.new.date.getFullYear()};${
          data.metadata.new.date.getMonth() + 1
        };${data.metadata.new.date.getDate()})`,
        dataObject.change,
        changesNotes,
        kind,
        dataObject.old && typeof dataObject.old.section !== `undefined` ? dataObject.old.section : `n/a`,
        dataObject.new && typeof dataObject.new.section !== `undefined` ? dataObject.new.section : `n/a`,
        dataObject.old && typeof dataObject.old.name !== `undefined` ? dataObject.old.name : `n/a`,
        dataObject.new && typeof dataObject.new.name !== `undefined` ? dataObject.new.name : `n/a`,
        dataObject.old && typeof dataObject.old.sentences !== `undefined` ? dataObject.old.sentences : `n/a`,
        dataObject.new && typeof dataObject.new.sentences !== `undefined` ? dataObject.new.sentences : `n/a`,
        dataObject.old && typeof dataObject.old.dataType !== `undefined` ? dataObject.old.dataType : `n/a`,
        dataObject.new && typeof dataObject.new.dataType !== `undefined` ? dataObject.new.dataType : `n/a`,
        dataObject.old && typeof dataObject.old.actionRequired !== `undefined` ? dataObject.old.actionRequired : `n/a`,
        dataObject.new && typeof dataObject.new.actionRequired !== `undefined` ? dataObject.new.actionRequired : `n/a`,
        dataObject.old && typeof dataObject.old.reuse !== `undefined` ? dataObject.old.reuse : `n/a`,
        dataObject.new && typeof dataObject.new.reuse !== `undefined` ? dataObject.new.reuse : `n/a`,
        dataObject.old && typeof dataObject.old.qc !== `undefined` ? dataObject.old.qc : `n/a`,
        dataObject.new && typeof dataObject.new.qc !== `undefined` ? dataObject.new.qc : `n/a`,
        dataObject.old && typeof dataObject.old.rep !== `undefined` ? dataObject.old.rep : `n/a`,
        dataObject.new && typeof dataObject.new.rep !== `undefined` ? dataObject.new.rep : `n/a`,
        dataObject.old && typeof dataObject.old.issue !== `undefined` ? dataObject.old.issue : `n/a`,
        dataObject.new && typeof dataObject.new.issue !== `undefined` ? dataObject.new.issue : `n/a`,
        dataObject.old && typeof dataObject.old.identifier !== `undefined` ? dataObject.old.identifier : `n/a`,
        dataObject.new && typeof dataObject.new.identifier !== `undefined` ? dataObject.new.identifier : `n/a`,
        dataObject.old && typeof dataObject.old.URL !== `undefined` ? dataObject.old.URL : `n/a`,
        dataObject.new && typeof dataObject.new.URL !== `undefined` ? dataObject.new.URL : `n/a`,
        dataObject.old && typeof dataObject.old.DOI !== `undefined` ? dataObject.old.DOI : `n/a`,
        dataObject.new && typeof dataObject.new.DOI !== `undefined` ? dataObject.new.DOI : `n/a`,
        dataObject.old && typeof dataObject.old.RRID !== `undefined` ? dataObject.old.RRID : `n/a`,
        dataObject.new && typeof dataObject.new.RRID !== `undefined` ? dataObject.new.RRID : `n/a`,
        dataObject.old && typeof dataObject.old.catalogNumber !== `undefined` ? dataObject.old.catalogNumber : `n/a`,
        dataObject.new && typeof dataObject.new.catalogNumber !== `undefined` ? dataObject.new.catalogNumber : `n/a`,
        dataObject.old && typeof dataObject.old.source !== `undefined` ? dataObject.old.source : `n/a`,
        dataObject.new && typeof dataObject.new.source !== `undefined` ? dataObject.new.source : `n/a`,
        dataObject.old && typeof dataObject.old.version !== `undefined` ? dataObject.old.version : `n/a`,
        dataObject.new && typeof dataObject.new.version !== `undefined` ? dataObject.new.version : `n/a`,
        dataObject.old && typeof dataObject.old.suggestedEntity !== `undefined`
          ? dataObject.old.suggestedEntity
          : `n/a`,
        dataObject.new && typeof dataObject.new.suggestedEntity !== `undefined`
          ? dataObject.new.suggestedEntity
          : `n/a`,
        dataObject.old && typeof dataObject.old.suggestedRRID !== `undefined` ? dataObject.old.suggestedRRID : `n/a`,
        dataObject.new && typeof dataObject.new.suggestedRRID !== `undefined` ? dataObject.new.suggestedRRID : `n/a`,
        dataObject.old && typeof dataObject.old.suggestedURL !== `undefined` ? dataObject.old.suggestedURL : `n/a`,
        dataObject.new && typeof dataObject.new.suggestedURL !== `undefined` ? dataObject.new.suggestedURL : `n/a`,
        dataObject.old && typeof dataObject.old.notes !== `undefined` ? dataObject.old.notes : `n/a`,
        dataObject.new && typeof dataObject.new.notes !== `undefined` ? dataObject.new.notes : `n/a`
      ];
      result.push(Self.buildLine(line, SEPARATOR));
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
