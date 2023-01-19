/*
 * @prettier
 */

'use strict';

const fs = require(`fs`);

const async = require(`async`);
const mongoose = require(`mongoose`);
const _ = require(`lodash`);

const Documents = require(`../../models/documents.js`);
const DocumentsMetadata = require(`../../models/documents.metadata.js`);
const DocumentsDatasets = require(`../../models/documents.datasets.js`);
const Accounts = require(`../../models/accounts.js`);
const Organizations = require(`../../models/organizations.js`);
const DocumentsFiles = require(`../../models/documents.files.js`);
const DocumentsLogs = require(`../../models/documents.logs.js`);

const AccountsController = require(`./accounts.js`);
const DocumentsFilesController = require(`./documents.files.js`);
const DocumentsDatasetsController = require(`./documents.datasets.js`);
const DocumentsLogsController = require(`./documents.logs.js`);

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

const conf = require(`../../conf/conf.json`);
const uploadConf = require(`../../conf/upload.json`);

let Self = {};

// Document Status
Self.status = {
  metadata: `metadata`,
  datasets: `datasets`,
  finish: `finish`
};

/**
 * Build CSV of all datasets of given documents
 * @param {object} documents - List of documents
 * @returns {buffer} buffer
 */
Self.buildDatasetsCSV = function (documents) {
  return CSV.buildDatasets(documents);
};

/**
 * Check sentences content of a document by id
 * @param {object} opts - Options available
 * @param {object} opts.user - Current user
 * @param {object} opts.data - Data available
 * @param {string} opts.data.source - Id of the source document (that contain datasets you want to import)
 * @param {string} opts.data.target - Id of the target document (that will receiving imported datasets)
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: document instance OR undefined)
 * @returns {undefined} undefined
 */
