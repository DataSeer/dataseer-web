/*
 * @prettier
 */

'use strict';

const fs = require(`fs`);
const path = require(`path`);

const async = require(`async`);
const mongoose = require(`mongoose`);
const _ = require(`lodash`);
const jsonDiff = require(`json-diff`);

const Documents = require(`../../models/documents.js`);
const DocumentsMetadata = require(`../../models/documents.metadata.js`);
const DocumentsDatasets = require(`../../models/documents.datasets.js`);
const Accounts = require(`../../models/accounts.js`);
const Organizations = require(`../../models/organizations.js`);
const DocumentsFiles = require(`../../models/documents.files.js`);
const DocumentsLogs = require(`../../models/documents.logs.js`);
const DocumentsDataObjects = require(`../../models/documents.dataObjects.js`);
const DocumentsDataObjectsLogs = require(`../../models/documents.dataObjects.logs.js`);
const DocumentsDataObjectsMetadata = require(`../../models/documents.dataObjects.metadata.js`);

const AccountsController = require(`./accounts.js`);
const DocumentsFilesController = require(`./documents.files.js`);
const DocumentsDatasetsController = require(`./documents.datasets.js`);
const DocumentsLogsController = require(`./documents.logs.js`);
const DocumentsDataObjectsController = require(`./documents.dataObjects.js`);
const DocumentsDataObjectsMetadataController = require(`./documents.dataObjects.metadata.js`);

const AccountsManager = require(`../../lib/accounts.js`);
const CrudManager = require(`../../lib/crud.js`);
const JWT = require(`../../lib/jwt.js`);
const XML = require(`../../lib/xml.js`);
const Params = require(`../../lib/params.js`);
const Mailer = require(`../../lib/mailer.js`);
const Url = require(`../../lib/url.js`);
const DataseerML = require(`../../lib/dataseer-ml.js`);
const Softcite = require(`../../lib/softcite.js`);
const DataTypes = require(`../../lib/dataTypes.js`);
const DocX = require(`../../lib/docx.js`);
const Hypothesis = require(`../../lib/hypothesis.js`);
const Encoding = require(`../../lib/encoding.js`);
const Analyzer = require(`../../lib/analyzer.js`);
const CSV = require(`../../lib/csv.js`);
const GoogleSheets = require(`../../lib/googleSheets.js`);
const OCR = require(`../../lib/ocr.js`);
const ORCID = require(`../../lib/orcid.js`);
const PdfManager = require(`../../lib/pdfManager.js`);
const BioNLP = require(`../../lib/bioNLP.js`);
const DataObjects = require(`../../lib/dataObjects.js`);
const { processCSV, extractIdentifiers } = require(`../../lib/krt.js`);

const conf = require(`../../conf/conf.json`);
const uploadConf = require(`../../conf/upload.json`);
const ASAPAuthorsConf = require(`../../conf/authors.ASAP.json`);
const SoftwareConf = require(`../../conf/software.json`);
const reportsConf = require(`../../conf/reports.json`);
const bioNLPConf = require(`../../conf/bioNLP.json`);
const krtConfig = require(`../../conf/krt.json`);
const krtRules = require(`../../conf/krt.rules.json`);

let Self = {};

// Document Status
Self.status = {
  metadata: `metadata`,
  datasets: `datasets`,
  finish: `finish`
};

/**
 * Build CSV of all dataObjects of given documents
 * @param {array} documents - List of documents
 * @returns {buffer} buffer
 */
Self.buildDataObjectsCSV = function (documents) {
  return CSV.buildDataObjects(documents);
};

/**
 * Build CSV of all dataObjects changes of given documents
 * @param {array} changes - List of changes
 * @returns {buffer} buffer
 */
Self.formatDataObjectsChangesToCSV = function (changes) {
  return CSV.formatDataObjectsChangesToCSV(changes);
};

/**
 * Build CSV of all dataObjects changes of given documents
 * @param {array} changes - List of changes
 * @returns {buffer} buffer
 */
Self.formatDataObjectsHistoriesToCSV = function (changes) {
  return CSV.formatDataObjectsHistoriesToCSV(changes);
};

/**
 * Build CSV of all dataObjects changes of given documents
 * @param {array} changes - List of changes
 * @returns {buffer} buffer
 */
Self.formatDataObjectsChangesFromReportsToCSV = function (changes) {
  return CSV.formatDataObjectsChangesFromReportsToCSV(changes);
};

/**
 * Check sentences content of a document by id
 * @param {object} opts - Options available
 * @param {object} opts.user - Current user
 * @param {object} opts.data - Data available
 * @param {string} opts.data.source - Id of the source document (that contain dataObjects you want to import)
 * @param {string} opts.data.target - Id of the target document (that will receiving imported dataObjects)
 * @param {boolean} opts.data.onlyLogs - Only logs no data objects creation
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: document instance OR undefined)
 * @returns {undefined} undefined
 */
Self.importDataObjects = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `user._id`) === `undefined`) return cb(new Error(`Missing required data: opts.user._id`));
  if (typeof _.get(opts, `data`) === `undefined`) return cb(new Error(`Missing required data: opts.data`));
  if (typeof _.get(opts, `data.source`) === `undefined`)
    return cb(new Error(`Missing required data: opts.data.source`));
  if (typeof _.get(opts, `data.target`) === `undefined`)
    return cb(new Error(`Missing required data: opts.data.target`));
  if (typeof _.get(opts, `data.onlyLogs`) === `undefined`) opts.data.onlyLogs = false;
  let accessRights = AccountsManager.getAccessRights(opts.user, AccountsManager.match.all);
  if (!accessRights.authenticated) return cb(null, new Error(`Unauthorized functionnality`));
  let source = Params.convertToString(opts.data.source);
  let target = Params.convertToString(opts.data.target);
  return async.reduce(
    [
      { kind: `source`, id: source },
      { kind: `target`, id: target }
    ],
    {},
    function (acc, item, next) {
      return Self.get(
        { data: { id: item.id, dataObjects: true, pdf: true, tei: true }, user: opts.user },
        function (err, doc) {
          if (err) return next(err, acc);
          if (doc instanceof Error) {
            acc[item.kind] = doc;
            return next(null, acc);
          }
          return DocumentsFilesController.readFileContent(
            { data: { id: doc.tei._id.toString() } },
            function (err, content) {
              if (err) return next(err, acc);
              if (content instanceof Error) {
                acc[item.kind] = content;
                return next(null, acc);
              }
              let dataObjects = _.get(doc, `dataObjects.current`);
              acc[item.kind] = { document: doc };
              acc[item.kind].dataObjects = typeof dataObjects === `undefined` ? [] : dataObjects.toObject();
              acc[item.kind].metadata = doc.pdf && doc.pdf.metadata ? doc.pdf.metadata : doc.tei.metadata;
              acc[item.kind].tei = { id: doc.tei._id.toString(), content: content.data };
              return next(null, acc);
            }
          );
        }
      );
    },
    function (err, res) {
      if (err) return cb(err);
      if (res.source instanceof Error) return cb(err, res.source);
      if (res.target instanceof Error) return cb(err, res.target);
      return Analyzer.checkDataObjectsInTEI(
        {
          dataObjects: res.source.dataObjects,
          tei: {
            name: `dataseer`,
            content: res.target.tei.content,
            metadata: res.target.metadata
          }
        },
        function (err, dataObjects) {
          if (err) return cb(err);
          let result = { merged: [], existing: [], rejected: dataObjects.rejected };
          return async.mapSeries(
            dataObjects.mergeable,
            function (item, next) {
              let dataObject = JSON.parse(JSON.stringify(item));
              let cp = JSON.parse(JSON.stringify(dataObject));
              let alreadyExist = DataObjects.dataObjectsAlreadyExist(
                res.target.dataObjects,
                dataObject,
                Analyzer.softMatch
              );
              if (alreadyExist) {
                result.existing.push(cp);
                return next();
              }
              result.merged.push(cp);
              return next();
            },
            function (err) {
              if (err) return cb(null, err);
              if (opts.data.onlyLogs) return cb(null, result);
              let mergedDataObjects = result.merged.map(function (item) {
                let d = {
                  document: res.target.document,
                  dataObject: item,
                  isExtracted: false,
                  isDeleted: false,
                  saveDocument: true
                };
                d.dataObject.document = res.target.document._id.toString();
                return d;
              });
              return Self.addDataObjects(
                {
                  user: opts.user,
                  data: mergedDataObjects
                },
                function (err, res) {
                  if (err) return cb(null, err);
                  return cb(null, result);
                }
              );
            }
          );
        }
      );
    }
  );
};

/**
 * Check sentences content of a document by id
 * @param {object} opts - Options available
 * @param {object} opts.user - Current user
 * @param {object} opts.data - Data available
 * @param {string} opts.data.source - Id of the source document
 * @param {string} opts.data.target - Id of the target document
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: document instance OR undefined)
 * @returns {undefined} undefined
 */
Self.merge = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `user._id`) === `undefined`) return cb(new Error(`Missing required data: opts.user._id`));
  if (typeof _.get(opts, `data`) === `undefined`) return cb(new Error(`Missing required data: opts.data`));
  if (typeof _.get(opts, `data.source`) === `undefined`)
    return cb(new Error(`Missing required data: opts.data.source`));
  if (typeof _.get(opts, `data.target`) === `undefined`)
    return cb(new Error(`Missing required data: opts.data.target`));
  let accessRights = AccountsManager.getAccessRights(opts.user, AccountsManager.match.all);
  if (!accessRights.isAdministrator) return cb(null, new Error(`Unauthorized functionnality`));
  let source = Params.convertToString(opts.data.source);
  let target = Params.convertToString(opts.data.target);
  return async.reduce(
    [
      { kind: `source`, id: source },
      { kind: `target`, id: target }
    ],
    {},
    function (acc, item, next) {
      return Self.get({ data: { id: item.id, pdf: true, tei: true }, user: opts.user }, function (err, doc) {
        if (err) return next(err, acc);
        if (doc instanceof Error) return next(doc, acc);
        return DocumentsFilesController.readFileContent(
          { data: { id: doc.tei._id.toString() } },
          function (err, content) {
            if (err) return next(err, acc);
            if (content instanceof Error) return next(content, acc);
            acc[item.kind] = {};
            acc[item.kind].content = content.data;
            acc[item.kind].metadata = doc.pdf && doc.pdf.metadata ? doc.pdf.metadata : doc.tei.metadata;
            return next(null, acc);
          }
        );
      });
    },
    function (err, res) {
      return Analyzer.checkSentencesContent(
        {
          source: {
            name: `dataseer`,
            content: res.source.content,
            metadata: res.source.metadata
          },
          target: {
            name: `dataseer`,
            content: res.target.content,
            metadata: res.target.metadata
          }
        },
        function (err, res) {
          return cb(err, res);
        }
      );
    }
  );
};

/**
 * Check sentences content of a document by id
 * @param {object} opts - Options available
 * @param {object} opts.user - Current user
 * @param {object} opts.data - Data available
 * @param {string} opts.data.id - Id of the document
 * @param {object} opts.data.xml - XML file
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: document instance OR undefined)
 * @returns {undefined} undefined
 */
Self.checkSentencesContent = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `user._id`) === `undefined`) return cb(new Error(`Missing required data: opts.user._id`));
  if (typeof _.get(opts, `data`) === `undefined`) return cb(new Error(`Missing required data: opts.data`));
  if (typeof _.get(opts, `data.id`) === `undefined`) return cb(new Error(`Missing required data: opts.data.id`));
  if (typeof _.get(opts, `data.xml`) === `undefined`) return cb(new Error(`Missing required data: opts.data.xml`));
  if (typeof _.get(opts, `data.xml.source`) === `undefined`)
    return cb(new Error(`Missing required data: opts.data.xml.source`));
  if (typeof _.get(opts, `data.xml.content`) === `undefined`)
    return cb(new Error(`Missing required data: opts.data.xml.content`));
  let accessRights = AccountsManager.getAccessRights(opts.user, AccountsManager.match.all);
  if (!accessRights.isAdministrator) return cb(null, new Error(`Unauthorized functionnality`));
  let id = Params.convertToString(opts.data.id);
  return Self.get({ data: { id: opts.data.id, pdf: true, tei: true }, user: opts.user }, function (err, doc) {
    if (err) return cb(err);
    if (doc instanceof Error) return cb(null, doc);
    return DocumentsFilesController.readFileContent({ data: { id: doc.tei._id.toString() } }, function (err, content) {
      if (err) return next(err);
      if (content instanceof Error) return next(content);
      return Analyzer.checkSentencesContent(
        {
          source: {
            source: `dataseer`,
            content: content.data,
            metadata: doc.pdf && doc.pdf.metadata ? doc.pdf.metadata : doc.tei.metadata
          },
          target: { source: opts.data.xml.source, content: opts.data.xml.content }
        },
        function (err, res) {
          return cb(err, res);
        }
      );
    });
  });
};

/**
 * Check sentences content of a document by id
 * @param {object} opts - Options available
 * @param {object} opts.user - Current user
 * @param {object} opts.data - Data available
 * @param {string} opts.data.id - Id of the document
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: document instance OR undefined)
 * @returns {undefined} undefined
 */
Self.checkSentencesBoundingBoxes = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `user._id`) === `undefined`) return cb(new Error(`Missing required data: opts.user._id`));
  if (typeof _.get(opts, `data`) === `undefined`) return cb(new Error(`Missing required data: opts.data`));
  if (typeof _.get(opts, `data.id`) === `undefined`) return cb(new Error(`Missing required data: opts.data.id`));
  let accessRights = AccountsManager.getAccessRights(opts.user, AccountsManager.match.all);
  if (!accessRights.isAdministrator) return cb(null, new Error(`Unauthorized functionnality`));
  let id = Params.convertToString(opts.data.id);
  return Self.get({ data: { id: opts.data.id, pdf: true }, user: opts.user }, function (err, doc) {
    if (err) return cb(err);
    if (doc instanceof Error) return cb(null, doc);
    return Analyzer.checkSentencesBoundingBoxes({ metadata: doc.pdf.metadata }, function (err, res) {
      return cb(err, res);
    });
  });
};

/**
 * build the gSpeadsheets of the given document
 * @param {object} opts - Options available
 * @param {object} opts.user - Current user
 * @param {object} opts.data - Data available
 * @param {string} opts.data.id - Id of the document
 * @param {string} opts.kind - Kind of report (available values : ASAP or AmNat)
 * @param {boolean} opts.strict - Strict mode (default : true)
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: document instance OR undefined)
 * @returns {undefined} undefined
 */
Self.getGSpreadsheets = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `user._id`) === `undefined`) return cb(new Error(`Missing required data: opts.user._id`));
  if (typeof _.get(opts, `data`) === `undefined`) return cb(new Error(`Missing required data: opts.data`));
  if (typeof _.get(opts, `data.id`) === `undefined`) return cb(new Error(`Missing required data: opts.data.id`));
  if (typeof _.get(opts, `kind`) === `undefined`) return cb(new Error(`Missing required data: opts.kind`));
  if (typeof _.get(opts, `strict`) === `undefined`) return cb(new Error(`Missing required data: opts.kind`));
  let accessRights = AccountsManager.getAccessRights(opts.user, AccountsManager.match.all);
  if (!accessRights.authenticated) return cb(null, new Error(`Unauthorized functionnality`));
  let id = Params.convertToString(opts.data.id);
  let organizations = Params.convertToArray(opts.data.organizations, `string`);
  let kind = Params.convertToString(opts.kind);
  let strict = Params.convertToBoolean(opts.strict);
  return GoogleSheets.getReportFileId(
    { strict: strict, kind: kind, data: { name: id, organizations: organizations } },
    function (err, res) {
      return cb(err, res);
    }
  );
};

/**
 * Get the gSpeadsheets changes
 * @param {object} opts - Options available
 * @param {object} opts.user - Current user
 * @param {object} opts.data - Data available
 * @param {string} opts.data.old - Id of the reports (old)
 * @param {string} opts.data.new - Id of the reports (new)
 * @param {string} opts.kind - Kind of report (available values : ASAP or AmNat)
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: document instance OR undefined)
 * @returns {undefined} undefined
 */
Self.getGSpreadsheetsChanges = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `user._id`) === `undefined`) return cb(new Error(`Missing required data: opts.user._id`));
  if (typeof _.get(opts, `data`) === `undefined`) return cb(new Error(`Missing required data: opts.data`));
  if (typeof _.get(opts, `data.old`) === `undefined`) return cb(new Error(`Missing required data: opts.data.old`));
  if (typeof _.get(opts, `data.new`) === `undefined`) return cb(new Error(`Missing required data: opts.data.new`));
  let kind = _.get(opts, `kind`);
  if (typeof kind === `undefined`) return cb(Error(`Missing required data: opts.kind`));
  if (Object.keys(reportsConf.templates).indexOf(kind) === -1)
    return cb(Error(`Invalid required data: opts.kind must be ${Object.keys(reportsConf.templates).join(`, `)}`));
  let accessRights = AccountsManager.getAccessRights(opts.user);
  if (!accessRights.isAdministrator && !accessRights.isModerator)
    return cb(null, new Error(`Unauthorized functionnality`));
  return GoogleSheets.getReportsChanges(
    { data: { old: { spreadsheetId: opts.data.old }, new: { spreadsheetId: opts.data.new } } },
    function (err, infos) {
      if (err) return cb(err);
      let results = {
        metadata: {
          old: infos.old.metadata,
          new: infos.new.metadata
        },
        dataObjects: {}
      };
      for (let k in infos) {
        for (let kind in infos[k]) {
          if (kind === `metadata`) continue; // skip metadata part
          for (let i = 0; i < infos[k][kind].length; i++) {
            let dataObject = infos[k][kind][i];
            if (typeof results.dataObjects[kind] === `undefined`) results.dataObjects[kind] = {};
            if (typeof results.dataObjects[kind][dataObject.name] === `undefined`)
              results.dataObjects[kind][dataObject.name] = {};
            results.dataObjects[kind][dataObject.name][k] = dataObject;
            if (typeof results.dataObjects[kind][dataObject.name].old === `undefined`)
              results.dataObjects[kind][dataObject.name].change = `add`;
            else if (typeof results.dataObjects[kind][dataObject.name].new === `undefined`)
              results.dataObjects[kind][dataObject.name].change = `remove`;
            else {
              let diff = jsonDiff.diff(
                results.dataObjects[kind][dataObject.name].old,
                results.dataObjects[kind][dataObject.name].new
              );
              results.dataObjects[kind][dataObject.name].change = diff ? `modify` : `none`;
              results.dataObjects[kind][dataObject.name].diff = diff;
            }
          }
        }
      }
      if (err) return cb(err);
      return cb(null, results);
    }
  );
};

/**
 * build the gSpeadsheets of the given document
 * @param {object} opts - Options available
 * @param {object} opts.user - Current user
 * @param {object} opts.data - Data available
 * @param {object} opts.data.dataTypes - datatypes
 * @param {string} opts.data.id - Id of the document
 * @param {string} opts.kind - Kind of report (available values : ASAP or AmNat)
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: document instance OR undefined)
 * @returns {undefined} undefined
 */
Self.buildGSpreadsheets = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `user._id`) === `undefined`) return cb(new Error(`Missing required data: opts.user._id`));
  if (typeof _.get(opts, `data`) === `undefined`) return cb(new Error(`Missing required data: opts.data`));
  if (typeof _.get(opts, `data.id`) === `undefined`) return cb(new Error(`Missing required data: opts.data.id`));
  if (typeof _.get(opts, `data.dataTypes`) === `undefined`)
    return cb(new Error(`Missing required data: opts.dataTypes`));
  let kind = _.get(opts, `kind`);
  if (typeof kind === `undefined`) return cb(Error(`Missing required data: opts.kind`));
  if (Object.keys(reportsConf.templates).indexOf(kind) === -1)
    return cb(Error(`Invalid required data: opts.kind must be ${Object.keys(reportsConf.templates).join(`, `)}`));
  let accessRights = AccountsManager.getAccessRights(opts.user);
  if (!accessRights.isAdministrator && !accessRights.isModerator)
    return cb(null, new Error(`Unauthorized functionnality`));
  let id = Params.convertToString(opts.data.id);
  return Self.getReportData(
    {
      data: { id: opts.data.id, kind: `html`, organization: `default`, dataTypes: opts.data.dataTypes },
      user: opts.user
    },
    function (err, data) {
      if (err) return cb(err);
      if (data instanceof Error) return cb(null, data);
      return GoogleSheets.buildReport(
        {
          filename: `${data.doc.name} (${opts.data.id})`,
          kind: kind,
          data: [
            {
              document: {
                id: data.doc._id.toString(),
                token: data.doc.token,
                organizations: data.doc.organizations.map(function (item) {
                  return item._id.toString();
                })
              },
              dataTypesInfo: opts.data.dataTypes,
              metadata: {
                articleTitle: data.doc.metadata.article_title,
                readmeIncluded: data.doc.metadata.readmeIncluded,
                describesFiles: data.doc.metadata.describesFiles,
                describesVariables: data.doc.metadata.describesVariables,
                affiliationAcknowledgementsLicenseNotes: data.doc.metadata.affiliationAcknowledgementsLicenseNotes,
                doi: data.doc.metadata.doi,
                authors: data.doc.metadata.authors.filter(function (item) {
                  return item.name.length > 0;
                }),
                dataSeerLink: {
                  url: `${Url.build(`/documents/${opts.data.id}`, {
                    view: `datasets`,
                    fromReport: true,
                    token: data.doc.token
                  })}`,
                  label: data.doc.name ? data.doc.name : data.doc._id.toString()
                },
                originalFileLink: {
                  url: data.doc.urls.originalFile,
                  label: data.doc.name ? data.doc.name : data.doc._id.toString()
                },
                dataseerDomain: Url.build(`/`, {}),
                acknowledgement: data.doc.metadata.acknowledgement,
                affiliation: data.doc.metadata.affiliation,
                license: data.doc.metadata.license
              },
              dataObjectsMetadata: data.doc.dataObjects.metadata,
              summary: data.dataObjectsSummary,
              datasets: data.sortedDataObjectsInfo.datasets,
              protocols: data.sortedDataObjectsInfo.protocols,
              reagents: data.sortedDataObjectsInfo.reagents,
              code: data.sortedDataObjectsInfo.code,
              software: data.sortedDataObjectsInfo.software
            }
          ]
        },
        function (err, spreadsheetId) {
          if (err) return cb(err);
          return cb(null, spreadsheetId);
        }
      );
    }
  );
};