Self.importDatasets = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `user._id`) === `undefined`) return cb(new Error(`Missing required data: opts.user._id`));
  if (typeof _.get(opts, `data`) === `undefined`) return cb(new Error(`Missing required data: opts.data`));
  if (typeof _.get(opts, `data.source`) === `undefined`)
    return cb(new Error(`Missing required data: opts.data.source`));
  if (typeof _.get(opts, `data.target`) === `undefined`)
    return cb(new Error(`Missing required data: opts.data.target`));
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
        { data: { id: item.id, datasets: true, pdf: true, tei: true }, user: opts.user },
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
              let datasets = _.get(doc, `datasets.current`);
              acc[item.kind] = { doc: doc };
              acc[item.kind].datasets = typeof datasets === `undefined` ? [] : datasets.toObject();
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
      return Analyzer.checkDatasetsInTEI(
        {
          datasets: res.source.datasets,
          tei: {
            name: `dataseer`,
            content: res.target.tei.content,
            metadata: res.target.metadata
          }
        },
        function (err, datasets) {
          if (err) return cb(err);
          let result = { merged: [], existing: [], rejected: datasets.rejected };
          return async.mapSeries(
            datasets.mergeable,
            function (item, next) {
              let dataset = Object.assign({}, item);
              let cp = Object.assign({}, dataset);
              let sentences = dataset.sentences.filter(function (item) {
                return true;
              });
              let alreadyExist = DocumentsDatasetsController.datasetAlreadyExist(
                res.target.datasets,
                dataset,
                Analyzer.softMatch
              );
              if (alreadyExist) {
                result.existing.push(cp);
                return next();
              }
              result.merged.push(cp);
              return Self.newDataset(
                {
                  datasetsId: res.target.doc.datasets._id.toString(),
                  dataset: dataset,
                  sentence: sentences[0],
                  user: opts.user,
                  logs: true
                },
                function (err, newDataset) {
                  if (err) return next(err);
                  if (sentences.length <= 1) return next();
                  return async.mapSeries(
                    sentences.slice(1),
                    function (sentence, _next) {
                      return Self.linkSentence(
                        {
                          datasetsId: res.target.doc.datasets._id.toString(),
                          link: { dataset: { id: newDataset.id }, sentence: { id: sentence.id } },
                          user: opts.user
                        },
                        function (err, s) {
                          return _next(err);
                        }
                      );
                    },
                    function (err) {
                      return next(err);
                    }
                  );
                }
              );
            },
            function (err) {
              console.log(err);
              if (err) return cb(null, err);
              return cb(null, result);
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
  let kind = Params.convertToString(opts.kind);
  let strict = Params.convertToBoolean(opts.strict);
  return GoogleSheets.getReportFileId({ strict: strict, kind: kind, data: { name: id } }, function (err, res) {
    return cb(err, res);
  });
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
  if (typeof _.get(opts, `data.id`) === `undefined`) return cb(new Error(`Missing required data: opts.data.id`));
  if (typeof _.get(opts, `data.dataTypes`) === `undefined`)
    return cb(new Error(`Missing required data: opts.dataTypes`));
  let kind = _.get(opts, `kind`);
  if (typeof kind === `undefined`) return cb(Error(`Missing required data: opts.kind`));
  if (kind !== `ASAP` && kind !== `AmNat` && kind !== `DataSeer Generic` && kind !== `Universal Journal Report`)
    return cb(
      Error(
        `Invalid required data: opts.kind must be 'ASAP or 'AmNat' or 'DataSeer Generic' or 'Universal Journal Report'`
      )
    );
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
          data: {
            doc: { id: data.doc._id.toString(), token: data.doc.token },
            dataTypesInfos: opts.data.dataTypes,
            metadata: {
              articleTitle: data.doc.metadata.article_title,
              doi: data.doc.metadata.doi,
              authors: data.doc.metadata.authors.filter(function (item) {
                return item.name.length > 0;
              }),
              dataSeerLink: {
                url: `${Url.build(`/documents/${opts.data.id}`, { token: data.doc.token })}`,
                label: data.doc.name ? data.doc.name : data.doc._id.toString()
              },
              dataseerDomain: Url.build(`/`, {}),
              acknowledgement: data.doc.metadata.acknowledgement,
              affiliation: data.doc.metadata.affiliation,
              license: data.doc.metadata.license
            },
            summary: data.datasetsSummary,
            datasets: data.sortedDatasetsInfos.datasets,
            protocols: data.sortedDatasetsInfos.protocols,
            reagents: data.sortedDatasetsInfos.reagents,
            codes: data.sortedDatasetsInfos.codes,
            softwares: data.sortedDatasetsInfos.softwares
          }
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
  let tokenInfos = Self.getTokenfromHeaderOrQuerystring(req);
  if (!tokenInfos || !tokenInfos.token || !tokenInfos.key) return next();
  // Just try to authenticate. If it fail, just go next
  else
    return JWT.check(tokenInfos.token, req.app.get(`private.key`), {}, function (err, decoded) {
      if (err || !decoded) return next();
      return Accounts.findOne({ _id: decoded.accountId, disabled: false })
        .populate(`organizations`)
        .populate(`role`)
        .exec(function (err, user) {
          if (err || !user) return next();
          return Documents.findOne(
            { _id: decoded.documentId, [tokenInfos.key]: tokenInfos.token },
            function (err, doc) {
              if (err || !doc) return next();
              if (doc._id.toString() === decoded.documentId) {
                req.user = user; // Set user
                res.locals = { useDocumentToken: true };
              }
              return next();
            }
          );
        });
    });
};

/**
 * Check token validity
 * @param {object} tokenInfos - Infos about the token
 * @param {string} tokenInfos.token - Content of the token
 * @param {string} tokenInfos.key - Key of the token that must be used to find the account in mongodb
 * @param {object} tokenInfos.[opts] - Options sent to jwt.vertify function (default: {})
 * @param {object} opts - Options data
 * @param {string} opts.privateKey - Private key that must be used
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: decoded token OR undefined)
 * @returns {undefined} undefined
 */
Self.checkTokenValidity = function (tokenInfos = {}, opts = {}, cb) {
  // Check all required data
  if (typeof _.get(tokenInfos, `token`) === `undefined`)
    return cb(new Error(`Missing required data: tokenInfos.token`));
  if (typeof _.get(tokenInfos, `key`) === `undefined`) return cb(new Error(`Missing required data: tokenInfos.key`));
  if (typeof _.get(opts, `privateKey`) === `undefined`) return cb(new Error(`Missing required data: opts.privateKey`));
  // Check all optionnal data
  if (typeof _.get(tokenInfos, `opts`) === `undefined`) tokenInfos.opts = {};
  // Start process
  // Just try to authenticate. If it fail, just go next
  return JWT.check(tokenInfos.token, opts.privateKey, tokenInfos.opts, function (err, decoded) {
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
    return Documents.findOne({ _id: decoded.documentId, [tokenInfos.key]: tokenInfos.token }, function (err, doc) {
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
 * @param {string} opts.dataTypes - dataTypes to create datasets (stored in app.get('dataTypes'))
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
  if (typeof _.get(opts, `mute`) === `undefined` || !accessRights.isAdministrator) opts.mute = false;
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
            return PdfManager.mergeFiles({ files: [params.file].concat(attachedPDFs) }, function (err, res) {
              if (err) return next(err, acc);
              params.attachedFiles.push(params.file);
              params.file = res;
              return next(null, acc);
            });
          },
          // Upload file
          function (acc, next) {
            if (
              !DocumentsFilesController.isPDF(params.file.mimetype) &&
              !DocumentsFilesController.isXML(params.file.mimetype)
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
                }
                if (DocumentsFilesController.isXML(res.mimetype)) {
                  // Set XML only when dataseer-ml do not need to be requested
                  acc.tei = res._id;
                }
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
                        name: `${params.file.name}.sanitized.pdf`,
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
                          name: `${params.file.name}.ds-ml.tei.xml`,
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
            if (!isPDF || !opts.softcite) return next(null, acc);
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
                          name: `${params.file.name}.softcite.json`,
                          data: json.toString(`utf8`).toString(DocumentsFilesController.encoding),
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
          // Process metadata
          function (acc, next) {
            return Self.updateOrCreateMetadata(
              {
                data: { id: acc._id.toString() },
                refreshORCIDsFromAPI: true,
                refreshORCIDsFromASAPList: true,
                user: opts.user,
                refreshAuthors: true
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
          // Process datasets
          function (acc, next) {
            return Self.extractDatasets(
              {
                data: { id: acc._id.toString() },
                user: opts.user,
                dataTypes: opts.dataTypes,
                setCustomDefaultProperties: uploadConf.setCustomDefaultProperties
              },
              function (err, datasets) {
                if (err) return next(err, acc);
                if (datasets instanceof Error) return next(datasets, acc);
                return Self.refreshDatasetsInTEI(
                  { user: opts.user, documentId: acc._id.toString(), datasets: datasets.current },
                  function (err) {
                    if (err) return next(err, acc);
                    // Create logs
                    return DocumentsLogsController.create(
                      {
                        target: datasets.document,
                        account: opts.user._id,
                        kind: CrudManager.actions.update._id,
                        key: `datasets`
                      },
                      function (err, log) {
                        if (err) return next(err, acc);
                        acc.datasets = datasets._id;
                        return next(null, acc);
                      }
                    );
                  }
                );
              }
            );
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
          // Refresh Datasets Indexes
          function (acc, next) {
            return Self.refreshDataObjectsIndexes(
              { user: opts.user, data: { id: acc._id.toString() } },
              function (err, ok) {
                if (err) return next(err, acc);
                if (ok instanceof Error) return next(ok, acc);
                return next(null, acc);
              }
            );
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
 * Validate Datasets of document
 * @param {object} opts - Options available (You must call getUploadParams)
 * @param {object} opts.data - Data available
 * @param {string} opts.data.id - Document id
 * @param {object} opts.user - Current user
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: ObjectId OR new Error)
 * @returns {undefined} undefined
 */
Self.validateDatasets = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `data`) === `undefined`) return cb(new Error(`Missing required data: opts.data`));
  if (typeof _.get(opts, `data.id`) === `undefined`) return cb(new Error(`Missing required data: opts.data.id`));
  let accessRights = AccountsManager.getAccessRights(opts.user, AccountsManager.match.all);
  return Self.get({ data: { id: opts.data.id }, user: opts.user }, function (err, doc) {
    if (err) return cb(err);
    if (doc instanceof Error) return cb(null, doc);
    return DocumentsDatasetsController.checkValidation({ data: { id: doc.datasets } }, function (err, validated) {
      if (err) return cb(err);
      if (validated instanceof Error) return cb(null, validated);
      if ((accessRights.isVisitor || accessRights.isStandardUser) && !validated) return cb(null, validated);
      doc.status = Self.status.finish;
      return doc.save(function (err) {
        if (err) return cb(err);
        // Create logs
        return DocumentsLogsController.create(
          {
            target: doc._id,
            account: opts.user._id,
            kind: CrudManager.actions.update._id,
            key: `validateDatasets`
          },
          function (err, log) {
            if (err) return cb(err);
            return cb(null, true); // Return true because document.status is now updated
          }
        );
      });
    });
  });
};

/**
 * Validate Metadata of document
 * @param {object} opts - Options available (You must call getUploadParams)
 * @param {object} opts.data - Data available
 * @param {string} opts.data.id - Document id
 * @param {object} opts.user - Current user
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: ObjectId OR new Error)
 * @returns {undefined} undefined
 */
Self.validateMetadata = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `data`) === `undefined`) return cb(new Error(`Missing required data: opts.data`));
  if (typeof _.get(opts, `data.id`) === `undefined`) return cb(new Error(`Missing required data: opts.data.id`));
  return Self.get({ data: { id: opts.data.id }, user: opts.user }, function (err, doc) {
    if (err) return cb(err);
    if (doc instanceof Error) return cb(null, doc);
    doc.status = Self.status.datasets;
    return doc.save(function (err) {
      if (err) return cb(err);
      // Create logs
      return DocumentsLogsController.create(
        {
          target: doc._id,
          account: opts.user._id,
          kind: CrudManager.actions.update._id,
          key: `validateMetadata`
        },
        function (err, log) {
          if (err) return cb(err);
          return cb(null, true);
        }
      );
    });
  });
};

/**
 * Back to metadata for the given document
 * @param {object} opts - Options available (You must call getUploadParams)
 * @param {object} opts.data - Data available
 * @param {string} opts.data.id - Document id
 * @param {object} opts.user - Current user
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: ObjectId OR new Error)
 * @returns {undefined} undefined
 */
Self.backToMetadata = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `data`) === `undefined`) return cb(new Error(`Missing required data: opts.data`));
  if (typeof _.get(opts, `data.id`) === `undefined`) return cb(new Error(`Missing required data: opts.data.id`));
  return Self.get({ data: { id: opts.data.id }, user: opts.user }, function (err, doc) {
    if (err) return cb(err);
    if (doc instanceof Error) return cb(null, doc);
    doc.status = Self.status.metadata;
    return doc.save(function (err) {
      if (err) return cb(err);
      // Create logs
      return DocumentsLogsController.create(
        {
          target: doc._id,
          account: opts.user._id,
          kind: CrudManager.actions.update._id,
          key: `backToMetadata`
        },
        function (err, log) {
          if (err) return cb(err);
          return cb(null, true);
        }
      );
    });
  });
};

/**
 * Reopen the given document
 * @param {object} opts - Options available (You must call getUploadParams)
 * @param {object} opts.data - Data available
 * @param {string} opts.data.id - Document id
 * @param {object} opts.user - Current user
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: ObjectId OR new Error)
 * @returns {undefined} undefined
 */
Self.reopen = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `data`) === `undefined`) return cb(new Error(`Missing required data: opts.data`));
  if (typeof _.get(opts, `data.id`) === `undefined`) return cb(new Error(`Missing required data: opts.data.id`));
  return Self.get({ data: { id: opts.data.id }, user: opts.user }, function (err, doc) {
    if (err) return cb(err);
    if (doc instanceof Error) return cb(null, doc);
    doc.status = Self.status.metadata;
    return doc.save(function (err) {
      if (err) return cb(err);
      // Create logs
      return DocumentsLogsController.create(
        {
          target: doc._id,
          account: opts.user._id,
          kind: CrudManager.actions.update._id,
          key: `reopen`
        },
        function (err, log) {
          if (err) return cb(err);
          return cb(null, true);
        }
      );
    });
  });
};