/**
 * build the gSpeadsheets of the given documents
 * @param {object} opts - Options available
 * @param {object} opts.user - Current user
 * @param {object} opts.data - Data available
 * @param {object} opts.data.dataTypes - datatypes
 * @param {string} opts.data.ids - Id of the document
 * @param {string} opts.kind - Kind of report (available values : ASAP or AmNat)
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: document instance OR undefined)
 * @returns {undefined} undefined
 */
Self._buildGSpreadsheets = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `user._id`) === `undefined`) return cb(new Error(`Missing required data: opts.user._id`));
  if (typeof _.get(opts, `data`) === `undefined`) return cb(new Error(`Missing required data: opts.data`));
  if (typeof _.get(opts, `data.ids`) === `undefined`) return cb(new Error(`Missing required data: opts.data.ids`));
  if (typeof _.get(opts, `data.dataTypes`) === `undefined`)
    return cb(new Error(`Missing required data: opts.dataTypes`));
  let kind = _.get(opts, `kind`);
  if (typeof kind === `undefined`) return cb(Error(`Missing required data: opts.kind`));
  if (Object.keys(reportsConf.templates).indexOf(kind) === -1)
    return cb(Error(`Invalid required data: opts.kind must be ${Object.keys(reportsConf.templates).join(`, `)}`));
  let accessRights = AccountsManager.getAccessRights(opts.user);
  if (!accessRights.isAdministrator && !accessRights.isModerator)
    return cb(null, new Error(`Unauthorized functionnality`));
  let ids = Params.convertToArray(opts.data.ids, `string`);
  let name = opts.data.name ? opts.data.name : ``;
  let preprints = Params.convertToArray(opts.data.preprints, `string`);
  let dois = Params.convertToArray(opts.data.dois, `string`);
  if (!Array.isArray(ids)) ids = [];
  let limit = ids.length;
  let list = [];
  for (let i = 0; i < limit; i++) {
    list.push({ id: ids[i] });
  }
  return async.mapSeries(
    list,
    function (item, next) {
      return Self.getReportData(
        {
          data: { id: item.id, kind: `html`, organization: `default`, dataTypes: opts.data.dataTypes },
          user: opts.user
        },
        function (err, data) {
          if (err) return next(err);
          if (data instanceof Error) return next(data);
          // HHMI report name format (ex "JC-11.23" -> if report name is "HHMI-0000JC-001" & document uploaded on "November 2023")
          if (kind === `HHMI`) {
            let date = new Date(data.doc.upload.date);
            name = `HHMI-${data.doc.name.substring(
              data.doc.name.lastIndexOf(`-`) - 2,
              data.doc.name.lastIndexOf(`-`)
            )}-${date.getUTCMonth() + 1}.${date.getUTCFullYear().toString().substring(2)}`.replace(`.pdf`, ``);
          }
          if (name === ``) name = data.doc.name;
          return next(null, {
            document: {
              id: data.doc._id.toString(),
              name: data.doc.name,
              token: data.doc.token,
              organizations: data.doc.organizations.map(function (item) {
                return item._id.toString();
              })
            },
            preprint: { url: data.doc.HHMI.preprint, doi: data.doc.HHMI.DOI },
            dataTypesInfo: opts.data.dataTypes,
            metadata: {
              DAS: data.doc.metadata.DAS,
              articleTitle: data.doc.metadata.article_title,
              readmeIncluded: data.doc.metadata.readmeIncluded,
              describesFiles: data.doc.metadata.describesFiles,
              describesVariables: data.doc.metadata.describesVariables,
              affiliationAcknowledgementsLicenseNotes: data.doc.metadata.affiliationAcknowledgementsLicenseNotes,
              doi: data.doc.metadata.doi,
              authors: data.doc.metadata.authors.filter(function (item) {
                return item.name.length > 0;
              }),
              dataSeerLink: {
                url: `${Url.build(`/documents/${item.id}`, {
                  view: `datasets`,
                  fromReport: true,
                  token: data.doc.token
                })}`,
                label: data.doc.name ? data.doc.name : data.doc._id.toString()
              },
              originalFileLink: {
                url: data.doc.urls.originalFile,
                label: data.doc.name ? data.doc.name : data.doc._id.toString()
              },
              dataseerDomain: Url.build(`/`, {}),
              acknowledgement: data.doc.metadata.acknowledgement,
              affiliation: data.doc.metadata.affiliation,
              license: data.doc.metadata.license
            },
            dataObjectsMetadata: data.doc.dataObjects.metadata,
            summary: data.dataObjectsSummary,
            datasets: data.sortedDataObjectsInfo.datasets,
            protocols: data.sortedDataObjectsInfo.protocols,
            reagents: data.sortedDataObjectsInfo.reagents,
            code: data.sortedDataObjectsInfo.code,
            software: data.sortedDataObjectsInfo.software
          });
        }
      );
    },
    function (err, res) {
      if (err) return cb(err);
      return GoogleSheets.buildReport(
        {
          filename: `${name} (${ids.join(`,`)})`,
          kind: kind,
          data: res
        },
        function (err, spreadsheetId) {
          if (err) return cb(err);
          return cb(null, spreadsheetId);
        }
      );
    }
  );
};

/**
 * Add watcher if necessary
 * This function must be done the quicker as possible
 * @param {string} token - Given JWT
 * @param {string} privateKey - Private key of JWT
 * @param {object} opts - JWT opts (see https://www.npmjs.com/package/jsonwebtoken#jwtverifytoken-secretorpublickey-options-callback)
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: decoded JWT OR undefined)
 * @returns {undefined} undefined
 */
Self.watch = function (req, res, next) {
  // Check all required data
  if (typeof req !== `object`) throw new Error(`Missing required data: req (express variable)`);
  if (typeof res !== `object`) throw new Error(`Missing required data: res (express variable)`);
  if (typeof next !== `function`) throw new Error(`Missing required data: next (express variable)`);
  if (!req.user) return next();
  let accountId = req.user._id.toString();
  if (conf.mongodb.default.accounts.id === accountId) return next(); // case this is a visitor
  let documentId = req.params.id;
  if (!documentId) return next();
  return Documents.findOne({ _id: documentId }, function (err, doc) {
    if (err || !doc) return next();
    if (doc.watchers.indexOf(accountId) === -1) {
      doc.watchers.push(accountId);
      return doc.save(function (err) {
        if (err) return next(err);
        else return next();
      });
    } else return next();
  });
};

/**
 * Extract token from request
 * @param {object} req - req  express params
 * @returns {string} Token or undefined
 */
Self.getTokenfromHeaderOrQuerystring = function (req) {
  if (typeof req !== `object`) throw new Error(`Missing required data: req (express variable)`);
  if (req.headers.authorization && req.headers.authorization.split(` `)[0] === `Bearer`) {
    return { token: req.headers.authorization.split(` `)[1], key: `token` };
  } else if (req.cookies && req.cookies.token) {
    return { token: req.cookies.token, key: `token` };
  } else if (req.query && req.query.token) {
    return { token: req.query.token, key: `token` };
  }
  return;
};

/**
 * Authenticate account with JWT (token)
 * @param {object} req - req express variable
 * @param {object} res - res express variable
 * @param {function} next - next express variable
 * @returns {undefined} undefined
 */
Self.authenticate = function (req, res, next) {
  // Check all required data
  if (typeof req !== `object`) throw new Error(`Missing required data: req (express variable)`);
  if (typeof res !== `object`) throw new Error(`Missing required data: res (express variable)`);
  if (typeof next !== `function`) throw new Error(`Missing required data: next (express variable)`);
  // If user is already authenticated with session, just go next
  if (req.user) return next();
  // Get token
  let tokenInfo = Self.getTokenfromHeaderOrQuerystring(req);
  if (!tokenInfo || !tokenInfo.token || !tokenInfo.key) return next();
  // Just try to authenticate. If it fail, just go next
  return JWT.check(tokenInfo.token, req.app.get(`private.key`), { ignoreExpiration: true }, function (err, decoded) {
    if (err || !decoded) return next();
    return Documents.findOne({ _id: decoded.documentId, [tokenInfo.key]: tokenInfo.token }, function (err, doc) {
      if (err || !doc) return next();
      return Accounts.findOne({ _id: decoded.accountId, disabled: false })
        .populate(`organizations`)
        .populate(`role`)
        .exec(function (err, user) {
          if (err || !user) return next();
          if (doc._id.toString() === decoded.documentId) {
            req.user = user; // Set user
            res.locals = { useDocumentToken: true };
          }
          return next();
        });
    });
  });
};

/**
 * Check token validity
 * @param {object} tokenInfo - Info about the token
 * @param {string} tokenInfo.token - Content of the token
 * @param {string} tokenInfo.key - Key of the token that must be used to find the account in mongodb
 * @param {object} tokenInfo.[opts] - Options sent to jwt.vertify function (default: {})
 * @param {object} opts - Options data
 * @param {string} opts.privateKey - Private key that must be used
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: decoded token OR undefined)
 * @returns {undefined} undefined
 */
Self.checkTokenValidity = function (tokenInfo = {}, opts = {}, cb) {
  // Check all required data
  if (typeof _.get(tokenInfo, `token`) === `undefined`) return cb(new Error(`Missing required data: tokenInfo.token`));
  if (typeof _.get(tokenInfo, `key`) === `undefined`) return cb(new Error(`Missing required data: tokenInfo.key`));
  if (typeof _.get(opts, `privateKey`) === `undefined`) return cb(new Error(`Missing required data: opts.privateKey`));
  // Check all optionnal data
  if (typeof _.get(tokenInfo, `opts`) === `undefined`) tokenInfo.opts = {};
  // Start process
  // Just try to authenticate. If it fail, just go next
  return JWT.check(tokenInfo.token, opts.privateKey, tokenInfo.opts, function (err, decoded) {
    let token = { valid: false };
    if (err && err.name !== `TokenExpiredError`) return cb(null, token);
    token.valid = true;
    token.revoked = true;
    if (err && err.name === `TokenExpiredError`) {
      token.expired = true;
      token.expiredAt = new Date(err.expiredAt).getTime() / 1000;
      return cb(null, token);
    } else token.expired = false;
    if (!decoded.documentId) return cb(null, new Error(`Bad token : does not contain enough data`));
    return Documents.findOne({ _id: decoded.documentId, [tokenInfo.key]: tokenInfo.token }, function (err, doc) {
      if (err) return cb(err);
      token.revoked = false;
      token.expiredAt = decoded.exp;
      return cb(null, token);
    });
  });
};

/**
 * Check params & build params for Self.upload() function
 * @returns {object} Options for Self.upload() function or new Error(msg)
 */
Self.getUploadParams = function (params = {}, user, cb) {
  params.organizations = Params.convertToArray(params.organizations, `string`);
  if (!params.files || !params.files[`file`]) return cb(null, new Error(`You must select a file`));
  let file = params.files[`file`];
  let krt = params.files[`krt`];
  if (typeof params.files[`attachedFiles`] !== `undefined` && !Array.isArray(params.files[`attachedFiles`])) {
    params.files[`attachedFiles`] = [params.files[`attachedFiles`]];
  }
  let attachedFiles = Array.isArray(params.files[`attachedFiles`]) ? params.files[`attachedFiles`] : [];
  let accessRights = AccountsManager.getAccessRights(user, AccountsManager.match.all);
  // Case user is not logged
  if (!accessRights.authenticated) {
    return Accounts.findOne({ _id: conf.mongodb.default.accounts.id }, function (err, account) {
      if (err) return cb(err);
      return cb(null, {
        organizations: account.organizations.map(function (item) {
          return item._id.toString();
        }),
        name: Params.convertToString(params.name),
        uploaded_by: account._id.toString(),
        owner: account._id.toString(),
        visible: false,
        locked: false,
        file: file,
        krt: krt,
        attachedFiles: attachedFiles,
        emails: undefined
      });
    });
  }
  if (accessRights.isStandardUser) {
    return cb(null, {
      organizations: AccountsManager.getOwnOrganizations(params.organizations, user),
      name: Params.convertToString(params.name),
      uploaded_by: user._id.toString(),
      owner: user._id.toString(),
      visible: true,
      locked: false,
      file: file,
      krt: krt,
      attachedFiles: attachedFiles,
      emails: user.username
    });
  }
  if (accessRights.isModerator || accessRights.isAdministrator) {
    return Accounts.findOne({ _id: params.owner }).exec(function (err, account) {
      if (err) return cb(err);
      if (!account) return cb(null, new Error(`Account not found`));
      let ownOrganizations = accessRights.isAdministrator
        ? Array.isArray(params.organizations)
          ? params.organizations
          : []
        : AccountsManager.getOwnOrganizations(params.organizations, account);
      return cb(null, {
        organizations: ownOrganizations,
        name: Params.convertToString(params.name),
        uploaded_by: user._id,
        owner: account._id,
        visible: Params.convertToBoolean(params.visible),
        locked: Params.convertToBoolean(params.locked),
        file: file,
        krt: krt,
        attachedFiles: attachedFiles,
        emails: `${account.username},${user.username}`
      });
    });
  }
};

/**
 * Write file on FileSystem and store attached data in MongoDB
 * @param {object} opts.data - Options available (You must call getUploadParams)
 * @param {object} opts.data.file - File representation
 * @param {string} opts.data.file.name - File name
 * @param {buffer} opts.data.file.data - File data
 * @param {number} opts.data.file.size - File size
 * @param {string} opts.data.file.encoding - File encoding
 * @param {string} opts.data.file.mimetype - File mimetype
 * @param {string} opts.data.file.md5 - File md5
 * @param {array} opts.data.attachedFiles - Array of attached files (same structure as opts.data.file)
 * @param {array} opts.data.organizations - Array of organizations id
 * @param {string} opts.data.owner - owner
 * @param {string} opts.data.uploaded_by - Id of uploader
 * @param {boolean} opts.data.visible - Visibility of the document
 * @param {boolean} opts.data.locked - Lock of the document
 * @param {string} opts.privateKey - PrivateKey to create JWT token (stored in app.get('private.key'))
 * @param {string} opts.dataTypes - dataTypes to create dataObjects (stored in app.get('dataTypes'))
 * @param {object} opts.user - Current user (must come from req.user)
 * @param {boolean} opts.[dataseerML] - Process dataseer-ml (default: true)
 * @param {boolean} opts.[removeResponseToViewerSection] - Remove "Response to viewer" section (default: false)
 * @param {boolean} opts.[mute] - Mute email notification (default: false)
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: Document instance OR undefined)
 * @returns {undefined} undefined
 */
Self.upload = function (opts = {}, cb) {
  // Set default value to opts.dataseerML
  if (typeof _.get(opts, `dataTypes`) === `undefined`) return cb(new Error(`Missing required data: opts.dataTypes`));
  if (typeof _.get(opts, `privateKey`) === `undefined`) return cb(new Error(`Missing required data: opts.privateKey`));
  let accessRights = AccountsManager.getAccessRights(opts.user, AccountsManager.match.all);
  if (typeof _.get(opts, `dataseerML`) === `undefined` || accessRights.isVisitor || accessRights.isStandardUser)
    opts.dataseerML = true;
  if (typeof _.get(opts, `mergePDFs`) === `undefined` || accessRights.isVisitor || accessRights.isStandardUser)
    opts.mergePDFs = true;
  if (typeof _.get(opts, `softcite`) === `undefined` || accessRights.isVisitor || accessRights.isStandardUser)
    opts.softcite = true;
  if (typeof _.get(opts, `bioNLP`) === `undefined` || accessRights.isVisitor || accessRights.isStandardUser)
    opts.bioNLP = true;
  opts.importDataFromKRT = typeof opts.importDataFromKRT !== `undefined` ? opts.importDataFromKRT : true;
  return Self.getUploadParams(opts.data, opts.user, function (err, params) {
    if (err) return cb(err);
    if (params instanceof Error) return cb(null, params);
    return Documents.create(
      {
        locked: opts.data.locked,
        watchers: []
      },
      function (err, doc) {
        if (err) return cb(err);
        let actions = [
          // Set opts.user if necessary
          function (acc, next) {
            if (!opts.user) {
              return Accounts.findOne({ _id: conf.mongodb.default.accounts.id }, function (err, account) {
                if (err) return next(err, acc);
                opts.user = account;
                return next(null, acc);
              });
            } else return next(null, acc);
          },
          // Get organization
          // Set organization & upload_journal properties
          function (acc, next) {
            if (params.organizations.length <= 0)
              return next(new Error(`You must select at least one organization`), acc);
            acc.organizations = params.organizations;
            return next(null, acc);
          },
          // Get account
          // Set owner property
          function (acc, next) {
            if (typeof params.owner === `undefined`) return next(new Error(`You must select an owner`), acc);
            // Set owner id
            acc.owner = params.owner;
            return next(null, acc);
          },
          // Set watchers & uploaded_by properties
          function (acc, next) {
            // Set opts.uploaded_by if uploader is not set (that means request comes from outside DataSeer app)
            if (typeof params.uploaded_by === `undefined`) params.uploaded_by = acc.owner;
            // Set watchers if necessary
            if (acc.watchers.indexOf(acc.owner) === -1) acc.watchers.push(acc.owner);
            if (acc.watchers.indexOf(params.uploaded_by) === -1) acc.watchers.push(params.uploaded_by); // Opts is good set him just before
            return next(null, acc);
          },
          // Create upload informations
          function (acc, next) {
            acc.upload = {
              account: params.uploaded_by,
              organizations: acc.organizations
            };
            return next(null, acc);
          },
          // Upload file
          function (acc, next) {
            if (
              !DocumentsFilesController.isPDF(params.file.mimetype) &&
              !DocumentsFilesController.isXML(params.file.mimetype) &&
              !accessRights.isAdministrator // to handle nxml format case
            )
              return next(new Error(`Bad content type`), acc);
            return DocumentsFilesController.upload(
              {
                data: {
                  accountId: params.uploaded_by.toString(),
                  documentId: acc._id.toString(),
                  file: params.file,
                  organizations: acc.upload.organizations
                },
                user: opts.user
              },
              function (err, res) {
                if (err) return next(err, acc);
                if (!Array.isArray(acc.files)) acc.files = [];
                // Add file to files
                acc.files.push(res._id);
                // Set document name
                acc.name = params.name ? params.name : res.filename;
                if (DocumentsFilesController.isPDF(res.mimetype)) {
                  // Set PDF
                  acc.pdf = res._id;
                  acc.originalPDF = res._id;
                }
                if (
                  DocumentsFilesController.isXML(res.mimetype) ||
                  accessRights.isAdministrator // to handle nxml format case
                ) {
                  // Set XML only when dataseer-ml do not need to be requested
                  acc.tei = res._id;
                }
                return next(null, acc);
              }
            );
          },
          // merge PDFs
          function (acc, next) {
            // No merge required
            if (!opts.mergePDFs) return next(null, acc);
            // Main file is not a PDF
            if (!DocumentsFilesController.isPDF(params.file.mimetype)) return next(new Error(`Bad content type`), acc);
            // There is no attached files
            if (!Array.isArray(params.attachedFiles) || params.attachedFiles.length <= 0) return next(null, acc);
            // Get attached PDFs
            let attachedPDFs = params.attachedFiles.filter(function (item) {
              return DocumentsFilesController.isPDF(item.mimetype);
            });
            // There is no PDFs in attached files
            if (attachedPDFs.length <= 0) return next(null, acc);
            return PdfManager.mergeFiles(
              { files: [params.file].concat(attachedPDFs), extension: `.pdf` },
              function (err, mergedFile) {
                if (err) return next(err, acc);
                return DocumentsFilesController.upload(
                  {
                    data: {
                      accountId: params.uploaded_by.toString(),
                      documentId: acc._id.toString(),
                      file: mergedFile,
                      organizations: acc.upload.organizations
                    },
                    user: opts.user
                  },
                  function (err, res) {
                    params.file = res;
                    // Set PDF
                    acc.pdf = res._id;
                    // Add file to files
                    acc.files.push(res._id);
                    return next(null, acc);
                  }
                );
              }
            );
          },
          // Upload krt
          function (acc, next) {
            if (!params.krt) return next(null, acc);
            if (!DocumentsFilesController.hasCSV(params.krt.mimetype)) return next(new Error(`Bad content type`), acc);
            return DocumentsFilesController.upload(
              {
                data: {
                  accountId: params.uploaded_by.toString(),
                  documentId: acc._id.toString(),
                  file: params.krt,
                  organizations: acc.upload.organizations
                },
                user: opts.user
              },
              function (err, res) {
                if (err) return next(err, acc);
                if (!Array.isArray(acc.files)) acc.files = [];
                // Add krt to files
                acc.files.push(res._id);
                acc.krt.source = res._id;
                return next(null, acc);
              }
            );
          },
          // Process removeResponseToViewerSection & replace pdf bny the new PDF
          function (acc, next) {
            // Only available for PDFs
            if (!DocumentsFilesController.isPDF(params.file.mimetype)) return next(null, acc);
            // Default value if user is not (Moderator or Administrator) and one of organizations is AmNat : true
            if (
              (accessRights.isVisitor || accessRights.isStandardUser) &&
              acc.organizations.indexOf(uploadConf.organizations.AmNat.organization.id) > -1
            )
              opts.removeResponseToViewerSection = true;
            // If removeResponseToViewerSection option is not defined (for Moderator or Administrator), then it's true by default
            if (
              (accessRights.isModerator || accessRights.isAdministrator) &&
              typeof opts.removeResponseToViewerSection === `undefined` &&
              acc.organizations.indexOf(uploadConf.organizations.AmNat.organization.id) > -1
            )
              opts.removeResponseToViewerSection = true;
            if (!opts.removeResponseToViewerSection) return next(null, acc);
            return PdfManager.removeResponseToViewerSection(
              {
                source: params.file.data
              },
              function (err, buffer) {
                if (err) return next(err, acc);
                // Case "response to viewer" sectrion not found
                if (buffer instanceof Error) return next(err, acc);
                return DocumentsFilesController.upload(
                  {
                    data: {
                      accountId: params.uploaded_by.toString(),
                      documentId: acc._id.toString(),
                      file: Object.assign(params.file, {
                        name: `${path.parse(params.file.name).name}.sanitized.pdf`,
                        data: buffer.toString(DocumentsFilesController.encoding),
                        encoding: DocumentsFilesController.encoding
                      }),
                      organizations: acc.upload.organizations
                    },
                    user: opts.user
                  },
                  function (err, res) {
                    if (err) return next(err, acc);
                    if (!Array.isArray(acc.files)) acc.files = [];
                    // Add file to files
                    acc.files.unshift(res._id);
                    // Set PDF
                    acc.pdf = res._id;
                    return next(null, acc);
                  }
                );
              }
            );
          },
          // Process dataseer-ml
          function (acc, next) {
            // Process dataseer-ml
            if (!opts.dataseerML) return next(null, acc);
            // Get buffer
            return DocumentsFilesController.readFile(
              { data: { id: acc.files[0].toString() } },
              function (err, content) {
                if (err) return next(err, acc);
                // Guess which kind of file it is to call the great function
                const fn = typeof acc.pdf !== `undefined` ? DataseerML.processPDF : DataseerML.processXML;
                return fn(content.data, function (err, tei) {
                  if (err) return next(err, acc);
                  return DocumentsFilesController.upload(
                    {
                      data: {
                        accountId: params.uploaded_by.toString(),
                        documentId: acc._id.toString(),
                        file: {
                          name: `${path.parse(params.file.name).name}.ds-ml.tei.xml`,
                          data: XML.sanitize(tei.toString(`utf8`)).toString(DocumentsFilesController.encoding),
                          mimetype: `application/xml`,
                          encoding: DocumentsFilesController.encoding
                        },
                        organizations: acc.upload.organizations
                      },
                      user: opts.user
                    },
                    function (err, res) {
                      if (err) return next(err, acc);
                      // Add file to files
                      acc.files.push(res._id);
                      // Set XML
                      acc.tei = res._id;
                      return next(null, acc);
                    }
                  );
                });
              }
            );
          },
          // Process softcite
          function (acc, next) {
            // Process softcite
            const isPDF = !!acc.pdf;
            if (!isPDF || (!opts.softcite && !opts.importDataFromSoftcite)) return next(null, acc);
            // Get buffer
            return DocumentsFilesController.readFile(
              { data: { id: acc.files[0].toString() } },
              function (err, content) {
                if (err) return next(err, acc);
                // Guess which kind of file it is to call the great function
                return Softcite.annotateSoftwarePDF({ disambiguate: true, buffer: content.data }, function (err, json) {
                  if (err) return next(null, acc);
                  return DocumentsFilesController.upload(
                    {
                      data: {
                        accountId: params.uploaded_by.toString(),
                        documentId: acc._id.toString(),
                        file: {
                          name: `${path.parse(params.file.name).name}.softcite.json`,
                          data: json.toString(DocumentsFilesController.encoding),
                          mimetype: `application/json`,
                          encoding: DocumentsFilesController.encoding
                        },
                        organizations: acc.upload.organizations
                      },
                      user: opts.user
                    },
                    function (err, res) {
                      if (err) return next(err, acc);
                      // Set softcite
                      acc.softcite = res._id;
                      // Add file to files
                      acc.files.push(res._id);
                      return next(null, acc);
                    }
                  );
                });
              }
            );
          },
          // Process BioNLP
          function (acc, next) {
            // Process BioNLP
            if (!opts.bioNLP && !opts.importDataFromBioNLP) return next(null, acc);
            // Get buffer
            return DocumentsFilesController.readFile({ data: { id: acc.tei.toString() } }, function (err, content) {
              if (err) return next(err, acc);
              let sentences = XML.extractTEISentences(
                XML.load(content.data.toString(DocumentsFilesController.encoding)),
                `array`
              );
              // Guess which kind of file it is to call the great function
              return BioNLP.processSentences(sentences, function (err, results) {
                if (err) return next(null, acc);
                return DocumentsFilesController.upload(
                  {
                    data: {
                      accountId: params.uploaded_by.toString(),
                      documentId: acc._id.toString(),
                      file: {
                        name: `${path.parse(params.file.name).name}.bioNLP.json`,
                        data: JSON.stringify(results).toString(DocumentsFilesController.encoding),
                        mimetype: `application/json`,
                        encoding: DocumentsFilesController.encoding
                      },
                      organizations: acc.upload.organizations
                    },
                    user: opts.user
                  },
                  function (err, res) {
                    if (err) return next(err, acc);
                    // Set bionlp
                    acc.bioNLP = res._id;
                    // Add file to files
                    acc.files.push(res._id);
                    return next(null, acc);
                  }
                );
              });
            });
          },
          // Process Key Resource Table
          function (acc, next) {
            // Process KRT
            if (!params.krt) return next(null, acc);
            // Get buffer
            return DocumentsFilesController.getFilePath(
              { data: { id: acc.krt.source.toString() } },
              function (err, filePath) {
                if (err) return next(err, acc);
                return processCSV({ csvFilePath: filePath, hash: acc._id.toString() })
                  .then((result) => {
                    return DocumentsFilesController.upload(
                      {
                        data: {
                          accountId: params.uploaded_by,
                          documentId: acc._id,
                          file: Object.assign(params.krt, {
                            name: `${path.parse(params.krt.name).name}.krt.pdf`,
                            mimetype: `application/pdf`,
                            data: result.pdf.toString(DocumentsFilesController.encoding),
                            encoding: DocumentsFilesController.encoding
                          }),
                          organizations: acc.upload.organizations
                        },
                        user: opts.user
                      },
                      function (err, res) {
                        if (err) return next(err, acc);
                        // Set krt.pdf
                        acc.krt.pdf = res._id;
                        // Add file to files
                        acc.files.push(res._id);
                        return DocumentsFilesController.upload(
                          {
                            data: {
                              accountId: params.uploaded_by,
                              documentId: acc._id,
                              file: Object.assign(params.krt, {
                                name: `${path.parse(params.krt.name).name}.krt.json`,
                                data: Buffer.from(JSON.stringify(result.json)).toString(
                                  DocumentsFilesController.encoding
                                ),
                                mimetype: `application/json`,
                                encoding: DocumentsFilesController.encoding
                              }),
                              organizations: acc.upload.organizations
                            },
                            user: opts.user
                          },
                          function (err, res) {
                            if (err) return next(err, acc);
                            // Set krt.json
                            acc.krt.json = res._id;
                            // Add file to files
                            acc.files.push(res._id);
                            return next(null, acc);
                          }
                        );
                      }
                    );
                  })
                  .catch((error) => {
                    console.error(`Error:`, error);
                    return next(null, acc);
                  });
                // Guess which kind of file it is to call the great function
              }
            );
          },
          // Refresh KRT
          function (acc, next) {
            if (!acc.krt.pdf || !acc.originalPDF) return next(null, acc);
            return Self.refreshKRT(
              {
                data: {
                  document: acc,
                  saveDocument: false, // Do not save the document
                  refreshKRTinPDF: true, // It will add the KRT table in the PDF
                  refreshTEIMetadata: false, // It will be refreshed after
                  refreshPDFMetadata: false, // It will be refreshed after
                  importDataFromKRT: false // It will be done after
                },
                user: opts.user
              },
              function (err, res) {
                if (err) return next(err, acc);
                acc = res;
                return next(null, acc);
              }
            );
          },
          // Process metadata
          function (acc, next) {
            return Self.updateOrCreateMetadata(
              {
                data: {
                  id: acc._id.toString(),
                  refreshDAS: true,
                  refreshORCIDsFromAPI: true,
                  refreshORCIDsFromASAPList: true,
                  automaticallySetPartOfASAPNetwork: true,
                  automaticallySetASAPAffiliationInUpload: true,
                  refreshAuthors: true
                },
                user: opts.user
              },
              function (err, metadata) {
                if (err) return next(err, acc);
                if (metadata instanceof Error) return next(metadata, acc);
                acc.metadata = metadata._id;
                acc.identifiers = {
                  doi: metadata.doi,
                  pmid: metadata.pmid,
                  manuscript_id: metadata.manuscript_id
                };
                acc.status = Self.status.metadata;
                return next(null, acc);
              }
            );
          },
          // Process dataObjects metadata
          function (acc, next) {
            return DocumentsDataObjectsMetadata.create({ document: acc._id.toString() }, function (err, metadata) {
              if (err) return next(err, acc);
              // Create logs
              return DocumentsLogsController.create(
                {
                  target: metadata.document,
                  account: opts.user._id,
                  kind: CrudManager.actions.create._id,
                  key: `documents.dataObjects.metadata`
                },
                function (err, log) {
                  if (err) return next(err, acc);
                  acc.dataObjects.metadata = metadata._id;
                  return next(null, acc);
                }
              );
            });
          },
          // Process dataObjects
          function (acc, next) {
            return DocumentsFilesController.readFile({ data: { id: acc.tei.toString() } }, function (err, content) {
              if (err) return next(err, acc);
              return Self.extractDataObjectsFromTEI(
                {
                  file: { id: acc.tei.toString(), xmlString: content.data.toString(DocumentsFilesController.encoding) },
                  user: opts.user,
                  dataTypes: opts.dataTypes,
                  setCustomDefaultProperties: uploadConf.setCustomDefaultProperties,
                  erase: true
                },
                function (err, dataObjects) {
                  if (err) return next(err, acc);
                  if (dataObjects instanceof Error) return next(dataObjects, acc);
                  let extractedDataObjects = dataObjects.map(function (item) {
                    let d = {
                      document: acc,
                      dataObject: item,
                      isExtracted: true,
                      isDeleted: false,
                      saveDocument: false
                    };
                    d.dataObject.document = acc._id.toString();
                    return d;
                  });
                  return Self.addDataObjects(
                    {
                      user: opts.user,
                      data: extractedDataObjects
                    },
                    function (err, res) {
                      if (err) return next(err, acc);
                      let errors = res.filter(function (item) {
                        return item.err;
                      });
                      if (errors.length > 0) return next(errors, acc);
                      return next(null, acc);
                    }
                  );
                }
              );
            });
          },
          // Process TEI metadata
          function (acc, next) {
            return Self.updateOrCreateTEIMetadata(
              { data: { id: acc._id.toString() }, user: opts.user },
              function (err, ok) {
                if (err) return next(err, acc);
                if (ok instanceof Error) return next(ok, acc);
                return next(null, acc);
              }
            );
          },
          // Process PDF metadata
          function (acc, next) {
            if (!acc.pdf) return next(null, acc);
            return Self.updateOrCreatePDFMetadata(
              { data: { id: acc._id.toString() }, user: opts.user },
              function (err, ok) {
                if (err) return next(err, acc);
                if (ok instanceof Error) return next(ok, acc);
                return next(null, acc);
              }
            );
          },
          // Upload attachedFiles
          function (acc, next) {
            if (!params.attachedFiles || !params.attachedFiles.length) return next(null, acc);
            return async.each(
              params.attachedFiles,
              function (file, callback) {
                return DocumentsFilesController.upload(
                  {
                    data: {
                      accountId: params.uploaded_by,
                      documentId: acc._id,
                      file: Object.assign(file, {
                        name: `attached-file.${file.name}`
                      }),
                      organizations: acc.upload.organizations
                    },
                    user: opts.user
                  },
                  function (err, file) {
                    // If error while uploading attachedFile
                    if (err) return callback(err);
                    else {
                      acc.files.push(file._id);
                      return callback();
                    }
                  }
                );
              },
              function (err) {
                return next(err, acc);
              }
            );
          },
          // Process softcite
          function (acc, next) {
            console.log(`importDataFromSoftcite`, opts.importDataFromSoftcite);
            if (!opts.importDataFromSoftcite) return next(null, acc);
            return Self.importDataFromSoftcite(
              {
                documentId: acc._id.toString(),
                user: opts.user,
                ignoreSoftCiteCommandLines: opts.ignoreSoftCiteCommandLines,
                ignoreSoftCiteSoftware: opts.ignoreSoftCiteSoftware,
                saveDocument: true
              },
              function (err, res) {
                return next(err, acc);
              }
            );
          },
          // Process BioNLP
          function (acc, next) {
            if (!opts.importDataFromBioNLP) return next(null, acc);
            return Self.importDataFromBioNLP(
              {
                documentId: acc._id.toString(),
                user: opts.user,
                saveDocument: true
              },
              function (err, res) {
                return next(err, acc);
              }
            );
          },
          // Process KRT
          function (acc, next) {
            if (!acc.krt.pdf || !acc.originalPDF) return next(null, acc);
            if (!opts.importDataFromKRT) return next(null, acc);
            return Self.importDataFromKRT(
              {
                documentId: acc._id.toString(),
                user: opts.user,
                saveDocument: true
              },
              function (err, res) {
                return next(err, acc);
              }
            );
          },
          // Refresh DataObjects (Indexes)
          function (acc, next) {
            return Self.refreshDataObjects({ user: opts.user, document: acc, resetIndex: true }, function (err, ok) {
              if (err) return next(err, acc);
              if (ok instanceof Error) return next(ok, acc);
              return next(null, acc);
            });
          }
        ];
        // Execute all actions & create document
        return async.reduce(
          actions, // [Function, function, ... ]
          doc, // document
          function (acc, action, next) {
            return action(acc, function (err, acc) {
              if (err) return next(err, acc);
              return acc.save(function (err) {
                return next(err, acc);
              });
            });
          },
          function (err, res) {
            if (err) {
              console.log(err);
              let documentId = _.get(res, `_id`, ``).toString();
              if (!documentId) return cb(null, err);
              return Self.delete({ data: { id: documentId }, user: opts.user, force: true }, function (_err) {
                if (_err) return cb(_err);
                return cb(null, err);
              });
            }
            // Create logs
            return DocumentsLogsController.create(
              {
                target: res._id,
                account: params.uploaded_by,
                kind: CrudManager.actions.create._id
              },
              function (err, log) {
                if (err) return cb(err);
                return Self.refreshToken(
                  { data: { id: res._id.toString() }, user: opts.user, privateKey: opts.privateKey },
                  function (err, res) {
                    if (err) return cb(err);
                    let url = Url.build(`documents/${res._id.toString()}`);
                    if (typeof _.get(opts, `mute`) === `undefined` || !accessRights.isAdministrator)
                      opts.mute =
                        res.upload.organizations.filter(function (_item) {
                          return _item.settings.upload.mute;
                        }).length > 0;
                    let mute = Params.convertToBoolean(opts.mute);
                    if (mute) return cb(null, res);
                    return Mailer.sendMail(
                      {
                        to: params.emails ? params.emails : Mailer.default.bcc,
                        bcc: params.emails ? Mailer.default.bcc : undefined,
                        template: Mailer.templates.documents.upload,
                        data: { document: res, url: url, user: opts.user }
                      },
                      function (err, info) {
                        if (err) return cb(err);
                        return cb(null, res);
                      }
                    );
                  }
                );
              }
            );
          }
        );
      }
    );
  });
};

/**
 * Patch DataObjects sentences
 * @param {object} opts - JSON object containing all data
 * @param {object} opts.user - Current user
 * @param {function} cb - Callback function(err) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.patchDataObjectSentences = function (opts, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  let transaction = DocumentsDataObjects.find({ 'sentences.text': `` });
  transaction.populate(`document`);
  transaction.exec(function (err, dataObjects) {
    if (err) return cb(err);
    if (!dataObjects) return cb(null, new Error(`DataObjects not found`));
    let count = dataObjects.length;
    return async.mapSeries(
      dataObjects,
      function (dataObject, next) {
        return DocumentsFilesController.readFile(
          { data: { id: dataObject.document.tei.toString() } },
          function (err, content) {
            let sentences = XML.extractTEISentences(
              XML.load(content.data.toString(DocumentsFilesController.encoding)),
              `object`
            );
            if (!Array.isArray(dataObject.sentences) || dataObject.sentences.length <= 0) return next();
            for (let i = 0; i < dataObject.sentences.length; i++) {
              let sentence = dataObject.sentences[i];
              if (sentence.text === `` && sentence.id !== ``) sentence.text = sentences[sentence.id].text;
            }
            return DocumentsDataObjects.updateOne({ _id: dataObject._id }, dataObject, function (err, res) {
              return next(err);
            });
          }
        );
      },
      function (err) {
        return cb(err, err ? false : dataObjects.length);
      }
    );
  });
};

/**
 * Patch converted document
 * @param {object} opts - JSON object containing all data
 * @param {object} opts.user - Current user
 * @param {string} opts.documentId - Document id
 * @param {boolean} opts.dataTypes - DataTypes
 * @param {function} cb - Callback function(err) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.patchConvertedDocument = function (opts, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `documentId`) === `undefined`) return cb(new Error(`Missing required data: opts.documentId`));
  return Self.get(
    { data: { id: opts.documentId.toString(), dataObjects: true, datasets: true }, user: opts.user },
    function (err, doc) {
      if (err) return cb(err);
      if (doc instanceof Error) return cb(null, doc);
      let dataObjectsNames = doc.dataObjects.current
        .filter(function (item) {
          return item.name.match(/(dataset\-\d+)/g) === null;
        })
        .map(function (item) {
          return item.name;
        });
      let oldDatasets = doc.datasets
        ? doc.datasets.current
          .filter(function (item) {
            return item.sentences.length > 0 && item.name !== `` && dataObjectsNames.indexOf(item.name) === -1;
          })
          .map(function (item) {
            return { data: item, matched: false };
          })
        : [];
      let dataObjects = [];
      for (let i = 0; i < doc.dataObjects.current.length; i++) {
        let current = doc.dataObjects.current[i];
        let sentencesIds = current.sentences.map(function (item) {
          return item.id;
        });
        let matchingName = current.name.match(/(dataset\-\d+)/g);
        if (!Array.isArray(matchingName) || matchingName.length !== 1) continue;
        for (let j = 0; j < oldDatasets.length; j++) {
          let oldDataset = oldDatasets[j];
          if (oldDataset.matched) continue;
          let matched =
            oldDataset.data.sentences.filter(function (s) {
              return sentencesIds.indexOf(s.id) > -1;
            }).length === oldDataset.data.sentences.length &&
            oldDataset.data.dataType === current.dataType &&
            oldDataset.data.subType === current.subType;
          if (matched) {
            oldDataset.matched = true;
            let d = {
              document: doc,
              dataObject: DataObjects.create(oldDataset.data),
              saveDocument: false
            };
            d.dataObject._id = current._id.toString();
            d.dataObject.document = doc._id.toString();
            dataObjects.push(d);
            break;
          }
        }
      }
      if (dataObjects.length <= 0) return cb(null, true);
      return Self.updateDataObjects({ user: opts.user, data: dataObjects }, function (err, ok) {
        if (err) return cb(err);
        if (ok instanceof Error) return cb(null, ok);
        return cb(null, true);
      });
    }
  );
};

/**
 * Convert Old document
 * @param {object} opts - JSON object containing all data
 * @param {object} opts.user - Current user
 * @param {string} opts.documentId - Document id
 * @param {boolean} opts.dataTypes - DataTypes
 * @param {function} cb - Callback function(err) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.convertOldDocument = function (opts, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `documentId`) === `undefined`) return cb(new Error(`Missing required data: opts.documentId`));
  let actions = [
    function (acc, next) {
      return Self.get(
        { data: { id: opts.documentId.toString(), dataObjects: true, datasets: true }, user: opts.user },
        function (err, doc) {
          if (err) return next(err);
          if (doc instanceof Error) return next(doc);
          if (_.get(doc, `dataObjects.metadata`) !== null)
            return next(new Error(`This document can't be converted (already processed)`));
          doc.dataObjects = { metadata: null, current: [], deleted: [], extracted: [] };
          acc.document = doc;
          return next(null, acc);
        }
      );
    },
    function (acc, next) {
      return DocumentsDataObjectsMetadata.create({ document: acc.document._id.toString() }, function (err, metadata) {
        if (err) return next(err);
        if (metadata instanceof Error) return next(metadata);
        acc.document.dataObjects.metadata = metadata._id.toString();
        acc.metadata = metadata;
        return next(null, acc);
      });
    },
    function (acc, next) {
      // Create logs
      return DocumentsLogsController.create(
        {
          target: acc.metadata.document,
          account: opts.user._id,
          kind: CrudManager.actions.create._id,
          key: `documents.dataObjects.metadata`
        },
        function (err, log) {
          if (err) return next(err);
          if (log instanceof Error) return next(log);
          return next(null, acc);
        }
      );
    },
    function (acc, next) {
      if (_.get(acc, `document.tei`) === null)
        return next(new Error(`This document can't be converted (TEI not found)`));
      return DocumentsFilesController.readFile({ data: { id: acc.document.tei.toString() } }, function (err, content) {
        if (err) return next(err);
        return Self.extractDataObjectsFromTEI(
          {
            file: {
              id: acc.document.tei.toString(),
              xmlString: content.data.toString(DocumentsFilesController.encoding)
            },
            user: opts.user,
            dataTypes: opts.dataTypes,
            setCustomDefaultProperties: uploadConf.setCustomDefaultProperties,
            erase: true
          },
          function (err, dataObjects) {
            if (err) return next(err);
            if (dataObjects instanceof Error) return next(dataObjects);
            let currentDataObjects = dataObjects
              .filter(function (item) {
                return item.sentences.length > 0;
              })
              .map(function (item) {
                let d = {
                  document: acc.document,
                  dataObject: item,
                  isExtracted: false,
                  isDeleted: false,
                  saveDocument: false
                };
                return d;
              });
            if (currentDataObjects.length <= 0) return next(null, acc);
            return Self.addDataObjects({ user: opts.user, data: currentDataObjects }, function (err, res) {
              if (err) return next(err);
              let errors = res.filter(function (item) {
                return item.err;
              });
              if (errors.length > 0) return next(errors);
              return next(null, acc);
            });
          }
        );
      });
    },
    function (acc, next) {
      // Create logs
      return DocumentsLogsController.create(
        {
          target: acc.document._id,
          account: opts.user._id,
          kind: CrudManager.actions.update._id,
          key: `convert documents.datasets.current`
        },
        function (err, log) {
          if (err) return next(err);
          if (log instanceof Error) return next(log);
          return next(null, acc);
        }
      );
    },
    // Directly create dataObjects (no need to write nything in the TEI)
    function (acc, next) {
      let extracted = _.get(acc.document, `datasets.extracted`, []);
      let deleted = _.get(acc.document, `datasets.deleted`, []);
      let extractedDataObjects = extracted.map(function (item) {
        let d = DataObjects.create(item);
        d.document = acc.document._id.toString();
        d.extracted = true;
        d.deleted = false;
        return d;
      });
      let deletedDataObjects = deleted.map(function (item) {
        let d = DataObjects.create(item);
        d.document = acc.document._id.toString();
        d.extracted = false;
        d.deleted = true;
        return d;
      });
      let dataObjects = [].concat(extractedDataObjects).concat(deletedDataObjects);
      if (dataObjects.length <= 0) return next(null, acc);
      return async.mapSeries(
        dataObjects,
        function (item, _next) {
          return DocumentsDataObjects.create(item, function (err, dataObject) {
            if (err) return _next(err);
            if (dataObject instanceof Error) return _next(dataObject);
            if (item.deleted) acc.document.dataObjects.deleted.push(dataObject._id.toString());
            if (item.extracted) acc.document.dataObjects.extracted.push(dataObject._id.toString());
            return _next();
          });
        },
        function (err) {
          if (err) return next(err, acc);
          return next(null, acc);
        }
      );
    },
    function (acc, next) {
      // Create logs
      return DocumentsLogsController.create(
        {
          target: acc.document._id,
          account: opts.user._id,
          kind: CrudManager.actions.update._id,
          key: `convert documents.datasets.deleted`
        },
        function (err, log) {
          if (err) return next(err);
          if (log instanceof Error) return next(log);
          return next(null, acc);
        }
      );
    },
    function (acc, next) {
      // Create logs
      return DocumentsLogsController.create(
        {
          target: acc.document._id,
          account: opts.user._id,
          kind: CrudManager.actions.update._id,
          key: `convert documents.datasets.extracted`
        },
        function (err, log) {
          if (err) return next(err);
          if (log instanceof Error) return next(log);
          return next(null, acc);
        }
      );
    },
    function (acc, next) {
      return Self.refreshDataObjects({ user: opts.user, document: acc.document, resetIndex: true }, function (err, ok) {
        if (err) return next(err, acc);
        if (ok instanceof Error) return next(ok, acc);
        return next(null, acc);
      });
    },
    function (acc, next) {
      return acc.document.save(function (err) {
        if (err) return next(err);
        return next(null, acc.document);
      });
    }
  ];
  return async.reduce(
    actions,
    {},
    function (acc, action, next) {
      return action(acc, function (err, acc) {
        return next(err, acc);
      });
    },
    function (err, res) {
      if (err) return cb(err);
      return cb(null, res);
    }
  );
};

/**
 * Refresh the KRT of a given document
 * @param {object} opts - Options available (You must call getUploadParams)
 * @param {object} opts.data - Data available
 * @param {object} opts.data.document - Document
 * @param {boolean} opts.data.saveDocument - Save the document
 * @param {boolean} opts.data.refreshKRTinPDF - Add KRT in the PDF
 * @param {boolean} opts.data.refreshPDFMetadata - Refresh PDF metadata
 * @param {boolean} opts.data.refreshTEIMetadata - Refresh TEI metadata
 * @param {boolean} opts.data.importDataFromKRT - Import DataObjects
 * @param {object} opts.user - Current user
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: document OR new Error)
 * @returns {undefined} undefined
 */