/**
 * search for documents
 * @param {object} opts - Options available
 * @param {object} opts.data - Data available
 * @param {string} opts.data.query - Global query
 * @param {Array} opts.data.fields - Fields
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
 * @param {object} opts.refreshAuthors - Refresh value of authors name property (using TEI data)
 * @param {object} opts.refreshORCIDsFromAPI - Refresh value of authors ORCID property (using ORCID data)
 * @param {object} opts.refreshORCIDsFromASAPList - Refresh value of authors ORCID property (using ASAP List data)
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
      let refreshAuthors = _.get(opts, `refreshAuthors`, false);
      let refreshORCIDsFromAPI = _.get(opts, `data.refreshORCIDsFromAPI`, false);
      let refreshORCIDsFromASAPList = _.get(opts, `data.refreshORCIDsFromASAPList`, false);
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
            if (!_metadata.license && metadata && metadata.license) _metadata.license = metadata.license;
            if (!_metadata.acknowledgement && metadata && metadata.acknowledgement)
              _metadata.acknowledgement = metadata.acknowledgement;
            if (!_metadata.affiliation && metadata && metadata.affiliation)
              _metadata.affiliation = metadata.affiliation;
            if (!refreshAuthors) {
              _metadata.authors = authors.map(function (e) {
                return e;
              });
            }
            metadata = Object.assign({}, _metadata);
            return next();
          },
          function (next) {
            // Get ORCIDs from API
            if (!refreshORCIDsFromAPI) return next();
            if (metadata.authors.length <= 0) return next();
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
                    if (err) return _next(err);
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
            if (!refreshORCIDsFromASAPList) return next();
            if (metadata.authors.length <= 0) return next();
            for (let i = 0; i < metadata.authors.length; i++) {
              let author = metadata.authors[i];
              let results = ORCID.findAuthorFromASAPList(author.name);
              if (results instanceof Error || !Array.isArray(results)) continue;
              author.orcid.suggestedValues = results.map((item) => {
                return `${item.orcid} (${item.firstname} ${item.lastname})`;
              });
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
 * Update Or Create Datasets of document
 * @param {object} opts - Options available (You must call getUploadParams)
 * @param {object} opts.data - Data available
 * @param {string} opts.data.id - Document id
 * @param {object} opts.dataTypes - Current dataTypes
 * @param {object} opts.user - Current user
 * @param {object} opts.setCustomDefaultProperties - Set custom default properties on current datasets
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: ObjectId OR new Error)
 * @returns {undefined} undefined
 */