Self.refreshKRT = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `data`) === `undefined`) return cb(new Error(`Missing required data: opts.data`));
  if (typeof _.get(opts, `data.document`) === `undefined`)
    return cb(new Error(`Missing required data: opts.data.document`));
  let doc = opts.data.document;
  if (!doc.tei) return cb(new Error(`Missing required data: opts.data.document.tei`));
  if (!doc.originalPDF) return cb(new Error(`Missing required data: opts.data.document.originalPDF`));
  if (!doc.krt.pdf) return cb(new Error(`Missing required data: opts.data.document.krt.pdf`));
  if (!doc.krt.json) return cb(new Error(`Missing required data: opts.data.document.krt.json`));
  let saveDocument = typeof opts.data.saveDocument !== `undefined` ? !!opts.data.saveDocument : false; // True by default
  let refreshKRTinPDF = !!opts.data.refreshKRTinPDF;
  let refreshPDFMetadata = !!opts.data.refreshPDFMetadata;
  let refreshTEIMetadata = !!opts.data.refreshTEIMetadata;
  let importDataFromKRT = !!opts.data.importDataFromKRT;
  let mapping = {};
  return async.mapSeries(
    [
      // Refresh the current PDF
      function (next) {
        if (!refreshKRTinPDF || !doc.originalPDF || !doc.krt.pdf) return next();
        return DocumentsFilesController.readFile({ data: { id: doc.originalPDF.toString() } }, function (err, pdfFile) {
          if (err) return next(err);
          return DocumentsFilesController.readFile({ data: { id: doc.krt.pdf.toString() } }, function (err, krtFile) {
            if (err) return next(err);
            return PdfManager.getPagesNumberOfFiles(
              {
                files: [
                  { name: `pdf`, data: pdfFile.data },
                  { name: `krt`, data: krtFile.data }
                ]
              },
              function (err, res) {
                mapping = res; // get pages numbers of PDFs
                return PdfManager.mergeFiles(
                  { files: [pdfFile, krtFile], extension: `.krt.merged.pdf` },
                  function (err, mergedPDF) {
                    if (err) return next(err);
                    return DocumentsFilesController.upload(
                      {
                        data: {
                          accountId: doc.upload.account.toString(),
                          documentId: doc._id.toString(),
                          file: mergedPDF,
                          organizations: doc.upload.organizations
                        },
                        user: opts.user
                      },
                      function (err, res) {
                        if (err) return next(err);
                        doc.pdf = res._id;
                        doc.files.push(res._id);
                        return next();
                      }
                    );
                  }
                );
              }
            );
          });
        });
      },
      // Add sentences in the TEI
      function (next) {
        if (!refreshKRTinPDF || !doc.tei || !doc.krt.json) return next();
        return DocumentsFilesController.readFile({ data: { id: doc.tei.toString() } }, function (err, teiContent) {
          if (err) return next(err);
          return DocumentsFilesController.readFile(
            { data: { id: doc.krt.json.toString() } },
            function (err, jsonContent) {
              if (err) return next(err);
              let xmlString = teiContent.data.toString(DocumentsFilesController.encoding);
              let krtData = JSON.parse(jsonContent.data.toString(DocumentsFilesController.encoding));
              let pageOffset = mapping[`pdf`];
              let newSentences = krtData.lines
                .filter(function (item) {
                  return !item.isHeader;
                })
                .map(function (item, i) {
                  return {
                    id: `krt-sentence-${item.line}`,
                    p: pageOffset + item.page,
                    x: item.x,
                    y: krtData.pages.height - item.y,
                    w: item.width,
                    h: item.height,
                    text: item.cells[krtConfig.columnIndexes[`ResourceName`]].content
                  };
                });
              let outpout = XML.addSentences(xmlString, newSentences, `krt`);
              return DocumentsFilesController.rewriteFile(doc.tei.toString(), outpout, function (err) {
                if (err) return next(err);
                return next();
              });
            }
          );
        });
      },
      // Refresh TEI Metadata
      function (next) {
        if (!refreshTEIMetadata) return next();
        return Self.updateOrCreateTEIMetadata(
          { data: { id: doc._id.toString() }, user: opts.user },
          function (err, ok) {
            if (err) return next(err);
            if (ok instanceof Error) return next(ok);
            return next();
          }
        );
      },
      // Refresh PDF Metadata
      function (next) {
        if (!refreshPDFMetadata) return next();
        return Self.updateOrCreatePDFMetadata(
          { data: { id: doc._id.toString() }, user: opts.user },
          function (err, ok) {
            if (err) return next(err);
            if (ok instanceof Error) return next(ok);
            return next();
          }
        );
      },
      // Import DataObjects
      function (next) {
        if (!importDataFromKRT) return next();
        return Self.importDataFromKRT(
          { user: opts.user, documentId: doc._id.toString(), saveDocument: saveDocument },
          function (err, ok) {
            if (err) return next(err);
            if (ok instanceof Error) return next(ok);
            return next();
          }
        );
      },
      // Save Document
      function (next) {
        if (!saveDocument) return next();
        return doc.save(function (err) {
          if (err) return next(err);
          return next();
        });
      }
    ],
    function (action, next) {
      return action(function (err) {
        return next(err);
      });
    },
    function (err) {
      return cb(err, doc);
    }
  );
};

/**
 * Extract data from softcie result
 * @param {object} opts - JSON object containing all data
 * @param {object} opts.user - Current user
 * @param {string} opts.documentId - Document id
 * @param {function} cb - Callback function(err) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.extractDataFromKRT = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `documentId`) === `undefined`) return cb(new Error(`Missing required data: opts.documentId`));
  return Self.get(
    { data: { id: opts.documentId.toString(), dataObjects: true }, user: opts.user },
    function (err, doc) {
      if (err) return cb(err);
      if (doc instanceof Error) return cb(null, doc);
      let currentDataObjects = doc.dataObjects.current.map(function (item) {
        return { ...item };
      });
      return Self.getKRTResults(
        {
          documentId: opts.documentId.toString(),
          user: opts.user
        },
        function (err, jsonData) {
          if (err) return cb(err);
          if (jsonData instanceof Error) return cb(null, jsonData);
          let results = [];
          for (let i = 0; i < jsonData.lines.length; i++) {
            let item = jsonData.lines[i];
            if (item.isHeader) continue; // Do not process headers
            let resourceType = item.cells[krtConfig.columnIndexes[`ResourceType`]].content;
            let resourceName = item.cells[krtConfig.columnIndexes[`ResourceName`]].content;
            let source = item.cells[krtConfig.columnIndexes[`Source`]].content;
            let identifiers = item.cells[krtConfig.columnIndexes[`Identifer`]].content;
            let additionalInformation = item.cells[krtConfig.columnIndexes[`AdditionalInformation`]].content;
            let { dataType, subType } =
              typeof krtRules.resourceType[resourceType] !== `undefined`
                ? krtRules.resourceType[resourceType]
                : krtRules.default;
            let { URL, PID, DOI, RRID, catalogNumber } = extractIdentifiers(identifiers);
            let dataObject = DataObjects.create({
              reuse: false,
              dataType: dataType,
              subType: subType,
              cert: `1`,
              name: resourceName,
              URL: URL,
              PID: PID,
              DOI: DOI,
              RRID: RRID,
              source: source,
              catalogNumber: catalogNumber,
              comments: additionalInformation,
              sentences: [{ id: `krt-sentence-${item.line}`, text: resourceName }]
            });
            if (dataObject.kind !== `reagent`) dataObject.source = ``; // Do not use source for dataObject NOT reagent
            dataObject.document = doc._id.toString();
            results.push(dataObject);
          }
          return cb(null, results);
        }
      );
    }
  );
};

/**
 * Extract data from softcie result
 * @param {object} opts - JSON object containing all data
 * @param {object} opts.user - Current user
 * @param {string} opts.documentId - Document id
 * @param {boolean} opts.softcite - Enable/disable softcite service request (default: true)
 * @param {boolean} opts.refreshData - Refresh data (force request softcite)
 * @param {function} cb - Callback function(err) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.extractDataFromSoftcite = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `documentId`) === `undefined`) return cb(new Error(`Missing required data: opts.documentId`));
  return Self.get(
    { data: { id: opts.documentId.toString(), dataObjects: true, pdf: true }, user: opts.user },
    function (err, doc) {
      if (err) return cb(err);
      if (doc instanceof Error) return cb(null, doc);
      let codeAndSoftware = doc.dataObjects.current.filter(function (item) {
        return item.kind === `code` || item.kind === `software`;
      });
      return Self.getSoftciteResults(
        {
          documentId: opts.documentId.toString(),
          user: opts.user,
          softcite: opts.softcite,
          refreshData: opts.refreshData
        },
        function (err, jsonData) {
          if (err) return cb(err);
          if (jsonData instanceof Error) return cb(null, jsonData);
          return DocumentsFilesController.readFile({ data: { id: doc.tei.toString() } }, function (err, xmlContent) {
            if (err) return cb(err);
            if (xmlContent instanceof Error) return cb(null, xmlContent);
            let $ = XML.load(xmlContent.data.toString(DocumentsFilesController.encoding));
            let software = {};
            if (!jsonData.mentions || !Array.isArray(jsonData.mentions)) return cb(null, software);
            for (let i = 0; i < jsonData.mentions.length; i++) {
              let mention = jsonData.mentions[i];
              let name = mention[`software-name`]?.normalizedForm || ``;
              let version = mention[`version`]?.normalizedForm || ``;
              let url = mention[`url`]?.normalizedForm || ``;
              let id = `${name.toLowerCase()}`;
              let identifier = `${name}${version ? ` ${version}` : ``}`;
              let areas = mention[`software-name`]?.boundingBoxes || [];
              let text = mention[`context`] || ``;
              for (let j = 0; j < areas.length; j++) {
                let item = areas[j];
                if (typeof item.p !== `number`) return;
                let pageMapping = doc.pdf.metadata.pages[item.p] ? doc.pdf.metadata.pages[item.p].sentences : {};
                let idsOfSentences = Object.keys(pageMapping);
                let results = idsOfSentences.map(function (k) {
                  let matches = doc.pdf.metadata.sentences[k].areas
                    .map(function (area) {
                      return area.boxes
                        .filter(function (box) {
                          return box.p === item.p;
                        })
                        .map(function (box) {
                          let bboxTEI = { x0: box.min.x, x1: box.max.x, y0: box.min.y, y1: box.max.y };
                          let bboxSoftcite = { x0: item.x, x1: item.x + item.w, y0: item.y, y1: item.y + item.h };
                          let areaTEI = (bboxTEI.x1 - bboxTEI.x0) * (bboxTEI.y1 - bboxTEI.y0);
                          let areaSoftcite = (bboxSoftcite.x1 - bboxSoftcite.x0) * (bboxSoftcite.y1 - bboxSoftcite.y0);
                          let overlap = OCR.getIntersectingRectangle(bboxTEI, bboxSoftcite);
                          if (overlap) {
                            let areaOverlap = (overlap.x1 - overlap.x0) * (overlap.y1 - overlap.y0);
                            let textTEI = $(`s[xml\\:id="${box.sentence.id}"]`).text();
                            let softMatch = Analyzer.softMatch(
                              textTEI.replace(/\s+/gm, ` `),
                              text.replace(/\s+/gm, ` `),
                              0.85
                            );
                            let strictMatch = textTEI.replace(/\s+/gm, ` `) === text.replace(/\s+/gm, ` `);
                            let sameAera = areaOverlap / areaSoftcite >= 0.8;
                            let match = (strictMatch || softMatch) && sameAera;
                            return {
                              id: area.sentence.id,
                              text: textTEI,
                              TEI: textTEI,
                              Softcite: text,
                              index: doc.pdf.metadata.mapping.object[area.sentence.id],
                              match
                            };
                          }
                        });
                    })
                    .flat()
                    .filter(function (e) {
                      return typeof e !== `undefined`;
                    });
                  if (typeof software[id] === `undefined`) {
                    software[id] = { name, version, url, sentences: matches, mentions: {} };
                  } else if (typeof software[id] === `object`)
                    software[id].sentences = software[id].sentences.concat(matches).sort(function (a, b) {
                      if (!a.match) return 1;
                      if (!b.match) return -1;
                      return a.index - b.index;
                    });
                  software[id].mentions[identifier] = true;
                });
              }
            }
            let ids = Object.keys(software);
            let results = [];
            for (let i = 0; i < ids.length; i++) {
              let id = ids[i];
              let s = software[id];
              s.match =
                s.sentences.filter(function (e) {
                  return e.match;
                }).length > 0;
              s.isCommandLine = !!SoftwareConf[s.name.toLowerCase()];
              s.mentions = Object.keys(s.mentions);
              s.alreadyExist =
                codeAndSoftware.filter(function (e) {
                  return e.name === s.name;
                }).length > 0;
              results.push(s);
            }
            return cb(null, results);
          });
        }
      );
    }
  );
};

/**
 * Extract data from Bio NLP result
 * @param {object} opts - JSON object containing all data
 * @param {object} opts.user - Current user
 * @param {string} opts.documentId - Document id
 * @param {array} opts.pages - List of pages
 * @param {boolean} opts.labMaterialsSectionsOnly - Automatically detect lab materials sections (default: false)
 * @param {boolean} opts.bioNLP - Enable/disable bioNLP service request (default: true)
 * @param {boolean} opts.refreshData - Refresh data (force request bioNLP)
 * @param {function} cb - Callback function(err) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.extractDataFromBioNLP = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `documentId`) === `undefined`) return cb(new Error(`Missing required data: opts.documentId`));
  if (typeof _.get(opts, `bioNLP`) === `undefined`) opts.bioNLP = true;
  if (typeof _.get(opts, `refreshData`) === `undefined`) opts.refreshData = false;
  if (typeof _.get(opts, `pages`) === `undefined`) opts.pages = [];
  if (typeof _.get(opts, `labMaterialsSectionsOnly`) === `undefined`) opts.labMaterialsSectionsOnly = false;
  return Self.get(
    { data: { id: opts.documentId.toString(), dataObjects: true }, user: opts.user },
    function (err, doc) {
      if (err) return cb(err);
      if (doc instanceof Error) return cb(null, doc);
      let labMaterials = doc.dataObjects.current.filter(function (item) {
        return item.kind === `reagent`;
      });
      return Self.getSentencesMetadata(
        { user: opts.user, documentId: opts.documentId.toString() },
        function (err, metadata) {
          if (err) return cb(err);
          if (metadata instanceof Error) return cb(null, metadata);
          let mapping = metadata.mapping.object;
          let sort = Self.sortSentencesUsingMapping(mapping);
          return DocumentsFilesController.readFile({ data: { id: doc.tei.toString() } }, function (err, content) {
            if (err) return next(err, content);
            let sentences = XML.extractTEISentences(
              XML.load(content.data.toString(DocumentsFilesController.encoding)),
              `array`
            );
            if (opts.labMaterialsSectionsOnly) sentences = Self.filterBioNLPSentences(sentences.sort(sort));
            if (opts.pages.length > 0) {
              sentences = sentences.filter(function (item) {
                return (
                  Object.keys(metadata.sentences[item.id].pages).filter(function (page) {
                    return opts.pages.indexOf(parseInt(page)) > -1;
                  }).length > 0
                );
              });
            }
            let sentencesMapping = sentences.reduce(function (acc, item) {
              acc[item.id] = item;
              return acc;
            }, {});
            return Self.getBioNLPResults(
              {
                documentId: opts.documentId.toString(),
                user: opts.user,
                pages: opts.pages,
                bioNLP: opts.bioNLP,
                refreshData: opts.refreshData
              },
              function (err, jsonData) {
                if (err) return cb(err);
                if (jsonData instanceof Error) return cb(null, jsonData);
                let tmp = {};
                let tags = {};
                for (let key in jsonData.BIONLP) {
                  let sentenceId = key;
                  // Check pages of sentence if there are restricted pages
                  if (typeof sentencesMapping[sentenceId] === `undefined`) continue;
                  let items = jsonData.BIONLP[key];
                  for (let i = 0; i < items.length; i++) {
                    // TO DO : Manage BIONLP results & create data objects found in sentences
                    let item = items[i];
                    if (item.token === ``) continue;
                    let name = item.token;
                    let types = [];
                    let shouldCreateDataObject = false;
                    let comments = [];

                    if (typeof tags[name] === `undefined`) {
                      tags[name] = {
                        'BioNLPLabMaterial': {},
                        'GenTaggType': {},
                        'CraftLabMaterial': {},
                        'Gazetteer Antibodies': {},
                        'Gazetteer Cell Lines': {},
                        'Gazetteer Plasmids': {}
                      };
                    }
                    let alreadyExist =
                      labMaterials.filter(function (e) {
                        return e.name === name;
                      }).length > 0;
                    // Check all tags
                    for (let k in bioNLPConf) {
                      tags[name][k][item[k].toString()] = true;
                      if (typeof item[k] !== `undefined` && typeof bioNLPConf[k][item[k]] !== `undefined`) {
                        // Add tag
                        // Set given dataType/subType
                        types.push({
                          dataType: bioNLPConf[k][item[k].toString()].dataType,
                          subType: bioNLPConf[k][item[k].toString()].subType
                        });
                      } else {
                        // Set default dataType/subType
                        types.push({
                          dataType: bioNLPConf[k][`default`].dataType,
                          subType: bioNLPConf[k][`default`].subType
                        });
                      }
                    }
                    let filteredTypes = types.filter(function (t) {
                      return t.dataType !== ``;
                    });
                    if (filteredTypes.length <= 0) continue;
                    let dataType = filteredTypes[0].dataType;
                    let subType = filteredTypes[0].subType;
                    // Set DataObject values
                    if (typeof tmp[name] === `undefined`) tmp[name] = {};
                    if (typeof tmp[name][`${dataType}:${subType}`] === `undefined`) {
                      tmp[name][`${dataType}:${subType}`] = {
                        alreadyExist,
                        name,
                        dataType,
                        subType,
                        comments: JSON.stringify(tags[name], null, 2),
                        sentences: [{ id: sentenceId }]
                      };
                    } else {
                      let alreadyIn =
                        tmp[name][`${dataType}:${subType}`].sentences.filter(function (s) {
                          return s.id === sentenceId;
                        }).length > 0;
                      if (!alreadyIn) {
                        tmp[name][`${dataType}:${subType}`].comments = JSON.stringify(tags[name], null, 2);
                        tmp[name][`${dataType}:${subType}`].sentences.push({ id: sentenceId });
                      }
                    }
                  }
                }
                // let csv = Object.keys(tags)
                //   .map(function (k) {
                //     return [
                //       `"${k}"`,
                //       `"${!!tags[k][`Gazetteer Antibodies`][`0`]}"`,
                //       `"${!!tags[k][`Gazetteer Antibodies`][`1`]}"`,
                //       `"${!!tags[k][`Gazetteer Cell Lines`][`0`]}"`,
                //       `"${!!tags[k][`Gazetteer Cell Lines`][`1`]}"`,
                //       `"${!!tags[k][`Gazetteer Plasmids`][`0`]}"`,
                //       `"${!!tags[k][`Gazetteer Plasmids`][`1`]}"`,
                //       `"${!!tags[k][`BioNLPLabMaterial`][`I-CL`]}"`,
                //       `"${!!tags[k][`BioNLPLabMaterial`][`I-ORG`]}"`,
                //       `"${!!tags[k][`BioNLPLabMaterial`][`I-PLS`]}"`,
                //       `"${!!tags[k][`BioNLPLabMaterial`][`I-AB`]}"`,
                //       `"${!!tags[k][`GenTaggType`][`cell_type`]}"`,
                //       `"${!!tags[k][`GenTaggType`][`protein`]}"`,
                //       `"${!!tags[k][`GenTaggType`][`DNA`]}"`,
                //       `"${!!tags[k][`GenTaggType`][`RNA`]}"`,
                //       `"${!!tags[k][`GenTaggType`][`cell_line`]}"`,
                //       `"${!!tags[k][`CraftLabMaterial`][`CHEBI`]}"`,
                //       `"${!!tags[k][`CraftLabMaterial`][`UBERON`]}"`,
                //       `"${!!tags[k][`CraftLabMaterial`][`NCBITaxon`]}"`,
                //       `"${!!tags[k][`CraftLabMaterial`][`GO_BP`]}"`,
                //       `"${!!tags[k][`CraftLabMaterial`][`PR`]}"`,
                //       `"${!!tags[k][`CraftLabMaterial`][`GO_CC`]}"`,
                //       `"${!!tags[k][`CraftLabMaterial`][`SO`]}"`,
                //       `"${!!tags[k][`CraftLabMaterial`][`CL`]}"`
                //     ].join(`,`);
                //   })
                //   .join(`\n`);
                // fs.writeFileSync(`~/${doc.name}.csv`, csv);
                // Convert tmp to an array
                let results = [];
                let names = Object.keys(tmp);
                for (let i = 0; i < names.length; i++) {
                  let types = Object.keys(tmp[names[i]]);
                  for (let j = 0; j < types.length; j++) {
                    let dataObject = tmp[names[i]][types[j]];
                    dataObject.sentences = dataObject.sentences
                      .map(function (s) {
                        return { ...sentencesMapping[s.id] };
                      })
                      .sort(sort);
                    dataObject.index = mapping[dataObject.sentences[0].id];
                    results.push(dataObject);
                  }
                }
                return cb(null, results);
              }
            );
          });
        }
      );
    }
  );
};

/**
 * Import data from KRT in the document
 * @param {object} opts - JSON object containing all data
 * @param {object} opts.user - Current user
 * @param {string} opts.documentId - Document id
 * @param {boolean} opts.saveDocument - Save document
 * @param {function} cb - Callback function(err) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.importDataFromKRT = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `documentId`) === `undefined`) return cb(new Error(`Missing required data: opts.documentId`));
  if (typeof _.get(opts, `saveDocument`) === `undefined`) opts.saveDocument = false;
  return Self.get({ data: { id: opts.documentId.toString() }, user: opts.user }, function (err, doc) {
    if (err) return cb(err);
    if (doc instanceof Error) return cb(null, doc);
    return Self.extractDataFromKRT(opts, function (err, dataObjects) {
      if (err) return cb(err);
      if (dataObjects instanceof Error) return cb(null, dataObjects);
      if (dataObjects.length === 0) return cb(null, dataObjects);
      return Self.addDataObjects(
        {
          user: opts.user,
          data: dataObjects.map(function (item) {
            return { isExtracted: true, dataObject: item, document: doc, saveDocument: opts.saveDocument };
          })
        },
        function (err, res) {
          return cb(err, dataObjects);
        }
      );
    });
  });
};

/**
 * Import data from softcite in the document
 * @param {object} opts - JSON object containing all data
 * @param {object} opts.user - Current user
 * @param {string} opts.documentId - Document id
 * @param {boolean} opts.softcite - Enable/disable softcite service request (default: true)
 * @param {boolean} opts.refreshData - Refresh data (force request softcite)
 * @param {boolean} opts.ignoreCommandLines - Ignore command lines, they won't be created (default: false)
 * @param {boolean} opts.ignoreSoftware - Ignore software, they won't be created (default: false)
 * @param {boolean} opts.saveDocument - Save document
 * @param {function} cb - Callback function(err) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.importDataFromSoftcite = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `documentId`) === `undefined`) return cb(new Error(`Missing required data: opts.documentId`));
  if (typeof _.get(opts, `refreshData`) === `undefined`) opts.refreshData = false;
  if (typeof _.get(opts, `ignoreSoftCiteCommandLines`) === `undefined`) opts.ignoreSoftCiteCommandLines = false;
  if (typeof _.get(opts, `ignoreSoftCiteSoftware`) === `undefined`) opts.ignoreSoftCiteSoftware = false;
  return Self.get({ data: { id: opts.documentId.toString() }, user: opts.user }, function (err, doc) {
    if (err) return cb(err);
    if (doc instanceof Error) return cb(null, doc);
    return Self.extractDataFromSoftcite(opts, function (err, software) {
      if (err) return cb(err);
      if (software instanceof Error) return cb(null, software);
      let softCiteCommandLines = opts.ignoreSoftCiteCommandLines
        ? []
        : software
          .filter(function (item) {
            if (!item.match) return false;
            if (item.alreadyExist) return false;
            if (!item.isCommandLine) return false;
            return true;
          })
          .map(function (item) {
            let d = {
              document: doc,
              dataObject: DataObjects.create({
                index: item.sentences[0].index,
                reuse: false,
                dataType: `code software`,
                subType: `custom scripts`,
                cert: `0`,
                name: item.name + ` Code`,
                URL: ``,
                comments: item.mentions.join(`, `),
                sentences: item.sentences.filter(function (e) {
                  return e.match;
                })
              }),
              isExtracted: true,
              isDeleted: false,
              saveDocument: opts.saveDocument
            };
            d.dataObject.document = doc._id.toString();
            return d;
          });
      let softCiteSoftware = opts.ignoreSoftCiteSoftware
        ? []
        : software
          .filter(function (item) {
            if (!item.match) return false;
            if (item.alreadyExist) return false;
            return true;
          })
          .map(function (item) {
            let d = {
              document: doc,
              dataObject: DataObjects.create({
                index: item.sentences[0].index,
                reuse: true,
                dataType: `code software`,
                subType: `software`,
                cert: `0`,
                name: item.name,
                version: item.version,
                URL: item.url,
                comments: item.mentions.join(`, `),
                sentences: item.sentences.filter(function (e) {
                  return e.match;
                })
              }),
              isExtracted: true,
              isDeleted: false,
              saveDocument: opts.saveDocument
            };
            d.dataObject.document = doc._id.toString();
            return d;
          });
      return Self.addDataObjects(
        {
          user: opts.user,
          data: softCiteCommandLines.concat(softCiteSoftware)
        },
        function (err, res) {
          return cb(err, software);
        }
      );
    });
  });
};

/**
 * Import data from Bio NLP in the document
 * @param {object} opts - JSON object containing all data
 * @param {object} opts.user - Current user
 * @param {string} opts.documentId - Document id
 * @param {array} opts.pages - List of pages
 * @param {boolean} opts.labMaterialsSectionsOnly - Automatically detect lab materials sections (default: false)
 * @param {boolean} opts.bioNLP - Enable/disable bioNLP request (default: true)
 * @param {boolean} opts.refreshData - Refresh data (force request bioNLP)
 * @param {boolean} opts.saveDocument - Save document
 * @param {boolean} opts.saveDocument - Save document
 * @param {function} cb - Callback function(err) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.importDataFromBioNLP = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `documentId`) === `undefined`) return cb(new Error(`Missing required data: opts.documentId`));
  if (typeof _.get(opts, `refreshData`) === `undefined`) opts.refreshData = false;
  if (typeof _.get(opts, `pages`) === `undefined`) opts.pages = [];
  if (typeof _.get(opts, `labMaterialsSectionsOnly`) === `undefined`) opts.labMaterialsSectionsOnly = false;
  if (typeof _.get(opts, `bioNLP`) === `undefined`) opts.bioNLP = true;
  return Self.get({ data: { id: opts.documentId.toString() }, user: opts.user }, function (err, doc) {
    if (err) return cb(err);
    if (doc instanceof Error) return cb(null, doc);
    return Self.extractDataFromBioNLP(opts, function (err, data) {
      if (err) return cb(err);
      if (data instanceof Error) return cb(null, data);
      let dataObjects = data
        .filter(function (item) {
          return !item.alreadyExist;
        })
        .map(function (item) {
          let d = {
            document: doc,
            dataObject: DataObjects.create({
              reuse: false,
              index: item.index,
              dataType: item.dataType,
              subType: item.subType,
              cert: `0`,
              name: item.name,
              comments: item.comments,
              sentences: item.sentences
            }),
            isExtracted: true,
            isDeleted: false,
            saveDocument: opts.saveDocument
          };
          d.dataObject.document = doc._id.toString();
          return d;
        });
      if (dataObjects.length <= 0) return cb(err, data);
      return Self.addDataObjects(
        {
          user: opts.user,
          data: dataObjects
        },
        function (err, res) {
          return cb(err, data);
        }
      );
    });
  });
};

/**
 * Get KRT results
 * @param {object} opts - JSON object containing all data
 * @param {object} opts.user - Current user
 * @param {string} opts.documentId - Document id
 * @param {function} cb - Callback function(err) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.getKRTResults = function (opts, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `documentId`) === `undefined`) return cb(new Error(`Missing required data: opts.documentId`));
  return Self.get({ data: { id: opts.documentId.toString() }, user: opts.user }, function (err, doc) {
    if (err) return cb(err);
    if (doc instanceof Error) return cb(null, doc);
    if (!doc.krt.json) return cb(new Error(`Local data not found, functionnality unavailable`));
    return DocumentsFilesController.readFile({ data: { id: doc.krt.json.toString() } }, function (err, jsonContent) {
      if (err) return cb(err);
      if (jsonContent instanceof Error) return cb(null, jsonContent);
      return cb(null, JSON.parse(jsonContent.data.toString(DocumentsFilesController.encoding)));
    });
  });
};

/**
 * Get softcite results
 * @param {object} opts - JSON object containing all data
 * @param {object} opts.user - Current user
 * @param {string} opts.documentId - Document id
 * @param {boolean} opts.softcite - Enable/disable softcite service request (default: true)
 * @param {boolean} opts.refreshData - Refresh data (force request softcite)
 * @param {function} cb - Callback function(err) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.getSoftciteResults = function (opts, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `documentId`) === `undefined`) return cb(new Error(`Missing required data: opts.documentId`));
  if (typeof _.get(opts, `softcite`) === `undefined`) opts.softcite = true;
  if (typeof _.get(opts, `refreshData`) === `undefined`) opts.refreshData = false;
  return Self.get({ data: { id: opts.documentId.toString() }, user: opts.user }, function (err, doc) {
    if (err) return cb(err);
    if (doc instanceof Error) return cb(null, doc);
    return async.reduce(
      [
        // Read local Data
        function (acc, next) {
          if (acc instanceof Error) return next(acc);
          if (!doc.softcite) {
            acc.fromFile = new Error(`Local data not found, functionnality unavailable`);
            return next(null, acc);
          }
          return DocumentsFilesController.readFile(
            { data: { id: doc.softcite.toString() } },
            function (err, jsonContent) {
              if (err) return next(err);
              if (jsonContent instanceof Error) {
                acc.fromFile = jsonContent;
                return next(null, acc);
              }
              acc.fromFile = {
                name: `${doc.name}.softcite.json`,
                data: jsonContent.data.toString(DocumentsFilesController.encoding),
                mimetype: `application/json`,
                encoding: DocumentsFilesController.encoding
              };
              return next(null, acc);
            }
          );
        },
        // Call Softcite service if necessary
        function (acc, next) {
          if (!opts.softcite) return next(null, acc);
          if (!opts.refreshData && !(acc.fromFile instanceof Error)) return next(null, acc);
          if (!doc.pdf) {
            acc.fromSoftcite = new Error(`PDF not found, functionnality unavailable`);
            return next(null, acc);
          }
          return DocumentsFilesController.readFile({ data: { id: doc.pdf.toString() } }, function (err, contentPDF) {
            if (err) return next(err);
            if (contentPDF instanceof Error) {
              acc.fromSoftcite = contentPDF;
              return next(null, acc);
            }
            return Softcite.annotateSoftwarePDF(
              { disambiguate: true, buffer: contentPDF.data },
              function (err, buffer) {
                if (err) return next(err);
                if (buffer instanceof Error) {
                  acc.fromSoftcite = buffer;
                  return next(null, acc);
                }
                acc.fromSoftcite = {
                  name: `${doc.name}.softcite.json`,
                  data: buffer.toString(DocumentsFilesController.encoding),
                  mimetype: `application/json`,
                  encoding: DocumentsFilesController.encoding
                };
                return next(null, acc);
              }
            );
          });
        },
        // Write/Rewrite Data if necessary
        function (acc, next) {
          let alreadyExist = !!doc.softcite;
          // By default use softcite version
          let requestFailed = acc.fromSoftcite instanceof Error;
          let readFileFailed = acc.fromFile instanceof Error;
          let file =
            acc.fromSoftcite && !requestFailed
              ? acc.fromSoftcite
              : acc.fromFile && !readFileFailed
                ? acc.fromFile
                : new Error(`Error: No data available (from softcite or local file)`);
          if (file instanceof Error) return next(null, file);
          if (alreadyExist)
            return DocumentsFilesController.rewriteFile(doc.softcite.toString(), file.data, function (err) {
              if (err) return next(err);
              return next(null, file.data);
            });
          return DocumentsFilesController.upload(
            {
              data: {
                accountId: opts.user._id.toString(),
                documentId: doc._id.toString(),
                file: file,
                organizations: doc.upload.organizations.map(function (item) {
                  return item._id.toString();
                })
              },
              user: opts.user
            },
            function (err, res) {
              if (err) return next(err, acc);
              // Set softcite
              doc.softcite = res._id;
              // Add file to files
              doc.files.push(res._id);
              return doc.save(function (err) {
                return next(err, file.data);
              });
            }
          );
        },
        // Parse Data to JSON
        function (acc, next) {
          if (acc instanceof Error) return next(null, acc);
          let json = {};
          try {
            json = JSON.parse(acc);
          } catch (e) {
            return next(e);
          }
          return next(null, json);
        }
      ],
      {},
      function (acc, action, next) {
        return action(acc, function (err, acc) {
          return next(err, acc);
        });
      },
      function (err, res) {
        if (err) return cb(err);
        return cb(null, res);
      }
    );
  });
};

/**
 * Filter sentences based on automatically detected sections
 * @param {array} sentences - sentences
 * @returns {array} Array of filtered sentences
 */
Self.filterBioNLPSentences = function (sentences) {
  let index = 0;
  for (let i = 0; i < sentences.length; i++) {
    let sentence = sentences[i];
    if (sentence.head && XML.checkHeaderContent(sentence.text)) {
      index = i;
      break;
    }
  }
  return sentences.slice(index);
};

/**
 * Get Bio NLP results
 * @param {object} opts - JSON object containing all data
 * @param {object} opts.user - Current user
 * @param {string} opts.documentId - Document id
 * @param {boolean} opts.bioNLP - Enable/disable bioNLP service request (default: true)
 * @param {array} opts.pages - List of pages
 * @param {boolean} opts.labMaterialsSectionsOnly - Automatically detect lab materials sections (default: false)
 * @param {boolean} opts.refreshData - Refresh data (force request bioNLP)
 * @param {function} cb - Callback function(err) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.getBioNLPResults = function (opts, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `documentId`) === `undefined`) return cb(new Error(`Missing required data: opts.documentId`));
  if (typeof _.get(opts, `bioNLP`) === `undefined`) opts.bioNLP = true;
  if (typeof _.get(opts, `refreshData`) === `undefined`) opts.refreshData = false;
  if (typeof _.get(opts, `pages`) === `undefined`) opts.pages = [];
  if (typeof _.get(opts, `labMaterialsSectionsOnly`) === `undefined`) opts.labMaterialsSectionsOnly = false;
  return Self.get({ data: { id: opts.documentId.toString() }, user: opts.user }, function (err, doc) {
    if (err) return cb(err);
    if (doc instanceof Error) return cb(null, doc);
    return async.reduce(
      [
        function (acc, next) {
          if (acc instanceof Error) return next(acc);
          return Self.getSentencesMetadata(
            { user: opts.user, documentId: opts.documentId.toString() },
            function (err, metadata) {
              if (err) return next(err);
              if (metadata instanceof Error) return next(null, metadata);
              acc.metadata = metadata;
              acc.sort = Self.sortSentencesUsingMapping(metadata.mapping.object);
              return next(null, acc);
            }
          );
        },
        // Read local Data
        function (acc, next) {
          if (acc instanceof Error) return next(acc);
          if (!doc.bioNLP) {
            acc.fromFile = new Error(`Local data not found, functionnality unavailable`);
            return next(null, acc);
          }
          return DocumentsFilesController.readFile(
            { data: { id: doc.bioNLP.toString() } },
            function (err, jsonContent) {
              if (err) return next(err);
              if (jsonContent instanceof Error) {
                acc.fromFile = jsonContent;
                return next(null, acc);
              }
              acc.fromFile = {
                name: `${doc.name}.bioNLP.json`,
                data: jsonContent.data.toString(DocumentsFilesController.encoding),
                mimetype: `application/json`,
                encoding: DocumentsFilesController.encoding
              };
              return next(null, acc);
            }
          );
        },
        // Call Bio NLP service if necessary
        function (acc, next) {
          if (!opts.bioNLP) return next(null, acc);
          if (!opts.refreshData && !(acc.fromFile instanceof Error)) return next(null, acc);
          if (!doc.tei) {
            acc.fromBioNLP = new Error(`TEI not found, functionnality unavailable`);
            return next(null, acc);
          }
          return DocumentsFilesController.readFile({ data: { id: doc.tei.toString() } }, function (err, contentTEI) {
            if (err) return next(err);
            if (contentTEI instanceof Error) {
              acc.fromBioNLP = contentTEI;
              return next(null, acc);
            }
            let sentences = XML.extractTEISentences(
              XML.load(contentTEI.data.toString(DocumentsFilesController.encoding)),
              `array`
            );
            if (opts.labMaterialsSectionsOnly) sentences = Self.filterBioNLPSentences(sentences.sort(acc.sort));
            if (opts.pages.length > 0) {
              sentences = sentences.filter(function (item) {
                return (
                  Object.keys(acc.metadata.sentences[item.id].pages).filter(function (page) {
                    return opts.pages.indexOf(parseInt(page)) > -1;
                  }).length > 0
                );
              });
            }
            return BioNLP.processSentences(sentences, function (err, results) {
              if (err) return next(err);
              if (results instanceof Error) {
                acc.fromBioNLP = results;
                return next(null, acc);
              }
              acc.fromBioNLP = {
                name: `${doc.name}.bioNLP.json`,
                data: JSON.stringify(results).toString(DocumentsFilesController.encoding),
                mimetype: `application/json`,
                encoding: DocumentsFilesController.encoding
              };
              return next(null, acc);
            });
          });
        },
        // Write/Rewrite Data if necessary
        function (acc, next) {
          let alreadyExist = !!doc.bioNLP;
          // By default use bioNLP version
          let requestFailed = acc.fromBioNLP instanceof Error;
          let readFileFailed = acc.fromFile instanceof Error;
          let file =
            acc.fromBioNLP && !requestFailed
              ? acc.fromBioNLP
              : acc.fromFile && !readFileFailed
                ? acc.fromFile
                : new Error(`Error: No data available (from bioNLP or local file)`);
          if (file instanceof Error) return next(null, file);
          if (alreadyExist)
            return DocumentsFilesController.rewriteFile(doc.bioNLP.toString(), file.data, function (err) {
              if (err) return next(err);
              return next(null, file.data);
            });
          return DocumentsFilesController.upload(
            {
              data: {
                accountId: opts.user._id.toString(),
                documentId: doc._id.toString(),
                file: file,
                organizations: doc.upload.organizations.map(function (item) {
                  return item._id.toString();
                })
              },
              user: opts.user
            },
            function (err, res) {
              if (err) return next(err, acc);
              // Set bioNLP
              doc.bioNLP = res._id;
              // Add file to files
              doc.files.push(res._id);
              return doc.save(function (err) {
                return next(err, file.data);
              });
            }
          );
        },
        // Parse Data to JSON
        function (acc, next) {
          if (acc instanceof Error) return next(null, acc);
          let json = {};
          try {
            json = JSON.parse(acc);
          } catch (e) {
            return next(e);
          }
          return next(null, json);
        }
      ],
      {},
      function (acc, action, next) {
        return action(acc, function (err, acc) {
          return next(err, acc);
        });
      },
      function (err, res) {
        if (err) return cb(err);
        return cb(null, res);
      }
    );
  });
};

/**
 * Refresh the token of a given document
 * @param {object} opts - Options available (You must call getUploadParams)
 * @param {object} opts.data - Data available
 * @param {string} opts.data.id - Document id
 * @param {object} opts.user - Current user
 * @param {string} opts.privateKey - Private key of JWT
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: ObjectId OR new Error)
 * @returns {undefined} undefined
 */
Self.refreshToken = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(conf, `mongodb.default.accounts.id`) === `undefined`)
    return cb(new Error(`Missing required data: conf.mongodb.default.accounts.id`));
  if (typeof _.get(opts, `privateKey`) === `undefined`) return cb(new Error(`Missing required data: opts.privateKey`));
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `data`) === `undefined`) return cb(new Error(`Missing required data: opts.data`));
  if (typeof _.get(opts, `data.id`) === `undefined`) return cb(new Error(`Missing required data: opts.data.id`));
  return Self.get({ data: { id: opts.data.id }, user: opts.user }, function (err, doc) {
    if (err) return cb(err);
    if (doc instanceof Error) return cb(null, doc);
    return JWT.create(
      {
        documentId: doc._id,
        accountId: conf.mongodb.default.accounts.id
      },
      opts.privateKey,
      conf.tokens.documents.expiresIn,
      function (err, token) {
        if (err) return cb(err);
        doc.token = token;
        return doc.save(function (err) {
          if (err) return cb(err);
          // Create logs
          return DocumentsLogsController.create(
            {
              target: doc._id,
              account: opts.user._id,
              kind: CrudManager.actions.update._id,
              key: `refreshToken`
            },
            function (err, log) {
              if (err) return cb(err);
              return cb(null, doc);
            }
          );
        });
      }
    );
  });
};

/**
 * search for documents
 * @param {object} opts - Options available
 * @param {object} opts.data - Data available
 * @param {string} opts.data.query - Global query
 * @param {array} opts.data.fields - Fields
 * @param {string} opts.data.documents - Custom query for document collection
 * @param {string} opts.data.metadata - Custom query for metadata collection
 * @param {object} opts.user - Current user
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: ObjectId OR new Error)
 * @returns {undefined} undefined
 */