Self.extractDatasets = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `data`) === `undefined`) return cb(new Error(`Missing required data: opts.data`));
  if (typeof _.get(opts, `dataTypes`) === `undefined`) return cb(new Error(`Missing required data: opts.dataTypes`));
  if (typeof _.get(opts, `data.id`) === `undefined`) return cb(new Error(`Missing required data: opts.data.id`));
  return Self.get({ data: { id: opts.data.id }, user: opts.user }, function (err, doc) {
    if (err) return cb(err);
    if (doc instanceof Error) return cb(null, doc);
    if (!doc.tei) return cb(null, new Error(`TEI file not found`));
    // Read TEI file (containing PDF metadata)
    return DocumentsFilesController.readFile({ data: { id: doc.tei.toString() } }, function (err, content) {
      if (err) return cb(err);
      // Extract metadata
      let extractedDatasets = XML.extractDatasets(
        XML.load(content.data.toString(DocumentsFilesController.encoding)),
        opts.dataTypes
      );
      let currentDatasets = [].concat(extractedDatasets);
      // Set custom default properties
      if (opts.setCustomDefaultProperties) {
        for (let i = 0; i < currentDatasets.length; i++) {
          let dataset = currentDatasets[i];
          if (dataset.kind === `dataset`) {
            dataset.reuse = false;
          }
        }
      }
      // Update them
      return DocumentsDatasets.findOneAndUpdate(
        { document: doc._id },
        {
          extracted: extractedDatasets,
          current: currentDatasets,
          deleted: []
        },
        {
          new: true,
          upsert: true, // Make this update into an upsert
          rawResult: true
        }
      ).exec(function (err, res) {
        if (err) return cb(err);
        if (typeof _.get(res, `value._id`) === `undefined`) return cb(null, new Error(`ObjectId not found`));
        let created = !_.get(res, `lastErrorObject.updatedExisting`, true);
        // Create logs
        return DocumentsLogsController.create(
          {
            target: doc._id,
            account: opts.user._id,
            kind: created ? CrudManager.actions.create._id : CrudManager.actions.update._id,
            key: `datasets`
          },
          function (err, log) {
            if (err) return cb(err);
            return cb(null, Object.assign({ _id: res.value._id.toString() }, res.value.toJSON()));
          }
        );
      });
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
 * Create new dataset
 * @param {object} opts - JSON containing all data
 * @param {object} opts.user - User
 * @param {string} opts.datasetsId - Datasets id
 * @param {string} opts.sentence - Sentence
 * @param {string} opts.sentence.id - Sentence id
 * @param {string} opts.dataset - Dataset
 * @param {boolean} opts.dataset.reuse - Dataset reuse property
 * @param {string} opts.dataset.cert - Dataset cert value (between 0 and 1)
 * @param {string} opts.dataset.dataType - Dataset dataType
 * @param {string} opts.dataset.subType - Dataset subType
 * @param {string} opts.dataset.description - Dataset description
 * @param {string} opts.dataset.bestDataFormatForSharing - Dataset best data format for sharing
 * @param {string} opts.dataset.mostSuitableRepositories - Dataset most suitable repositories
 * @param {string} opts.dataset.DOI - Dataset DOI
 * @param {string} opts.dataset.name - Dataset name
 * @param {string} opts.dataset.comments - Dataset comments
 * @param {function} cb - Callback function(err, res) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.newDataset = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `datasetsId`) === `undefined`) return cb(new Error(`Missing required data: opts.datasetsId`));
  if (typeof _.get(opts, `dataset`) === `undefined`) return cb(new Error(`Missing required data: opts.dataset`));
  if (typeof _.get(opts, `sentence.id`) === `undefined`)
    return cb(new Error(`Missing required data: opts.sentence.id`));
  // Init transaction
  return Documents.findOne({ datasets: opts.datasetsId }).exec(function (err, doc) {
    if (err) return cb(err);
    if (!doc) return cb(null, new Error(`Document not found`));
    let accessRights = AccountsManager.getAccessRights(opts.user);
    if (doc.locked && (accessRights.isStandardUser || accessRights.isVisitor))
      return cb(null, new Error(`Document is locked`));
    let transaction = DocumentsDatasets.findOne({ _id: opts.datasetsId });
    // Execute transaction
    return transaction.exec(function (err, datasets) {
      if (err) return cb(err);
      if (!datasets) return cb(null, new Error(`Datasets not found`));
      return Self.addDatasetInTEI(
        {
          documentId: datasets.document,
          sentence: { id: opts.sentence.id },
          dataset: {
            reuse: opts.dataset.reuse ? !!opts.dataset.reuse : false,
            type: opts.dataset.dataType,
            subtype: opts.dataset.subType,
            cert: opts.dataset.cert
          },
          user: opts.user
        },
        function (err, teiInfos) {
          if (err) return cb(err);
          if (teiInfos instanceof Error) return cb(null, teiInfos);
          let error = false;
          // Check dataset with opts.id already exist
          for (let i = 0; i < datasets.current.length; i++) {
            if (datasets.current[i].id === teiInfos.dataset.id) error = true;
          }
          if (error) return cb(null, new Error(`Dataset not created in mongodb`));
          // add new dataset
          opts.dataset.id = teiInfos.dataset.id;
          opts.dataset.dataInstanceId = teiInfos.dataset.dataInstanceId;
          opts.dataset.sentences = [teiInfos.links[0].sentence];
          let dataset = DocumentsDatasetsController.createDataset(opts.dataset);
          datasets.current.push(dataset);
          let mongoInfos = dataset;
          return datasets.save(function (err, res) {
            if (err) return cb(err);
            // Create logs
            return DocumentsLogsController.create(
              {
                target: datasets.document,
                account: opts.user._id,
                kind: CrudManager.actions.create._id,
                key: `${opts.dataset.id}`
              },
              function (err, log) {
                if (err) return cb(err);
                return cb(null, mongoInfos);
              }
            );
          });
        }
      );
    });
  });
};

/**
 * Update dataset
 * @param {object} opts - JSON containing all data
 * @param {object} opts.user - User
 * @param {object} opts.data - Available data
 * @param {string} opts.data.id - Document id
 * @param {string} opts.data.datasets - Document datasets
 * @param {boolean} opts.[merge] - Merge new current datasets with old current datasets (default: false)
 * @param {function} cb - Callback function(err, res) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.updateDatasets = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `data.id`) === `undefined`) return cb(new Error(`Missing required data: opts.data.id`));
  if (typeof _.get(opts, `data.datasets`) === `undefined`) opts.data.datasets = {};
  if (typeof _.get(opts, `merge`) === `undefined`) opts.merge = false;
  let accessRights = AccountsManager.getAccessRights(opts.user);
  if (!accessRights.isAdministrator) return cb(null, new Error(`Unauthorized functionnality`));
  return DocumentsDatasets.findOne({ document: opts.data.id }, function (err, datasets) {
    if (err) return cb(err);
    if (!datasets) return cb(null, new Error(`Datasets not found`));
    if (Params.checkArray(opts.data.datasets.current)) {
      if (opts.merge)
        datasets.current = DocumentsDatasetsController.mergeDatasets(datasets.current, opts.data.datasets.current);
      else datasets.current = opts.data.datasets.current;
      // Reset dataInstanceIds
      datasets.current = datasets.current.map(function (item, i) {
        item.dataInstanceId = `dataInstance-${i + 1}`;
        item.id = `dataset-${i + 1}`;
        return item;
      });
    }
    if (Params.checkArray(opts.data.datasets.deleted)) datasets.deleted = opts.data.datasets.deleted;
    if (Params.checkArray(opts.data.datasets.extracted)) datasets.extracted = opts.data.datasets.extracted;
    return datasets.save(function (err) {
      if (err) return cb(err);
      Self.refreshDatasetsInTEI(
        { user: opts.user, documentId: opts.data.id, datasets: datasets.current },
        function (err) {
          if (err) return cb(err);
          // Create logs
          return DocumentsLogsController.create(
            {
              target: datasets.document,
              account: opts.user._id,
              kind: CrudManager.actions.update._id,
              key: `datasets`
            },
            function (err, log) {
              if (err) return cb(err);
              return cb(null, datasets);
            }
          );
        }
      );
    });
  });
};

/**
 * Refresh all datasets of all documents
 * @param {object} opts - JSON containing all data
 * @param {object} opts.user - User
 * @param {function} cb - Callback function(err, res) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.refreshAllDataObjects = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  let accessRights = AccountsManager.getAccessRights(opts.user);
  if (!accessRights.isAdministrator) return cb(null, new Error(`Unauthorized functionnality`));
  return Documents.find(
    {},
    {
      _id: 1 // By default
    }
  ).exec(function (err, ids) {
    if (err) return cb(err);
    let results = [];
    return async.reduce(
      ids,
      results,
      function (acc, item, next) {
        return Self.refreshDataObjects({ user: opts.user, data: { id: item._id.toString() } }, function (err, res) {
          if (err) acc.push({ err, document: { _id: item._id.toString() }, res: res });
          else if (res && res._id && res.document)
            acc.push({
              err,
              document: { _id: item._id.toString() },
              datasets: { _id: res._id.toString(), document: res.document.toString() }
            });
          else acc.push({ err, res: res });
          return next(null, acc);
        });
      },
      function (err, res) {
        return cb(err, res);
      }
    );
  });
};

/**
 * Refresh datasets
 * @param {object} opts - JSON containing all data
 * @param {object} opts.user - User
 * @param {object} opts.data - Available data
 * @param {string} opts.data.id - Document id
 * @param {function} cb - Callback function(err, res) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.refreshDataObjects = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `data.id`) === `undefined`) return cb(new Error(`Missing required data: opts.data.id`));
  let accessRights = AccountsManager.getAccessRights(opts.user);
  if (!accessRights.isAdministrator) return cb(null, new Error(`Unauthorized functionnality`));
  return DocumentsDatasets.findOne({ document: opts.data.id }, function (err, datasets) {
    if (err) return cb(err);
    if (!datasets) return cb(null, new Error(`Datasets not found`));
    // Reset dataInstanceIds
    for (let i = 0; i < datasets.current.length; i++) {
      datasets.current[i] = DocumentsDatasetsController.createDataset(datasets.current[i].toJSON());
      datasets.current[i].dataInstanceId = `dataInstance-${i + 1}`;
      datasets.current[i].id = `dataset-${i + 1}`;
    }
    return datasets.save(function (err) {
      if (err) return cb(err);
      Self.refreshDatasetsInTEI(
        { user: opts.user, documentId: opts.data.id, datasets: datasets.current },
        function (err) {
          if (err) return cb(err);
          // Create logs
          return DocumentsLogsController.create(
            {
              target: datasets.document,
              account: opts.user._id,
              kind: CrudManager.actions.update._id,
              key: `datasets`
            },
            function (err, log) {
              if (err) return cb(err);
              return cb(null, datasets);
            }
          );
        }
      );
    });
  });
};

/**
 * Refresh all datasets indexes of all documents
 * @param {object} opts - JSON containing all data
 * @param {object} opts.user - User
 * @param {function} cb - Callback function(err, res) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.refreshAllDataObjectsIndexes = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  let accessRights = AccountsManager.getAccessRights(opts.user);
  if (!accessRights.isAdministrator) return cb(null, new Error(`Unauthorized functionnality`));
  return Documents.find(
    {},
    {
      _id: 1 // By default
    }
  ).exec(function (err, ids) {
    if (err) return cb(err);
    let results = [];
    return async.reduce(
      ids,
      results,
      function (acc, item, next) {
        return Self.refreshDataObjectsIndexes(
          { user: opts.user, data: { id: item._id.toString() } },
          function (err, res) {
            if (err) acc.push({ err, document: { _id: item._id.toString() }, res: res });
            else if (res && res._id && res.document)
              acc.push({
                err,
                document: { _id: item._id.toString() },
                datasets: { _id: res._id.toString(), document: res.document.toString() }
              });
            else acc.push({ err, res: res });
            return next(null, acc);
          }
        );
      },
      function (err, res) {
        return cb(err, res);
      }
    );
  });
};

/**
 * Refresh datasets indexes
 * @param {object} opts - JSON containing all data
 * @param {object} opts.user - User
 * @param {object} opts.data - Available data
 * @param {string} opts.data.id - Document id
 * @param {function} cb - Callback function(err, res) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.refreshDataObjectsIndexes = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `data.id`) === `undefined`) return cb(new Error(`Missing required data: opts.data.id`));
  let accessRights = AccountsManager.getAccessRights(opts.user);
  if (!accessRights.isModerator) return cb(null, new Error(`Unauthorized functionnality`));
  return Self.get({ data: { id: opts.data.id, pdf: true, tei: true }, user: opts.user }, function (err, doc) {
    let mapping = undefined;
    if (doc.tei && doc.tei.metadata && doc.tei.metadata.mapping && doc.tei.metadata.mapping.object)
      mapping = doc.tei.metadata.mapping.object;
    if (doc.pdf && doc.pdf.metadata && doc.pdf.metadata.mapping && doc.pdf.metadata.mapping.object)
      mapping = doc.pdf.metadata.mapping.object;
    if (typeof mapping === `undefined`) return cb(null, new Error(`mapping not available`));
    return DocumentsDatasets.findOne({ document: opts.data.id }, function (err, datasets) {
      if (err) return cb(err);
      if (!datasets) return cb(null, new Error(`Datasets not found`));
      for (let i = 0; i < datasets.current.length; i++) {
        if (datasets.current[i].sentences.length > 0) {
          let sentence = datasets.current[i].sentences[0];
          if (typeof datasets.current[i].index === `undefined` && sentence && sentence.id)
            datasets.current[i].index = mapping[sentence.id];
        }
      }
      return datasets.save(function (err) {
        if (err) return cb(err);
        return cb(null, datasets);
      });
    });
  });
};

/**
 * Update dataset
 * @param {object} opts - JSON containing all data
 * @param {object} opts.user - User
 * @param {string} opts.fromAPI - Update dataset without sentences & dataInstanceId properties
 * @param {string} opts.datasetsId - Datasets id
 * @param {string} opts.dataset.id - Dataset id
 * @param {string} opts.dataset.dataInstanceId - Dataset dataInstanceId
 * @param {string} opts.dataset.sentences - Dataset sentences
 * @param {boolean} opts.dataset.reuse - Dataset reuse property
 * @param {string} opts.dataset.cert - Dataset cert value (between 0 and 1)
 * @param {string} opts.dataset.dataType - Dataset dataType
 * @param {string} opts.dataset.subType - Dataset subType
 * @param {string} opts.dataset.description - Dataset description
 * @param {string} opts.dataset.bestDataFormatForSharing - Dataset best data format for sharing
 * @param {string} opts.dataset.mostSuitableRepositories - Dataset most suitable repositories
 * @param {string} opts.dataset.DOI - Dataset DOI
 * @param {string} opts.dataset.name - Dataset name
 * @param {string} opts.dataset.comments - Dataset comments
 * @param {function} cb - Callback function(err, res) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.updateDataset = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `datasetsId`) === `undefined`) return cb(new Error(`Missing required data: opts.datasetsId`));
  if (typeof _.get(opts, `dataset.id`) === `undefined`) return cb(new Error(`Missing required data: opts.dataset.id`));
  return Documents.findOne({ datasets: opts.datasetsId }).exec(function (err, doc) {
    if (err) return cb(err);
    if (!doc) return cb(null, new Error(`Document not found`));
    let accessRights = AccountsManager.getAccessRights(opts.user);
    if (doc.locked && (accessRights.isStandardUser || accessRights.isVisitor))
      return cb(null, new Error(`Document is locked`));
    // Init transaction
    let transaction = DocumentsDatasets.findOne({ _id: opts.datasetsId });
    // Execute transaction
    return transaction.exec(function (err, datasets) {
      if (err) return cb(err);
      if (!datasets) return cb(null, new Error(`Datasets not found`));
      return Self.updateDatasetInTEI(
        {
          documentId: datasets.document,
          dataset: {
            id: opts.dataset.id,
            reuse: opts.dataset.reuse ? !!opts.dataset.reuse : false,
            type: opts.dataset.dataType,
            subtype: opts.dataset.subType,
            cert: opts.dataset.cert
          },
          user: opts.user
        },
        function (err, teiInfos) {
          if (err) return cb(err);
          if (teiInfos instanceof Error) return cb(null, teiInfos);
          // Check dataset with opts.id already exist
          let updated = false;
          let dataset;
          for (let i = 0; i < datasets.current.length; i++) {
            // update dataset
            if (datasets.current[i].id === opts.dataset.id) {
              updated = true;
              if (opts.fromAPI) {
                opts.dataset.dataInstanceId = datasets.current[i].dataInstanceId;
                opts.dataset.sentences = datasets.current[i].sentences;
              }
              datasets.current[i] = DocumentsDatasetsController.createDataset(opts.dataset);
              dataset = datasets.current[i];
            }
          }
          if (!updated) return cb(null, new Error(`Dataset not updated in mongodb`));
          let mongoInfos = dataset;
          return datasets.save(function (err, res) {
            if (err) return cb(err);
            // Create logs
            return DocumentsLogsController.create(
              {
                target: datasets.document,
                account: opts.user._id,
                kind: CrudManager.actions.update._id,
                key: `${opts.dataset.id}`
              },
              function (err, log) {
                if (err) return cb(err);
                return cb(null, mongoInfos);
              }
            );
          });
        }
      );
    });
  });
};

/**
 * Delete dataset
 * @param {object} opts - JSON containing all data
 * @param {object} opts.user - User
 * @param {string} opts.datasetsId - Datasets id
 * @param {string} opts.dataset.id - Dataset id
 * @returns {undefined} undefined
 */
Self.deleteDataset = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `datasetsId`) === `undefined`) return cb(new Error(`Missing required data: opts.datasetsId`));
  if (typeof _.get(opts, `dataset.id`) === `undefined`) return cb(new Error(`Missing required data: opts.dataset.id`));
  return Documents.findOne({ datasets: opts.datasetsId }).exec(function (err, doc) {
    if (err) return cb(err);
    if (!doc) return cb(null, new Error(`Document not found`));
    let accessRights = AccountsManager.getAccessRights(opts.user);
    if (doc.locked && (accessRights.isStandardUser || accessRights.isVisitor))
      return cb(null, new Error(`Document is locked`));
    // Init transaction
    let transaction = DocumentsDatasets.findOne({ _id: opts.datasetsId });
    // Execute transaction
    return transaction.exec(function (err, datasets) {
      if (err) return cb(err);
      if (!datasets) return cb(null, new Error(`Datasets not found`));
      return Self.deleteDatasetInTEI(
        {
          documentId: datasets.document,
          dataset: { id: opts.dataset.id },
          user: opts.user
        },
        function (err, teiInfos) {
          if (err) return cb(err);
          if (teiInfos instanceof Error) return cb(null, teiInfos);
          // Check dataset with opts.id already exist
          let deleted = false;
          let dataset;
          for (let i = 0; i < datasets.current.length; i++) {
            // update dataset
            if (datasets.current[i].id === opts.dataset.id) {
              datasets.current[i].sentences = [];
              datasets.current[i].dataInstanceId = null;
              dataset = datasets.current.splice(i, 1)[0];
              datasets.deleted.push(dataset);
              deleted = true;
            }
          }
          if (!deleted) return cb(null, new Error(`Dataset not deleted in mongodb`));
          let mongoInfos = dataset;
          return datasets.save(function (err, res) {
            if (err) return cb(err);
            // Create logs
            return DocumentsLogsController.create(
              {
                target: datasets.document,
                account: opts.user._id,
                kind: CrudManager.actions.delete._id,
                key: `${opts.dataset.id}`
              },
              function (err, log) {
                if (err) return cb(err);
                return cb(null, mongoInfos);
              }
            );
          });
        }
      );
    });
  });
};