Self.search = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `data`) === `undefined`) return cb(new Error(`Missing required data: opts.data`));
  let query = _.get(opts, `data.query`, ``);
  if (!query) return cb(null, new Error(`Error : Empty search request`));
  let fieldsArray = _.get(opts, `data.fields`, []);
  let fields = fieldsArray.reduce(
    function (acc, item) {
      let split = item.split(`.`);
      if (split.length !== 2) return acc;
      if (split[0] === `document`) acc.document[split[1]] = true;
      else if (split[0] === `metadata`) acc.metadata[split[1]] = true;
      return acc;
    },
    { document: {}, metadata: {} }
  );
  let filteredQuery = query.toString().trim().replace(/\s+/gim, ` `).replace(`,`, `|`);
  let queryDocuments = _.get(opts, `data.documents`, filteredQuery);
  let queryMetadata = _.get(opts, `data.metadata`, filteredQuery);
  let regexDocuments = queryDocuments.toString().trim().replace(/\s+/gim, ` `).replace(`,`, `|`);
  let regexMetadata = queryMetadata.toString().trim().replace(/\s+/gim, ` `).replace(`,`, `|`);
  let documentsQuery = { '$or': [] };
  if (typeof fields.document === `object`) {
    if (fields.document[`name`]) documentsQuery[`$or`].push({ 'name': { '$regex': regexDocuments, $options: `imx` } });
    if (fields.document[`doi`])
      documentsQuery[`$or`].push({ 'identifiers.doi': { '$regex': regexDocuments, $options: `imx` } });
    if (fields.document[`pmid`])
      documentsQuery[`$or`].push({ 'identifiers.pmid': { '$regex': regexDocuments, $options: `imx` } });
    if (fields.document[`manuscript_id`])
      documentsQuery[`$or`].push({ 'identifiers.manuscript_id': { '$regex': regexDocuments, $options: `imx` } });
  }
  let metadataQuery = { '$or': [] };
  if (typeof fields.metadata === `object`) {
    if (fields.metadata[`article_title`])
      metadataQuery[`$or`].push({ 'article_title': { '$regex': regexMetadata, $options: `imx` } });
    if (fields.metadata[`doi`]) metadataQuery[`$or`].push({ 'doi': { '$regex': regexMetadata, $options: `imx` } });
    if (fields.metadata[`isbn`]) metadataQuery[`$or`].push({ 'isbn': { '$regex': regexMetadata, $options: `imx` } });
    if (fields.metadata[`journal`])
      metadataQuery[`$or`].push({ 'journal': { '$regex': regexMetadata, $options: `imx` } });
    if (fields.metadata[`manuscript_id`])
      metadataQuery[`$or`].push({ 'manuscript_id': { '$regex': regexMetadata, $options: `imx` } });
    if (fields.metadata[`pmid`]) metadataQuery[`$or`].push({ 'pmid': { '$regex': regexMetadata, $options: `imx` } });
    if (fields.metadata[`publisher`])
      metadataQuery[`$or`].push({ 'publisher': { '$regex': regexMetadata, $options: `imx` } });
    if (fields.metadata[`submitting_author`])
      metadataQuery[`$or`].push({ 'submitting_author': { '$regex': regexMetadata, $options: `imx` } });
    if (fields.metadata[`submitting_author_email`])
      metadataQuery[`$or`].push({ 'submitting_author_email': { '$regex': regexMetadata, $options: `imx` } });
    if (fields.metadata[`authorsName`])
      metadataQuery[`$or`].push({ 'authors.name': { '$regex': regexMetadata, $options: `imx` } });
  }
  let ignoreDocumentsQuery = documentsQuery[`$or`].length <= 0;
  let ignoreMetadataQuery = metadataQuery[`$or`].length <= 0;
  const actions = [
    // Search in documents collection
    function (acc, next) {
      if (ignoreDocumentsQuery) return next(null, acc);
      return Documents.find(documentsQuery).exec(function (err, res) {
        if (err) return next(err);
        acc = acc.concat(res.map((obj) => obj._id));
        return next(null, acc);
      });
    },
    // Search in metadata collection
    function (acc, next) {
      if (ignoreMetadataQuery) return next(null, acc);
      return DocumentsMetadata.find(metadataQuery).exec(function (err, res) {
        if (err) return next(err);
        acc = acc.concat(res.map((obj) => obj.document));
        return next(null, acc);
      });
    },
    // return all results
    function (acc, next) {
      const ids = [...new Set(acc)];
      if (ids.length <= 0) return next(null, []);
      return next(null, ids);
    }
  ];
  let results = [];
  // Execute all actions & get documents
  return async.reduce(
    actions, // [Function, function, ... ]
    results, // Array of searches results
    function (acc, action, next) {
      return action(acc, function (err, acc) {
        return next(err, acc);
      });
    },
    function (err, res) {
      if (err) return cb(err);
      return cb(null, res);
    }
  );
};

/**
 * Update Or Create Metadata of document
 * @param {object} opts - Options available (You must call getUploadParams)
 * @param {object} opts.data - Data available
 * @param {string} opts.data.id - Document id
 * @param {object} opts.data.metadata - Document metadata
 * @param {string} opts.data.metadata.article_title - Document metadata article_title
 * @param {string} opts.data.metadata.journal - Document metadata journal
 * @param {string} opts.data.metadata.publisher - Document metadata publisher
 * @param {string} opts.data.metadata.manuscript_id - Document metadata manuscript_id
 * @param {string} opts.data.metadata.doi - Document metadata doi
 * @param {string} opts.data.metadata.pmid - Document metadata pmid
 * @param {object} opts.user - Current user
 * @param {object} opts.refreshDAS - Refresh value of DAS properties (using TEI data)
 * @param {object} opts.refreshAuthors - Refresh value of authors name property (using TEI data)
 * @param {object} opts.refreshORCIDsFromAPI - Refresh value of authors ORCID property (using ORCID data)
 * @param {object} opts.refreshORCIDsFromASAPList - Refresh value of authors ORCID property (using ASAP List data)
 * @param {object} opts.automaticallySetPartOfASAPNetwork - Automatically set PartOfASAPNetwork
 * @param {object} opts.automaticallySetASAPAffiliationInUpload - Automatically set ASAPAffiliationInUpload
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: ObjectId OR new Error)
 * @returns {undefined} undefined
 */
Self.updateOrCreateMetadata = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `data`) === `undefined`) return cb(new Error(`Missing required data: opts.data`));
  if (typeof _.get(opts, `data.id`) === `undefined`) return cb(new Error(`Missing required data: opts.data.id`));
  let accessRights = AccountsManager.getAccessRights(opts.user);
  if (!accessRights.authenticated) return cb(null, new Error(`Unauthorized functionnality`));
  return Self.get({ data: { id: opts.data.id }, user: opts.user }, function (err, doc) {
    if (err) return cb(err);
    if (doc instanceof Error) return cb(null, doc);
    if (!doc.tei) return cb(null, new Error(`TEI file not found`));
    // Read TEI file (containing PDF metadata)
    return DocumentsFilesController.readFile({ data: { id: doc.tei.toString() } }, function (err, content) {
      if (err) return cb(err);
      let metadata = _.get(opts, `data.metadata`);
      let authors = _.get(metadata, `authors`, []);
      let refreshAuthors = _.get(opts, `data.refreshAuthors`, false);
      let refreshDAS = _.get(opts, `data.refreshDAS`, false);
      let refreshORCIDsFromAPI = _.get(opts, `data.refreshORCIDsFromAPI`, false);
      let refreshORCIDsFromASAPList = _.get(opts, `data.refreshORCIDsFromASAPList`, false);
      let automaticallySetPartOfASAPNetwork = _.get(opts, `data.automaticallySetPartOfASAPNetwork`, false);
      let automaticallySetASAPAffiliationInUpload = _.get(opts, `data.automaticallySetASAPAffiliationInUpload`, false);
      let xmlString = content.data.toString(DocumentsFilesController.encoding);
      return async.mapSeries(
        [
          function (next) {
            if (typeof metadata !== `undefined` && accessRights.isModerator) {
              // Update Metadata
              xmlString = XML.updateMetadata(
                XML.load(content.data.toString(DocumentsFilesController.encoding)),
                metadata
              );
              return DocumentsFilesController.rewriteFile(doc.tei.toString(), xmlString, function (err) {
                if (err) return next(err);
                return next(null);
              });
            } else return next();
          },
          function (next) {
            // Extract metadata
            const _metadata = Object.assign({}, metadata, XML.extractMetadata(XML.load(xmlString)));
            if (
              !_metadata.affiliationAcknowledgementsLicenseNotes &&
              metadata &&
              metadata.affiliationAcknowledgementsLicenseNotes
            )
              _metadata.affiliationAcknowledgementsLicenseNotes = metadata.affiliationAcknowledgementsLicenseNotes;
            if (!_metadata.license && metadata && metadata.license) _metadata.license = metadata.license;
            if (!_metadata.acknowledgement && metadata && metadata.acknowledgement)
              _metadata.acknowledgement = metadata.acknowledgement;
            if (!_metadata.affiliation && metadata && metadata.affiliation)
              _metadata.affiliation = metadata.affiliation;
            if (!_metadata.readmeIncluded && metadata && metadata.readmeIncluded)
              _metadata.readmeIncluded = metadata.readmeIncluded;
            if (!_metadata.describesFiles && metadata && metadata.describesFiles)
              _metadata.describesFiles = metadata.describesFiles;
            if (!_metadata.describesVariables && metadata && metadata.describesVariables)
              _metadata.describesVariables = metadata.describesVariables;
            if (!refreshAuthors) {
              _metadata.authors = authors.map(function (e) {
                return e;
              });
            }
            if (!refreshDAS) {
              if (metadata && metadata.DAS) _metadata.DAS = metadata.DAS;
            }
            metadata = Object.assign({}, _metadata);
            return next();
          },
          function (next) {
            // Get ORCIDs from API
            if (metadata.authors.length <= 0) return next();
            if (!refreshORCIDsFromAPI) return next();
            return async.mapSeries(
              metadata.authors,
              function (item, _next) {
                return ORCID.findAuthorFromAPI(
                  {
                    'family-name': item[`family-name`],
                    'given-names': item[`given-names`]
                    // 'email': item[`email`],
                    // 'other-name': item[`other-name`]
                    // 'digital-object-ids': metadata[`doi`],
                    // 'pmid': metadata[`pmid`],
                    // 'isbn': metadata[`isbn`]
                  },
                  function (err, data) {
                    if (err) {
                      console.log(err);
                      return _next(err);
                    }
                    item.orcid.fromAPI = data[`num-found`] > 0 ? data[`expanded-result`] : [];
                    return _next(null, data);
                  }
                );
              },
              function (err, result) {
                return next();
              }
            );
          },
          function (next) {
            // Get ORCIDs from ASAP List
            if (metadata.authors.length <= 0) return next();
            for (let i = 0; i < metadata.authors.length; i++) {
              let author = metadata.authors[i];
              if (refreshORCIDsFromASAPList) {
                let results = ORCID.findAuthorFromASAPList(author.name);
                if (Array.isArray(results)) {
                  author.orcid.suggestedValues = results.map((item) => {
                    return `${item.orcid} (${item.firstname} ${item.lastname})`;
                  });
                } else author.orcid.suggestedValues = [];
              }
              if (automaticallySetPartOfASAPNetwork) {
                author.orcid.partOfASAPNetwork =
                  author.orcid &&
                  Array.isArray(author.orcid.suggestedValues) &&
                  author.orcid.suggestedValues.length > 0;
              }
              if (automaticallySetASAPAffiliationInUpload) {
                author.orcid.ASAPAffiliationInUpload =
                  author.affiliations.filter(function (item) {
                    for (let j = 0; j < ASAPAuthorsConf.affiliationNames.length; j++) {
                      if (item.indexOf(ASAPAuthorsConf.affiliationNames[j]) > -1) return true;
                    }
                    return false;
                  }).length > 0;
              }
            }
            return next();
          }
        ],
        function (action, next) {
          return action(function (err) {
            return next(err);
          });
        },
        function (err) {
          // Update them
          return DocumentsMetadata.findOneAndUpdate({ document: doc._id }, metadata, {
            new: true,
            upsert: true, // Make this update into an upsert
            rawResult: true
          }).exec(function (err, res) {
            if (err) return cb(err);
            if (typeof _.get(res, `value._id`) === `undefined`) return cb(null, new Error(`ObjectId not found`));
            let created = !_.get(res, `lastErrorObject.updatedExisting`, true);
            // Create logs
            return DocumentsLogsController.create(
              {
                target: doc._id,
                account: opts.user._id,
                kind: created ? CrudManager.actions.create._id : CrudManager.actions.update._id,
                key: `metadata`
              },
              function (err, log) {
                if (err) return cb(err);
                return cb(null, Object.assign({ _id: res.value._id }, metadata));
              }
            );
          });
        }
      );
    });
  });
};

/**
 * Update Or Create metadata of PDF document
 * @param {object} opts - Options available (You must call getUploadParams)
 * @param {object} opts.data - Data available
 * @param {string} opts.data.id - Document id
 * @param {object} opts.user - Current user
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: true OR new Error)
 * @returns {undefined} undefined
 */
Self.updateOrCreatePDFMetadata = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `data`) === `undefined`) return cb(new Error(`Missing required data: opts.data`));
  if (typeof _.get(opts, `data.id`) === `undefined`) return cb(new Error(`Missing required data: opts.data.id`));
  return Self.get({ data: { id: opts.data.id }, user: opts.user }, function (err, doc) {
    if (err) return cb(err);
    if (doc instanceof Error) return cb(null, doc);
    if (!doc.tei) return cb(null, new Error(`TEI file not found`));
    if (!doc.pdf) return cb(null, new Error(`PDF file not found`));
    // Read TEI file (containing PDF metadata)
    return DocumentsFilesController.readFile({ data: { id: doc.tei.toString() } }, function (err, content) {
      if (err) return cb(err);
      return DocumentsFiles.findById(doc.pdf).exec(function (err, file) {
        if (err) return cb(err);
        if (!file) return cb(null, new Error(`File not found`));
        let created = typeof file.metadata.version === `undefined`;
        // Add metadata in file
        file.metadata = XML.extractPDFSentencesMetadata(
          XML.load(content.data.toString(DocumentsFilesController.encoding))
        );
        return file.save(function (err) {
          if (err) return cb(err);
          // Create logs
          return DocumentsLogsController.create(
            {
              target: doc._id,
              account: opts.user._id,
              kind: created ? CrudManager.actions.create._id : CrudManager.actions.update._id,
              key: `pdf.metadata`
            },
            function (err, log) {
              if (err) return cb(err);
              return cb(null, true);
            }
          );
        });
      });
    });
  });
};

/**
 * Update Or Create metadata of TEI document
 * @param {object} opts - Options available (You must call getUploadParams)
 * @param {object} opts.data - Data available
 * @param {string} opts.data.id - Document id
 * @param {object} opts.user - Current user
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: true OR new Error)
 * @returns {undefined} undefined
 */
Self.updateOrCreateTEIMetadata = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `data`) === `undefined`) return cb(new Error(`Missing required data: opts.data`));
  if (typeof _.get(opts, `data.id`) === `undefined`) return cb(new Error(`Missing required data: opts.data.id`));
  return Self.get({ data: { id: opts.data.id }, user: opts.user }, function (err, doc) {
    if (err) return cb(err);
    if (doc instanceof Error) return cb(null, doc);
    if (!doc.tei) return cb(null, new Error(`TEI file not found`));
    // Read TEI file (containing PDF metadata)
    return DocumentsFilesController.readFile({ data: { id: doc.tei.toString() } }, function (err, content) {
      if (err) return cb(err);
      return DocumentsFiles.findById(doc.tei).exec(function (err, file) {
        if (err) return cb(err);
        if (!file) return cb(null, new Error(`File not found`));
        let created = typeof file.metadata.version === `undefined`;
        // Add metadata in file
        file.metadata = XML.extractTEISentencesMetadata(
          XML.load(content.data.toString(DocumentsFilesController.encoding))
        );
        return file.save(function (err) {
          if (err) return cb(err);
          // Create logs
          return DocumentsLogsController.create(
            {
              target: doc._id,
              account: opts.user._id,
              kind: created ? CrudManager.actions.create._id : CrudManager.actions.update._id,
              key: `tei.metadata`
            },
            function (err, log) {
              if (err) return cb(err);
              return cb(null, true);
            }
          );
        });
      });
    });
  });
};

/**
 * Extract dataObjects from TEI
 * @param {object} opts - JSON containing all data
 * @param {string} opts.file - JSON containing all data
 * @param {string} opts.file.xmlString - XML string
 * @param {string} opts.file.id - Id of document
 * @param {object} opts.user - User
 * @param {object} opts.dataTypes - dataTypes
 * @param {boolean} opts.setCustomDefaultProperties - setCustomDefaultProperties
 * @param {boolean} opts.erase - Erase existing dataObjects
 * @param {function} cb - Callback function(err, res) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.extractDataObjectsFromTEI = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `file.xmlString`) === `undefined`)
    return cb(new Error(`Missing required data: opts.xmlString`));
  if (typeof _.get(opts, `file.id`) === `undefined`) return cb(new Error(`Missing required data: opts.id`));
  if (typeof _.get(opts, `dataTypes`) === `undefined`) return cb(new Error(`Missing required data: opts.dataTypes`));
  if (typeof _.get(opts, `setCustomDefaultProperties`) === `undefined`) opts.setCustomDefaultProperties = true;
  if (typeof _.get(opts, `erase`) === `undefined`) opts.erase = false;
  let accessRights = AccountsManager.getAccessRights(opts.user);
  if (!accessRights.isModerator) return cb(null, new Error(`Unauthorized functionnality`));
  let $ = XML.load(opts.file.xmlString);
  let dataObjects = XML.extractDataObjects($, {
    dataTypes: opts.dataTypes,
    setCustomDefaultProperties: opts.setCustomDefaultProperties
  });
  if (opts.erase) {
    for (let i = 0; i < dataObjects.length; i++) {
      let dataObject = dataObjects[i];
      DocumentsDataObjectsController._deleteDataObjectInTEI($, dataObject);
    }
    return DocumentsFilesController.rewriteFile(opts.file.id, $.xml(), function (err) {
      if (err) return cb(err);
      return cb(null, dataObjects);
    });
  }
  return cb(null, dataObjects);
};

/**
 * Update dataObjects Metadata
 * @param {object} opts - JSON containing all data
 * @param {object} opts.user - User
 * @param {string} opts.documentId - Document id
 * @param {object} opts.metadata - Metadata
 * @param {function} cb - Callback function(err, res) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.updateDataObjectsMetadata = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `documentId`) === `undefined`) return cb(new Error(`Missing required data: opts.documentId`));
  // Check documents exists
  return Self.get({ data: { id: opts.documentId }, user: opts.user }, function (err, doc) {
    if (err) return cb(err);
    if (doc instanceof Error) return cb(null, doc);
    if (!doc) return cb(null, new Error(`Document not found`));
    return DocumentsDataObjectsMetadataController.update(
      { user: opts.user, document: doc, metadata: opts.metadata },
      function (err, res) {
        if (err) return cb(err);
        if (res instanceof Error) return cb(null, res);
        return cb(null, res);
      }
    );
  });
};

/**
 * Add dataObjects
 * @param {object} opts - JSON containing all data
 * @param {object} opts.user - User
 * @param {array} opts.data - List of dataObjects info
 * -> item.saveDocument (default: true, use false on upload process to avoid mongoose errors)
 * -> item.isExtracted
 * -> item.dataObject
 * -> item.document
 * @param {function} cb - Callback function(err, res) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.addDataObjects = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `data`) === `undefined`) return cb(new Error(`Missing required data: opts.data`));
  let actions = _.get(opts, `data`);
  if (!Array.isArray(actions)) return cb(new Error(`Bad data: opts.data must be an array`));
  let accessRights = AccountsManager.getAccessRights(opts.user);
  if (!accessRights.isModerator) return cb(null, new Error(`Unauthorized functionnality`));
  return async.reduce(
    actions,
    [],
    function (acc, item, next) {
      return DocumentsDataObjectsController.create(
        { user: opts.user, isExtracted: item.isExtracted, dataObject: item.dataObject, document: item.document },
        function (err, dataObject) {
          if (err) return next(err, acc);
          if (dataObject instanceof Error) return next(dataObject, acc);
          acc.push({ err: dataObject instanceof Error, res: dataObject });
          // Update Document in MongoDB
          if (dataObject.extracted) item.document.dataObjects.extracted.push(dataObject._id.toString());
          item.document.dataObjects.current.push(dataObject._id.toString());
          let saveDocument = _.get(item, `saveDocument`, true);
          if (!saveDocument) return next(null, acc);
          return Documents.updateOne(
            { _id: dataObject.document },
            { dataObjects: item.document.dataObjects },
            function (err, doc) {
              if (err) return next(err, acc);
              return next(null, acc);
            }
          );
        }
      );
    },
    function (err, res) {
      if (err) return cb(err);
      return cb(null, res);
    }
  );
};

/**
 * Update dataObjects
 * @param {object} opts - JSON containing all data
 * @param {object} opts.user - User
 * @param {array} opts.data - List of dataObjects info
 * -> item.saveDocument (default: true)
 * -> item.isExtracted
 * -> item.dataObject
 * -> item.document
 * @param {function} cb - Callback function(err, res) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.updateDataObjects = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `data`) === `undefined`) return cb(new Error(`Missing required data: opts.data`));
  let actions = _.get(opts, `data`);
  if (!Array.isArray(actions)) return cb(new Error(`Bad data: opts.data must be an array`));
  let accessRights = AccountsManager.getAccessRights(opts.user);
  if (!accessRights.isModerator) return cb(null, new Error(`Unauthorized functionnality`));
  return async.reduce(
    actions,
    [],
    function (acc, item, next) {
      return DocumentsDataObjectsController.update(
        { user: opts.user, isExtracted: item.isExtracted, dataObject: item.dataObject, document: item.document },
        function (err, dataObject) {
          if (err) return next(err, acc);
          if (dataObject instanceof Error) return next(dataObject, acc);
          acc.push({ err: dataObject instanceof Error, res: dataObject });
          let saveDocument = _.get(item, `saveDocument`, true);
          if (!saveDocument) return next(null, acc);
          return Documents.updateOne(
            { _id: dataObject.document.data },
            { dataObjects: item.document.dataObjects },
            function (err, doc) {
              if (err) return next(err, acc);
              return next(null, acc);
            }
          );
        }
      );
    },
    function (err, res) {
      if (err) return cb(err);
      return cb(null, res);
    }
  );
};

/**
 * Delete dataObjects
 * @param {object} opts - JSON containing all data
 * @param {object} opts.user - User
 * @param {array} opts.data - List of dataObjects info
 * -> item.saveDocument (default: true)
 * -> item.isExtracted
 * -> item.dataObject
 * -> item.document
 * @param {function} cb - Callback function(err, res) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.deleteDataObjects = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `data`) === `undefined`) return cb(new Error(`Missing required data: opts.data`));
  let actions = _.get(opts, `data`);
  if (!Array.isArray(actions)) return cb(new Error(`Bad data: opts.data must be an array`));
  let accessRights = AccountsManager.getAccessRights(opts.user);
  if (!accessRights.isModerator) return cb(null, new Error(`Unauthorized functionnality`));
  return async.reduce(
    actions,
    [],
    function (acc, item, next) {
      return DocumentsDataObjectsController.delete(
        { user: opts.user, isExtracted: item.isExtracted, dataObject: item.dataObject, document: item.document },
        function (err, dataObject) {
          if (err) return next(err, acc);
          if (dataObject instanceof Error) return next(dataObject, acc);
          acc.push({ err: dataObject instanceof Error, res: dataObject });
          // Update Document
          item.document.dataObjects.current = item.document.dataObjects.current.filter(function (item) {
            return item.toString() !== dataObject._id.toString();
          });
          item.document.dataObjects.deleted.push(dataObject._id.toString());
          let saveDocument = _.get(item, `saveDocument`, true);
          if (!saveDocument) return next(null, acc);
          return Documents.updateOne(
            { _id: dataObject.document },
            { dataObjects: item.document.dataObjects },
            function (err, doc) {
              if (err) return next(err, acc);
              return next(null, acc);
            }
          );
        }
      );
    },
    function (err, res) {
      if (err) return cb(err);
      return cb(null, res);
    }
  );
};

/**
 * Refresh dataObjects
 * @param {object} opts - JSON containing all data
 * @param {object} opts.user - User
 * @param {string} opts.document - Document
 * @param {string} opts.resetIndex - Reset DataObject index (default false)
 * @param {function} cb - Callback function(err, res) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.refreshDataObjects = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `document`) === `undefined`) return cb(new Error(`Missing required data: opts.document`));
  if (typeof _.get(opts, `resetIndex`) === `undefined`) opts.resetIndex = false;
  let accessRights = AccountsManager.getAccessRights(opts.user);
  if (!accessRights.isModerator) return cb(null, new Error(`Unauthorized functionnality`));
  return Self.getSentencesMapping(
    { user: opts.user, documentId: opts.document._id.toString() },
    function (err, mapping) {
      if (err) return cb(err);
      if (mapping instanceof Error) return cb(null, mapping);
      let sort = Self.sortSentencesUsingMapping(mapping);
      return DocumentsDataObjectsController.all(
        { user: opts.user, data: { documents: [opts.document._id.toString()] } },
        function (err, res) {
          if (err) return cb(err);
          if (res instanceof Error) return cb(null, res);
          if (!res || !Array.isArray(res.data)) return cb(null, new Error(`DataObjects not found`));
          return async.mapSeries(
            res.data,
            function (dataObject, next) {
              if (opts.resetIndex && dataObject.sentences.length > 0) {
                let sentences = dataObject.sentences.sort(sort);
                dataObject.index = mapping[sentences[0].id];
              }
              return DocumentsDataObjectsController.update(
                { user: opts.user, dataObject: dataObject, document: opts.document },
                function (err, res) {
                  return next(err);
                }
              );
            },
            function (err) {
              if (err) return cb(err);
              return cb(null, true);
            }
          );
        }
      );
    }
  );
};

/**
 * Process OCR on the PDF file
 * @param {object} opts JSON object containing all data
 * @param {object} opts.user - Current user
 * @param {string} opts.documentId - Document id
 * @param {object} opts.pages - Pages that will be processed
 * @param {function} cb - Callback function(err) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.processOCR = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `documentId`) === `undefined`) return cb(new Error(`Missing required data: opts.documentId`));
  if (typeof _.get(opts, `pages`) === `undefined`) return cb(null, new Error(`Missing required data: opts.pages`));
  let pages = Array.isArray(opts.pages) ? opts.pages : undefined;
  if (!pages) return cb(null, new Error(`Pages not found`));
  return Self.get({ data: { id: opts.documentId.toString() }, user: opts.user }, function (err, doc) {
    if (err) return cb(err);
    if (doc instanceof Error) return cb(null, doc);
    return DocumentsFilesController.getFilePath({ data: { id: doc.pdf.toString() } }, function (err, pdfFilePath) {
      if (err) return cb(err);
      return OCR.processPDF(
        { pdfPath: pdfFilePath, pages: pages, getTextContent: true, getTextOCR: true },
        function (err, res) {
          if (err) return cb(err);
          else return cb(null, res);
        }
      );
    });
  });
};

/**
 * Try to detect new sentences in the PDF file (using OCR)
 * @param {object} opts JSON object containing all data
 * @param {object} opts.user - Current user
 * @param {string} opts.documentId - Document id
 * @param {object} opts.pages - Pages that will be processed
 * @param {function} cb - Callback function(err) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.detectNewSentences = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `documentId`) === `undefined`) return cb(new Error(`Missing required data: opts.documentId`));
  return Self.get({ data: { id: opts.documentId.toString(), pdf: true }, user: opts.user }, function (err, doc) {
    if (err) return cb(err);
    if (doc instanceof Error) return cb(null, doc);
    if (!doc.pdf) return cb(null, new Error(`PDF file not found`));
    if (!doc.pdf.metadata) return cb(null, new Error(`PDF file metadata not found`));
    let results = { errors: [], newSentences: [] };
    return Self.processOCR(opts, function (err, pages) {
      if (err) return cb(err);
      for (let i = 0; i < pages.length; i++) {
        let page = pages[i];
        if (page instanceof Error) {
          results.errors.push(page.toString());
        } else {
          let numPage = page.number;
          let words = page.mergedText.map(function (word) {
            return {
              text: word.text,
              bbox: {
                x0: word.bbox.x0 / word.scale,
                x1: word.bbox.x1 / word.scale,
                y0: word.bbox.y0 / word.scale,
                y1: word.bbox.y1 / word.scale
              },
              confidence: word.confidence,
              scale: 1.0,
              page: word.page
            };
          });
          let newSentences = Analyzer.getNewSentencesOfPage(numPage, words, doc.pdf.metadata);
          for (let j = 0; j < newSentences.length; j++) {
            let sentence = newSentences[j];
            results.newSentences.push({
              p: numPage,
              x: sentence.bbox.x0,
              y: sentence.bbox.y0,
              h: sentence.bbox.y1 - sentence.bbox.y0,
              w: sentence.bbox.x1 - sentence.bbox.x0,
              text: sentence.text
            });
          }
        }
      }
      if (results.newSentences.length <= 0) return cb(null, results);
      return DocumentsFilesController.readFile({ data: { id: doc.tei.toString() } }, function (err, content) {
        if (err) return cb(err);
        let xmlString = content.data.toString(DocumentsFilesController.encoding);
        let outpout = XML.addSentences(xmlString, results.newSentences, `ocr`);
        return DocumentsFilesController.rewriteFile(doc.tei.toString(), outpout, function (err) {
          if (err) return cb(err);
          return Self.updateOrCreateTEIMetadata(
            { data: { id: doc._id.toString() }, user: opts.user },
            function (err, ok) {
              if (err) return cb(err);
              if (ok instanceof Error) return cb(ok);
              return Self.updateOrCreatePDFMetadata(
                { data: { id: doc._id.toString() }, user: opts.user },
                function (err, ok) {
                  if (err) return cb(err);
                  if (ok instanceof Error) return cb(ok);
                  return cb(null, results);
                }
              );
            }
          );
        });
      });
    });
  });
};

/**
 * Get all documents
 * @param {object} opts - Options available (You must call getUploadParams)
 * @param {object} opts.data - Data available
 * @param {boolean} opts.data.[count] - Count results (default: false)
 * @param {string} opts.data.[ids] - list of ids
 * @param {limit} opts.data.[limit] - Limit of the results
 * @param {limit} opts.data.[skip] - Skip of the results
 * @param {array} opts.data.[owners] - Array of accounts Id
 * @param {array} opts.data.[organizations] - Array of organizations Id
 * @param {boolean} opts.data.[visibleStates] - Visible states of documents
 * @param {int} opts.data.[uploadRange] - Range in day when upload from now - the range
 * @param {int} opts.data.[updateRange] - Range in day when update from now - the range
 * @param {date} opts.data.[updatedBefore] - Update before this date
 * @param {date} opts.data.[updatedAfter] - Update after this date
 * @param {date} opts.data.[uploadedBefore] - Upload before this date
 * @param {date} opts.data.[uploadedAfter] - Upload after this date
 * @param {string} opts.data.[sort] - Sort results (available value asc or desc)
 * @param {boolean} opts.data.[pdf] - Populate pdf property (default: false)
 * @param {boolean} opts.data.[tei] - Populate tei property (default: false)
 * @param {boolean} opts.data.[files] - Populate files property (default: false)
 * @param {boolean} opts.data.[dataObjects] - Populate dataObjects current, deleted & extracted property (default: false)
 * @param {boolean} opts.data.[dataObjectsMetadata] - Populate dataObjects.metadata property (default: false)
 * @param {object} opts.user - Current user
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: array of documents instance OR undefined)
 * @returns {undefined} undefined
 */
Self.all = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(conf, `mongodb.default.organizations.id`) === `undefined`)
    return cb(new Error(`Missing required data: const.mongodb.default.organizations.id`));
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `user.organizations`) === `undefined`)
    return cb(new Error(`Missing required data: opts.user.organizations`));
  if (typeof _.get(opts, `data`) === `undefined`) return cb(new Error(`Missing required data: opts.data`));
  let accessRights = AccountsManager.getAccessRights(opts.user);
  if (!accessRights.authenticated) return cb(null, new Error(`Unauthorized functionnality`));
  // Start process
  // Check if user is visitor
  if (!accessRights.isStandardUser) return cb(null, []);
  // Build query data from opts
  let count = Params.convertToBoolean(opts.data.count);
  let ids = Params.convertToArray(opts.data.ids, `string`);
  let limit = Params.convertToInteger(opts.data.limit);
  let skip = Params.convertToInteger(opts.data.skip);
  let owners = Params.convertToArray(opts.data.owners, `string`);
  let organizations = Params.convertToArray(opts.data.organizations, `string`);
  let visibleStates = Params.convertToArray(opts.data.visibleStates, `boolean`);
  let lockedStates = Params.convertToArray(opts.data.lockedStates, `boolean`);
  let uploadRange = Params.convertToInteger(opts.data.uploadRange);
  let updateRange = Params.convertToInteger(opts.data.updateRange);
  let updatedBefore = Params.convertToDate(opts.data.updatedBefore);
  let updatedAfter = Params.convertToDate(opts.data.updatedAfter);
  let uploadedBefore = Params.convertToDate(opts.data.uploadedBefore);
  let uploadedAfter = Params.convertToDate(opts.data.uploadedAfter);
  let sort = Params.convertToString(opts.data.sort);
  let pdf = Params.convertToBoolean(opts.data.pdf);
  let tei = Params.convertToBoolean(opts.data.tei);
  let files = Params.convertToBoolean(opts.data.files);
  let metadata = Params.convertToBoolean(opts.data.metadata);
  let dataObjects = Params.convertToBoolean(opts.data.dataObjects);
  let dataObjectsMetadata = Params.convertToBoolean(opts.data.dataObjectsMetadata);
  let filter = Params.convertToString(opts.data.filter);
  let filterFields = Params.convertToArray(opts.data.filterFields, `string`);
  let query = {};
  // Set default value
  if (typeof ids === `undefined`) ids = [];
  if (typeof limit === `undefined` || limit <= 0) limit = 20;
  if (typeof skip === `undefined` || skip < 0) skip = 0;
  if (typeof sort === `undefined` || sort !== `asc`) sort = `desc`;
  // Set filters
  if (ids.length > 0) query._id = { $in: ids };
  if (typeof owners !== `undefined`) query.owner = { $in: owners };
  if (typeof organizations !== `undefined`) query.organizations = { $in: organizations };
  if (typeof visibleStates !== `undefined`) query.visible = { $in: visibleStates };
  if (typeof lockedStates !== `undefined`) query.locked = { $in: lockedStates };
  // Create date range
  let now = new Date();
  let uploadRange_date;
  let updateRange_date;
  if (Params.checkInteger(uploadRange) && uploadRange > 0) {
    uploadRange_date = new Date(now);
    uploadRange_date.setDate(now.getDate() - uploadRange);
  }
  if (Params.checkInteger(updateRange) && updateRange > 0) {
    updateRange_date = new Date(now);
    updateRange_date.setDate(now.getDate() - updateRange);
  }
  // Check updateRange_date
  if (Params.checkDate(updateRange_date)) {
    if (typeof query.updatedAt === `undefined`) query.updatedAt = {};
    query.updatedAt.$gte = updateRange_date.toISOString();
  }
  // Check uploadRange_date
  if (Params.checkDate(uploadRange_date)) {
    if (typeof query[`upload.date`] === `undefined`) query[`upload.date`] = {};
    query[`upload.date`].$gte = uploadRange_date.toISOString();
  }
  // Upload between date & date
  if (Params.checkDate(uploadedBefore)) {
    if (typeof query[`upload.date`] === `undefined`) query[`upload.date`] = {};
    query[`upload.date`].$lte = new Date(uploadedBefore);
  }
  if (Params.checkDate(uploadedAfter)) {
    if (typeof query[`upload.date`] === `undefined`) query[`upload.date`] = {};
    query[`upload.date`].$gte = new Date(uploadedAfter);
  }
  // Update between date & date
  if (Params.checkDate(updatedBefore)) {
    if (typeof query.updatedAt === `undefined`) query.updatedAt = {};
    query.updatedAt.$lte = new Date(updatedBefore);
  }
  if (Params.checkDate(updatedAfter)) {
    if (typeof query.updatedAt === `undefined`) query.updatedAt = {};
    query.updatedAt.$gte = new Date(updatedAfter);
  }
  if (!accessRights.isAdministrator)
    query.organizations = { $in: AccountsManager.getOwnOrganizations(organizations, opts.user) };
  // Delete organizations restriction for visitor (because its token can be used for only one document)
  if (!accessRights.isStandardUser) delete query.organizations;
  if (!accessRights.isModerator) {
    if (!Array.isArray(organizations))
      organizations = opts.user.organizations.map(function (item) {
        return item._id.toString();
      });
    let filteredOrganizations = AccountsManager.getOwnOrganizations(organizations, opts.user);
    query.organizations = { $in: filteredOrganizations };
    query.owner = { $in: [opts.user._id.toString()] };
  }
  if (accessRights.isVisitor || accessRights.isStandardUser) {
    query.visible = [true];
  }
  let params = {
    ids,
    limit,
    skip,
    filter,
    filterFields,
    owners,
    organizations,
    visibleStates,
    lockedStates,
    updatedBefore,
    updatedAfter,
    uploadedBefore,
    uploadedAfter,
    uploadRange,
    updateRange
  };
  return async.reduce(
    [
      function (acc, next) {
        if (!filter) return next(null, acc);
        return Self.search({ data: { query: filter, fields: filterFields }, user: opts.user }, function (err, res) {
          if (err) return next(err);
          if (res instanceof Error) return next(null, acc);
          if (Array.isArray(res) && res.length > 0)
            return next(null, {
              $and: [{ _id: { $in: res } }, acc]
            });
          return next(null, acc);
        });
      }
    ],
    query,
    function (acc, action, next) {
      return action(acc, function (err, acc) {
        return next(err, acc);
      });
    },
    function (err, res) {
      if (err) return cb(err);
      let transaction = Documents.find(res).skip(skip).limit(limit);
      // Populate dependings on the parameters
      transaction.populate(`owner`, `-tokens -hash -salt`);
      transaction.populate(`organizations`);
      transaction.populate(`upload.organizations`);
      if (metadata) transaction.populate(`metadata`);
      if (dataObjects) {
        transaction.populate(`dataObjects.current`);
        transaction.populate(`dataObjects.deleted`);
        transaction.populate(`dataObjects.extracted`);
      }
      if (dataObjectsMetadata) transaction.populate(`dataObjects.metadata`);
      if (pdf) transaction.populate(`pdf`);
      if (tei) transaction.populate(`tei`);
      if (files) transaction.populate(`files`);
      transaction.sort(sort === `asc` ? { _id: 1 } : { _id: -1 });
      return transaction.exec(function (err, docs) {
        if (err) return cb(err);
        if (count)
          return Documents.find(res).countDocuments(function (err, count) {
            if (err) return cb(err);
            let result = {
              count: count,
              data: docs,
              params: params
            };
            return cb(null, result);
          });
        let result = {
          data: docs,
          params: params
        };
        return cb(null, result);
      });
    }
  );
};

/**
 * Get document by id
 * @param {object} opts - Options available
 * @param {object} opts.user - Current user
 * @param {object} opts.data - Data available
 * @param {string} opts.data.id - Id of the document
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: document instance OR undefined)
 * @returns {undefined} undefined
 */
Self.getLogs = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `user._id`) === `undefined`) return cb(new Error(`Missing required data: opts.user._id`));
  if (typeof _.get(opts, `data`) === `undefined`) return cb(new Error(`Missing required data: opts.data`));
  if (typeof _.get(opts, `data.id`) === `undefined`) return cb(new Error(`Missing required data: opts.data.id`));
  let accessRights = AccountsManager.getAccessRights(opts.user, AccountsManager.match.all);
  if (!accessRights.authenticated) return cb(null, new Error(`Unauthorized functionnality`));
  let id = Params.convertToString(opts.data.id);
  let query = { target: id };
  let transaction = DocumentsLogs.find(query).populate(`account`, `-tokens -hash -salt`).populate(`kind`);
  return transaction.exec(function (err, logs) {
    if (err) return cb(err);
    if (!logs) return cb(null, new Error(`Logs not found`));
    return cb(null, logs);
  });
};

/**
 * Get changes of a all dataObjects of a given document
 * @param {object} opts - JSON object containing all data
 * @param {object} opts.user - User
 * @param {object} opts.data - JSON object containing all data
 * @param {array} opts.data.documents - Id of documents
 * @param {objects} opts.data.accounts - All infos about accounts
 * @param {function} cb - Callback function(err) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.getDataObjectsChanges = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  // Check Access Rights
  let accessRights = AccountsManager.getAccessRights(opts.user);
  if (!accessRights.isAdministrator) return cb(null, new Error(`Unauthorized functionnality`));
  return DocumentsDataObjectsController.all(
    {
      data: { documents: opts.data.documents, limit: 100000, populate: { document: true } },
      user: opts.user
    },
    function (err, res) {
      if (err) return cb(err);
      return async.reduce(
        res.data,
        [],
        function (acc, dataObject, next) {
          return DocumentsDataObjectsController.getChanges(
            {
              data: {
                updatedBefore: opts.data.updatedBefore,
                updatedAfter: opts.data.updatedAfter,
                dataObject: { ...dataObject.toJSON(), document: dataObject.document._id.toString() }, // Do no send document properties
                target: dataObject._id.toString(),
                accounts: opts.data.accounts
              },
              user: opts.user
            },
            function (err, res) {
              if (err)
                acc.push({
                  err: err,
                  document: {
                    id: dataObject.document._id.toString(),
                    name: dataObject.document.name,
                    token: dataObject.document.token
                  }
                });
              else if (res instanceof Error)
                acc.push({
                  err: res,
                  document: {
                    id: dataObject.document._id.toString(),
                    name: dataObject.document.name,
                    token: dataObject.document.token
                  }
                });
              else
                acc.push({
                  err: false,
                  res: {
                    ...res,
                    document: {
                      id: dataObject.document._id.toString(),
                      name: dataObject.document.name,
                      token: dataObject.document.token
                    }
                  }
                });
              return next(null, acc);
            }
          );
        },
        function (err, result) {
          if (err) return cb(err);
          return cb(null, result);
        }
      );
    }
  );
};

/**
 * Get histories of a all dataObjects of a given document
 * @param {object} opts - JSON object containing all data
 * @param {object} opts.user - User
 * @param {object} opts.data - JSON object containing all data
 * @param {array} opts.data.documents - Id of documents
 * @param {objects} opts.data.accounts - All infos about accounts
 * @param {function} cb - Callback function(err) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.getDataObjectsHistories = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  // Check Access Rights
  let accessRights = AccountsManager.getAccessRights(opts.user);
  if (!accessRights.isAdministrator) return cb(null, new Error(`Unauthorized functionnality`));
  return DocumentsDataObjectsController.all(
    {
      data: { documents: opts.data.documents, limit: 100000, populate: { document: true } },
      user: opts.user
    },
    function (err, res) {
      if (err) return cb(err);
      return async.reduce(
        res.data,
        [],
        function (acc, dataObject, next) {
          return DocumentsDataObjectsController.getHistories(
            {
              data: {
                updatedBefore: opts.data.updatedBefore,
                updatedAfter: opts.data.updatedAfter,
                dataObject: { ...dataObject.toJSON(), document: dataObject.document._id.toString() }, // Do no send document properties
                target: dataObject._id.toString(),
                accounts: opts.data.accounts
              },
              user: opts.user
            },
            function (err, res) {
              if (err)
                acc.push({
                  err: err,
                  document: {
                    id: dataObject.document._id.toString(),
                    name: dataObject.document.name,
                    token: dataObject.document.token
                  }
                });
              else if (res instanceof Error)
                acc.push({
                  err: res,
                  document: {
                    id: dataObject.document._id.toString(),
                    name: dataObject.document.name,
                    token: dataObject.document.token
                  }
                });
              else
                acc.push({
                  err: false,
                  res: {
                    ...res,
                    document: {
                      id: dataObject.document._id.toString(),
                      name: dataObject.document.name,
                      token: dataObject.document.token
                    }
                  }
                });
              return next(null, acc);
            }
          );
        },
        function (err, result) {
          if (err) return cb(err);
          return cb(null, result);
        }
      );
    }
  );
};

/**
 * Get document by id
 * @param {object} opts - Options available
 * @param {object} opts.user - Current user
 * @param {object} opts.data - Data available
 * @param {string} opts.data.id - Id of the document
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: document instance OR undefined)
 * @returns {undefined} undefined
 */
Self.getReportData = function (opts = {}, cb) {
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `user._id`) === `undefined`) return cb(new Error(`Missing required data: opts.user._id`));
  if (typeof _.get(opts, `data`) === `undefined`) return cb(new Error(`Missing required data: opts.data`));
  if (typeof _.get(opts, `data.id`) === `undefined`) return cb(new Error(`Missing required data: opts.data.id`));
  if (typeof _.get(opts, `data.kind`) === `undefined`) return cb(new Error(`Missing required data: opts.data.kind`));
  if (typeof _.get(opts, `data.organization`) === `undefined`)
    return cb(new Error(`Missing required data: opts.data.organization`));
  if (typeof _.get(opts, `data.dataTypes`) === `undefined`)
    return cb(new Error(`Missing required data: opts.data.dataTypes`));
  if (opts.data.kind !== `html` && opts.data.kind !== `docx`) return cb(new Error(`Bad value: opts.data.kind`));
  if (opts.data.kind === `html` && opts.data.organization !== `bioRxiv` && opts.data.organization !== `default`)
    return cb(new Error(`Bad value: opts.data.organization`));
  if (opts.data.kind === `docx` && opts.data.organization !== `default`)
    return cb(new Error(`Bad value: opts.data.organization`));
  return Self.get(
    {
      data: { id: opts.data.id, dataObjects: true, dataObjectsMetadata: true, metadata: true, pdf: true, tei: true },
      user: opts.user
    },
    function (err, doc) {
      if (err) return cb(err);
      if (doc instanceof Error) return cb(null, doc);
      if (opts.data.kind === `html`) {
        if (opts.data.organization === `default` || opts.data.organization === `bioRxiv`) {
          let sortedDataObjectsInfo = Self.getSortedDataObjectsInfo(doc, opts.data.dataTypes);
          let dataObjectsSummary = DataTypes.getDataObjectsSummary(sortedDataObjectsInfo.all, opts.data.dataTypes);
          let bestPractices = DataTypes.getBestPractices(
            [].concat(
              sortedDataObjectsInfo.protocols,
              sortedDataObjectsInfo.datasets,
              sortedDataObjectsInfo.code,
              sortedDataObjectsInfo.software,
              sortedDataObjectsInfo.reagents
            ),
            opts.data.dataTypes
          );
          return cb(null, {
            doc,
            sortedDataObjectsInfo,
            dataObjectsSummary,
            bestPractices
          });
        }
      }
      return cb(null, new Error(`Case not handled`));
    }
  );
};