/**
 * Create new link
 * @param {object} opts - JSON containing all data
 * @param {object} opts.user - Account
 * @param {string} opts.datasetsId - Datasets id
 * @param {string} opts.link - Link
 * @param {string} opts.link.dataset - Dataset
 * @param {string} opts.link.dataset.id - Dataset id
 * @param {string} opts.link.sentence - Linked sentence
 * @param {string} opts.link.sentence.id - Linked sentence id
 * @param {function} cb - Callback function(err, res) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.linkSentence = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `datasetsId`) === `undefined`) return cb(new Error(`Missing required data: opts.datasetsId`));
  if (typeof _.get(opts, `link.sentence.id`) === `undefined`)
    return cb(new Error(`Missing required data: opts.link.sentence.id`));
  if (typeof _.get(opts, `link.dataset.id`) === `undefined`)
    return cb(new Error(`Missing required data: opts.link.dataset.id`));
  return Documents.findOne({ datasets: opts.datasetsId }).exec(function (err, doc) {
    if (err) return cb(err);
    if (!doc) return cb(null, new Error(`Document not found`));
    let accessRights = AccountsManager.getAccessRights(opts.user);
    if (doc.locked && (accessRights.isStandardUser || accessRights.isVisitor))
      return cb(null, new Error(`Document is locked`));
    // Init transaction
    let transaction = DocumentsDatasets.findOne({ _id: opts.datasetsId });
    // Execute transaction
    return transaction.exec(function (err, datasets) {
      if (err) return cb(err);
      if (!datasets) return cb(null, new Error(`Datasets not found`));
      return Self.linkSentenceInTEI(
        {
          documentId: datasets.document,
          sentence: { id: opts.link.sentence.id },
          dataset: { id: opts.link.dataset.id },
          user: opts.user
        },
        function (err, teiInfos) {
          if (err) return cb(err);
          if (teiInfos instanceof Error) return cb(null, teiInfos);
          // Check dataset with opts.id exist
          let updated = false;
          let dataset;
          for (let i = 0; i < datasets.current.length; i++) {
            // update dataset
            if (datasets.current[i].id === opts.link.dataset.id) {
              updated = true;
              dataset = datasets.current[i];
              let sentenceAlreadyLinked = false;
              dataset.sentences.map(function (sentence) {
                if (sentence.id === teiInfos.sentence.id) sentenceAlreadyLinked = true;
              });
              if (!sentenceAlreadyLinked) dataset.sentences.push(teiInfos.sentence);
            }
          }
          if (!updated) return cb(null, new Error(`Dataset not linked in mongodb`));
          let mongoInfos = dataset;
          return datasets.save(function (err, res) {
            if (err) return cb(err);
            // Create logs
            return DocumentsLogsController.create(
              {
                target: datasets.document,
                account: opts.user._id,
                kind: CrudManager.actions.update._id,
                key: `${opts.link.dataset.id}`
              },
              function (err, log) {
                if (err) return cb(err);
                return cb(null, mongoInfos);
              }
            );
          });
        }
      );
    });
  });
};

/**
 * Delete link
 * @param {object} opts - JSON containing all data
 * @param {object} opts.user - Account
 * @param {string} opts.datasetsId - Datasets id
 * @param {string} opts.link - Link
 * @param {string} opts.link.dataset - Dataset
 * @param {string} opts.link.dataset.id - Dataset id
 * @param {string} opts.link.sentence - Linked sentence
 * @param {string} opts.link.sentence.id - Linked sentence id
 * @param {function} cb - Callback function(err, res) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.unlinkSentence = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `datasetsId`) === `undefined`) return cb(new Error(`Missing required data: opts.datasetsId`));
  if (typeof _.get(opts, `link.sentence.id`) === `undefined`)
    return cb(new Error(`Missing required data: opts.link.sentence.id`));
  if (typeof _.get(opts, `link.dataset.id`) === `undefined`)
    return cb(new Error(`Missing required data: opts.link.dataset.id`));
  return Documents.findOne({ datasets: opts.datasetsId }).exec(function (err, doc) {
    if (err) return cb(err);
    if (!doc) return cb(null, new Error(`Document not found`));
    let accessRights = AccountsManager.getAccessRights(opts.user);
    if (doc.locked && (accessRights.isStandardUser || accessRights.isVisitor))
      return cb(null, new Error(`Document is locked`));
    // Init transaction
    let transaction = DocumentsDatasets.findOne({ _id: opts.datasetsId });
    // Execute transaction
    return transaction.exec(function (err, datasets) {
      if (err) return cb(err);
      else if (!datasets) return cb(null, new Error(`Datasets not found`));
      return Self.unlinkSentenceInTEI(
        {
          documentId: datasets.document,
          sentence: { id: opts.link.sentence.id },
          dataset: { id: opts.link.dataset.id },
          user: opts.user
        },
        function (err, teiInfos) {
          if (err) return cb(err);
          if (teiInfos instanceof Error) return cb(null, teiInfos);
          // Check dataset with opts.id exist
          let updated = false;
          let dataset;
          for (let i = 0; i < datasets.current.length; i++) {
            // update dataset
            if (datasets.current[i].id === teiInfos.dataset.id) {
              dataset = datasets.current[i];
              let sentenceIndex = dataset.sentences.reduce(function (acc, sentence, index) {
                if (sentence.id === teiInfos.sentence.id) acc = index;
                return acc;
              }, -1);
              if (sentenceIndex > -1) {
                updated = true;
                dataset.sentences.splice(sentenceIndex, 1);
              }
            }
          }
          if (!updated) return cb(null, new Error(`Dataset not unlinked in mongodb`));
          let mongoInfos = dataset;
          return datasets.save(function (err, res) {
            if (err) return cb(err);
            // Create logs
            return DocumentsLogsController.create(
              {
                target: datasets.document,
                account: opts.user._id,
                kind: CrudManager.actions.update._id,
                key: `${opts.link.dataset.id}`
              },
              function (err, log) {
                if (err) return cb(err);
                return cb(null, mongoInfos);
              }
            );
          });
        }
      );
    });
  });
};

/**
 * Refresh datasets in TEI
 * @param {object} opts JSON object containing all data
 * @param {object} opts.user - Current user
 * @param {string} opts.documentId - Document id
 * @param {array} opts.datasets - datasets
 * @param {function} cb - Callback function(err) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.refreshDatasetsInTEI = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `documentId`) === `undefined`) return cb(new Error(`Missing required data: opts.documentId`));
  if (typeof _.get(opts, `datasets`) === `undefined`) return cb(new Error(`Missing required data: opts.datasets`));
  return Self.get({ data: { id: opts.documentId.toString() }, user: opts.user }, function (err, doc) {
    if (err) return cb(err);
    if (doc instanceof Error) return cb(null, doc);
    return DocumentsFilesController.readFile({ data: { id: doc.tei.toString() } }, function (err, content) {
      if (err) return cb(err);
      let teiInfos = XML.refreshDatasets(XML.load(content.data.toString(DocumentsFilesController.encoding)), {
        datasets: opts.datasets
      });
      if (teiInfos.err) return cb(null, new Error(`Dataset not linked in TEI`));
      return DocumentsFilesController.rewriteFile(doc.tei.toString(), teiInfos.res.xml, function (err) {
        if (err) return cb(err);
        else return cb(null);
      });
    });
  });
};

/**
 * Try to fix the TEI content
 * @param {object} opts JSON object containing all data
 * @param {object} opts.user - Current user
 * @param {string} opts.documentId - Document id
 * @param {function} cb - Callback function(err) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.fixTEIContent = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `documentId`) === `undefined`) return cb(new Error(`Missing required data: opts.documentId`));
  return Self.get({ data: { id: opts.documentId.toString() }, user: opts.user }, function (err, doc) {
    if (err) return cb(err);
    if (doc instanceof Error) return cb(null, doc);
    return DocumentsFilesController.readFileContent({ data: { id: doc.tei.toString() } }, function (err, content) {
      if (err) return cb(err);
      let oldContent = content.data.toString(DocumentsFilesController.encoding);
      let chars = `</TEI>`;
      let indexOfChars = oldContent.indexOf(chars);
      let isCorrect = indexOfChars + chars.length === oldContent.length;
      if (isCorrect) return cb(null);
      let newContent = oldContent.substring(0, indexOfChars + chars.length);
      return fs.writeFile(
        `${content.path}.save`,
        oldContent,
        { encoding: DocumentsFilesController.encoding },
        function (err) {
          if (err) return cb(err);
          return DocumentsFilesController.rewriteFile(doc.tei.toString(), newContent, function (err) {
            if (err) return cb(err);
            else return cb(null);
          });
        }
      );
    });
  });
};

/**
 * Process OCR on the PDF file
 * @param {object} opts JSON object containing all data
 * @param {object} opts.user - Current user
 * @param {string} opts.documentId - Document id
 * @param {string} opts.pagesNumber - Pages number
 * @param {function} cb - Callback function(err) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.processOCR = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `documentId`) === `undefined`) return cb(new Error(`Missing required data: opts.documentId`));
  let pagesNumber = Array.isArray(opts.pagesNumber) ? opts.pagesNumber : undefined;
  return Self.get({ data: { id: opts.documentId.toString() }, user: opts.user }, function (err, doc) {
    if (err) return cb(err);
    if (doc instanceof Error) return cb(null, doc);
    return DocumentsFilesController.getFilePath({ data: { id: doc.pdf.toString() } }, function (err, pdfFilePath) {
      if (err) return cb(err);
      return OCR.processPDF(pdfFilePath, pagesNumber, function (err, res) {
        if (err) return cb(err);
        else return cb(null, res);
      });
    });
  });
};

/**
 * Try to detect new sentences in the PDF file (using OCR)
 * @param {object} opts JSON object containing all data
 * @param {object} opts.user - Current user
 * @param {string} opts.documentId - Document id
 * @param {string} opts.pagesNumber - Pages number
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
          let numPage = page.page;
          let words = page.words.map(function (word) {
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
        let outpout = XML.addSentences(xmlString, results.newSentences);
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
 * Add dataset in TEI file
 * @param {object} opts - JSON object containing all data
 * @param {object} opts.user - Current user
 * @param {string} opts.documentId - Document id
 * @param {string} opts.sentence - Linked sentence
 * @param {string} opts.sentence.id - Linked sentence id
 * @param {object} opts.dataset - JSON object containing all dataset infos
 * @param {string} opts.dataset.dataInstanceId - Dataset dataInstanceId
 * @param {string} opts.dataset.id - Dataset id
 * @param {string} opts.dataset.type - Dataset type
 * @param {string} opts.dataset.cert - Dataset cert
 * @param {function} cb - Callback function(err) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.addDatasetInTEI = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `documentId`) === `undefined`) return cb(new Error(`Missing required data: opts.documentId`));
  if (typeof _.get(opts, `sentence.id`) === `undefined`)
    return cb(new Error(`Missing required data: opts.sentence.id`));
  if (typeof _.get(opts, `dataset`) === `undefined`) return cb(new Error(`Missing required data: opts.dataset`));
  return Self.get({ data: { id: opts.documentId.toString() }, user: opts.user }, function (err, doc) {
    if (err) return cb(err);
    if (doc instanceof Error) return cb(null, doc);
    return DocumentsFilesController.readFile({ data: { id: doc.tei.toString() } }, function (err, content) {
      if (err) return cb(err);
      let teiInfos = XML.addDataset(XML.load(content.data.toString(DocumentsFilesController.encoding)), opts);
      if (teiInfos.err) return cb(null, new Error(`Dataset not created in TEI`));
      return DocumentsFilesController.rewriteFile(doc.tei.toString(), teiInfos.res.xml, function (err) {
        if (err) return cb(err);
        else return cb(null, teiInfos.res.data);
      });
    });
  });
};

/**
 * Update dataset in TEI file
 * @param {object} opts - JSON object containing all data
 * @param {object} opts.user - Current user
 * @param {string} opts.documentId - Document id
 * @param {object} opts.dataset - JSON object containing all dataset infos
 * @param {string} opts.dataset.dataInstanceId - Dataset dataInstanceId
 * @param {string} opts.dataset.id - Dataset id
 * @param {string} opts.dataset.type - Dataset type
 * @param {string} opts.dataset.cert - Dataset cert
 * @param {function} cb - Callback function(err) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.updateDatasetInTEI = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `documentId`) === `undefined`) return cb(new Error(`Missing required data: opts.documentId`));
  if (typeof _.get(opts, `dataset.id`) === `undefined`) return cb(new Error(`Missing required data: opts.dataset.id`));
  return Self.get({ data: { id: opts.documentId.toString() }, user: opts.user }, function (err, doc) {
    if (err) return cb(err);
    if (doc instanceof Error) return cb(null, doc);
    return DocumentsFilesController.readFile({ data: { id: doc.tei.toString() } }, function (err, content) {
      if (err) return cb(err);
      let teiInfos = XML.updateDataset(XML.load(content.data.toString(DocumentsFilesController.encoding)), opts);
      if (teiInfos.err) return cb(null, new Error(`Dataset not updated in TEI`));
      return DocumentsFilesController.rewriteFile(doc.tei.toString(), teiInfos.res.xml, function (err) {
        if (err) return cb(err);
        else return cb(null, teiInfos.res.data);
      });
    });
  });
};

/**
 * Delete dataset in TEI file
 * @param {object} opts JSON object containing all data
 * @param {object} opts.user - Current user
 * @param {string} opts.documentId - Document id
 * @param {object} opts.dataset - JSON object containing all dataset infos
 * @param {string} opts.dataset.id - Dataset id
 * @param {function} cb - Callback function(err) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.deleteDatasetInTEI = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `documentId`) === `undefined`) return cb(new Error(`Missing required data: opts.documentId`));
  if (typeof _.get(opts, `dataset.id`) === `undefined`) return cb(new Error(`Missing required data: opts.dataset.id`));
  return Self.get({ data: { id: opts.documentId.toString() }, user: opts.user }, function (err, doc) {
    if (err) return cb(err);
    if (doc instanceof Error) return cb(null, doc);
    return DocumentsFilesController.readFile({ data: { id: doc.tei.toString() } }, function (err, content) {
      if (err) return cb(err);
      let teiInfos = XML.deleteDataset(XML.load(content.data.toString(DocumentsFilesController.encoding)), opts);
      if (teiInfos.err) return cb(null, new Error(`Dataset not deleted in TEI`));
      return DocumentsFilesController.rewriteFile(doc.tei.toString(), teiInfos.res.xml, function (err) {
        if (err) return cb(err);
        else return cb(null, teiInfos.res.data);
      });
    });
  });
};

/**
 * Add link in TEI file
 * @param {object} opts JSON object containing all data
 * @param {object} opts.user - Current user
 * @param {string} opts.documentId - Document id
 * @param {string} opts.sentence - Linked sentence
 * @param {string} opts.sentence.id - Linked sentence id
 * @param {object} opts.dataset - JSON object containing all dataset infos
 * @param {string} opts.dataset.id - Dataset id
 * @param {function} cb - Callback function(err) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.linkSentenceInTEI = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `documentId`) === `undefined`) return cb(new Error(`Missing required data: opts.documentId`));
  if (typeof _.get(opts, `dataset.id`) === `undefined`) return cb(new Error(`Missing required data: opts.dataset.id`));
  if (typeof _.get(opts, `sentence.id`) === `undefined`)
    return cb(new Error(`Missing required data: opts.sentence.id`));
  return Self.get({ data: { id: opts.documentId.toString() }, user: opts.user }, function (err, doc) {
    if (err) return cb(err);
    if (doc instanceof Error) return cb(null, doc);
    return DocumentsFilesController.readFile({ data: { id: doc.tei.toString() } }, function (err, content) {
      if (err) return cb(err);
      let teiInfos = XML.linkSentence(XML.load(content.data.toString(DocumentsFilesController.encoding)), opts);
      if (teiInfos.err) return cb(null, new Error(`Dataset not linked in TEI`));
      return DocumentsFilesController.rewriteFile(doc.tei.toString(), teiInfos.res.xml, function (err) {
        if (err) return cb(err);
        else return cb(null, teiInfos.res.data);
      });
    });
  });
};

/**
 * Delete link in TEI file
 * @param {object} opts JSON object containing all data
 * @param {object} opts.user - Current user
 * @param {string} opts.documentId - Document id
 * @param {string} opts.sentence - Linked sentence
 * @param {string} opts.sentence.id - Linked sentence id
 * @param {object} opts.dataset - JSON object containing all dataset infos
 * @param {string} opts.dataset.id - Dataset id
 * @param {function} cb - Callback function(err) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.unlinkSentenceInTEI = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `documentId`) === `undefined`) return cb(new Error(`Missing required data: opts.documentId`));
  if (typeof _.get(opts, `dataset.id`) === `undefined`) return cb(new Error(`Missing required data: opts.dataset.id`));
  if (typeof _.get(opts, `sentence.id`) === `undefined`)
    return cb(new Error(`Missing required data: opts.sentence.id`));
  return Self.get({ data: { id: opts.documentId.toString() }, user: opts.user }, function (err, doc) {
    if (err) return cb(err);
    if (doc instanceof Error) return cb(null, doc);
    return DocumentsFilesController.readFile({ data: { id: doc.tei.toString() } }, function (err, content) {
      if (err) return cb(err);
      let teiInfos = XML.unlinkSentence(XML.load(content.data.toString(DocumentsFilesController.encoding)), opts);
      if (teiInfos.err) return cb(null, new Error(`Dataset not unlinked in TEI`));
      return DocumentsFilesController.rewriteFile(doc.tei.toString(), teiInfos.res.xml, function (err) {
        if (err) return cb(err);
        else return cb(null, teiInfos.res.data);
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
  let datasets = Params.convertToBoolean(opts.data.datasets);
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
      if (datasets) transaction.populate(`datasets`);
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
    { data: { id: opts.data.id, datasets: true, metadata: true, pdf: true, tei: true }, user: opts.user },
    function (err, doc) {
      if (err) return cb(err);
      if (doc instanceof Error) return cb(null, doc);
      if (opts.data.kind === `html`) {
        if (opts.data.organization === `default` || opts.data.organization === `bioRxiv`) {
          let sortedDatasetsInfos = Self.getSortedDatasetsInfos(doc, opts.data.dataTypes);
          let datasetsSummary = DataTypes.getDatasetsSummary(sortedDatasetsInfos.all, opts.data.dataTypes);
          let bestPractices = DataTypes.getBestPractices(
            [].concat(
              sortedDatasetsInfos.protocols,
              sortedDatasetsInfos.datasets,
              sortedDatasetsInfos.codes,
              sortedDatasetsInfos.softwares,
              sortedDatasetsInfos.reagents
            ),
            opts.data.dataTypes
          );
          return cb(null, {
            doc,
            sortedDatasetsInfos,
            datasetsSummary,
            bestPractices
          });
        }
      }
      if (opts.data.kind === `docx`) {
        if (opts.data.organization === `default`) {
          return cb(null, DocX.getData(doc, opts.data.dataTypes));
        }
      }
      return cb(null, new Error(`Case not handled`));
    }
  );
};

/**
 * Sort datasets of the given document (useful to create reports)
 * @param {object} doc - Document mongodb object
 * @param {object} dataTypes - dataTypes object
 * @returns {object} sorted datasets
 */