/**
 * Get sentences mapping of a given document
 * @param {object} opts - JSON containing all data
 * @param {object} opts.user - User
 * @param {string} opts.documentId - Document id
 * @param {function} cb - Callback function(err, res) (err: error process OR null)
 */
Self.getSentencesMapping = function (opts, cb) {
  return Self.get({ data: { id: opts.documentId, tei: true, pdf: true }, user: opts.user }, function (err, doc) {
    if (err) return cb(err);
    if (doc instanceof Error) return cb(null, doc);
    let mapping =
      doc.pdf && doc.pdf.metadata && doc.pdf.metadata.mapping
        ? doc.pdf.metadata.mapping.object
        : doc.tei && doc.tei.metadata && doc.tei.metadata.mapping
          ? doc.tei.metadata.mapping.object
          : {};
    return cb(null, mapping);
  });
};

/**
 * Get sentences metadata of a given document
 * @param {object} opts - JSON containing all data
 * @param {object} opts.user - User
 * @param {string} opts.documentId - Document id
 * @param {function} cb - Callback function(err, res) (err: error process OR null)
 */
Self.getSentencesMetadata = function (opts, cb) {
  return Self.get({ data: { id: opts.documentId, tei: true, pdf: true }, user: opts.user }, function (err, doc) {
    if (err) return cb(err);
    if (doc instanceof Error) return cb(null, doc);
    let metadata = doc.pdf && doc.pdf.metadata ? doc.pdf.metadata : doc.tei && doc.tei.metadata ? doc.tei.metadata : {};
    return cb(null, metadata);
  });
};

/**
 * Get sentences mapping function
 * @param {object} mapping - Sentence mapping
 * @returns {function} Sorting function using mapping
 */
Self.sortSentencesUsingMapping = function (mapping) {
  return function (a, b) {
    let c = mapping[a.id] ? mapping[a.id] : null;
    let d = mapping[b.id] ? mapping[b.id] : null;
    if (c === null && d === null) return 0;
    if (c === null) return 1;
    if (d === null) return -1;
    return c - d;
  };
};

/**
 * Sort dataObjects of the given document (useful to create reports)
 * @param {object} doc - Document mongodb object
 * @param {object} dataTypes - dataTypes object
 * @returns {object} sorted dataObjects
 */
Self.getSortedDataObjectsInfo = function (doc, dataTypes = {}) {
  let currentDataObjects = _.get(doc, `dataObjects.current`, []);
  let mapping =
    doc.pdf && doc.pdf.metadata && doc.pdf.metadata.mapping
      ? doc.pdf.metadata.mapping.object
      : doc.tei && doc.tei.metadata && doc.tei.metadata.mapping
        ? doc.tei.metadata.mapping.object
        : {};
  let sortSentences = function (a, b) {
    let c = mapping[a.id] ? mapping[a.id] : null,
      d = mapping[b.id] ? mapping[b.id] : null;
    if (c === null && d === null) return 0;
    if (c === null) return 1;
    if (d === null) return -1;
    return c - d;
  };
  let orderedDataObjects = currentDataObjects
    .map(function (item) {
      // sort sentences
      let sentences = item.sentences.sort(sortSentences);
      let type = DataTypes.getDataTypeInfo(item, dataTypes);
      return Object.assign({}, item.toJSON(), {
        type,
        sentences,
        isValid: item.actionRequired && item.actionRequired !== `Yes`
      });
    })
    .sort(function (a, b) {
      let c = a.sentences && a.sentences[0] && a.sentences[0].id ? mapping[a.sentences[0].id] : Infinity;
      let d = b.sentences && b.sentences[0] && b.sentences[0].id ? mapping[b.sentences[0].id] : Infinity;
      return c === d ? 0 : c < d ? -1 : 1;
    });
  let protocols = orderedDataObjects.filter(function (item) {
    return item.kind === `protocol`;
  });
  let code = orderedDataObjects.filter(function (item) {
    return item.kind === `code`;
  });
  let software = orderedDataObjects.filter(function (item) {
    return item.kind === `software`;
  });
  let reagents = orderedDataObjects.filter(function (item) {
    return item.kind === `reagent`;
  });
  let datasets = orderedDataObjects.filter(function (item) {
    return item.kind === `dataset`;
  });
  return { all: orderedDataObjects, protocols, code, software, reagents, datasets };
};

/**
 * Update or create n hypothesis annotation
 * @param {object} opts - Options available
 * @param {object} opts.user - Current user
 * @param {object} opts.dataTypes - dataTypes object
 * @param {object} opts.data - Data available
 * @param {string} opts.data.id - Id of the document
 * @param {string} opts.data.url - Url of the document
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: document instance OR undefined)
 * @returns {undefined} undefined
 */
Self.updateOrCreateHypothesisAnnotation = function (opts, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `user._id`) === `undefined`) return cb(new Error(`Missing required data: opts.user._id`));
  if (typeof _.get(opts, `dataTypes`) === `undefined`) return cb(new Error(`Missing required data: opts.dataTypes`));
  if (typeof _.get(opts, `data`) === `undefined`) return cb(new Error(`Missing required data: opts.data`));
  if (typeof _.get(opts, `data.id`) === `undefined`) return cb(new Error(`Missing required data: opts.data.id`));
  if (typeof _.get(opts, `data.url`) === `undefined`) return cb(new Error(`Missing required data: opts.data.url`));
  let accessRights = AccountsManager.getAccessRights(opts.user, AccountsManager.match.all);
  if (!accessRights.isAdministrator) return cb(null, new Error(`Unauthorized functionnality`));
  let id = Params.convertToString(opts.data.id);
  return Self.getReportData(
    {
      data: {
        id: id,
        kind: `html`,
        organization: `bioRxiv`,
        dataTypes: opts.dataTypes
      },
      user: opts.user
    },
    function (err, data) {
      if (err) return cb(err);
      if (data instanceof Error) return cb(null, data);
      let url = Params.convertToString(opts.data.url);
      let content = Hypothesis.buildAnnotationContent({
        data: {
          publicURL: `${Url.build(`/documents/${id}`, { token: data.doc.token })}`,
          reportData: data
        }
      });
      if (content instanceof Error) return cb(content);
      return Hypothesis.updateOrCreateAnnotation({ url: url, text: content }, function (err, annotation) {
        if (err) return cb(err);
        return Self.update(
          {
            user: opts.user,
            data: {
              id: id,
              urls: { hypothesis: url }
            },
            logs: false
          },
          function (err, res) {
            if (err) return cb(err);
            if (res instanceof Error) return cb(null, res);
            return cb(null, annotation);
          }
        );
      });
    }
  );
};

/**
 * Get document by id
 * @param {object} opts - Options available
 * @param {object} opts.user - Current user
 * @param {object} opts.data - Data available
 * @param {string} opts.data.id - Id of the document
 * @param {boolean} opts.data.[pdf] - Populate pdf property (default: false)
 * @param {boolean} opts.data.[tei] - Populate tei property (default: false)
 * @param {boolean} opts.data.[files] - Populate files property (default: false)
 * @param {boolean} opts.data.[metadata] - Populate metadata property (default: false)
 * @param {boolean} opts.data.[dataObjects] - Populate dataObjects current, deleted & extracted property (default: false)
 * @param {boolean} opts.data.[dataObjectsMetadata] - Populate dataObjects.metadata property (default: false)
 * @param {boolean} opts.[logs] - Specify if action must be logged (default: false)
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: document instance OR undefined)
 * @returns {undefined} undefined
 */
Self.get = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `user._id`) === `undefined`) return cb(new Error(`Missing required data: opts.user._id`));
  if (typeof _.get(opts, `data`) === `undefined`) return cb(new Error(`Missing required data: opts.data`));
  if (typeof _.get(opts, `data.id`) === `undefined`) return cb(new Error(`Missing required data: opts.data.id`));
  // Check all optionnal data
  if (typeof _.get(opts, `logs`) !== true) opts.logs = false;
  let accessRights = AccountsManager.getAccessRights(opts.user, AccountsManager.match.all);
  if (!accessRights.authenticated) return cb(null, new Error(`Unauthorized functionnality`));
  let id = Params.convertToString(opts.data.id);
  let pdf = Params.convertToBoolean(opts.data.pdf);
  let krt = Params.convertToBoolean(opts.data.krt);
  let tei = Params.convertToBoolean(opts.data.tei);
  let files = Params.convertToBoolean(opts.data.files);
  let datasets = Params.convertToBoolean(opts.data.datasets);
  let metadata = Params.convertToBoolean(opts.data.metadata);
  let dataObjects = Params.convertToBoolean(opts.data.dataObjects);
  let dataObjectsMetadata = Params.convertToBoolean(opts.data.dataObjectsMetadata);
  let query = {};
  if (accessRights.isVisitor || accessRights.isStandardUser) {
    query.visible = [true];
  }
  if (accessRights.isStandardUser) {
    query.owner = { $in: opts.user._id };
  }
  if (accessRights.isStandardUser || accessRights.isModerator)
    query.organizations = {
      $in: opts.user.organizations.map(function (item) {
        return item._id.toString();
      })
    };
  query._id = id;
  let transaction = Documents.findOne(query);
  // Populate dependings on the parameters
  transaction.populate(`owner`, `-tokens -hash -salt`);
  transaction.populate(`organizations`);
  transaction.populate(`upload.organizations`);
  if (metadata) transaction.populate(`metadata`);
  if (datasets) transaction.populate(`datasets`);
  if (dataObjects) {
    transaction.populate(`dataObjects.current`);
    transaction.populate(`dataObjects.deleted`);
    transaction.populate(`dataObjects.extracted`);
  }
  if (dataObjectsMetadata) transaction.populate(`dataObjects.metadata`);
  if (pdf) transaction.populate(`pdf`);
  if (tei) transaction.populate(`tei`);
  if (files) transaction.populate(`files`);
  if (krt) transaction.populate(`krt.pdf`).populate(`krt.json`).populate(`krt.source`);
  return transaction.exec(function (err, doc) {
    if (err) return cb(err);
    if (!doc) return cb(null, new Error(`Document not found`));
    if (!opts.logs) return cb(null, doc);
    return DocumentsLogsController.create(
      {
        target: doc._id,
        account: opts.user._id,
        kind: CrudManager.actions.read._id
      },
      function (err, log) {
        if (err) return cb(err);
        return cb(null, doc);
      }
    );
  });
};

/**
 * Get document by id
 * @param {object} opts - Options available
 * @param {object} opts.user - Current user
 * @param {string} opts.data.id - Id of the update document
 * @param {string} opts.data.visible - Visibility of the document
 * @param {string} opts.data.name - Name of the document
 * @param {array} opts.data.organizations - Array of organizations id
 * @param {string} opts.data.owner - Owner of the document
 * @param {object} opts.data.urls - Urls of the document
 * @param {boolean} opts.[logs] - Specify if action must be logged (default: true)
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: document instance OR undefined)
 * @returns {undefined} undefined
 */
Self.update = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `user._id`) === `undefined`) return cb(new Error(`Missing required data: opts.user._id`));
  if (typeof _.get(opts, `data`) === `undefined`) return cb(new Error(`Missing required data: opts.data`));
  if (typeof _.get(opts, `data.id`) === `undefined`) return cb(new Error(`Missing required data: opts.data.id`));
  // Check all optionnal data
  if (typeof _.get(opts, `logs`) === `undefined`) opts.logs = true;
  let accessRights = AccountsManager.getAccessRights(opts.user, AccountsManager.match.all);
  if (!accessRights.authenticated) return cb(null, new Error(`Unauthorized functionnality`));
  return Self.get(
    {
      data: {
        id: opts.data.id
      },
      user: opts.user
    },
    function (err, doc) {
      if (err) return cb(err);
      if (doc instanceof Error) return cb(null, doc);
      let accessRights = AccountsManager.getAccessRights(opts.user, AccountsManager.match.all);
      if ((accessRights.isVisitor || accessRights.isStandardUser) && doc.locked)
        return cb(null, new Error(`You can not update locked data`));
      let organizations = Params.convertToArray(opts.data.organizations, `string`);
      return async.map(
        [
          // Update properties
          function (next) {
            if (Params.checkString(opts.data.name)) doc.name = opts.data.name ? opts.data.name : doc._id.toString();
            if (Params.checkString(opts.data.status)) doc.status = opts.data.status;
            if (accessRights.isModerator || accessRights.isAdministrator) {
              if (Params.checkBoolean(opts.data.visible)) doc.visible = opts.data.visible;
              if (Params.checkBoolean(opts.data.locked)) doc.locked = opts.data.locked;
            }
            return next();
          },
          // Update organizations property
          function (next) {
            if (!Params.checkArray(organizations)) return next();
            if (accessRights.isAdministrator) {
              doc.organizations = organizations;
            }
            if (accessRights.isStandardUser || accessRights.isModerator) {
              doc.organizations = AccountsManager.getOwnOrganizations(organizations, opts.user);
            }
            return next();
          },
          // Update owner property
          function (next) {
            if (!Params.checkString(opts.data.owner)) return next();
            return Accounts.findOne({ _id: opts.data.owner }, function (err, account) {
              if (err) return next(err);
              if (!account) return next(new Error(`Account not found`));
              if (accessRights.isAdministrator) {
                doc.owner = opts.data.owner;
              }
              if (accessRights.isModerator) {
                // Get user organizations ids
                let userOrganizationsIds = opts.user.organizations.map(function (item) {
                  return item._id.toString();
                });
                // Check owner has same organization than the current user
                let belongsToOrganizations =
                  AccountsManager.getOwnOrganizations(userOrganizationsIds, account).length > 0;
                if (belongsToOrganizations) doc.owner = opts.data.owner;
              }
              return next();
            });
          },
          // Update urls property
          function (next) {
            if (typeof _.get(opts, `data.urls`) !== `object`) return next();
            if (Params.checkString(opts.data.urls.originalFile)) doc.urls.originalFile = opts.data.urls.originalFile;
            if (Params.checkString(opts.data.urls.bioRxiv)) doc.urls.bioRxiv = opts.data.urls.bioRxiv;
            if (Params.checkString(opts.data.urls.preprint)) doc.urls.bioRxiv = opts.data.urls.preprint;
            if (Params.checkString(opts.data.urls.hypothesis) && accessRights.isAdministrator)
              doc.urls.hypothesis = opts.data.urls.hypothesis;
            return next();
          },
          // Update HHMI property
          function (next) {
            if (typeof _.get(opts, `data.HHMI`) !== `object`) return next();
            if (Params.checkString(opts.data.HHMI.DOI)) doc.HHMI.DOI = opts.data.HHMI.DOI;
            if (Params.checkString(opts.data.HHMI.preprint)) doc.HHMI.preprint = opts.data.HHMI.preprint;
            return next();
          }
        ],
        function (action, next) {
          return action(next);
        },
        function (err) {
          if (err) return cb(err);
          return doc.save(function (err) {
            if (err) return cb(err);
            if (!opts.logs) return cb(null, doc);
            return DocumentsLogsController.create(
              {
                target: doc._id,
                account: opts.user._id,
                kind: CrudManager.actions.update._id
              },
              function (err, log) {
                if (err) return cb(err);
                return cb(null, doc);
              }
            );
          });
        }
      );
    }
  );
};

/**
 * update documents
 * @param {object} opts - Options available
 * @param {array} opts.data.ids - array of documents id
 * @param {string} opts.data.visible - Visibility of the document
 * @param {array} opts.data.organizations - Array of organizations id
 * @param {string} opts.data.owner - Owner of the document
 * @param {boolean} opts.[logs] - Specify if action must be logged (default: true)
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: document instance OR undefined)
 * @returns {undefined} undefined
 */
Self.updateMany = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `user._id`) === `undefined`) return cb(new Error(`Missing required data: opts.user._id`));
  if (typeof _.get(opts, `data`) === `undefined`) return cb(new Error(`Missing required data: opts.data`));
  if (typeof _.get(opts, `data.ids`) === `undefined`) return cb(new Error(`Missing required data: opts.data.ids`));
  // Check all optionnal data
  if (typeof _.get(opts, `logs`) === `undefined`) opts.logs = true;
  let accessRights = AccountsManager.getAccessRights(opts.user, AccountsManager.match.all);
  if (!accessRights.isAdministrator) return cb(null, new Error(`Unauthorized functionnality`));
  let ids = Params.convertToArray(opts.data.ids, `string`);
  if (!Params.checkArray(ids)) return cb(null, new Error(`You must select at least one document!`));
  let owner = Params.convertToString(opts.data.owner);
  if (!Params.checkString(owner)) return cb(null, new Error(`You must select an owner!`));
  let organizations = Params.convertToArray(opts.data.organizations, `string`);
  if (!Params.checkArray(organizations)) return cb(null, new Error(`You must select at least one organization!`));
  let visible = Params.convertToBoolean(opts.data.visible);
  let locked = Params.convertToBoolean(opts.data.locked);
  let name = Params.convertToString(opts.data.name);
  return async.reduce(
    ids,
    [],
    function (acc, item, next) {
      return Self.update(
        {
          user: opts.user,
          data: {
            id: item,
            owner: owner,
            name: name,
            organizations: organizations,
            visible: visible,
            locked: locked
          },
          logs: opts.logs
        },
        function (err, res) {
          acc.push({ err, res });
          return next(null, acc);
        }
      );
    },
    function (err, result) {
      if (err) return cb(err);
      return cb(null, result);
    }
  );
};

/**
 * Delete a document
 * @param {object} opts - Options available
 * @param {object} opts.user - Current user
 * @param {string} opts.data.id - Id of the update document
 * @param {boolean} opts.[force] - Specify if action must be forced (default: false)
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: document instance OR undefined)
 * @returns {undefined} undefined
 */
Self.delete = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `data`) === `undefined`) return cb(new Error(`Missing required data: opts.data`));
  if (typeof _.get(opts, `data.id`) === `undefined`) return cb(new Error(`Missing required data: opts.data.id`));
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `user._id`) === `undefined`) return cb(new Error(`Missing required data: opts.user._id`));
  let accessRights = AccountsManager.getAccessRights(opts.user, AccountsManager.match.all);
  if (!accessRights.authenticated && !opts.force) return cb(null, new Error(`Unauthorized functionnality`));
  return Self.get({ data: { id: opts.data.id }, user: opts.user }, function (err, doc) {
    if (err) return cb(err);
    if (doc instanceof Error) return cb(null, doc);
    let actions = [
      // Delete DocumentsFiles
      function (callback) {
        return DocumentsFiles.find({ document: doc._id }, function (err, files) {
          if (err) return callback(err);
          if (Array.isArray(files) && files.length)
            return async.each(
              files,
              function (file, next) {
                if (err) return next(err);
                // Delete files on FileSystem & in mongoDB
                return DocumentsFilesController.deleteFile(file._id.toString(), function (err) {
                  return next(err);
                });
              },
              function (err) {
                return callback(err);
              }
            );
          return callback();
        });
      },
      function (callback) {
        return DocumentsLogsController.delete({ target: doc._id }, function (err) {
          if (err) return callback(err);
          return callback(err);
        });
      },
      function (callback) {
        return DocumentsMetadata.deleteOne({ document: doc._id }, function (err) {
          if (err) return callback(err);
          return callback(err);
        });
      },
      function (callback) {
        return DocumentsDatasets.deleteOne({ document: doc._id }, function (err) {
          if (err) return callback(err);
          return callback(err);
        });
      },
      function (callback) {
        return DocumentsDataObjectsMetadata.deleteOne({ document: doc._id }, function (err) {
          if (err) return callback(err);
          return callback(err);
        });
      },
      function (callback) {
        return DocumentsDataObjectsController.all(
          { user: opts.user, data: { documents: [doc._id] } },
          function (err, res) {
            if (err) return callback(err);
            if (res instanceof Error) return callback(null, res);
            if (!res || !Array.isArray(res.data)) return callback(null, new Error(`DataObjects not found`));
            let dataObjectsIds = res.data.map(function (item) {
              return item._id.toString();
            });
            if (dataObjectsIds.length < 1) return callback(err);
            return DocumentsDataObjects.deleteMany({ _id: { $in: dataObjectsIds } }, function (err) {
              if (err) return callback(err);
              return DocumentsDataObjectsLogs.deleteMany({ target: { $in: dataObjectsIds } }, function (err) {
                return callback(err);
              });
            });
          }
        );
      }
    ];
    // Execute all delete actions
    return async.each(
      actions,
      function (action, next) {
        return action(next);
      },
      function (err) {
        if (err) return cb(err);
        return Documents.deleteOne({ _id: doc._id }, function (err) {
          return cb(err, doc);
        });
      }
    );
  });
};

/**
 * Delete multiples documents (c.f delete function get more informations)
 * @param {object} opts - Options available
 * @param {object} opts.data - Data available
 * @param {array} opts.data.ids - Array of accounts id
 * @param {object} opts.user - User using this functionality (must be similar to req.user)
 * @param {boolean} opts.[logs] - Specify if action must be logged (default: true)
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: Array of process logs OR undefined)
 * @returns {undefined} undefined
 */
Self.deleteMany = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `user._id`) === `undefined`) return cb(new Error(`Missing required data: opts.user._id`));
  if (typeof _.get(opts, `data`) === `undefined`) return cb(new Error(`Missing required data: opts.data`));
  if (typeof _.get(opts, `data.ids`) === `undefined`) return cb(new Error(`Missing required data: opts.data.ids`));
  // Check all optionnal data
  if (typeof _.get(opts, `logs`) === `undefined`) opts.logs = true;
  let accessRights = AccountsManager.getAccessRights(opts.user, AccountsManager.match.all);
  let ids = Params.convertToArray(opts.data.ids, `string`);
  if (!Params.checkArray(ids)) return cb(null, new Error(`You must select at least one document`));
  return async.reduce(
    ids,
    [],
    function (acc, item, next) {
      return Self.delete({ user: opts.user, data: { id: item }, logs: opts.logs }, function (err, res) {
        acc.push({ err, res });
        return next(null, acc);
      });
    },
    function (err, result) {
      if (err) return cb(err);
      return cb(null, result);
    }
  );
};

module.exports = Self;