Self.getSortedDatasetsInfos = function (doc, dataTypes = {}) {
  let currentDatasets = _.get(doc, `datasets.current`, []);
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
  let orderedDatasets = currentDatasets
    .map(function (item) {
      // sort sentences
      let sentences = item.sentences.sort(sortSentences);
      let type = DataTypes.getDataTypeInfos(item, dataTypes);
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
  let protocols = orderedDatasets.filter(function (item) {
    return item.kind === `protocol`;
  });
  let codes = orderedDatasets.filter(function (item) {
    return item.kind === `code`;
  });
  let softwares = orderedDatasets.filter(function (item) {
    return item.kind === `software`;
  });
  let reagents = orderedDatasets.filter(function (item) {
    return item.kind === `reagent`;
  });
  let datasets = orderedDatasets.filter(function (item) {
    return item.kind === `dataset`;
  });
  return { all: orderedDatasets, protocols, codes, softwares, reagents, datasets };
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
 * @param {boolean} opts.data.[datasets] - Populate datasets property (default: false)
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
  let tei = Params.convertToBoolean(opts.data.tei);
  let files = Params.convertToBoolean(opts.data.files);
  let metadata = Params.convertToBoolean(opts.data.metadata);
  let datasets = Params.convertToBoolean(opts.data.datasets);
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
  if (pdf) transaction.populate(`pdf`);
  if (tei) transaction.populate(`tei`);
  if (files) transaction.populate(`files`);
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
            if (Params.checkString(opts.data.urls.bioRxiv)) doc.urls.bioRxiv = opts.data.urls.bioRxiv;
            if (Params.checkString(opts.data.urls.hypothesis) && accessRights.isAdministrator)
              doc.urls.hypothesis = opts.data.urls.hypothesis;
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
        let opts = {
          documentId: doc._id
        };
        return DocumentsLogsController.delete({ target: doc._id }, function (err) {
          if (err) return callback(err);
          return callback(err);
        });
      },
      function (callback) {
        let opts = {
          documentId: doc._id
        };
        return DocumentsMetadata.deleteOne({ document: doc._id }, function (err) {
          if (err) return callback(err);
          return callback(err);
        });
      },
      function (callback) {
        let opts = {
          documentId: doc._id
        };
        return DocumentsDatasets.deleteOne({ document: doc._id }, function (err) {
          if (err) return callback(err);
          return callback(err);
        });
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
