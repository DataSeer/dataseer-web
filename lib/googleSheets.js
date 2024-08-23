/*
 * @prettier
 */

'use strict';

const _ = require(`lodash`);
const async = require(`async`);
const path = require(`path`);
const { google } = require(`googleapis`);

const Url = require(`./url.js`);
const Params = require(`./params.js`);

const googleAPICredentials = require(`../conf/services/googleAPICredentials.json`);
const conf = require(`../conf/reports.json`);
const changesLogsConf = require(`../conf/changes.logs.json`);
const changesReportsConf = require(`../conf/changes.reports.json`);
const ASAPAuthorsConf = require(`../conf/authors.ASAP.json`);
const customSoftwareConf = require(`../conf/software.custom.json`);
const customReagentsConf = require(`../conf/reagents.custom.json`);
const customIdentifiersConf = require(`../conf/identifiers.custom.json`);

const RULES = require(`../resources/rules/rules.js`);

const auth = new google.auth.GoogleAuth({
  keyFile: path.join(__dirname, `../conf/services/googleAPICredentials.json`),
  scopes: [
    `https://www.googleapis.com/auth/cloud-platform`,
    `https://www.googleapis.com/auth/drive`,
    `https://www.googleapis.com/auth/drive.file`,
    `https://www.googleapis.com/auth/spreadsheets`
  ]
});

const drive = google.drive({
  version: `v3`,
  auth: auth
});

const gSheets = google.sheets({ version: `v4`, auth });

const BLACK_BORDER = {
  style: `SOLID`,
  colorStyle: {
    rgbColor: {
      red: 0,
      green: 0,
      blue: 0,
      alpha: 1
    }
  }
};

const GRAY_BORDER = {
  style: `SOLID`,
  colorStyle: {
    rgbColor: {
      red: 127,
      green: 127,
      blue: 127,
      alpha: 1
    }
  }
};

const NO_BORDER = {
  style: `NONE`,
  colorStyle: {
    rgbColor: {
      red: 255,
      green: 255,
      blue: 255,
      alpha: 1
    }
  }
};

const BLACK_BORDERS = {
  top: BLACK_BORDER,
  bottom: BLACK_BORDER,
  left: BLACK_BORDER,
  right: BLACK_BORDER,
  innerHorizontal: BLACK_BORDER,
  innerVertical: BLACK_BORDER
};

const GRAY_BORDERS = {
  top: GRAY_BORDER,
  bottom: GRAY_BORDER,
  left: GRAY_BORDER,
  right: GRAY_BORDER,
  innerHorizontal: GRAY_BORDER,
  innerVertical: GRAY_BORDER
};

const NO_BORDERS = {
  top: NO_BORDER,
  bottom: NO_BORDER,
  left: NO_BORDER,
  right: NO_BORDER,
  innerHorizontal: NO_BORDER,
  innerVertical: NO_BORDER
};

let Self = {};

/**
 * This function return the key the the given rule
 * @param {string} rule - The complete rule
 * @returns {Number} The rule key or NaN
 */
Self.getRuleKey = function (rule) {
  if (typeof rule !== `string`) return NaN;
  let split = rule.split(`[`);
  if (split.length !== 2) return NaN;
  return Number(split[1].slice(0, -1));
};

/**
 * This function return the key the the given conf rule
 * @param {string} key - The RULES key
 * @param {string} dataType - The RULES datatype kind
 * @param {string} subType - The RULES subtype kind (or null)
 * @param {string} ruleNumber - The RULES rule number
 * @returns {Number} The rule key or NaN
 */
Self.getConfRuleKey = function (key, dataType, subType = null, ruleNumber) {
  if (typeof RULES[key] === `undefined`) throw new Error(`Wrong RULES key : ${key}`);
  if (typeof RULES[key].status[dataType] === `undefined`) throw new Error(`Wrong RULES dataType : ${dataType} `);
  if (subType === null) return RULES[key].status[dataType][ruleNumber].key;
  else {
    if (typeof RULES[key].status[dataType][subType] !== `undefined`)
      return RULES[key].status[dataType][subType][ruleNumber].key;
    else return RULES[key].status[dataType][``][ruleNumber].key; // use default rules
  }
};

/**
 * This function return the report file ID (google file ID)
 * @param {object} opts - Options available
 * @param {string} opts.folder - Parent folder of the document
 * @param {boolean} opts.strict - Strict mode (default : true)
 * @param {string} opts.kind - kind of report
 * @param {object} opts.data - Data available
 * @param {string} opts.data.name - Name of the document
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR Error)
 * @returns {undefined} undefined
 */
Self.getReportFileId = function (opts = {}, cb) {
  // Check all required data
  let strict = _.get(opts, `strict`, true);
  let kind = _.get(opts, `kind`);
  let folder = _.get(opts, `folder`);
  let folders = _.get(conf, `folders.${kind}`);
  let name = _.get(opts, `data.name`);
  let organizations = _.get(opts, `data.organizations`);
  if (kind) {
    if (Object.keys(conf.templates).indexOf(kind) === -1)
      return cb(Error(`Invalid required data: opts.kind must be ${Object.keys(conf.templates).join(`, `)}`));
    if (typeof folders === `undefined`) return cb(Error(`Missing required data: conf.folders.${kind}`));
    folder = folders.default;
    if (Array.isArray(organizations)) {
      for (let i = 0; i < organizations.length; i++) {
        let organizationId = organizations[i];
        if (typeof folders[organizationId] !== `undefined`) {
          folder = folders[organizationId];
          break;
        }
      }
    }
  }
  if (typeof folder === `undefined`) return cb(Error(`Unable to find folder`));
  let pageToken = null;
  let ids = [];
  return async.doWhilst(
    function (callback) {
      let query = strict ? `name='${name}'` : `name contains '${name}'`;
      if (conf.prefix) query = query + ` and name contains '${conf.prefix}'`;
      if (folder) query = `${query} and '${folder}' in parents`;
      return drive.files.list(
        {
          q: query,
          fields: `nextPageToken,files(id, name)`,
          spaces: `drive`,
          pageToken: pageToken
        },
        function (err, res) {
          // Handle error
          if (err) return callback(err);
          if (Array.isArray(res.data.files) && res.data.files.length > 0)
            res.data.files.map(function (file) {
              ids.push(file.id);
            });
          pageToken = res.data.nextPageToken;
          return callback();
        }
      );
    },
    function (callback) {
      return callback(null, !!pageToken);
    },
    function (err) {
      // Handle error
      if (err) return cb(err);
      // There is no one existing document
      if (ids.length <= 0) return cb(null, new Error(`Report file not found`));
      // There is one existing document : return the google file id
      if (ids.length === 1) return cb(null, ids[0]);
      // There is more than one existing document : not handled
      return cb(new Error(`Unhandled case: More than one report exist for this document`));
    }
  );
};

/**
 * This function return the report file ID (google file ID)
 * @param {object} opts - Options available
 * @param {string} opts.folder - Parent folder of the document
 * @param {boolean} opts.strict - Strict mode (default : true)
 * @param {string} opts.kind - kind of report
 * @param {object} opts.data - Data available
 * @param {string} opts.data.name - Name of the document
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR Error)
 * @returns {undefined} undefined
 */
Self.getReportFileIds = function (opts = {}, cb) {
  // Check all required data
  let strict = _.get(opts, `strict`, true);
  let kind = _.get(opts, `kind`);
  let folder = _.get(opts, `folder`);
  let folders = _.get(conf, `folders.${kind}`);
  let name = _.get(opts, `data.name`);
  let organizations = _.get(opts, `data.organizations`);
  if (kind) {
    if (Object.keys(conf.templates).indexOf(kind) === -1)
      return cb(Error(`Invalid required data: opts.kind must be ${Object.keys(conf.templates).join(`, `)}`));
    if (typeof folders === `undefined`) return cb(Error(`Missing required data: conf.folders.${kind}`));
    folder = folders.default;
    if (Array.isArray(organizations)) {
      for (let i = 0; i < organizations.length; i++) {
        let organizationId = organizations[i];
        if (typeof folders[organizationId] !== `undefined`) {
          folder = folders[organizationId];
          break;
        }
      }
    }
  }
  if (typeof folder === `undefined`) return cb(Error(`Unable to find folder`));
  let pageToken = null;
  let ids = [];
  return async.doWhilst(
    function (callback) {
      let query = strict ? `name='${name}'` : `name contains '${name}'`;
      if (conf.prefix) query = query + ` and name contains '${conf.prefix}'`;
      if (folder) query = `${query} and '${folder}' in parents`;
      return drive.files.list(
        {
          q: query,
          fields: `nextPageToken,files(id, name, lastModifyingUser, createdTime, modifiedTime)`,
          spaces: `drive`,
          pageToken: pageToken
        },
        function (err, res) {
          // Handle error
          if (err) return callback(err);
          if (Array.isArray(res.data.files) && res.data.files.length > 0)
            res.data.files.map(function (file) {
              let data = {
                id: file.id,
                name: file.name,
                lastModifier: file.lastModifyingUser?.emailAddress ? file.lastModifyingUser?.emailAddress : ``,
                createdAt: new Date(file.createdTime),
                updatedAt: new Date(file.modifiedTime)
              };
              ids.push(data);
            });
          pageToken = res.data.nextPageToken;
          return callback();
        }
      );
    },
    function (callback) {
      return callback(null, !!pageToken);
    },
    function (err) {
      // Handle error
      if (err) return cb(err);
      // There is no one existing document
      // There is one existing document : return the google file id
      return cb(null, ids);
    }
  );
};

/**
 * This function return the Sheets file ID (google file ID)
 * @param {object} opts - Options available
 * @param {string} opts.folder - Parent folder of the document
 * @param {boolean} opts.strict - Strict mode (default : true)
 * @param {string} opts.kind - kind of report
 * @param {object} opts.data - Data available
 * @param {string} opts.data.name - Name of the document
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR Error)
 * @returns {undefined} undefined
 */
Self.getSheetsFileId = function (opts = {}, cb) {
  // Check all required data
  let strict = _.get(opts, `strict`, true);
  let kind = _.get(opts, `kind`);
  let folder = _.get(opts, `folder`);
  let name = _.get(opts, `data.name`);
  if (typeof folder === `undefined`) return cb(Error(`Unable to find folder`));
  let pageToken = null;
  let ids = [];
  return async.doWhilst(
    function (callback) {
      let query = strict ? `name='${name}'` : `name contains '${name}'`;
      if (opts.prefix) query = query + ` and name contains '${opts.prefix}'`;
      if (folder) query = `${query} and '${folder}' in parents`;
      return drive.files.list(
        {
          q: query,
          fields: `nextPageToken,files(id, name)`,
          spaces: `drive`,
          pageToken: pageToken
        },
        function (err, res) {
          // Handle error
          if (err) return callback(err);
          if (Array.isArray(res.data.files) && res.data.files.length > 0)
            res.data.files.map(function (file) {
              ids.push(file.id);
            });
          pageToken = res.data.nextPageToken;
          return callback();
        }
      );
    },
    function (callback) {
      return callback(null, !!pageToken);
    },
    function (err) {
      // Handle error
      if (err) return cb(err);
      // There is no one existing document
      if (ids.length <= 0) return cb(null, new Error(`Report file not found`));
      // There is one existing document : return the google file id
      if (ids.length === 1) return cb(null, ids[0]);
      // There is more than one existing document : not handled
      return cb(new Error(`Unhandled case: More than one report exist for this document`));
    }
  );
};

/**
 * This function return the google drive file (google file ID)
 * @param {object} opts - Options available
 * @param {string} opts.fileId - FileId of the document
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR Error)
 * @returns {undefined} undefined
 */
Self.getGoogleDriveFile = function (opts = {}, cb) {
  // Check all required data
  let strict = _.get(opts, `strict`, true);
  let fileId = _.get(opts, `fileId`);
  return drive.files.get(
    { fileId: fileId, fields: `name,lastModifyingUser,createdTime,modifiedTime` },
    function (err, query) {
      if (err) return cb(err);
      return cb(null, {
        name: query.data.name,
        lastModifier: query.data.lastModifyingUser?.emailAddress ? query.data.lastModifyingUser?.emailAddress : ``,
        createdAt: new Date(query.data.createdTime),
        updatedAt: new Date(query.data.modifiedTime)
      });
    }
  );
};

/**
 * This function return the sheet ID (google sheet ID)
 * @param {array} list - List of google sheets
 * @returns {integer} google sheet ID OR Error
 */
Self.getSheetId = function (list, sheetTitle = ``) {
  let sheets = Array.isArray(list) ? list : [];
  let sheet = sheets.filter(function (item) {
    return _.get(item, `properties.title`, undefined) === sheetTitle;
  });
  if (sheet.length !== 1) return new Error(`sheet with title ${sheetTitle} not found`);
  let sheetId = sheet.length === 1 ? sheet[0].properties.sheetId : undefined;
  if (typeof sheetId === `undefined`) return new Error(`SheetId not found`);
  return sheetId;
};

/**
 * This function return the sheets (google sheets)
 * @param {object} opts - Options available
 * @param {string} opts.spreadsheetId - spreadsheetId
 * @param {boolean} opts.includeGridData - includeGridData
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google sheets OR Error)
 * @returns {undefined} undefined
 */
Self.getSheets = function (opts, cb) {
  if (typeof _.get(opts, `spreadsheetId`) === `undefined`)
    return cb(Error(`Missing required data: opts.spreadsheetId`));
  let spreadsheetId = _.get(opts, `spreadsheetId`);
  let includeGridData = _.get(opts, `includeGridData`, false);
  return gSheets.spreadsheets.get(
    {
      // The spreadsheet to request.
      spreadsheetId: spreadsheetId,
      includeGridData: !!includeGridData // TODO: Update placeholder value.
    },
    function (err, query) {
      if (err) return cb(err);
      let sheets = _.get(query, `data.sheets`, []);
      if (sheets.length <= 0) return cb(null, new Error(`sheets not found`));
      return cb(null, sheets);
    }
  );
};

/**
 * This function will get the diff (changes) between 2 reports
 * @param {object} opts - Options available
 * @param {string} opts.kind - What kind of report (available values : ASAP or AmNat)
 * @param {object} opts.data - List of data
 * @param {object} data - Data available (for the report)
 * @param {string} data.old.spreadsheetId - Google Drive file ID
 * @param {string} data.new.spreadsheetId - Google Drive file ID
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR undefined)
 * @returns {undefined} undefined
 */
Self.getReportsChanges = function (opts, cb) {
  // Check all required data
  let data = _.get(opts, `data`);
  let results = {
    old: {
      metadata: {},
      datasets: [],
      code: [],
      software: [],
      materials: [],
      protocols: []
    },
    new: {
      metadata: {},
      datasets: [],
      code: [],
      software: [],
      materials: [],
      protocols: []
    }
  };
  if (typeof data === `undefined`) return cb(Error(`Missing required data: opts.kind`));
  return async.mapSeries(
    [
      { key: `old`, data: data.old },
      { key: `new`, data: data.new }
    ],
    function (item, next) {
      return Self.getGoogleDriveFile({ fileId: item.data.spreadsheetId }, function (err, file) {
        if (err) return next(new Error(`File not found`));
        return Self.getSheets(
          { spreadsheetId: item.data.spreadsheetId, includeGridData: true },
          function (err, sheets) {
            if (err) return next(new Error(`Sheets not found`));
            let dataSheets = sheets.map(function (sheet) {
              let data = sheet.data[0].rowData
                .map(function (rowDataItem) {
                  if (!Array.isArray(rowDataItem.values)) return;
                  return rowDataItem.values.map(function (value) {
                    return value.effectiveValue ? value.effectiveValue : {};
                  });
                })
                .filter(function (e) {
                  return typeof e !== `undefined`;
                });
              return { properties: sheet.properties, data: data };
            });
            for (let i = 0; i < dataSheets.length; i++) {
              let dataSheet = dataSheets[i];
              switch (dataSheet.properties.title) {
              case `Summary Sheet`:
                results[item.key].metadata = Self.extractMetadataFromASAPReport(dataSheet.data);
                results[item.key].metadata.name = file.name;
                results[item.key].metadata.version = file.name.substr(file.name.length - 3);
                results[item.key].metadata.lastModifier = file.lastModifier;
                results[item.key].metadata.createdAt = file.createdAt;
                results[item.key].metadata.updatedAt = file.updatedAt;
                results[item.key].metadata.report = item.data.spreadsheetId;
                break;
              case `Datasets`:
                results[item.key].datasets = Self.extractDatasetsFromASAPReport(dataSheet.data);
                break;
              case `Code and Software`:
                results[item.key].code = Self.extractCodeFromASAPReport(dataSheet.data);
                results[item.key].software = Self.extractSoftwareFromASAPReport(dataSheet.data);
                break;
              case `Lab Materials`:
                results[item.key].materials = Self.extractLabMaterialsFromASAPReport(dataSheet.data);
                break;
              case `Protocols`:
                results[item.key].protocols = Self.extractProtocolsFromASAPReport(dataSheet.data);
                break;
              default:
                break;
              }
            }
            return next(err);
          }
        );
      });
    },
    function (err) {
      return cb(err, results);
    }
  );
};

Self.splitDataFromASAPReportLines = function (lines, keys) {
  let arrKeys = Object.keys(keys);
  let results = arrKeys.reduce(function (acc, item) {
    acc[item] = [];
    return acc;
  }, {});
  let currentKey = undefined;
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    let filteredLine = line.filter(function (item) {
      return typeof item.stringValue !== `undefined`;
    });
    if (filteredLine.length === 0) currentKey = undefined;
    else if (filteredLine[0] && filteredLine[0].stringValue && arrKeys.indexOf(filteredLine[0].stringValue) > -1)
      currentKey = filteredLine[0].stringValue;
    else if (filteredLine[1] && filteredLine[1].stringValue && arrKeys.indexOf(filteredLine[1].stringValue) > -1)
      currentKey = filteredLine[1].stringValue;
    if (typeof currentKey !== `undefined` && line[0] && typeof line[0].numberValue !== `undefined`) {
      results[currentKey].push(line);
    }
  }
  return results;
};

Self.convertGoogleDateValueToDate = function (googleDateValue) {
  return new Date(
    new Date(1899, 11, 30 + Math.floor(googleDateValue), 0, 0, 0, 0).getTime() + (googleDateValue % 1) * 86400000
  );
};

/**
 * This function will extract datasets from a ASAP report
 * @param {object} data - data of sheet
 * @returns {array} list of Datasets
 */
Self.extractMetadataFromASAPReport = function (lines) {
  let results = {};
  results.name = lines[8][1].stringValue;
  results.date = isNaN(lines[9][1].numberValue) ? `` : Self.convertGoogleDateValueToDate(lines[9][1].numberValue);
  return results;
};

/**
 * This function will extract datasets from a ASAP report
 * @param {object} data - data of sheet
 * @returns {array} list of Datasets
 */
Self.extractDatasetsFromASAPReport = function (lines) {
  let results = [];
  let actionRequired = {
    'Deposit to appropriate repository and cite PID in text': true,
    'Cite dataset unique identifier in text': true,
    'Verify dataset citation': true,
    'Action Not Required': false,
    'Action Optional - (Media)': false,
    'Action Optional - (Other)': false
  };
  let splitedData = Self.splitDataFromASAPReportLines(lines, actionRequired);
  // create datasets
  for (let k in splitedData) {
    let data = splitedData[k];
    for (let i = 0; i < data.length; i++) {
      let item = data[i];
      let dataObject = {
        section: k,
        actionRequired: actionRequired[k],
        kind: `dataset`,
        reuse: item[1].boolValue,
        qc: item[2].boolValue,
        rep: item[3].boolValue,
        issue: item[4].boolValue,
        name: item[5].stringValue ? item[5].stringValue : ``,
        sentences: item[6].stringValue ? item[6].stringValue : ``,
        URL: item[7].stringValue ? item[7].stringValue : ``,
        identifier: item[8].stringValue ? item[8].stringValue : ``,
        notes: item[9].stringValue ? item[9].stringValue : ``,
        dataType: item[10].stringValue ? item[10].stringValue : ``
      };
      results.push(dataObject);
    }
  }
  return results;
};

/**
 * This function will extract code from a ASAP report
 * @param {object} data - data of sheet
 * @returns {array} list of Datasets
 */
Self.extractCodeFromASAPReport = function (lines) {
  let results = [];
  let actionRequired = {
    'Upload code to Zenodo and provide DOI or register tool for an RRID': true,
    'Verify citation': true,
    'Action Not Required': false
  };
  let splitedData = Self.splitDataFromASAPReportLines(lines, actionRequired);
  // create code
  for (let k in splitedData) {
    let data = splitedData[k];
    for (let i = 0; i < data.length; i++) {
      let item = data[i];
      let dataObject = {
        section: k,
        actionRequired: actionRequired[k],
        kind: `code`,
        issue: item[1].boolValue,
        name: item[3].stringValue ? item[3].stringValue : ``,
        sentences: item[4].stringValue ? item[4].stringValue : ``,
        URL: item[5].stringValue ? item[5].stringValue : ``,
        DOI: item[6].stringValue ? item[6].stringValue : ``,
        notes: item[8].stringValue ? item[8].stringValue : ``
      };
      results.push(dataObject);
    }
  }
  return results;
};

/**
 * This function will extract software from a ASAP report
 * @param {object} data - data of sheet
 * @returns {array} list of Datasets
 */
Self.extractSoftwareFromASAPReport = function (lines) {
  let results = [];
  let actionRequired = {
    'Wherever possible, ensure that Software has a version number, URL, and RRID': true,
    'Verify citation': true,
    'Action Not Required': false
  };
  let splitedData = Self.splitDataFromASAPReportLines(lines, actionRequired);
  // create software
  for (let k in splitedData) {
    let data = splitedData[k];
    for (let i = 0; i < data.length; i++) {
      let item = data[i];
      let dataObject = {
        section: k,
        actionRequired: actionRequired[k],
        kind: `software`,
        issue: item[1].boolValue,
        version: item[2].stringValue ? item[2].stringValue : ``,
        name: item[3].stringValue ? item[3].stringValue : ``,
        sentences: item[4].stringValue ? item[4].stringValue : ``,
        URL: item[5].stringValue ? item[5].stringValue : ``,
        RRID: item[6].stringValue ? item[6].stringValue : ``,
        suggestedEntity: item[7].stringValue ? item[7].stringValue : ``,
        suggestedRRID: item[8].stringValue ? item[8].stringValue : ``,
        suggestedURL: item[9].stringValue ? item[9].stringValue : ``,
        notes: item[10].stringValue ? item[10].stringValue : ``
      };
      results.push(dataObject);
    }
  }
  return results;
};

/**
 * This function will extract lab materials from a ASAP report
 * @param {object} data - data of sheet
 * @returns {array} list of Datasets
 */
Self.extractLabMaterialsFromASAPReport = function (lines) {
  let results = [];
  let actionRequired = {
    'Assign RRID and cite in text': true,
    'Check for an existing RRID': true,
    'Verify citation': true,
    'Done - Cited correctly': false,
    'None - Citation meets minimum standards': false
  };
  let splitedData = Self.splitDataFromASAPReportLines(lines, actionRequired);
  // create materials
  for (let k in splitedData) {
    let data = splitedData[k];
    for (let i = 0; i < data.length; i++) {
      let item = data[i];
      let dataObject = {
        section: k,
        actionRequired: actionRequired[k],
        kind: `materials`,
        reuse: item[1].boolValue,
        issue: item[2].boolValue,
        name: item[3].stringValue ? item[3].stringValue : ``,
        sentences: item[4].stringValue ? item[4].stringValue : ``,
        source: item[5].stringValue ? item[5].stringValue : ``,
        catalogNumber: item[6].stringValue ? item[6].stringValue : ``,
        RRID: item[7].stringValue ? item[7].stringValue : ``,
        dataType: item[8].stringValue ? item[8].stringValue : ``,
        suggestedEntity: item[9].stringValue ? item[9].stringValue : ``,
        suggestedRRID: item[10].stringValue ? item[10].stringValue : ``,
        notes: item[11].stringValue ? item[11].stringValue : ``
      };
      results.push(dataObject);
    }
  }
  return results;
};

/**
 * This function will extract protocols from a ASAP report
 * @param {object} data - data of sheet
 * @returns {array} list of Datasets
 */
Self.extractProtocolsFromASAPReport = function (lines) {
  let results = [];
  let actionRequired = {
    'Deposit in repository and cite DOI in text': true,
    'Confirm citations meet minimum standards': true,
    'Verify citation': true,
    'Action Not Required': false
  };
  let splitedData = Self.splitDataFromASAPReportLines(lines, actionRequired);
  // create protocols
  for (let k in splitedData) {
    let data = splitedData[k];
    for (let i = 0; i < data.length; i++) {
      let item = data[i];
      let dataObject = {
        section: k,
        actionRequired: actionRequired[k],
        kind: `protocol`,
        reuse: item[1].boolValue,
        issue: item[2].boolValue,
        name: item[3].stringValue ? item[3].stringValue : ``,
        URL: item[4].stringValue ? item[4].stringValue : ``,
        DOI: item[5].stringValue ? item[5].stringValue : ``,
        dataType: item[6].stringValue ? item[6].stringValue : ``,
        notes: item[7].stringValue ? item[7].stringValue : ``
      };
      results.push(dataObject);
    }
  }
  return results;
};

/**
 * This function will build the changes (from DS logs OR ASAP reports) and return the file ID (google file ID)
 * @param {object} opts - Options available
 * @param {string} opts.filename - filename (of the report)
 * @param {string} opts.kind - What kind of report (available values : ASAP)
 * @param {string} opts.kind - What config (available values : DS_LOGS or ASAP_REPORTS)
 * @param {array} opts.data - List of data
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR undefined)
 * @returns {undefined} undefined
 */
Self.buildChanges = function (opts, cb) {
  // Check all required data
  let config = _.get(opts, `config`);
  let kind = _.get(opts, `kind`);
  if (typeof config === `undefined`) return cb(Error(`Missing required data: opts.config`));
  if (config !== `DS_LOGS` && config !== `ASAP_REPORTS`)
    return cb(Error(`Invalid required data: opts.config must be "DS_LOGS" or "ASAP_REPORTS"`));
  let changesConf = config === `DS_LOGS` ? changesLogsConf : changesReportsConf;
  if (Object.keys(changesConf.templates).indexOf(kind) === -1)
    return cb(Error(`Invalid required data: opts.kind must be ${Object.keys(changesConf.templates).join(`, `)}`));
  if (typeof _.get(changesConf, `folders.${kind}`) === `undefined`)
    return cb(Error(`Missing required data: changesConf.folders.${kind}`));
  if (typeof _.get(changesConf, `templates.${kind}`) === `undefined`)
    return cb(Error(`Missing required data: changesConf.templates.${kind}`));
  if (typeof _.get(opts, `filename`) === `undefined`) return cb(Error(`Missing required data: opts.data.filename`));
  let filename = _.get(opts, `filename`);
  if (changesConf.prefix) filename = changesConf.prefix + filename;
  let template = _.get(changesConf, `templates.${kind}`);
  let folders = _.get(changesConf, `folders.${kind}`);
  let permissions = _.get(changesConf, `permissions.${kind}`);
  let folder = folders.default;
  let permission = permissions.default;
  if (typeof folder === `undefined`) return cb(Error(`Missing required data: default folder for ${kind} template`));
  if (typeof permission === `undefined`)
    return cb(Error(`Missing required data: default permission for ${kind} template`));
  return Self.createSheetsFile(
    { template: template, folder: folder, data: { name: filename, permission: permission }, erase: true },
    function (err, id) {
      if (err) return cb(err);
      // Case report does not exist yet
      if (!id) return cb(null, new Error(`Sheets file not created in the google API drive`));
      if (config === `ASAP_REPORTS`)
        return Self.insertDataInChangesFromASAPReportsFile({ spreadsheetId: id, data: opts.data }, function (err) {
          if (err) return cb(err);
          return cb(null, id);
        });
      else if (config === `DS_LOGS`)
        return Self.insertDataInChangesFromDSLogsFile({ spreadsheetId: id, data: opts.data }, function (err) {
          if (err) return cb(err);
          return cb(null, id);
        });
      else return cb(null, new Error(`Unavailable functionality`));
    }
  );
};

/**
 * This function will fill Changes from DS Logs file with given data and return the file ID (google file ID)
 * @param {object} opts - Options available
 * @param {string} opts.spreadsheetId - spreadsheetId
 * @param {object} opts.data - Data available
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR undefined)
 * @returns {undefined} undefined
 */
Self.insertDataInChangesFromDSLogsFile = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `spreadsheetId`) === `undefined`)
    return cb(Error(`Missing required data: opts.spreadsheetId`));
  let spreadsheetId = _.get(opts, `spreadsheetId`);
  let data = _.get(opts, `data`, {});
  return Self.getSheets({ spreadsheetId: spreadsheetId }, function (err, sheets) {
    let importedDataSheetId = Self.getSheetId(sheets, `Imported data`);
    let formattedChangesSheetId = Self.getSheetId(sheets, `Formatted changes`);
    let filteredDataSheetId = Self.getSheetId(sheets, `Filtered data`);
    let duplicatesSheetId = Self.getSheetId(sheets, `Duplicates`);
    let moreDetailsAboutChanges = Self.getSheetId(sheets, `More details about changes`);
    if (data.length - 1 <= 0) return cb();
    let actions = [
      // insert rows to 'Formatted Data' & 'Filtered Data' & 'Duplicates' & 'More details about changes'
      // function (next) {
      //   if (moreDetailsAboutChanges instanceof Error) return next(moreDetailsAboutChanges);
      //   if (formattedChangesSheetId instanceof Error) return next(formattedChangesSheetId);
      //   if (filteredDataSheetId instanceof Error) return next(filteredDataSheetId);
      //   if (duplicatesSheetId instanceof Error) return next(duplicatesSheetId);
      //   return Self.insertLinesChangesFromDSLogsFileSheet(
      //     {
      //       spreadsheetId: spreadsheetId,
      //       data: {
      //         sheets: {
      //           'More details about changes': moreDetailsAboutChanges,
      //           'Formatted changes': formattedChangesSheetId,
      //           'Filtered data': filteredDataSheetId,
      //           'Duplicates': duplicatesSheetId
      //         },
      //         nbLines: data.length - 1
      //       }
      //     },
      //     function (err, res) {
      //       return next(err);
      //     }
      //   );
      // },
      // fill 'Imported Data'
      function (next) {
        if (importedDataSheetId instanceof Error) return next(importedDataSheetId);
        return Self.fillImportedDataChangesFromDSLogsFileSheet(
          {
            spreadsheetId: spreadsheetId,
            sheetId: importedDataSheetId,
            data: data.slice(1).join(`\n`)
          },
          function (err, res) {
            return next(err);
          }
        );
      },
      // copy 'Formatted Data' to 'More details about changes'
      function (next) {
        if (moreDetailsAboutChanges instanceof Error) return next(moreDetailsAboutChanges);
        if (formattedChangesSheetId instanceof Error) return next(formattedChangesSheetId);
        return Self.copyDataChangesFromDSLogsFileSheet(
          {
            spreadsheetId: spreadsheetId,
            data: {
              source: {
                sheetId: formattedChangesSheetId,
                startRowIndex: 1,
                endRowIndex: 1 + data.length - 1,
                startColumnIndex: 0,
                endColumnIndex: 49
              },
              target: {
                sheetId: moreDetailsAboutChanges,
                startRowIndex: 1,
                endRowIndex: 1 + data.length - 1,
                startColumnIndex: 0,
                endColumnIndex: 49
              }
            }
          },
          function (err, res) {
            return next(err);
          }
        );
      }
    ];
    return async.mapSeries(
      actions,
      function (action, next) {
        return action(function (err) {
          return next(err);
        });
      },
      function (err) {
        return cb(err);
      }
    );
  });
};

Self.fillImportedDataChangesFromDSLogsFileSheet = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `spreadsheetId`) === `undefined`)
    return cb(Error(`Missing required data: opts.spreadsheetId`));
  if (typeof _.get(opts, `sheetId`) === `undefined`) return cb(Error(`Missing required data: opts.sheetId`));
  let spreadsheetId = _.get(opts, `spreadsheetId`);
  let sheetId = _.get(opts, `sheetId`);
  let data = _.get(opts, `data`, {});
  return gSheets.spreadsheets.batchUpdate(
    {
      // The ID of the spreadsheet to update.
      spreadsheetId: spreadsheetId,
      // Request body metadata
      requestBody: {
        includeSpreadsheetInResponse: false,
        responseIncludeGridData: false,
        // request body parameters
        requests: [Self.buildRequestPasteData(sheetId, data, 1, 0, `PASTE_VALUES`)]
      }
    },
    function (err, res) {
      return cb(err);
    }
  );
};

Self.copyDataChangesFromDSLogsFileSheet = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `spreadsheetId`) === `undefined`)
    return cb(Error(`Missing required data: opts.spreadsheetId`));
  let spreadsheetId = _.get(opts, `spreadsheetId`);
  let data = _.get(opts, `data`, {});
  let source = _.get(data, `source`);
  let target = _.get(data, `target`);
  return gSheets.spreadsheets.batchUpdate(
    {
      // The ID of the spreadsheet to update.
      spreadsheetId: spreadsheetId,
      // Request body metadata
      requestBody: {
        includeSpreadsheetInResponse: false,
        responseIncludeGridData: false,
        // request body parameters
        requests: [Self.buildRequestCopyPaste(source, target, `PASTE_VALUES`)]
      }
    },
    function (err, res) {
      return cb(err);
    }
  );
};

Self.insertLinesChangesFromDSLogsFileSheet = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `spreadsheetId`) === `undefined`)
    return cb(Error(`Missing required data: opts.spreadsheetId`));
  let spreadsheetId = _.get(opts, `spreadsheetId`);
  let data = _.get(opts, `data`, {});
  let requests = [];
  if (data.nbLines > 2) {
    requests.push(Self.buildRequestInsertRows(data.sheets[`Duplicates`], 3, data.nbLines + 1, true));
    requests.push(Self.buildRequestInsertRows(data.sheets[`Filtered data`], 3, data.nbLines + 1, true));
    requests.push(Self.buildRequestInsertRows(data.sheets[`Formatted changes`], 3, data.nbLines + 1, true));
    requests.push(Self.buildRequestInsertRows(data.sheets[`More details about changes`], 3, data.nbLines + 1, true));
  }
  let lastLine = data.nbLines <= 2 ? 3 : data.nbLines + 1;
  requests.push(
    Self.buildRequestCopyPaste(
      {
        sheetId: data.sheets[`Filtered data`],
        startRowIndex: 2,
        endRowIndex: 3,
        startColumnIndex: 0,
        endColumnIndex: 48
      },
      {
        sheetId: data.sheets[`Filtered data`],
        startRowIndex: 3,
        endRowIndex: lastLine,
        startColumnIndex: 0,
        endColumnIndex: 48
      },
      `PASTE_NORMAL`
    )
  );
  requests.push(
    Self.buildRequestCopyPaste(
      {
        sheetId: data.sheets[`Formatted changes`],
        startRowIndex: 2,
        endRowIndex: 3,
        startColumnIndex: 0,
        endColumnIndex: 49
      },
      {
        sheetId: data.sheets[`Formatted changes`],
        startRowIndex: 3,
        endRowIndex: lastLine,
        startColumnIndex: 0,
        endColumnIndex: 49
      },
      `PASTE_NORMAL`
    )
  );
  requests.push(
    Self.buildRequestCopyPaste(
      {
        sheetId: data.sheets[`Duplicates`],
        startRowIndex: 2,
        endRowIndex: 3,
        startColumnIndex: 1,
        endColumnIndex: 3
      },
      {
        sheetId: data.sheets[`Duplicates`],
        startRowIndex: 3,
        endRowIndex: lastLine,
        startColumnIndex: 1,
        endColumnIndex: 3
      },
      `PASTE_NORMAL`
    )
  );
  return gSheets.spreadsheets.batchUpdate(
    {
      // The ID of the spreadsheet to update.
      spreadsheetId: spreadsheetId,
      // Request body metadata
      requestBody: {
        includeSpreadsheetInResponse: false,
        responseIncludeGridData: false,
        // request body parameters
        requests: requests
      }
    },
    function (err, res) {
      return cb(err);
    }
  );
};

/**
 * This function will fill Changes from ASAP Reports changes file with given data and return the file ID (google file ID)
 * @param {object} opts - Options available
 * @param {string} opts.spreadsheetId - spreadsheetId
 * @param {object} opts.data - Data available
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR undefined)
 * @returns {undefined} undefined
 */
Self.insertDataInChangesFromASAPReportsFile = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `spreadsheetId`) === `undefined`)
    return cb(Error(`Missing required data: opts.spreadsheetId`));
  let spreadsheetId = _.get(opts, `spreadsheetId`);
  let data = _.get(opts, `data`, {});
  return Self.getSheets({ spreadsheetId: spreadsheetId }, function (err, sheets) {
    let importedDataSheetId = Self.getSheetId(sheets, `Imported data`);
    let formattedChangesSheetId = Self.getSheetId(sheets, `Formatted changes`);
    let filteredDataSheetId = Self.getSheetId(sheets, `Filtered data`);
    let duplicatesSheetId = Self.getSheetId(sheets, `Duplicates`);
    let moreDetailsAboutChanges = Self.getSheetId(sheets, `More details about changes`);
    if (data.length - 1 <= 0) return cb();
    let actions = [
      // insert rows to 'Formatted Data' & 'Filtered Data' & 'Duplicates' & 'More details about changes'
      // function (next) {
      //   if (moreDetailsAboutChanges instanceof Error) return next(moreDetailsAboutChanges);
      //   if (formattedChangesSheetId instanceof Error) return next(formattedChangesSheetId);
      //   if (filteredDataSheetId instanceof Error) return next(filteredDataSheetId);
      //   if (duplicatesSheetId instanceof Error) return next(duplicatesSheetId);
      //   return Self.insertLinesChangesFromASAPReportsFileSheet(
      //     {
      //       spreadsheetId: spreadsheetId,
      //       data: {
      //         sheets: {
      //           'More details about changes': moreDetailsAboutChanges,
      //           'Formatted changes': formattedChangesSheetId,
      //           'Filtered data': filteredDataSheetId,
      //           'Duplicates': duplicatesSheetId
      //         },
      //         nbLines: data.length - 1
      //       }
      //     },
      //     function (err, res) {
      //       return next(err);
      //     }
      //   );
      // },
      // fill 'Imported Data'
      function (next) {
        if (importedDataSheetId instanceof Error) return next(importedDataSheetId);
        return Self.fillImportedDataChangesFromASAPReportsFileSheet(
          {
            spreadsheetId: spreadsheetId,
            sheetId: importedDataSheetId,
            data: data.slice(1).join(`\n`)
          },
          function (err, res) {
            return next(err);
          }
        );
      },
      // copy 'Formatted Data' to 'More details about changes'
      function (next) {
        if (moreDetailsAboutChanges instanceof Error) return next(moreDetailsAboutChanges);
        if (formattedChangesSheetId instanceof Error) return next(formattedChangesSheetId);
        return Self.copyDataChangesFromASAPReportsFileSheet(
          {
            spreadsheetId: spreadsheetId,
            data: {
              source: {
                sheetId: formattedChangesSheetId,
                startRowIndex: 1,
                endRowIndex: 1 + data.length - 1,
                startColumnIndex: 0,
                endColumnIndex: 55
              },
              target: {
                sheetId: moreDetailsAboutChanges,
                startRowIndex: 1,
                endRowIndex: 1 + data.length - 1,
                startColumnIndex: 0,
                endColumnIndex: 55
              }
            }
          },
          function (err, res) {
            return next(err);
          }
        );
      }
    ];
    return async.mapSeries(
      actions,
      function (action, next) {
        return action(function (err) {
          return next(err);
        });
      },
      function (err) {
        return cb(err);
      }
    );
  });
};

Self.fillImportedDataChangesFromASAPReportsFileSheet = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `spreadsheetId`) === `undefined`)
    return cb(Error(`Missing required data: opts.spreadsheetId`));
  if (typeof _.get(opts, `sheetId`) === `undefined`) return cb(Error(`Missing required data: opts.sheetId`));
  let spreadsheetId = _.get(opts, `spreadsheetId`);
  let sheetId = _.get(opts, `sheetId`);
  let data = _.get(opts, `data`, {});
  return gSheets.spreadsheets.batchUpdate(
    {
      // The ID of the spreadsheet to update.
      spreadsheetId: spreadsheetId,
      // Request body metadata
      requestBody: {
        includeSpreadsheetInResponse: false,
        responseIncludeGridData: false,
        // request body parameters
        requests: [Self.buildRequestPasteData(sheetId, data, 1, 0, `PASTE_VALUES`)]
      }
    },
    function (err, res) {
      return cb(err);
    }
  );
};

Self.copyDataChangesFromASAPReportsFileSheet = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `spreadsheetId`) === `undefined`)
    return cb(Error(`Missing required data: opts.spreadsheetId`));
  let spreadsheetId = _.get(opts, `spreadsheetId`);
  let data = _.get(opts, `data`, {});
  let source = _.get(data, `source`);
  let target = _.get(data, `target`);
  return gSheets.spreadsheets.batchUpdate(
    {
      // The ID of the spreadsheet to update.
      spreadsheetId: spreadsheetId,
      // Request body metadata
      requestBody: {
        includeSpreadsheetInResponse: false,
        responseIncludeGridData: false,
        // request body parameters
        requests: [Self.buildRequestCopyPaste(source, target, `PASTE_VALUES`)]
      }
    },
    function (err, res) {
      return cb(err);
    }
  );
};

Self.insertLinesChangesFromASAPReportsFileSheet = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `spreadsheetId`) === `undefined`)
    return cb(Error(`Missing required data: opts.spreadsheetId`));
  let spreadsheetId = _.get(opts, `spreadsheetId`);
  let data = _.get(opts, `data`, {});
  let requests = [];
  if (data.nbLines > 2) {
    requests.push(Self.buildRequestInsertRows(data.sheets[`Duplicates`], 3, data.nbLines + 1, true));
    requests.push(Self.buildRequestInsertRows(data.sheets[`Filtered data`], 3, data.nbLines + 1, true));
    requests.push(Self.buildRequestInsertRows(data.sheets[`Formatted changes`], 3, data.nbLines + 1, true));
    requests.push(Self.buildRequestInsertRows(data.sheets[`More details about changes`], 3, data.nbLines + 1, true));
  }
  let lastLine = data.nbLines <= 2 ? 3 : data.nbLines + 1;
  requests.push(
    Self.buildRequestCopyPaste(
      {
        sheetId: data.sheets[`Filtered data`],
        startRowIndex: 2,
        endRowIndex: 3,
        startColumnIndex: 0,
        endColumnIndex: 55
      },
      {
        sheetId: data.sheets[`Filtered data`],
        startRowIndex: 3,
        endRowIndex: lastLine,
        startColumnIndex: 0,
        endColumnIndex: 55
      },
      `PASTE_NORMAL`
    )
  );
  requests.push(
    Self.buildRequestCopyPaste(
      {
        sheetId: data.sheets[`Formatted changes`],
        startRowIndex: 2,
        endRowIndex: 3,
        startColumnIndex: 0,
        endColumnIndex: 56
      },
      {
        sheetId: data.sheets[`Formatted changes`],
        startRowIndex: 3,
        endRowIndex: lastLine,
        startColumnIndex: 0,
        endColumnIndex: 56
      },
      `PASTE_NORMAL`
    )
  );
  requests.push(
    Self.buildRequestCopyPaste(
      {
        sheetId: data.sheets[`Duplicates`],
        startRowIndex: 2,
        endRowIndex: 3,
        startColumnIndex: 1,
        endColumnIndex: 3
      },
      {
        sheetId: data.sheets[`Duplicates`],
        startRowIndex: 3,
        endRowIndex: lastLine,
        startColumnIndex: 1,
        endColumnIndex: 3
      },
      `PASTE_NORMAL`
    )
  );
  return gSheets.spreadsheets.batchUpdate(
    {
      // The ID of the spreadsheet to update.
      spreadsheetId: spreadsheetId,
      // Request body metadata
      requestBody: {
        includeSpreadsheetInResponse: false,
        responseIncludeGridData: false,
        // request body parameters
        requests: requests
      }
    },
    function (err, res) {
      return cb(err);
    }
  );
};

/**
 * This function will build the report and return the file ID (google file ID)
 * @param {object} opts - Options available
 * @param {string} opts.filename - filename (of the report)
 * @param {string} opts.kind - What kind of report (available values : ASAP or AmNat)
 * @param {array} opts.data - List of data
 *   @param {object} item - Data available (for the report)
 *   @param {string} item.document - document data
 *   @param {object} item.metadata - metadata
 *   @param {object} item.metadata.articleTitle - articleTitle
 *   @param {object} item.metadata.doi - doi
 *   @param {object} item.metadata.authors - authors
 *   @param {array} item.datasets - datasets
 *   @param {array} item.protocols - protocols
 *   @param {array} item.reagents - reagents
 *   @param {array} item.code - code
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR undefined)
 * @returns {undefined} undefined
 */
Self.buildReport = function (opts, cb) {
  // Check all required data
  let kind = _.get(opts, `kind`);
  if (typeof kind === `undefined`) return cb(Error(`Missing required data: opts.kind`));
  if (Object.keys(conf.templates).indexOf(kind) === -1)
    return cb(Error(`Invalid required data: opts.kind must be ${Object.keys(conf.templates).join(`, `)}`));
  if (typeof _.get(conf, `folders.${kind}`) === `undefined`)
    return cb(Error(`Missing required data: conf.folders.${kind}`));
  if (typeof _.get(conf, `templates.${kind}`) === `undefined`)
    return cb(Error(`Missing required data: conf.templates.${kind}`));
  if (typeof _.get(opts, `filename`) === `undefined`) return cb(Error(`Missing required data: opts.data.filename`));
  let filename = _.get(opts, `filename`);
  if (conf.prefix) filename = conf.prefix + filename;
  let template = _.get(conf, `templates.${kind}`);
  let folders = _.get(conf, `folders.${kind}`);
  let permissions = _.get(conf, `permissions.${kind}`);
  let folder = folders.default;
  let permission = permissions.default;
  if (typeof folder === `undefined`) return cb(Error(`Missing required data: default folder for ${kind} template`));
  if (typeof permission === `undefined`)
    return cb(Error(`Missing required data: default permission for ${kind} template`));
  let finished = false;
  for (let i = 0; i < opts.data.length; i++) {
    let data = opts.data[i];
    for (let j = 0; j < data.document.organizations.length; j++) {
      let organizationId = data.document.organizations[j];
      if (typeof folders[organizationId] !== `undefined` && !finished) {
        folder = folders[organizationId];
        finished = true;
      }
    }
  }
  finished = false;
  for (let i = 0; i < opts.data.length; i++) {
    let data = opts.data[i];
    for (let j = 0; j < data.document.organizations.length; j++) {
      let organizationId = data.document.organizations[j];
      if (typeof permission[organizationId] !== `undefined` && !finished) {
        permission = permissions[organizationId];
        finished = true;
      }
    }
  }
  return Self.createReportFile(
    { template: template, folder: folder, data: { name: filename, permission: permission }, erase: false },
    function (err, id) {
      if (err) return cb(err);
      // Case report does not exist yet
      if (!id) return cb(null, new Error(`Report file not created in the google API drive`));
      if (kind === `ASAP`)
        return Self.insertDataInASAPSheets({ spreadsheetId: id, data: opts.data[0] }, function (err) {
          if (err) return cb(err);
          return cb(null, id);
        });
      else if (kind === `ASAP-PPMI`)
        return Self.insertDataInASAPPPMISheets({ spreadsheetId: id, data: opts.data[0] }, function (err) {
          if (err) return cb(err);
          return cb(null, id);
        });
      else if (kind === `ASAP-GP2`)
        return Self.insertDataInASAPGP2Sheets({ spreadsheetId: id, data: opts.data[0] }, function (err) {
          if (err) return cb(err);
          return cb(null, id);
        });
      else if (kind === `DataSeer Generic`)
        return Self.insertDataInDataSeerGenericSheets({ spreadsheetId: id, data: opts.data[0] }, function (err) {
          if (err) return cb(err);
          return cb(null, id);
        });
      else if (kind === `AmNat`)
        return Self.insertDataInAmNatSheets({ spreadsheetId: id, data: opts.data[0] }, function (err) {
          if (err) return cb(err);
          return cb(null, id);
        });
      else if (kind === `Universal Journal Report`)
        return Self.insertDataInUniversalJournalReportSheets({ spreadsheetId: id, data: opts.data[0] }, function (err) {
          if (err) return cb(err);
          return cb(null, id);
        });
      else if (kind === `HHMI`)
        return Self.insertDataInHHMISheets({ spreadsheetId: id, data: opts.data }, function (err) {
          if (err) return cb(err);
          return cb(null, id);
        });
      else if (kind === `MJFF Impact Report`)
        return Self.insertDataInMJFFImpactReportSheets({ spreadsheetId: id, data: opts.data[0] }, function (err) {
          if (err) return cb(err);
          return cb(null, id);
        });
      else return cb(null, new Error(`Unavailable functionality`));
    }
  );
};

/**
 * This function will sort data for HHMI report
 */
Self.sortDataForHHMISheets = function (a, b) {
  if (a.reuse && !b.reuse) return -1;
  else if (!a.reuse && b.reuse) return 1;
  else if (!a.issue && b.issue) return -1;
  else if (a.issue && !b.issue) return 1;
  else if (a.qc && !b.qc) return -1;
  else if (!a.qc && b.qc) return 1;
  else if (a.representativeImage && !b.representativeImage) return -1;
  else if (!a.representativeImage && b.representativeImage) return 1;
  else if (a.index < b.index) return -1;
  else if (a.index > b.index) return 1;
  return 0;
};

/**
 * This function will build data for HHMI report
 * @param {object} data - Data available
 * @returns {object} Return data for HHMISheets
 */
Self.buildDataForHHMISheets = function (data) {
  let datasets = {
    notShared: data.datasets
      .filter(function (item) {
        return (
          Self.getRuleKey(item.rules[`HHMI`].rule) !== Self.getConfRuleKey(`HHMI`, `datasets`, null, `0`) &&
          Self.getRuleKey(item.rules[`HHMI`].rule) !== Self.getConfRuleKey(`HHMI`, `datasets`, null, `1`) &&
          Self.getRuleKey(item.rules[`HHMI`].rule) !== Self.getConfRuleKey(`HHMI`, `datasets`, null, `2`)
        );
      })
      .sort(Self.sortDataForHHMISheets),
    shared: data.datasets
      .filter(function (item) {
        return Self.getRuleKey(item.rules[`HHMI`].rule) === Self.getConfRuleKey(`HHMI`, `datasets`, null, `0`);
      })
      .sort(Self.sortDataForHHMISheets),
    other: data.datasets
      .filter(function (item) {
        return Self.getRuleKey(item.rules[`HHMI`].rule) === Self.getConfRuleKey(`HHMI`, `datasets`, null, `2`);
      })
      .sort(Self.sortDataForHHMISheets)
  };
  let code = {
    notShared: data.code
      .filter(function (item) {
        let subType = item.dataType === `other` ? `` : item.subType;
        return Self.getRuleKey(item.rules[`HHMI`].rule) !== Self.getConfRuleKey(`HHMI`, `code`, subType, `0`);
      })
      .sort(Self.sortDataForHHMISheets),
    shared: data.code
      .filter(function (item) {
        let subType = item.dataType === `other` ? `` : item.subType;
        return Self.getRuleKey(item.rules[`HHMI`].rule) === Self.getConfRuleKey(`HHMI`, `code`, subType, `0`);
      })
      .sort(Self.sortDataForHHMISheets)
  };
  let software = {
    notShared: data.software
      .filter(function (item) {
        let subType = item.dataType === `other` ? `` : item.subType;
        return Self.getRuleKey(item.rules[`HHMI`].rule) !== Self.getConfRuleKey(`HHMI`, `software`, subType, `0`);
      })
      .sort(Self.sortDataForHHMISheets),
    shared: data.software
      .filter(function (item) {
        let subType = item.dataType === `other` ? `` : item.subType;
        return Self.getRuleKey(item.rules[`HHMI`].rule) === Self.getConfRuleKey(`HHMI`, `software`, subType, `0`);
      })
      .sort(Self.sortDataForHHMISheets)
  };
  let labMaterials = {
    notShared: data.reagents
      .filter(function (item) {
        return Self.getRuleKey(item.rules[`HHMI`].rule) !== Self.getConfRuleKey(`HHMI`, `reagents`, null, `0`);
      })
      .sort(Self.sortDataForHHMISheets),
    shared: data.reagents
      .filter(function (item) {
        return Self.getRuleKey(item.rules[`HHMI`].rule) === Self.getConfRuleKey(`HHMI`, `reagents`, null, `0`);
      })
      .sort(Self.sortDataForHHMISheets)
  };
  let protocols = {
    notShared: data.protocols
      .filter(function (item) {
        let subType = item.dataType === `other` ? `` : item.subType;
        return Self.getRuleKey(item.rules[`HHMI`].rule) !== Self.getConfRuleKey(`HHMI`, `protocols`, subType, `0`);
      })
      .sort(Self.sortDataForHHMISheets),
    shared: data.protocols
      .filter(function (item) {
        let subType = item.dataType === `other` ? `` : item.subType;
        return Self.getRuleKey(item.rules[`HHMI`].rule) === Self.getConfRuleKey(`HHMI`, `protocols`, subType, `0`);
      })
      .sort(Self.sortDataForHHMISheets)
  };
  let article = {
    title: data.metadata.articleTitle,
    URL: data.metadata.originalFileLink
  };
  let preprint = { URL: { url: data.preprint.url, label: data.preprint.url }, DOI: data.preprint.doi };
  let dataSeerLink = data.metadata.dataSeerLink;
  let date = new Date();
  let authors = data.metadata.authors.filter(function (item) {
    return item.name.length > 0;
  });
  let DAS = data.metadata.DAS.content;
  return {
    document: data.document,
    metadata: {
      DAS,
      article,
      preprint,
      dataSeerLink,
      date,
      authors
    },
    dataObjects: {
      datasets,
      code,
      software,
      labMaterials,
      protocols
    },
    authors,
    OSIS: {
      datasets: {
        newShared: datasets.shared.filter(function (item) {
          return !item.reuse;
        }).length,
        newNotShared: datasets.notShared.filter(function (item) {
          return !item.reuse;
        }).length,
        reuseCited: datasets.shared.filter(function (item) {
          return item.reuse;
        }).length,
        reuseNotCited: datasets.notShared.filter(function (item) {
          return item.reuse;
        }).length
      },
      code: {
        newShared: code.shared.filter(function (item) {
          return !item.reuse;
        }).length,
        newNotShared: code.notShared.filter(function (item) {
          return !item.reuse;
        }).length,
        reuseCited: code.shared.filter(function (item) {
          return item.reuse;
        }).length,
        reuseNotCited: code.notShared.filter(function (item) {
          return item.reuse;
        }).length
      },
      software: {
        newShared: software.shared.filter(function (item) {
          return !item.reuse;
        }).length,
        newNotShared: software.notShared.filter(function (item) {
          return !item.reuse;
        }).length,
        reuseCited: software.shared.filter(function (item) {
          return item.reuse;
        }).length,
        reuseNotCited: software.notShared.filter(function (item) {
          return item.reuse;
        }).length
      },
      labMaterials: {
        newShared: labMaterials.shared.filter(function (item) {
          return !item.reuse;
        }).length,
        newNotShared: labMaterials.notShared.filter(function (item) {
          return !item.reuse;
        }).length,
        reuseCited: labMaterials.shared.filter(function (item) {
          return item.reuse;
        }).length,
        reuseNotCited: labMaterials.notShared.filter(function (item) {
          return item.reuse;
        }).length
      },
      protocols: {
        newShared: protocols.shared.filter(function (item) {
          return !item.reuse;
        }).length,
        newNotShared: protocols.notShared.filter(function (item) {
          return !item.reuse;
        }).length,
        reuseCited: protocols.shared.filter(function (item) {
          return item.reuse;
        }).length,
        reuseNotCited: protocols.notShared.filter(function (item) {
          return item.reuse;
        }).length
      }
    }
  };
};

/**
 * This function will sort data for MJFF Impact Report report
 */
Self.sortDataForMJFFImpactReportSheets = function (a, b) {
  if (a.reuse && !b.reuse) return -1;
  else if (!a.reuse && b.reuse) return 1;
  else if (!a.issue && b.issue) return -1;
  else if (a.issue && !b.issue) return 1;
  else if (a.qc && !b.qc) return -1;
  else if (!a.qc && b.qc) return 1;
  else if (a.representativeImage && !b.representativeImage) return -1;
  else if (!a.representativeImage && b.representativeImage) return 1;
  else if (a.index < b.index) return -1;
  else if (a.index > b.index) return 1;
  return 0;
};

/**
 * This function will build data for MJFF Impact Report report
 * @param {object} data - Data available
 * @returns {object} Return data for MJFF Impact ReportSheets
 */
Self.buildDataForMJFFImpactReportSheets = function (data) {
  let datasets = {
    notShared: data.datasets
      .filter(function (item) {
        return (
          Self.getRuleKey(item.rules[`MJFF Impact Report`].rule) !==
            RULES[`MJFF Impact Report`].status.datasets[`0`].key &&
          Self.getRuleKey(item.rules[`MJFF Impact Report`].rule) !==
            RULES[`MJFF Impact Report`].status.datasets[`1`].key &&
          Self.getRuleKey(item.rules[`MJFF Impact Report`].rule) !==
            RULES[`MJFF Impact Report`].status.datasets[`2`].key
        );
      })
      .sort(Self.sortDataForMJFFImpactReportSheets),
    shared: data.datasets
      .filter(function (item) {
        return (
          Self.getRuleKey(item.rules[`MJFF Impact Report`].rule) ===
          RULES[`MJFF Impact Report`].status.datasets[`0`].key
        );
      })
      .sort(Self.sortDataForMJFFImpactReportSheets)
  };
  let code = {
    notShared: data.code
      .filter(function (item) {
        let subType = item.dataType === `other` ? `` : item.subType;
        return (
          Self.getRuleKey(item.rules[`MJFF Impact Report`].rule) !==
          RULES[`MJFF Impact Report`].status.code[subType][`0`].key
        );
      })
      .sort(Self.sortDataForMJFFImpactReportSheets),
    shared: data.code
      .filter(function (item) {
        let subType = item.dataType === `other` ? `` : item.subType;
        return (
          Self.getRuleKey(item.rules[`MJFF Impact Report`].rule) ===
          RULES[`MJFF Impact Report`].status.code[subType][`0`].key
        );
      })
      .sort(Self.sortDataForMJFFImpactReportSheets)
  };
  let software = {
    notShared: data.software
      .filter(function (item) {
        let subType = item.dataType === `other` ? `` : item.subType;
        return (
          Self.getRuleKey(item.rules[`MJFF Impact Report`].rule) !==
          RULES[`MJFF Impact Report`].status.software[subType][`0`].key
        );
      })
      .sort(Self.sortDataForMJFFImpactReportSheets),
    shared: data.software
      .filter(function (item) {
        let subType = item.dataType === `other` ? `` : item.subType;
        return (
          Self.getRuleKey(item.rules[`MJFF Impact Report`].rule) ===
          RULES[`MJFF Impact Report`].status.software[subType][`0`].key
        );
      })
      .sort(Self.sortDataForMJFFImpactReportSheets)
  };
  let labMaterials = {
    notShared: data.reagents
      .filter(function (item) {
        return (
          Self.getRuleKey(item.rules[`MJFF Impact Report`].rule) !==
          RULES[`MJFF Impact Report`].status.reagents[`0`].key
        );
      })
      .sort(Self.sortDataForMJFFImpactReportSheets),
    shared: data.reagents
      .filter(function (item) {
        return (
          Self.getRuleKey(item.rules[`MJFF Impact Report`].rule) ===
          RULES[`MJFF Impact Report`].status.reagents[`0`].key
        );
      })
      .sort(Self.sortDataForMJFFImpactReportSheets)
  };
  let protocols = {
    notShared: data.protocols
      .filter(function (item) {
        let subType = item.dataType === `other` ? `` : item.subType;
        return (
          Self.getRuleKey(item.rules[`MJFF Impact Report`].rule) !==
          RULES[`MJFF Impact Report`].status.protocols[subType][`0`].key
        );
      })
      .sort(Self.sortDataForMJFFImpactReportSheets),
    shared: data.protocols
      .filter(function (item) {
        let subType = item.dataType === `other` ? `` : item.subType;
        return (
          Self.getRuleKey(item.rules[`MJFF Impact Report`].rule) ===
          RULES[`MJFF Impact Report`].status.protocols[subType][`0`].key
        );
      })
      .sort(Self.sortDataForMJFFImpactReportSheets)
  };
  let article = {
    title: data.metadata.articleTitle,
    URL: data.metadata.originalFileLink
  };
  let preprint = { URL: { url: data.preprint.url, label: data.preprint.url }, DOI: data.preprint.doi };
  let dataSeerLink = data.metadata.dataSeerLink;
  let date = new Date();
  let authors = data.metadata.authors.filter(function (item) {
    return item.name.length > 0;
  });
  let DAS = data.metadata.DAS.content;
  return {
    document: data.document,
    metadata: {
      DAS,
      article,
      preprint,
      dataSeerLink,
      date,
      authors
    },
    dataObjects: {
      datasets,
      code,
      software,
      labMaterials,
      protocols
    },
    authors,
    OSIS: {
      datasets: {
        newShared: datasets.shared.filter(function (item) {
          return !item.reuse;
        }).length,
        newNotShared: datasets.notShared.filter(function (item) {
          return !item.reuse;
        }).length,
        reuseCited: datasets.shared.filter(function (item) {
          return item.reuse;
        }).length,
        reuseNotCited: datasets.notShared.filter(function (item) {
          return item.reuse && item.associatedReference === ``;
        }).length,
        reuseNotCitedArtRef: datasets.notShared.filter(function (item) {
          return item.reuse && item.associatedReference !== ``;
        }).length
      },
      code: {
        newShared: code.shared.filter(function (item) {
          return !item.reuse;
        }).length,
        newNotShared: code.notShared.filter(function (item) {
          return !item.reuse;
        }).length,
        reuseCited: code.shared.filter(function (item) {
          return item.reuse;
        }).length,
        reuseNotCited: code.notShared.filter(function (item) {
          return item.reuse && item.associatedReference === ``;
        }).length,
        reuseNotCitedArtRef: code.notShared.filter(function (item) {
          return item.reuse && item.associatedReference !== ``;
        }).length
      },
      software: {
        newShared: software.shared.filter(function (item) {
          return !item.reuse;
        }).length,
        newNotShared: software.notShared.filter(function (item) {
          return !item.reuse;
        }).length,
        reuseCited: software.shared.filter(function (item) {
          return item.reuse;
        }).length,
        reuseNotCited: software.notShared.filter(function (item) {
          return item.reuse && item.associatedReference === ``;
        }).length,
        reuseNotCitedArtRef: software.notShared.filter(function (item) {
          return item.reuse && item.associatedReference !== ``;
        }).length
      },
      labMaterials: {
        newShared: labMaterials.shared.filter(function (item) {
          return !item.reuse;
        }).length,
        newNotShared: labMaterials.notShared.filter(function (item) {
          return !item.reuse;
        }).length,
        reuseCited: labMaterials.shared.filter(function (item) {
          return item.reuse;
        }).length,
        reuseNotCited: labMaterials.notShared.filter(function (item) {
          return item.reuse && item.associatedReference === ``;
        }).length,
        reuseNotCitedArtRef: labMaterials.notShared.filter(function (item) {
          return item.reuse && item.associatedReference !== ``;
        }).length
      },
      protocols: {
        newShared: protocols.shared.filter(function (item) {
          return !item.reuse;
        }).length,
        newNotShared: protocols.notShared.filter(function (item) {
          return !item.reuse;
        }).length,
        reuseCited: protocols.shared.filter(function (item) {
          return item.reuse;
        }).length,
        reuseNotCited: protocols.notShared.filter(function (item) {
          return item.reuse && item.associatedReference === ``;
        }).length,
        reuseNotCitedArtRef: protocols.notShared.filter(function (item) {
          return item.reuse && item.associatedReference !== ``;
        }).length
      }
    }
  };
};

/**
 * This function will fill MJFF Impact Report with given data and return the file ID (google file ID)
 * @param {object} opts - Options available
 * @param {string} opts.spreadsheetId - spreadsheetId
 * @param {object} opts.data - Data available
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR undefined)
 * @returns {undefined} undefined
 */
Self.insertDataInMJFFImpactReportSheets = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `spreadsheetId`) === `undefined`)
    return cb(Error(`Missing required data: opts.spreadsheetId`));
  let spreadsheetId = _.get(opts, `spreadsheetId`);
  let data = _.get(opts, `data`, {});
  return Self.getSheets({ spreadsheetId: spreadsheetId }, function (err, sheets) {
    let detailedReportSheetId = Self.getSheetId(sheets, `Detailed Report`);
    let name = data.document.name.replace(`.pdf`, ``);
    let articleInformation = {
      title: data.metadata.articleTitle,
      reportID: name.substring(name.length - 6),
      preprintURL: { url: data.preprint.url, label: data.preprint.url },
      preprintDOI: data.preprint.doi,
      publicationURL: data.metadata.originalFileLink
    };
    if (detailedReportSheetId instanceof Error) return cb(detailedReportSheetId);
    return Self.fillDetailedReportMJFFImpactReportSheet(
      {
        spreadsheetId: spreadsheetId,
        sheetId: detailedReportSheetId,
        sheetName: `Detailed Report`,
        data: Self.buildDataForMJFFImpactReportSheets(data)
      },
      function (err, res) {
        return cb(err);
      }
    );
  });
};

/**
 * This function will fill MJFF Impact Report report with given data and return the file ID (google file ID)
 * @param {object} opts - Options available
 * @param {string} opts.spreadsheetId - spreadsheetId
 * @param {string} opts.sheetId - sheetId
 * @param {object} opts.sheetName - sheetName
 * @param {object} opts.data - Data available
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR undefined)
 * @returns {undefined} undefined
 */
Self.fillDetailedReportMJFFImpactReportSheet = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `spreadsheetId`) === `undefined`)
    return cb(Error(`Missing required data: opts.spreadsheetId`));
  if (typeof _.get(opts, `sheetId`) === `undefined`) return cb(Error(`Missing required data: opts.sheetId`));
  let spreadsheetId = _.get(opts, `spreadsheetId`);
  let sheetId = _.get(opts, `sheetId`);
  let sheetName = _.get(opts, `sheetName`);
  let data = _.get(opts, `data`, {});
  let doc = _.get(data, `document`, {});
  let metadata = _.get(data, `metadata`, {});
  let dataObjects = _.get(data, `dataObjects`, {});
  let datasets = _.get(dataObjects, `datasets`, {});
  let code = _.get(dataObjects, `code`, {});
  let software = _.get(dataObjects, `software`, {});
  let materials = _.get(dataObjects, `labMaterials`, {});
  let protocols = _.get(dataObjects, `protocols`, {});
  let authors = _.get(data, `authors`, {});
  let OSIS = _.get(data, `OSIS`, {});
  let actions = [
    // fill 'Detailed Report' part of the report
    function (next) {
      if (sheetId instanceof Error) return next(sheetId);
      return Self.fillDetailedReportMJFFImpactReportPart(
        {
          spreadsheetId: spreadsheetId,
          sheetId: sheetId,
          sheetName: sheetName,
          data: {
            documentId: doc.id,
            documentToken: doc.token,
            datasets: [datasets.notShared, datasets.shared],
            code: [code.notShared, code.shared],
            software: [software.notShared, software.shared],
            materials: [materials.notShared, materials.shared],
            protocols: [protocols.notShared, protocols.shared]
          }
        },
        function (err, res) {
          return next(err);
        }
      );
    },
    // fill 'Open Science Indicator Summary' part of the report
    function (next) {
      if (sheetId instanceof Error) return next(sheetId);
      return Self.fillOpenScienceIndicatorSummaryMJFFImpactReportPart(
        {
          spreadsheetId: spreadsheetId,
          sheetId: sheetId,
          sheetName: sheetName,
          data: {
            documentId: doc.id,
            documentToken: doc.token,
            OSIS
          }
        },
        function (err, res) {
          return next(err);
        }
      );
    },
    // fill 'Summary Sheet' part of the report
    function (next) {
      if (sheetId instanceof Error) return next(sheetId);
      // Article Title
      // Authors
      // Article URL
      // Document in DataSeer
      // Report Date
      // Data Availability Statement
      return Self.fillSummaryMJFFImpactReportPart(
        {
          spreadsheetId: spreadsheetId,
          sheetId: sheetId,
          sheetName: sheetName,
          data: {
            documentId: doc.id,
            documentToken: doc.token,
            article: metadata.article,
            DAS: metadata.DAS,
            authors: metadata.authors,
            dataSeerLink: metadata.dataSeerLink
          }
        },
        function (err, res) {
          return next(err);
        }
      );
    }
  ];
  return async.mapSeries(
    actions,
    function (action, next) {
      return setTimeout(function () {
        return action(function (err) {
          return next(err);
        });
      }, 1000);
    },
    function (err) {
      return cb(err);
    }
  );
};

/**
 * This function will fill Detailed Report part with given data and return the file ID (google file ID)
 * @param {object} opts - Options available
 * @param {string} opts.spreadsheetId - spreadsheetId
 * @param {object} opts.sheetId - sheetId
 * @param {object} opts.sheetName - sheetName
 * @param {object} opts.data - Data available
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR undefined)
 * @returns {undefined} undefined
 */
Self.fillDetailedReportMJFFImpactReportPart = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `spreadsheetId`) === `undefined`)
    return cb(Error(`Missing required data: opts.spreadsheetId`));
  if (typeof _.get(opts, `sheetId`) === `undefined`) return cb(Error(`Missing required data: opts.sheetId`));
  let spreadsheetId = _.get(opts, `spreadsheetId`);
  let sheetId = _.get(opts, `sheetId`);
  let sheetName = _.get(opts, `sheetName`);
  let data = _.get(opts, `data`, {});
  let summary = _.get(data, `summary`, []);
  let protocols = _.get(data, `protocols`, []);
  let code = _.get(data, `code`, []);
  let software = _.get(data, `software`, []);
  let materials = _.get(data, `materials`, []);
  let datasets = _.get(data, `datasets`, []);
  let documentId = _.get(data, `documentId`);
  let documentToken = _.get(data, `documentToken`);
  // Compute batches commands
  let batches = [
    // protocols
    // {
    //   sheet: { id: sheetId, name: sheetName },
    //   row: { min: 80, max: 80, insert: 80 },
    //   cells: [],
    //   params: {
    //     noDataRow: { min: 81, max: 83, display: conf.settings.displayNoDataSection[`MJFF Impact Report`].protocols }
    //   },
    //   fn: function (batch) {
    //     let link = `#gid=${sheetId}&range=B${batch.row.insert}`;
    //     let label = `Protocols`;
    //     return Self.buildRequestUpdateCell(`'${sheetName}'!F16`, [`=LIEN_HYPERTEXTE("${link}", "${label}")`]);
    //   },
    //   data: [
    //     {
    //       merges: [
    //         { begin: 2, end: 5 },
    //         { begin: 5, end: 7 },
    //         { begin: 7, end: 9 },
    //         { begin: 11, end: 16 }
    //       ],
    //       row: { min: 84, max: 88, insert: 86 },
    //       cells: [
    //         { column: `B`, property: `reuse` },
    //         { column: `C`, property: `issue` },
    //         { column: `F`, property: `name` },
    //         { column: `H`, property: `URL` },
    //         { column: `J`, property: `repository` },
    //         { column: `K`, property: `protocolType` },
    //         { column: `L`, property: `notes` }
    //       ],
    //       // Deposit in repository and cite DOI in text
    //       data: protocols[0].map(function (item) {
    //         return {
    //           reuse: item.reuse,
    //           issue: !!item.issues,
    //           name: conf.settings.dataObjectsLinks[`MJFF Impact Report`]
    //             ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
    //             : item.name,
    //           notes: item.comments,
    //           sentences: item.sentences
    //             .map(function (s) {
    //               return s.text;
    //             })
    //             .join(` `),
    //           protocolType: item.type.url
    //             ? `=LIEN_HYPERTEXTE("${item.type.url}";"${item.type.label}")`
    //             : item.type.label,
    //           URL: item.URL,
    //           repository: item.DOI
    //         };
    //       })
    //     },
    //     {
    //       merges: [
    //         { begin: 2, end: 5 },
    //         { begin: 5, end: 7 },
    //         { begin: 7, end: 9 },
    //         { begin: 11, end: 16 }
    //       ],
    //       row: { min: 89, max: 92, insert: 91 },
    //       cells: [
    //         { column: `B`, property: `reuse` },
    //         { column: `C`, property: `issue` },
    //         { column: `F`, property: `name` },
    //         { column: `H`, property: `URL` },
    //         { column: `J`, property: `repository` },
    //         { column: `K`, property: `protocolType` },
    //         { column: `L`, property: `notes` }
    //       ],
    //       // Include missing information in citation
    //       data: protocols[1].map(function (item) {
    //         return {
    //           reuse: item.reuse,
    //           issue: !!item.issues,
    //           name: conf.settings.dataObjectsLinks[`MJFF Impact Report`]
    //             ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
    //             : item.name,
    //           notes: item.comments,
    //           sentences: item.sentences
    //             .map(function (s) {
    //               return s.text;
    //             })
    //             .join(` `),
    //           protocolType: item.type.url
    //             ? `=LIEN_HYPERTEXTE("${item.type.url}";"${item.type.label}")`
    //             : item.type.label,
    //           URL: item.URL,
    //           repository: item.DOI
    //         };
    //       })
    //     }
    //   ]
    // },
    // lab materials
    {
      sheet: { id: sheetId, name: sheetName },
      row: { min: 65, max: 65, insert: 65 },
      cells: [],
      params: {
        noDataRow: { min: 66, max: 68, display: conf.settings.displayNoDataSection[`MJFF Impact Report`].materials }
      },
      fn: function (batch) {
        let link = `#gid=${sheetId}&range=B${batch.row.insert}`;
        let label = `Lab Materials`;
        return Self.buildRequestUpdateCell(`'${sheetName}'!F15`, [`=LIEN_HYPERTEXTE("${link}", "${label}")`]);
      },
      data: [
        {
          merges: [
            { begin: 2, end: 5 },
            { begin: 14, end: 16 }
          ],
          row: { min: 69, max: 73, insert: 71 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `H`, property: `source` },
            { column: `I`, property: `catalog` },
            { column: `J`, property: `RRID` },
            { column: `K`, property: `datatype` },
            { column: `L`, property: `suggestedEntity` },
            { column: `M`, property: `suggestedRRID` },
            { column: `N`, property: `associatedReference` },
            { column: `O`, property: `notes` }
          ],
          // Assign RRID and cite in text
          data: materials[0].map(function (item) {
            return {
              reuse: item.reuse,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`MJFF Impact Report`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              repository: item.DOI,
              datatype: item.type.url ? `=LIEN_HYPERTEXTE("${item.type.url}";"${item.type.label}")` : item.type.label,
              source: item.source,
              RRID: item.RRID,
              suggestedEntity: item.suggestedEntity,
              catalog: item.catalogNumber,
              suggestedRRID: item.suggestedRRID,
              associatedReference: item.associatedReference
            };
          })
        },
        {
          merges: [
            { begin: 2, end: 5 },
            { begin: 14, end: 16 }
          ],
          row: { min: 74, max: 79, insert: 76 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `H`, property: `source` },
            { column: `I`, property: `catalog` },
            { column: `J`, property: `RRID` },
            { column: `K`, property: `datatype` },
            { column: `L`, property: `suggestedEntity` },
            { column: `M`, property: `suggestedRRID` },
            { column: `N`, property: `associatedReference` },
            { column: `O`, property: `notes` }
          ],
          // Check for an existing RRID
          data: materials[1].map(function (item) {
            return {
              reuse: item.reuse,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`MJFF Impact Report`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              repository: item.DOI,
              datatype: item.type.url ? `=LIEN_HYPERTEXTE("${item.type.url}";"${item.type.label}")` : item.type.label,
              source: item.source,
              RRID: item.RRID,
              suggestedEntity: item.suggestedEntity,
              catalog: item.catalogNumber,
              suggestedRRID: item.suggestedRRID,
              associatedReference: item.associatedReference
            };
          })
        }
      ]
    },
    // software
    {
      sheet: { id: sheetId, name: sheetName },
      row: { min: 50, max: 50, insert: 50 },
      cells: [],
      params: {
        noDataRow: { min: 51, max: 53, display: conf.settings.displayNoDataSection[`MJFF Impact Report`].software }
      },
      fn: function (batch) {
        let link = `#gid=${sheetId}&range=B${batch.row.insert}`;
        let label = `Software`;
        return Self.buildRequestUpdateCell(`'${sheetName}'!F14`, [`=LIEN_HYPERTEXTE("${link}", "${label}")`]);
      },
      data: [
        {
          merges: [
            { begin: 2, end: 4 },
            { begin: 7, end: 9 },
            { begin: 14, end: 16 }
          ],
          row: { min: 54, max: 58, insert: 56 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `version` },
            { column: `E`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `H`, property: `URL` },
            { column: `J`, property: `RRID` },
            { column: `K`, property: `suggestedEntity` },
            { column: `L`, property: `suggestedRRID` },
            { column: `M`, property: `suggestedURL` },
            { column: `N`, property: `associatedReference` },
            { column: `O`, property: `notes` }
          ],
          // Include missing information in citation
          data: software[0].map(function (item) {
            return {
              reuse: item.reuse,
              version: item.version,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`MJFF Impact Report`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              URL: item.URL,
              RRID: item.RRID,
              suggestedEntity: item.suggestedEntity,
              suggestedRRID: item.suggestedRRID,
              suggestedURL: item.suggestedURL,
              notes: item.comments,
              associatedReference: item.associatedReference
            };
          })
        },
        {
          merges: [
            { begin: 2, end: 4 },
            { begin: 7, end: 9 },
            { begin: 14, end: 16 }
          ],
          row: { min: 59, max: 64, insert: 61 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `version` },
            { column: `E`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `H`, property: `URL` },
            { column: `J`, property: `RRID` },
            { column: `K`, property: `suggestedEntity` },
            { column: `L`, property: `suggestedRRID` },
            { column: `M`, property: `suggestedURL` },
            { column: `N`, property: `associatedReference` },
            { column: `O`, property: `notes` }
          ],
          // Verify citation
          data: software[1].map(function (item) {
            return {
              reuse: item.reuse,
              version: item.version,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`MJFF Impact Report`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              URL: item.URL,
              RRID: item.RRID,
              suggestedEntity: item.suggestedEntity,
              suggestedRRID: item.suggestedRRID,
              suggestedURL: item.suggestedURL,
              notes: item.comments,
              associatedReference: item.associatedReference
            };
          })
        }
      ]
    },
    // code
    {
      sheet: { id: sheetId, name: sheetName },
      row: { min: 35, max: 35, insert: 35 },
      cells: [],
      params: {
        noDataRow: { min: 36, max: 38, display: conf.settings.displayNoDataSection[`MJFF Impact Report`].code }
      },
      fn: function (batch) {
        let link = `#gid=${sheetId}&range=B${batch.row.insert}`;
        let label = `Code`;
        return Self.buildRequestUpdateCell(`'${sheetName}'!F13`, [`=LIEN_HYPERTEXTE("${link}", "${label}")`]);
      },
      data: [
        {
          merges: [
            { begin: 1, end: 5 },
            { begin: 7, end: 9 },
            { begin: 9, end: 11 },
            { begin: 11, end: 13 },
            { begin: 13, end: 16 }
          ],
          row: { min: 39, max: 43, insert: 41 },
          cells: [
            { column: `B`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `H`, property: `URL` },
            { column: `J`, property: `DOI` },
            { column: `L`, property: `associatedReference` },
            { column: `N`, property: `notes` }
          ],
          // Upload code to Zenodo and provide DOI
          data: code[0].map(function (item) {
            return {
              reuse: item.reuse,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`MJFF Impact Report`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              DOI: item.DOI,
              URL: item.URL,
              associatedReference: item.associatedReference
            };
          })
        },
        {
          merges: [
            { begin: 1, end: 5 },
            { begin: 7, end: 9 },
            { begin: 9, end: 11 },
            { begin: 11, end: 13 },
            { begin: 13, end: 16 }
          ],
          row: { min: 44, max: 49, insert: 46 },
          cells: [
            { column: `B`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `H`, property: `URL` },
            { column: `J`, property: `DOI` },
            { column: `L`, property: `associatedReference` },
            { column: `N`, property: `notes` }
          ],
          // Verify citation
          data: code[1].map(function (item) {
            return {
              reuse: item.reuse,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`MJFF Impact Report`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              DOI: item.DOI,
              URL: item.URL,
              associatedReference: item.associatedReference
            };
          })
        }
      ]
    },
    // datasets
    {
      sheet: { id: sheetId, name: sheetName },
      row: { min: 21, max: 21, insert: 21 },
      cells: [],
      params: {
        noDataRow: { min: 22, max: 24, display: conf.settings.displayNoDataSection[`MJFF Impact Report`].datasets }
      },
      fn: function (batch) {
        let link = `#gid=${sheetId}&range=B${batch.row.insert}`;
        let label = `Datasets`;
        return Self.buildRequestUpdateCell(`'${sheetName}'!F12`, [`=LIEN_HYPERTEXTE("${link}", "${label}")`]);
      },
      data: [
        {
          merges: [
            { begin: 7, end: 9 },
            { begin: 13, end: 16 }
          ],
          row: { min: 25, max: 29, insert: 27 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `qc` },
            { column: `D`, property: `representativeImage` },
            { column: `E`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `H`, property: `repository` },
            { column: `J`, property: `uniqueIdentifier` },
            { column: `K`, property: `datatype` },
            { column: `L`, property: `figureOrTable` },
            { column: `M`, property: `associatedReference` },
            { column: `N`, property: `notes` }
          ],
          // Deposit to appropriate repository and cite PID in text
          data: datasets[0].map(function (item) {
            return {
              reuse: item.reuse,
              qc: item.qc,
              representativeImage: item.representativeImage,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`MJFF Impact Report`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              figureOrTable: item.associatedFigureOrTable,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              repository: item.URL,
              uniqueIdentifier: item.PID,
              datatype:
                item.type && item.type.url
                  ? `=LIEN_HYPERTEXTE("${item.type.url}";"${item.type.label}")`
                  : item.type.label,
              associatedReference: item.associatedReference
            };
          })
        },
        {
          merges: [
            { begin: 7, end: 9 },
            { begin: 13, end: 16 }
          ],
          row: { min: 30, max: 34, insert: 32 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `qc` },
            { column: `D`, property: `representativeImage` },
            { column: `E`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `H`, property: `repository` },
            { column: `J`, property: `uniqueIdentifier` },
            { column: `K`, property: `datatype` },
            { column: `L`, property: `figureOrTable` },
            { column: `M`, property: `associatedReference` },
            { column: `N`, property: `notes` }
          ],
          // Cite dataset unique identifier in text
          data: datasets[1].map(function (item) {
            return {
              reuse: item.reuse,
              qc: item.qc,
              representativeImage: item.representativeImage,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`MJFF Impact Report`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              notes: item.comments,
              figureOrTable: item.associatedFigureOrTable,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              repository: item.URL,
              uniqueIdentifier: item.PID,
              datatype:
                item.type && item.type.url
                  ? `=LIEN_HYPERTEXTE("${item.type.url}";"${item.type.label}")`
                  : item.type.label,
              associatedReference: item.associatedReference
            };
          })
        }
      ]
    }
  ];
  return async.mapSeries(
    batches,
    function (batch, _next) {
      // Is there data in this bulk of data
      let noData = batch.data.reduce(function (acc, item) {
        return acc && item.data.length === 0;
      }, true);
      let actions = [
        // Insert rows
        function (n) {
          let requests = [];
          let offset = 0;
          // if there is data or noDataRow should not be displayed, delete the "noDataRow"
          if ((!noData && batch.params.noDataRow) || !batch.params.noDataRow.display) {
            requests.push(
              Self.buildRequestDeleteRows(batch.sheet.id, batch.params.noDataRow.min - 1, batch.params.noDataRow.max)
            );
            offset -= batch.params.noDataRow.max - batch.params.noDataRow.min + 1;
          }
          // Copy/Paste template if necessary
          if (typeof batch.copyPaste === `object`) {
            let delta = batch.copyPaste.row.end - batch.copyPaste.row.begin + 1;
            offset += delta;
            requests.push(
              Self.buildRequestInsertRows(sheetId, batch.copyPaste.row.end, batch.copyPaste.row.end + delta + 1, false)
            );
            requests.push(
              Self.buildRequestCopyPaste(
                {
                  sheetId: sheetId,
                  startRowIndex: batch.copyPaste.row.begin,
                  endRowIndex: batch.copyPaste.row.end,
                  startColumnIndex: batch.copyPaste.column.begin,
                  endColumnIndex: batch.copyPaste.column.end
                },
                {
                  sheetId: sheetId,
                  startRowIndex: batch.copyPaste.row.begin + delta,
                  endRowIndex: batch.copyPaste.row.end + delta,
                  startColumnIndex: batch.copyPaste.column.begin,
                  endColumnIndex: batch.copyPaste.column.end
                }
              )
            );
            batch.row.min += offset;
            batch.row.max += offset;
            batch.row.insert += offset;
          }
          // insert rows if necessary
          for (let i = batch.data.length - 1; i >= 0; i--) {
            batch.data[i].row.min += offset;
            batch.data[i].row.insert += offset;
            batch.data[i].row.max += offset;
            // if there is data in this bulk of data
            if (batch.data[i].data.length > 0) {
              // insert row(s)
              requests.push(
                Self.buildRequestInsertRows(
                  sheetId,
                  batch.data[i].row.insert,
                  batch.data[i].row.insert + batch.data[i].data.length - 1,
                  true
                )
              );
              // merge cells
              for (let j = 0; j < batch.data[i].merges.length; j++) {
                let merge = batch.data[i].merges[j];
                requests.push(
                  Self.buildRequestMergeCells(
                    sheetId,
                    batch.data[i].row.insert,
                    batch.data[i].row.insert + batch.data[i].data.length - 1,
                    merge.begin,
                    merge.end
                  )
                );
              }
              // update borders
              requests.push(
                Self.buildRequestUpdateBorders(
                  sheetId,
                  batch.data[i].row.insert,
                  batch.data[i].row.insert + batch.data[i].data.length - 1,
                  0,
                  15
                )
              );
            }
            // delete row(s) if necessary
            else {
              requests.push(Self.buildRequestDeleteRows(sheetId, batch.data[i].row.min - 1, batch.data[i].row.max));
            }
          }
          // if there is no data at all, delete head row(s)
          if (noData && !batch.params.noDataRow.display)
            requests.push(Self.buildRequestDeleteRows(sheetId, batch.row.min - 1, batch.row.max));
          if (requests.length <= 0) return n();
          return gSheets.spreadsheets.batchUpdate(
            {
              // The ID of the spreadsheet to update.
              spreadsheetId: spreadsheetId,
              // Request body metadata
              requestBody: {
                includeSpreadsheetInResponse: false,
                responseIncludeGridData: false,
                // request body parameters
                requests: requests
              }
            },
            function (err, res) {
              setTimeout(function () {
                // process err or result here
                return n(err);
              }, conf.settings.googleAPI[`MJFF Impact Report`].timeout);
            }
          );
        },
        // Update cells & Add data validations
        function (n) {
          let data = [];
          let offset = 0;
          // Copy/Paste template if necessary
          if (batch.copyPaste) {
            let delta = batch.copyPaste.row.end - batch.copyPaste.row.begin + 1;
            offset += delta;
          }
          let begin = batch.row.min;
          let end = batch.row.max;
          // fill rows if necessary
          if (typeof batch.fn === `function`) data.push(batch.fn(batch));
          for (let i = 0; i < batch.data.length; i++) {
            // if there is data in this bulk of data
            if (batch.data[i].data.length > 0) {
              batch.data[i].row.max += batch.data[i].data.length - 1;
              end += batch.data[i].row.max;
              // update row property of all the next items
              if (typeof batch.data[i + 1] !== `undefined`) {
                let d = batch.data[i].data.length - 1; // -1 because there is one line by default
                for (let j = i + 1; j < batch.data.length; j++) {
                  batch.data[j].row.min += d;
                  batch.data[j].row.insert += d;
                  batch.data[j].row.max += d;
                }
              }
              // fill row(s)
              for (let j = 0; j < batch.data[i].data.length; j++) {
                let item = batch.data[i].data[j];
                let rowIndex = batch.data[i].row.insert + j;
                data.push(Self.buildRequestUpdateCell(`'${sheetName}'!A${rowIndex}`, [j + 1]));
                for (let k = 0; k < batch.data[i].cells.length; k++) {
                  let info = batch.data[i].cells[k];
                  data.push(
                    Self.buildRequestUpdateCell(`'${sheetName}'!${info.column}${rowIndex}`, [item[info.property]])
                  );
                }
              }
            } else {
              // update row property of all the next items
              let d = batch.data[i].row.max - batch.data[i].row.min + 1;
              for (let j = i + 1; j < batch.data.length; j++) {
                batch.data[j].row.min -= d;
                batch.data[j].row.insert -= d;
                batch.data[j].row.max -= d;
              }
            }
          }
          // if there is data fill head row(s)
          if (batch.cells.length > 0 && batch.row.insert) {
            for (let i = 0; i < batch.cells.length; i++) {
              let rowIndex = batch.row.insert;
              let info = batch.cells[i];
              data.push(Self.buildRequestUpdateCell(`'${sheetName}'!${info.column}${rowIndex}`, [info.value]));
            }
          }
          if (data.length <= 0) return n();
          return gSheets.spreadsheets.values.batchUpdate(
            {
              // The ID of the spreadsheet to update.
              spreadsheetId: spreadsheetId,
              // Request body metadata
              requestBody: {
                // request body parameters
                data: data,
                valueInputOption: `USER_ENTERED`
              }
            },
            function (err, res) {
              setTimeout(function () {
                // process err or result here
                return n(err);
              }, conf.settings.googleAPI[`MJFF Impact Report`].timeout);
            }
          );
        }
      ];
      return async.mapSeries(
        actions,
        function (action, next) {
          return action(function (err) {
            return next(err);
          });
        },
        function (err) {
          return _next(err);
        }
      );
    },
    function (err) {
      return cb(err);
    }
  );
};

/**
 * This function will fill 'Open Science Indicator Summary' part of the report with given data and return the file ID (google file ID)
 * @param {object} opts - Options available
 * @param {string} opts.spreadsheetId - spreadsheetId
 * @param {object} opts.sheetId - sheetId
 * @param {object} opts.sheetName - sheetName
 * @param {object} opts.data - Data available
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR undefined)
 * @returns {undefined} undefined
 */
Self.fillOpenScienceIndicatorSummaryMJFFImpactReportPart = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `spreadsheetId`) === `undefined`)
    return cb(Error(`Missing required data: opts.spreadsheetId`));
  if (typeof _.get(opts, `sheetId`) === `undefined`) return cb(Error(`Missing required data: opts.sheetId`));
  let spreadsheetId = _.get(opts, `spreadsheetId`);
  let sheetId = _.get(opts, `sheetId`);
  let sheetName = _.get(opts, `sheetName`);
  let data = _.get(opts, `data`, {});
  let documentId = _.get(data, `documentId`);
  let documentToken = _.get(data, `documentToken`);
  let OSIS = _.get(data, `OSIS`);
  let actions = [
    // Update cells & Add data validations
    function (next) {
      if (!conf.settings.OSIS[`MJFF Impact Report`]) return next();
      let data = [
        Self.buildRequestUpdateCell(`'${sheetName}'!G12`, [OSIS.datasets.newShared]),
        Self.buildRequestUpdateCell(`'${sheetName}'!H12`, [OSIS.datasets.newNotShared]),
        Self.buildRequestUpdateCell(`'${sheetName}'!I12`, [OSIS.datasets.reuseCited]),
        Self.buildRequestUpdateCell(`'${sheetName}'!J12`, [OSIS.datasets.reuseNotCited]),
        Self.buildRequestUpdateCell(`'${sheetName}'!K12`, [OSIS.datasets.reuseNotCitedArtRef]),
        Self.buildRequestUpdateCell(`'${sheetName}'!G13`, [OSIS.code.newShared]),
        Self.buildRequestUpdateCell(`'${sheetName}'!H13`, [OSIS.code.newNotShared]),
        Self.buildRequestUpdateCell(`'${sheetName}'!I13`, [OSIS.code.reuseCited]),
        Self.buildRequestUpdateCell(`'${sheetName}'!J13`, [OSIS.code.reuseNotCited]),
        Self.buildRequestUpdateCell(`'${sheetName}'!K13`, [OSIS.code.reuseNotCitedArtRef]),
        Self.buildRequestUpdateCell(`'${sheetName}'!G14`, [OSIS.software.newShared]),
        Self.buildRequestUpdateCell(`'${sheetName}'!H14`, [OSIS.software.newNotShared]),
        Self.buildRequestUpdateCell(`'${sheetName}'!I14`, [OSIS.software.reuseCited]),
        Self.buildRequestUpdateCell(`'${sheetName}'!J14`, [OSIS.software.reuseNotCited]),
        Self.buildRequestUpdateCell(`'${sheetName}'!K14`, [OSIS.software.reuseNotCitedArtRef]),
        Self.buildRequestUpdateCell(`'${sheetName}'!G15`, [OSIS.labMaterials.newShared]),
        Self.buildRequestUpdateCell(`'${sheetName}'!H15`, [OSIS.labMaterials.newNotShared]),
        Self.buildRequestUpdateCell(`'${sheetName}'!I15`, [OSIS.labMaterials.reuseCited]),
        Self.buildRequestUpdateCell(`'${sheetName}'!J15`, [OSIS.labMaterials.reuseNotCited]),
        Self.buildRequestUpdateCell(`'${sheetName}'!K15`, [OSIS.labMaterials.reuseNotCitedArtRef])
        // Self.buildRequestUpdateCell(`'${sheetName}'!G16`, [OSIS.protocols.newShared]),
        // Self.buildRequestUpdateCell(`'${sheetName}'!H16`, [OSIS.protocols.newNotShared]),
        // Self.buildRequestUpdateCell(`'${sheetName}'!I16`, [OSIS.protocols.reuseCited]),
        // Self.buildRequestUpdateCell(`'${sheetName}'!J16`, [OSIS.protocols.reuseNotCited]),
        // Self.buildRequestUpdateCell(`'${sheetName}'!K16`, [OSIS.protocols.reuseNotCitedArtRef])
      ];
      return gSheets.spreadsheets.values.batchUpdate(
        {
          // The ID of the spreadsheet to update.
          spreadsheetId: spreadsheetId,
          // Request body metadata
          requestBody: {
            // request body parameters
            data: data,
            valueInputOption: `USER_ENTERED`
          }
        },
        function (err, res) {
          return next(err);
        }
      );
    }
  ];
  return async.mapSeries(
    actions,
    function (action, next) {
      return action(function (err) {
        return next(err);
      });
    },
    function (err) {
      return cb(err);
    }
  );
};

/**
 * This function will fill summary part with given data and return the file ID (google file ID)
 * @param {object} opts - Options available
 * @param {string} opts.spreadsheetId - spreadsheetId
 * @param {object} opts.sheetId - sheetId
 * @param {object} opts.sheetName - sheetName
 * @param {object} opts.data - Data available
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR undefined)
 * @returns {undefined} undefined
 */
Self.fillSummaryMJFFImpactReportPart = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `spreadsheetId`) === `undefined`)
    return cb(Error(`Missing required data: opts.spreadsheetId`));
  if (typeof _.get(opts, `sheetId`) === `undefined`) return cb(Error(`Missing required data: opts.sheetId`));
  let spreadsheetId = _.get(opts, `spreadsheetId`);
  let sheetId = _.get(opts, `sheetId`);
  let sheetName = _.get(opts, `sheetName`);
  let data = _.get(opts, `data`, {});
  let article = _.get(data, `article`, {});
  let DAS = _.get(data, `DAS`, {});
  let authors = _.get(data, `authors`, []);
  let preprint = _.get(data, `preprint`, []);
  let documentId = _.get(data, `documentId`);
  let documentToken = _.get(data, `documentToken`);
  let dataSeerLink = _.get(data, `dataSeerLink`, {});
  let authorsNames = authors
    .map(function (item) {
      return item.name;
    })
    .join(`, `);
  let actions = [
    // Update cells & Add data validations
    function (next) {
      let date = new Date();
      let data = [
        Self.buildRequestUpdateCell(`'${sheetName}'!F3`, [article.title]),
        Self.buildRequestUpdateCell(`'${sheetName}'!F4`, [authorsNames]),
        Self.buildRequestUpdateCell(`'${sheetName}'!F5`, [
          `=LIEN_HYPERTEXTE("${article.URL.url}";"${article.URL.url}")`
        ]),
        Self.buildRequestUpdateCell(`'${sheetName}'!F6`, [
          `=LIEN_HYPERTEXTE("${dataSeerLink.url}";"${dataSeerLink.label}")`
        ]),
        Self.buildRequestUpdateCell(`'${sheetName}'!F7`, [
          `=DATE(${date.getFullYear()};${date.getMonth() + 1};${date.getDate()})`
        ]),
        Self.buildRequestUpdateCell(`'${sheetName}'!F8`, [DAS])
      ];
      return gSheets.spreadsheets.values.batchUpdate(
        {
          // The ID of the spreadsheet to update.
          spreadsheetId: spreadsheetId,
          // Request body metadata
          requestBody: {
            // request body parameters
            data: data,
            valueInputOption: `USER_ENTERED`
          }
        },
        function (err, res) {
          return next(err);
        }
      );
    }
  ];
  return async.mapSeries(
    actions,
    function (action, next) {
      return action(function (err) {
        return next(err);
      });
    },
    function (err) {
      return cb(err);
    }
  );
};

/**
 * This function will fill HHMI report with given data and return the file ID (google file ID)
 * @param {object} opts - Options available
 * @param {string} opts.spreadsheetId - spreadsheetId
 * @param {object} opts.data - Data available
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR undefined)
 * @returns {undefined} undefined
 */
Self.insertDataInHHMISheets = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `spreadsheetId`) === `undefined`)
    return cb(Error(`Missing required data: opts.spreadsheetId`));
  let spreadsheetId = _.get(opts, `spreadsheetId`);
  let data = _.get(opts, `data`, {});
  return Self.getSheets({ spreadsheetId: spreadsheetId }, function (err, sheets) {
    let summarySheetId = Self.getSheetId(sheets, `Summary Sheet`);
    let ART_1 = Self.getSheetId(sheets, `ART-1`);
    let ART_2 = Self.getSheetId(sheets, `ART-2`);
    let ART_3 = Self.getSheetId(sheets, `ART-3`);
    let ART_4 = Self.getSheetId(sheets, `ART-4`);
    let ART_5 = Self.getSheetId(sheets, `ART-5`);
    let dataSheetId = Self.getSheetId(sheets, `__data__`);
    let opts = {
      ART_1: Self.buildDataForHHMISheets(data[0]),
      ART_2: Self.buildDataForHHMISheets(data[1]),
      ART_3: Self.buildDataForHHMISheets(data[2]),
      ART_4: Self.buildDataForHHMISheets(data[3]),
      ART_5: Self.buildDataForHHMISheets(data[4])
    };
    let articleInformation = data.map(function (item) {
      let name = item.document.name.replace(`.pdf`, ``);
      return {
        title: item.metadata.articleTitle,
        reportID: name.substring(name.length - 6),
        preprintURL: { url: item.preprint.url, label: item.preprint.url },
        preprintDOI: item.preprint.doi,
        publicationURL: item.metadata.originalFileLink
      };
    });
    let keys = Object.keys(opts);
    let actions = [
      // fill 'Summary Sheet'
      function (next) {
        if (summarySheetId instanceof Error) return next(summarySheetId);
        return Self.fillSummaryHHMISheet(
          {
            spreadsheetId: spreadsheetId,
            sheetId: summarySheetId,
            sheetName: `Summary Sheet`,
            data: {
              articleInformation: articleInformation
            }
          },
          function (err, res) {
            return next(err);
          }
        );
      },
      // fill 'ART_1'
      function (next) {
        if (ART_1 instanceof Error) return next(ART_1);
        return Self.insertDataInHHMIDocumentSheet(
          {
            spreadsheetId: spreadsheetId,
            sheetId: ART_1,
            sheetName: `ART-1`,
            data: opts.ART_1
          },
          function (err, res) {
            return next(err);
          }
        );
      },
      // fill 'ART_2'
      function (next) {
        if (ART_2 instanceof Error) return next(ART_2);
        return Self.insertDataInHHMIDocumentSheet(
          {
            spreadsheetId: spreadsheetId,
            sheetId: ART_2,
            sheetName: `ART-2`,
            data: opts.ART_2
          },
          function (err, res) {
            return next(err);
          }
        );
      },
      // fill 'ART_3'
      function (next) {
        if (ART_3 instanceof Error) return next(ART_3);
        return Self.insertDataInHHMIDocumentSheet(
          {
            spreadsheetId: spreadsheetId,
            sheetId: ART_3,
            sheetName: `ART-3`,
            data: opts.ART_3
          },
          function (err, res) {
            return next(err);
          }
        );
      },
      // fill 'ART_4'
      function (next) {
        if (ART_4 instanceof Error) return next(ART_4);
        return Self.insertDataInHHMIDocumentSheet(
          {
            spreadsheetId: spreadsheetId,
            sheetId: ART_4,
            sheetName: `ART-4`,
            data: opts.ART_4
          },
          function (err, res) {
            return next(err);
          }
        );
      },
      // fill 'ART_5'
      function (next) {
        if (ART_5 instanceof Error) return next(ART_5);
        return Self.insertDataInHHMIDocumentSheet(
          {
            spreadsheetId: spreadsheetId,
            sheetId: ART_5,
            sheetName: `ART-5`,
            data: opts.ART_5
          },
          function (err, res) {
            return next(err);
          }
        );
      },
      // Rename ART tabs
      function (next) {
        return Self.renameHHMISheets(
          {
            spreadsheetId: spreadsheetId,
            dataSheetId: dataSheetId,
            data: {
              'ART-1': { sheetId: ART_1, title: articleInformation[0].reportID },
              'ART-2': { sheetId: ART_2, title: articleInformation[1].reportID },
              'ART-3': { sheetId: ART_3, title: articleInformation[2].reportID },
              'ART-4': { sheetId: ART_4, title: articleInformation[3].reportID },
              'ART-5': { sheetId: ART_5, title: articleInformation[4].reportID }
            }
          },
          function (err, res) {
            return next(err);
          }
        );
      }
    ];
    return async.mapSeries(
      actions,
      function (action, next) {
        return action(function (err) {
          return next(err);
        });
      },
      function (err) {
        return cb(err);
      }
    );
  });
};

/**
 * This function will fill HHMI report with given data and return the file ID (google file ID)
 * @param {object} opts - Options available
 * @param {string} opts.spreadsheetId - spreadsheetId
 * @param {object} opts.data - Data available
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR undefined)
 * @returns {undefined} undefined
 */
Self.renameHHMISheets = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `spreadsheetId`) === `undefined`)
    return cb(Error(`Missing required data: opts.spreadsheetId`));
  let spreadsheetId = _.get(opts, `spreadsheetId`);
  let dataSheetId = _.get(opts, `dataSheetId`);
  let data = _.get(opts, `data`, {});
  let actions = [
    // Update cells & Add data validations
    function (next) {
      let requests = [
        Self.buildRequestUpdateSheetTitle(data[`ART-1`].sheetId, data[`ART-1`].title),
        Self.buildRequestUpdateSheetTitle(data[`ART-2`].sheetId, data[`ART-2`].title),
        Self.buildRequestUpdateSheetTitle(data[`ART-3`].sheetId, data[`ART-3`].title),
        Self.buildRequestUpdateSheetTitle(data[`ART-4`].sheetId, data[`ART-4`].title),
        Self.buildRequestUpdateSheetTitle(data[`ART-5`].sheetId, data[`ART-5`].title),

        Self.buildRequestCopyPaste(
          {
            sheetId: dataSheetId,
            startRowIndex: 0,
            endRowIndex: 23,
            startColumnIndex: 0,
            endColumnIndex: 8
          },
          {
            sheetId: dataSheetId,
            startRowIndex: 0,
            endRowIndex: 23,
            startColumnIndex: 0,
            endColumnIndex: 8
          }
        )
      ];
      return gSheets.spreadsheets.batchUpdate(
        {
          // The ID of the spreadsheet to update.
          spreadsheetId: spreadsheetId,
          // Request body metadata
          requestBody: {
            includeSpreadsheetInResponse: false,
            responseIncludeGridData: false,
            // request body parameters
            requests: requests
          }
        },
        function (err, res) {
          return next(err);
        }
      );
    }
  ];
  return async.mapSeries(
    actions,
    function (action, next) {
      return action(function (err) {
        return next(err);
      });
    },
    function (err) {
      return cb(err);
    }
  );
};

/**
 * This function will fill HHMI report with given data and return the file ID (google file ID)
 * @param {object} opts - Options available
 * @param {string} opts.spreadsheetId - spreadsheetId
 * @param {string} opts.sheetId - sheetId
 * @param {object} opts.sheetName - sheetName
 * @param {object} opts.data - Data available
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR undefined)
 * @returns {undefined} undefined
 */
Self.fillSummaryHHMISheet = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `spreadsheetId`) === `undefined`)
    return cb(Error(`Missing required data: opts.spreadsheetId`));
  if (typeof _.get(opts, `sheetId`) === `undefined`) return cb(Error(`Missing required data: opts.sheetId`));
  let spreadsheetId = _.get(opts, `spreadsheetId`);
  let sheetId = _.get(opts, `sheetId`);
  let sheetName = _.get(opts, `sheetName`);
  let data = _.get(opts, `data`, {});
  let articleInformation = _.get(data, `articleInformation`);

  let actions = [
    // Update cells & Add data validations
    function (next) {
      let data = [];
      let offset = 30;
      for (let i = 0; i < articleInformation.length; i++) {
        let rowIndex = offset + i;
        data.push(Self.buildRequestUpdateCell(`'${sheetName}'!A${rowIndex}`, [articleInformation[i].title]));
        data.push(Self.buildRequestUpdateCell(`'${sheetName}'!B${rowIndex}`, [articleInformation[i].reportID]));
        data.push(
          Self.buildRequestUpdateCell(`'${sheetName}'!D${rowIndex}`, [
            `=LIEN_HYPERTEXTE("${articleInformation[i].publicationURL.url}", "${articleInformation[i].publicationURL.url}")`
          ])
        );
        if (articleInformation[i].preprintURL.url !== ``)
          data.push(
            Self.buildRequestUpdateCell(`'${sheetName}'!K${rowIndex}`, [
              `=LIEN_HYPERTEXTE("${articleInformation[i].preprintURL.url}", "${articleInformation[i].preprintURL.url}")`
            ])
          );
        if (articleInformation[i].preprintDOI !== ``)
          data.push(Self.buildRequestUpdateCell(`'${sheetName}'!O${rowIndex}`, [articleInformation[i].preprintDOI]));
      }
      return gSheets.spreadsheets.values.batchUpdate(
        {
          // The ID of the spreadsheet to update.
          spreadsheetId: spreadsheetId,
          // Request body metadata
          requestBody: {
            // request body parameters
            data: data,
            valueInputOption: `USER_ENTERED`
          }
        },
        function (err, res) {
          return next(err);
        }
      );
    }
  ];
  return async.mapSeries(
    actions,
    function (action, next) {
      return action(function (err) {
        return next(err);
      });
    },
    function (err) {
      return cb(err);
    }
  );
};

/**
 * This function will fill HHMI report with given data and return the file ID (google file ID)
 * @param {object} opts - Options available
 * @param {string} opts.spreadsheetId - spreadsheetId
 * @param {string} opts.sheetId - sheetId
 * @param {object} opts.sheetName - sheetName
 * @param {object} opts.data - Data available
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR undefined)
 * @returns {undefined} undefined
 */
Self.insertDataInHHMIDocumentSheet = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `spreadsheetId`) === `undefined`)
    return cb(Error(`Missing required data: opts.spreadsheetId`));
  if (typeof _.get(opts, `sheetId`) === `undefined`) return cb(Error(`Missing required data: opts.sheetId`));
  let spreadsheetId = _.get(opts, `spreadsheetId`);
  let sheetId = _.get(opts, `sheetId`);
  let sheetName = _.get(opts, `sheetName`);
  let data = _.get(opts, `data`, {});
  let doc = _.get(data, `document`, {});
  let metadata = _.get(data, `metadata`, {});
  let dataObjects = _.get(data, `dataObjects`, {});
  let datasets = _.get(dataObjects, `datasets`, {});
  let code = _.get(dataObjects, `code`, {});
  let software = _.get(dataObjects, `software`, {});
  let materials = _.get(dataObjects, `labMaterials`, {});
  let protocols = _.get(dataObjects, `protocols`, {});
  let authors = _.get(data, `authors`, {});
  let OSIS = _.get(data, `OSIS`, {});
  let actions = [
    // fill 'Authors and Affiliations' part of the report
    function (next) {
      if (sheetId instanceof Error) return next(sheetId);
      return Self.fillAuthorsAndAffiliationHHMIPart(
        {
          spreadsheetId: spreadsheetId,
          sheetId: sheetId,
          sheetName: sheetName,
          data: {
            authors: authors
          }
        },
        function (err, res) {
          return next(err);
        }
      );
    },
    // fill 'Detailed Report' part of the report
    function (next) {
      if (sheetId instanceof Error) return next(sheetId);
      return Self.fillDetailedReportHHMIPart(
        {
          spreadsheetId: spreadsheetId,
          sheetId: sheetId,
          sheetName: sheetName,
          data: {
            documentId: doc.id,
            documentToken: doc.token,
            datasets: [datasets.notShared, datasets.shared, datasets.other],
            code: [code.notShared, code.shared],
            software: [software.notShared, software.shared],
            materials: [materials.notShared, materials.shared],
            protocols: [protocols.notShared, protocols.shared]
          }
        },
        function (err, res) {
          return next(err);
        }
      );
    },
    // fill 'Open Science Indicator Summary' part of the report
    function (next) {
      if (sheetId instanceof Error) return next(sheetId);
      return Self.fillOpenScienceIndicatorSummaryHHMIPart(
        {
          spreadsheetId: spreadsheetId,
          sheetId: sheetId,
          sheetName: sheetName,
          data: {
            documentId: doc.id,
            documentToken: doc.token,
            OSIS
          }
        },
        function (err, res) {
          return next(err);
        }
      );
    },
    // fill 'Summary Sheet' part of the report
    function (next) {
      if (sheetId instanceof Error) return next(sheetId);
      return Self.fillSummaryHHMIPart(
        {
          spreadsheetId: spreadsheetId,
          sheetId: sheetId,
          sheetName: sheetName,
          data: {
            documentId: doc.id,
            documentToken: doc.token,
            article: metadata.article,
            DAS: metadata.DAS,
            authors: metadata.authors,
            preprint: metadata.preprint,
            dataSeerLink: metadata.dataSeerLink
          }
        },
        function (err, res) {
          return next(err);
        }
      );
    }
  ];
  return async.mapSeries(
    actions,
    function (action, next) {
      return setTimeout(function () {
        return action(function (err) {
          return next(err);
        });
      }, 1000);
    },
    function (err) {
      return cb(err);
    }
  );
};

/**
 * This function will fill Detailed Report part with given data and return the file ID (google file ID)
 * @param {object} opts - Options available
 * @param {string} opts.spreadsheetId - spreadsheetId
 * @param {object} opts.sheetId - sheetId
 * @param {object} opts.sheetName - sheetName
 * @param {object} opts.data - Data available
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR undefined)
 * @returns {undefined} undefined
 */
Self.fillDetailedReportHHMIPart = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `spreadsheetId`) === `undefined`)
    return cb(Error(`Missing required data: opts.spreadsheetId`));
  if (typeof _.get(opts, `sheetId`) === `undefined`) return cb(Error(`Missing required data: opts.sheetId`));
  let spreadsheetId = _.get(opts, `spreadsheetId`);
  let sheetId = _.get(opts, `sheetId`);
  let sheetName = _.get(opts, `sheetName`);
  let data = _.get(opts, `data`, {});
  let summary = _.get(data, `summary`, []);
  let protocols = _.get(data, `protocols`, []);
  let code = _.get(data, `code`, []);
  let software = _.get(data, `software`, []);
  let materials = _.get(data, `materials`, []);
  let datasets = _.get(data, `datasets`, []);
  let documentId = _.get(data, `documentId`);
  let documentToken = _.get(data, `documentToken`);
  // Compute batches commands
  let batches = [
    // protocols
    {
      sheet: { id: sheetId, name: sheetName },
      row: { min: 89, max: 89, insert: 89 },
      cells: [],
      params: {
        noDataRow: { min: 90, max: 92, display: conf.settings.displayNoDataSection[`HHMI`].protocols }
      },
      fn: function (batch) {
        let link = `#gid=${sheetId}&range=B${batch.row.insert}`;
        let label = `Protocols`;
        return Self.buildRequestUpdateCell(`'${sheetName}'!F18`, [`=LIEN_HYPERTEXTE("${link}", "${label}")`]);
      },
      data: [
        {
          merges: [
            { begin: 2, end: 5 },
            { begin: 5, end: 7 },
            { begin: 7, end: 9 },
            { begin: 11, end: 15 }
          ],
          row: { min: 93, max: 97, insert: 95 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `H`, property: `URL` },
            { column: `J`, property: `repository` },
            { column: `K`, property: `protocolType` },
            { column: `L`, property: `notes` }
          ],
          // Deposit in repository and cite DOI in text
          data: protocols[0].map(function (item) {
            return {
              reuse: item.reuse,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`HHMI`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              protocolType: item.type.url
                ? `=LIEN_HYPERTEXTE("${item.type.url}";"${item.type.label}")`
                : item.type.label,
              URL: item.URL,
              repository: item.DOI
            };
          })
        },
        {
          merges: [
            { begin: 2, end: 5 },
            { begin: 5, end: 7 },
            { begin: 7, end: 9 },
            { begin: 11, end: 15 }
          ],
          row: { min: 98, max: 103, insert: 100 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `H`, property: `URL` },
            { column: `J`, property: `repository` },
            { column: `K`, property: `protocolType` },
            { column: `L`, property: `notes` }
          ],
          // Include missing information in citation
          data: protocols[1].map(function (item) {
            return {
              reuse: item.reuse,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`HHMI`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              protocolType: item.type.url
                ? `=LIEN_HYPERTEXTE("${item.type.url}";"${item.type.label}")`
                : item.type.label,
              URL: item.URL,
              repository: item.DOI
            };
          })
        }
      ]
    },
    // lab materials
    {
      sheet: { id: sheetId, name: sheetName },
      row: { min: 74, max: 74, insert: 74 },
      cells: [],
      params: {
        noDataRow: { min: 75, max: 77, display: conf.settings.displayNoDataSection[`HHMI`].materials }
      },
      fn: function (batch) {
        let link = `#gid=${sheetId}&range=B${batch.row.insert}`;
        let label = `Lab Materials`;
        return Self.buildRequestUpdateCell(`'${sheetName}'!F17`, [`=LIEN_HYPERTEXTE("${link}", "${label}")`]);
      },
      data: [
        {
          merges: [
            { begin: 2, end: 5 },
            { begin: 13, end: 15 }
          ],
          row: { min: 78, max: 82, insert: 80 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `H`, property: `source` },
            { column: `I`, property: `catalog` },
            { column: `J`, property: `RRID` },
            { column: `K`, property: `datatype` },
            { column: `L`, property: `suggestedEntity` },
            { column: `M`, property: `suggestedRRID` },
            { column: `N`, property: `notes` }
          ],
          // Assign RRID and cite in text
          data: materials[0].map(function (item) {
            return {
              reuse: item.reuse,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`HHMI`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              repository: item.DOI,
              datatype: item.type.url ? `=LIEN_HYPERTEXTE("${item.type.url}";"${item.type.label}")` : item.type.label,
              source: item.source,
              RRID: item.RRID,
              suggestedEntity: item.suggestedEntity,
              catalog: item.catalogNumber,
              suggestedRRID: item.suggestedRRID
            };
          })
        },
        {
          merges: [
            { begin: 2, end: 5 },
            { begin: 13, end: 15 }
          ],
          row: { min: 83, max: 88, insert: 85 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `H`, property: `source` },
            { column: `I`, property: `catalog` },
            { column: `J`, property: `RRID` },
            { column: `K`, property: `datatype` },
            { column: `L`, property: `suggestedEntity` },
            { column: `M`, property: `suggestedRRID` },
            { column: `N`, property: `notes` }
          ],
          // Check for an existing RRID
          data: materials[1].map(function (item) {
            return {
              reuse: item.reuse,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`HHMI`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              repository: item.DOI,
              datatype: item.type.url ? `=LIEN_HYPERTEXTE("${item.type.url}";"${item.type.label}")` : item.type.label,
              source: item.source,
              RRID: item.RRID,
              suggestedEntity: item.suggestedEntity,
              catalog: item.catalogNumber,
              suggestedRRID: item.suggestedRRID
            };
          })
        }
      ]
    },
    // software
    {
      sheet: { id: sheetId, name: sheetName },
      row: { min: 59, max: 59, insert: 59 },
      cells: [],
      params: {
        noDataRow: { min: 60, max: 62, display: conf.settings.displayNoDataSection[`HHMI`].software }
      },
      fn: function (batch) {
        let link = `#gid=${sheetId}&range=B${batch.row.insert}`;
        let label = `Software`;
        return Self.buildRequestUpdateCell(`'${sheetName}'!F16`, [`=LIEN_HYPERTEXTE("${link}", "${label}")`]);
      },
      data: [
        {
          merges: [
            { begin: 2, end: 4 },
            { begin: 7, end: 9 },
            { begin: 13, end: 15 }
          ],
          row: { min: 63, max: 67, insert: 65 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `version` },
            { column: `E`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `H`, property: `URL` },
            { column: `J`, property: `RRID` },
            { column: `K`, property: `suggestedEntity` },
            { column: `L`, property: `suggestedRRID` },
            { column: `M`, property: `suggestedURL` },
            { column: `N`, property: `notes` }
          ],
          // Include missing information in citation
          data: software[0].map(function (item) {
            return {
              reuse: item.reuse,
              version: item.version,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`HHMI`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              URL: item.URL,
              RRID: item.RRID,
              suggestedEntity: item.suggestedEntity,
              suggestedRRID: item.suggestedRRID,
              suggestedURL: item.suggestedURL,
              notes: item.comments
            };
          })
        },
        {
          merges: [
            { begin: 2, end: 4 },
            { begin: 7, end: 9 },
            { begin: 13, end: 15 }
          ],
          row: { min: 68, max: 73, insert: 70 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `version` },
            { column: `E`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `H`, property: `URL` },
            { column: `J`, property: `RRID` },
            { column: `K`, property: `suggestedEntity` },
            { column: `L`, property: `suggestedRRID` },
            { column: `M`, property: `suggestedURL` },
            { column: `N`, property: `notes` }
          ],
          // Verify citation
          data: software[1].map(function (item) {
            return {
              reuse: item.reuse,
              version: item.version,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`HHMI`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              URL: item.URL,
              RRID: item.RRID,
              suggestedEntity: item.suggestedEntity,
              suggestedRRID: item.suggestedRRID,
              suggestedURL: item.suggestedURL,
              notes: item.comments
            };
          })
        }
      ]
    },
    // code
    {
      sheet: { id: sheetId, name: sheetName },
      row: { min: 44, max: 44, insert: 44 },
      cells: [],
      params: {
        noDataRow: { min: 45, max: 47, display: conf.settings.displayNoDataSection[`HHMI`].code }
      },
      fn: function (batch) {
        let link = `#gid=${sheetId}&range=B${batch.row.insert}`;
        let label = `Code`;
        return Self.buildRequestUpdateCell(`'${sheetName}'!F15`, [`=LIEN_HYPERTEXTE("${link}", "${label}")`]);
      },
      data: [
        {
          merges: [
            { begin: 1, end: 5 },
            { begin: 7, end: 9 },
            { begin: 9, end: 11 },
            { begin: 11, end: 15 }
          ],
          row: { min: 48, max: 52, insert: 50 },
          cells: [
            { column: `B`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `H`, property: `URL` },
            { column: `J`, property: `DOI` },
            { column: `L`, property: `notes` }
          ],
          // Upload code to Zenodo and provide DOI
          data: code[0].map(function (item) {
            return {
              reuse: item.reuse,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`HHMI`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              DOI: item.DOI,
              URL: item.URL
            };
          })
        },
        {
          merges: [
            { begin: 1, end: 5 },
            { begin: 7, end: 9 },
            { begin: 9, end: 11 },
            { begin: 11, end: 15 }
          ],
          row: { min: 53, max: 58, insert: 55 },
          cells: [
            { column: `B`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `H`, property: `URL` },
            { column: `J`, property: `DOI` },
            { column: `L`, property: `notes` }
          ],
          // Verify citation
          data: code[1].map(function (item) {
            return {
              reuse: item.reuse,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`HHMI`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              DOI: item.DOI,
              URL: item.URL
            };
          })
        }
      ]
    },
    // datasets
    {
      sheet: { id: sheetId, name: sheetName },
      row: { min: 23, max: 23, insert: 23 },
      cells: [],
      params: {
        noDataRow: { min: 24, max: 26, display: conf.settings.displayNoDataSection[`HHMI`].datasets }
      },
      fn: function (batch) {
        let link = `#gid=${sheetId}&range=B${batch.row.insert}`;
        let label = `Datasets`;
        return Self.buildRequestUpdateCell(`'${sheetName}'!F14`, [`=LIEN_HYPERTEXTE("${link}", "${label}")`]);
      },
      data: [
        {
          merges: [
            { begin: 7, end: 9 },
            { begin: 12, end: 15 }
          ],
          row: { min: 27, max: 31, insert: 29 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `qc` },
            { column: `D`, property: `representativeImage` },
            { column: `E`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `H`, property: `repository` },
            { column: `J`, property: `uniqueIdentifier` },
            { column: `K`, property: `datatype` },
            { column: `L`, property: `figureOrTable` },
            { column: `M`, property: `notes` }
          ],
          // Deposit to appropriate repository and cite PID in text
          data: datasets[0].map(function (item) {
            return {
              reuse: item.reuse,
              qc: item.qc,
              representativeImage: item.representativeImage,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`HHMI`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              figureOrTable: item.associatedFigureOrTable,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              repository: item.URL,
              uniqueIdentifier: item.PID,
              datatype:
                item.type && item.type.url
                  ? `=LIEN_HYPERTEXTE("${item.type.url}";"${item.type.label}")`
                  : item.type.label
            };
          })
        },
        {
          merges: [
            { begin: 7, end: 9 },
            { begin: 12, end: 15 }
          ],
          row: { min: 32, max: 36, insert: 34 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `qc` },
            { column: `D`, property: `representativeImage` },
            { column: `E`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `H`, property: `repository` },
            { column: `J`, property: `uniqueIdentifier` },
            { column: `K`, property: `datatype` },
            { column: `L`, property: `figureOrTable` },
            { column: `M`, property: `notes` }
          ],
          // Cite dataset unique identifier in text
          data: datasets[1].map(function (item) {
            return {
              reuse: item.reuse,
              qc: item.qc,
              representativeImage: item.representativeImage,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`HHMI`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              notes: item.comments,
              figureOrTable: item.associatedFigureOrTable,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              repository: item.URL,
              uniqueIdentifier: item.PID,
              datatype:
                item.type && item.type.url
                  ? `=LIEN_HYPERTEXTE("${item.type.url}";"${item.type.label}")`
                  : item.type.label
            };
          })
        },
        {
          merges: [
            { begin: 7, end: 9 },
            { begin: 12, end: 15 }
          ],
          row: { min: 37, max: 43, insert: 40 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `qc` },
            { column: `D`, property: `representativeImage` },
            { column: `E`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `H`, property: `repository` },
            { column: `J`, property: `uniqueIdentifier` },
            { column: `K`, property: `datatype` },
            { column: `L`, property: `figureOrTable` },
            { column: `M`, property: `notes` }
          ],
          // Cite dataset unique identifier in text
          data: datasets[2].map(function (item) {
            return {
              reuse: item.reuse,
              qc: item.qc,
              representativeImage: item.representativeImage,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`HHMI`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              notes: item.comments,
              figureOrTable: item.associatedFigureOrTable,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              repository: item.URL,
              uniqueIdentifier: item.PID,
              datatype:
                item.type && item.type.url
                  ? `=LIEN_HYPERTEXTE("${item.type.url}";"${item.type.label}")`
                  : item.type.label
            };
          })
        }
      ]
    }
  ];
  return async.mapSeries(
    batches,
    function (batch, _next) {
      // Is there data in this bulk of data
      let noData = batch.data.reduce(function (acc, item) {
        return acc && item.data.length === 0;
      }, true);
      let actions = [
        // Insert rows
        function (n) {
          let requests = [];
          let offset = 0;
          // if there is data or noDataRow should not be displayed, delete the "noDataRow"
          if ((!noData && batch.params.noDataRow) || !batch.params.noDataRow.display) {
            requests.push(
              Self.buildRequestDeleteRows(batch.sheet.id, batch.params.noDataRow.min - 1, batch.params.noDataRow.max)
            );
            offset -= batch.params.noDataRow.max - batch.params.noDataRow.min + 1;
          }
          // Copy/Paste template if necessary
          if (typeof batch.copyPaste === `object`) {
            let delta = batch.copyPaste.row.end - batch.copyPaste.row.begin + 1;
            offset += delta;
            requests.push(
              Self.buildRequestInsertRows(sheetId, batch.copyPaste.row.end, batch.copyPaste.row.end + delta + 1, false)
            );
            requests.push(
              Self.buildRequestCopyPaste(
                {
                  sheetId: sheetId,
                  startRowIndex: batch.copyPaste.row.begin,
                  endRowIndex: batch.copyPaste.row.end,
                  startColumnIndex: batch.copyPaste.column.begin,
                  endColumnIndex: batch.copyPaste.column.end
                },
                {
                  sheetId: sheetId,
                  startRowIndex: batch.copyPaste.row.begin + delta,
                  endRowIndex: batch.copyPaste.row.end + delta,
                  startColumnIndex: batch.copyPaste.column.begin,
                  endColumnIndex: batch.copyPaste.column.end
                }
              )
            );
            batch.row.min += offset;
            batch.row.max += offset;
            batch.row.insert += offset;
          }
          // insert rows if necessary
          for (let i = batch.data.length - 1; i >= 0; i--) {
            batch.data[i].row.min += offset;
            batch.data[i].row.insert += offset;
            batch.data[i].row.max += offset;
            // if there is data in this bulk of data
            if (batch.data[i].data.length > 0) {
              // insert row(s)
              requests.push(
                Self.buildRequestInsertRows(
                  sheetId,
                  batch.data[i].row.insert,
                  batch.data[i].row.insert + batch.data[i].data.length - 1,
                  true
                )
              );
              // merge cells
              for (let j = 0; j < batch.data[i].merges.length; j++) {
                let merge = batch.data[i].merges[j];
                requests.push(
                  Self.buildRequestMergeCells(
                    sheetId,
                    batch.data[i].row.insert,
                    batch.data[i].row.insert + batch.data[i].data.length - 1,
                    merge.begin,
                    merge.end
                  )
                );
              }
              // update borders
              requests.push(
                Self.buildRequestUpdateBorders(
                  sheetId,
                  batch.data[i].row.insert,
                  batch.data[i].row.insert + batch.data[i].data.length - 1,
                  0,
                  15
                )
              );
            }
            // delete row(s) if necessary
            else {
              requests.push(Self.buildRequestDeleteRows(sheetId, batch.data[i].row.min - 1, batch.data[i].row.max));
            }
          }
          // if there is no data at all, delete head row(s)
          if (noData && !batch.params.noDataRow.display)
            requests.push(Self.buildRequestDeleteRows(sheetId, batch.row.min - 1, batch.row.max));
          if (requests.length <= 0) return n();
          return gSheets.spreadsheets.batchUpdate(
            {
              // The ID of the spreadsheet to update.
              spreadsheetId: spreadsheetId,
              // Request body metadata
              requestBody: {
                includeSpreadsheetInResponse: false,
                responseIncludeGridData: false,
                // request body parameters
                requests: requests
              }
            },
            function (err, res) {
              setTimeout(function () {
                // process err or result here
                return n(err);
              }, conf.settings.googleAPI[`HHMI`].timeout);
            }
          );
        },
        // Update cells & Add data validations
        function (n) {
          let data = [];
          let offset = 0;
          // Copy/Paste template if necessary
          if (batch.copyPaste) {
            let delta = batch.copyPaste.row.end - batch.copyPaste.row.begin + 1;
            offset += delta;
          }
          let begin = batch.row.min;
          let end = batch.row.max;
          // fill rows if necessary
          if (typeof batch.fn === `function`) data.push(batch.fn(batch));
          for (let i = 0; i < batch.data.length; i++) {
            // if there is data in this bulk of data
            if (batch.data[i].data.length > 0) {
              batch.data[i].row.max += batch.data[i].data.length - 1;
              end += batch.data[i].row.max;
              // update row property of all the next items
              if (typeof batch.data[i + 1] !== `undefined`) {
                let d = batch.data[i].data.length - 1; // -1 because there is one line by default
                for (let j = i + 1; j < batch.data.length; j++) {
                  batch.data[j].row.min += d;
                  batch.data[j].row.insert += d;
                  batch.data[j].row.max += d;
                }
              }
              // fill row(s)
              for (let j = 0; j < batch.data[i].data.length; j++) {
                let item = batch.data[i].data[j];
                let rowIndex = batch.data[i].row.insert + j;
                data.push(Self.buildRequestUpdateCell(`'${sheetName}'!A${rowIndex}`, [j + 1]));
                for (let k = 0; k < batch.data[i].cells.length; k++) {
                  let info = batch.data[i].cells[k];
                  data.push(
                    Self.buildRequestUpdateCell(`'${sheetName}'!${info.column}${rowIndex}`, [item[info.property]])
                  );
                }
              }
            } else {
              // update row property of all the next items
              let d = batch.data[i].row.max - batch.data[i].row.min + 1;
              for (let j = i + 1; j < batch.data.length; j++) {
                batch.data[j].row.min -= d;
                batch.data[j].row.insert -= d;
                batch.data[j].row.max -= d;
              }
            }
          }
          // if there is data fill head row(s)
          if (batch.cells.length > 0 && batch.row.insert) {
            for (let i = 0; i < batch.cells.length; i++) {
              let rowIndex = batch.row.insert;
              let info = batch.cells[i];
              data.push(Self.buildRequestUpdateCell(`'${sheetName}'!${info.column}${rowIndex}`, [info.value]));
            }
          }
          if (data.length <= 0) return n();
          return gSheets.spreadsheets.values.batchUpdate(
            {
              // The ID of the spreadsheet to update.
              spreadsheetId: spreadsheetId,
              // Request body metadata
              requestBody: {
                // request body parameters
                data: data,
                valueInputOption: `USER_ENTERED`
              }
            },
            function (err, res) {
              setTimeout(function () {
                // process err or result here
                return n(err);
              }, conf.settings.googleAPI[`HHMI`].timeout);
            }
          );
        }
      ];
      return async.mapSeries(
        actions,
        function (action, next) {
          return action(function (err) {
            return next(err);
          });
        },
        function (err) {
          return _next(err);
        }
      );
    },
    function (err) {
      return cb(err);
    }
  );
};

/**
 * This function will fill 'Open Science Indicator Summary' part of the report with given data and return the file ID (google file ID)
 * @param {object} opts - Options available
 * @param {string} opts.spreadsheetId - spreadsheetId
 * @param {object} opts.sheetId - sheetId
 * @param {object} opts.sheetName - sheetName
 * @param {object} opts.data - Data available
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR undefined)
 * @returns {undefined} undefined
 */
Self.fillOpenScienceIndicatorSummaryHHMIPart = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `spreadsheetId`) === `undefined`)
    return cb(Error(`Missing required data: opts.spreadsheetId`));
  if (typeof _.get(opts, `sheetId`) === `undefined`) return cb(Error(`Missing required data: opts.sheetId`));
  let spreadsheetId = _.get(opts, `spreadsheetId`);
  let sheetId = _.get(opts, `sheetId`);
  let sheetName = _.get(opts, `sheetName`);
  let data = _.get(opts, `data`, {});
  let documentId = _.get(data, `documentId`);
  let documentToken = _.get(data, `documentToken`);
  let OSIS = _.get(data, `OSIS`);

  let actions = [
    // Update cells & Add data validations
    function (next) {
      if (!conf.settings.OSIS[`HHMI`]) return next();
      let data = [
        Self.buildRequestUpdateCell(`'${sheetName}'!G14`, [OSIS.datasets.newShared]),
        Self.buildRequestUpdateCell(`'${sheetName}'!H14`, [OSIS.datasets.newNotShared]),
        Self.buildRequestUpdateCell(`'${sheetName}'!I14`, [OSIS.datasets.reuseCited]),
        Self.buildRequestUpdateCell(`'${sheetName}'!J14`, [OSIS.datasets.reuseNotCited]),
        Self.buildRequestUpdateCell(`'${sheetName}'!G15`, [OSIS.code.newShared]),
        Self.buildRequestUpdateCell(`'${sheetName}'!H15`, [OSIS.code.newNotShared]),
        Self.buildRequestUpdateCell(`'${sheetName}'!I15`, [OSIS.code.reuseCited]),
        Self.buildRequestUpdateCell(`'${sheetName}'!J15`, [OSIS.code.reuseNotCited]),
        Self.buildRequestUpdateCell(`'${sheetName}'!G16`, [OSIS.software.newShared]),
        Self.buildRequestUpdateCell(`'${sheetName}'!H16`, [OSIS.software.newNotShared]),
        Self.buildRequestUpdateCell(`'${sheetName}'!I16`, [OSIS.software.reuseCited]),
        Self.buildRequestUpdateCell(`'${sheetName}'!J16`, [OSIS.software.reuseNotCited]),
        Self.buildRequestUpdateCell(`'${sheetName}'!G17`, [OSIS.labMaterials.newShared]),
        Self.buildRequestUpdateCell(`'${sheetName}'!H17`, [OSIS.labMaterials.newNotShared]),
        Self.buildRequestUpdateCell(`'${sheetName}'!I17`, [OSIS.labMaterials.reuseCited]),
        Self.buildRequestUpdateCell(`'${sheetName}'!J17`, [OSIS.labMaterials.reuseNotCited]),
        Self.buildRequestUpdateCell(`'${sheetName}'!G18`, [OSIS.protocols.newShared]),
        Self.buildRequestUpdateCell(`'${sheetName}'!H18`, [OSIS.protocols.newNotShared]),
        Self.buildRequestUpdateCell(`'${sheetName}'!I18`, [OSIS.protocols.reuseCited]),
        Self.buildRequestUpdateCell(`'${sheetName}'!J18`, [OSIS.protocols.reuseNotCited])
      ];
      return gSheets.spreadsheets.values.batchUpdate(
        {
          // The ID of the spreadsheet to update.
          spreadsheetId: spreadsheetId,
          // Request body metadata
          requestBody: {
            // request body parameters
            data: data,
            valueInputOption: `USER_ENTERED`
          }
        },
        function (err, res) {
          return next(err);
        }
      );
    }
  ];
  return async.mapSeries(
    actions,
    function (action, next) {
      return action(function (err) {
        return next(err);
      });
    },
    function (err) {
      return cb(err);
    }
  );
};

/**
 * This function will fill Authors and Affiliation Report part with given data and return the file ID (google file ID)
 * @param {object} opts - Options available
 * @param {string} opts.spreadsheetId - spreadsheetId
 * @param {object} opts.sheetId - sheetId
 * @param {object} opts.sheetName - sheetName
 * @param {object} opts.data - Data available
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR undefined)
 * @returns {undefined} undefined
 */
Self.fillAuthorsAndAffiliationHHMIPart = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `spreadsheetId`) === `undefined`)
    return cb(Error(`Missing required data: opts.spreadsheetId`));
  if (typeof _.get(opts, `sheetId`) === `undefined`) return cb(Error(`Missing required data: opts.sheetId`));
  let spreadsheetId = _.get(opts, `spreadsheetId`);
  let sheetId = _.get(opts, `sheetId`);
  let sheetName = _.get(opts, `sheetName`);
  let data = _.get(opts, `data`, {});
  let authors = _.get(data, `authors`);
  let begin = 108;
  let actions = [
    // Insert or delete rows
    function (next) {
      let requests = [];
      if (conf.settings.authors[`HHMI`]) {
        // Lab Materials
        requests.push(Self.buildRequestInsertRows(sheetId, begin, begin + 1 + authors.length - 1, true));
        requests.push(Self.buildRequestMergeCells(sheetId, begin, begin + 1 + authors.length - 1, 2, 6));
        requests.push(Self.buildRequestMergeCells(sheetId, begin, begin + 1 + authors.length - 1, 6, 9));
        requests.push(Self.buildRequestMergeCells(sheetId, begin, begin + 1 + authors.length - 1, 9, 12));
        requests.push(Self.buildRequestUpdateBorders(sheetId, begin, begin + 1 + authors.length - 1, 2, 12));
      } else {
        requests.push(Self.buildRequestDeleteRows(sheetId, begin - 5));
      }
      return gSheets.spreadsheets.batchUpdate(
        {
          // The ID of the spreadsheet to update.
          spreadsheetId: spreadsheetId,
          // Request body metadata
          requestBody: {
            includeSpreadsheetInResponse: false,
            responseIncludeGridData: false,
            // request body parameters
            requests: requests
          }
        },
        function (err, res) {
          return next(err);
        }
      );
    },
    // Update cells & Add data validations
    function (next) {
      if (!conf.settings.authors[`HHMI`]) return next();
      let data = [];
      let offset = begin;
      for (let i = 0; i < authors.length; i++) {
        let rowIndex = begin + i;
        let orcidsFromAPI = _.get(authors[i], `orcid.fromAPI`, [])
          .slice(0, 20)
          .filter(function (item) {
            return !!item[`orcid-id`];
          })
          .map(function (item) {
            return item[`orcid-id`];
          })
          .join(`, `);
        let orcidsFromTEI = _.get(authors[i], `orcid.fromTEI`, []).join(`, `);
        let orcid = _.get(authors[i], `orcid.currentValue`, ``);
        data.push(Self.buildRequestUpdateCell(`'${sheetName}'!C${rowIndex}`, [authors[i].name]));
        data.push(
          Self.buildRequestUpdateCell(`'${sheetName}'!G${rowIndex}`, [
            orcid ? orcid : orcidsFromTEI ? orcidsFromTEI : ``
          ])
        );
        data.push(
          Self.buildRequestUpdateCell(`'${sheetName}'!J${rowIndex}`, [
            authors[i].orcid.suggestedValues.length ? authors[i].orcid.suggestedValues.join(`, `) : `Not Found`
          ])
        );
      }
      return gSheets.spreadsheets.values.batchUpdate(
        {
          // The ID of the spreadsheet to update.
          spreadsheetId: spreadsheetId,
          // Request body metadata
          requestBody: {
            // request body parameters
            data: data,
            valueInputOption: `USER_ENTERED`
          }
        },
        function (err, res) {
          return next(err);
        }
      );
    }
  ];
  return async.mapSeries(
    actions,
    function (action, next) {
      return action(function (err) {
        return next(err);
      });
    },
    function (err) {
      return cb(err);
    }
  );
};

/**
 * This function will fill summary part with given data and return the file ID (google file ID)
 * @param {object} opts - Options available
 * @param {string} opts.spreadsheetId - spreadsheetId
 * @param {object} opts.sheetId - sheetId
 * @param {object} opts.sheetName - sheetName
 * @param {object} opts.data - Data available
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR undefined)
 * @returns {undefined} undefined
 */
Self.fillSummaryHHMIPart = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `spreadsheetId`) === `undefined`)
    return cb(Error(`Missing required data: opts.spreadsheetId`));
  if (typeof _.get(opts, `sheetId`) === `undefined`) return cb(Error(`Missing required data: opts.sheetId`));
  let spreadsheetId = _.get(opts, `spreadsheetId`);
  let sheetId = _.get(opts, `sheetId`);
  let sheetName = _.get(opts, `sheetName`);
  let data = _.get(opts, `data`, {});
  let article = _.get(data, `article`, {});
  let DAS = _.get(data, `DAS`, {});
  let authors = _.get(data, `authors`, []);
  let preprint = _.get(data, `preprint`, []);
  let documentId = _.get(data, `documentId`);
  let documentToken = _.get(data, `documentToken`);
  let dataSeerLink = _.get(data, `dataSeerLink`, {});
  let authorsNames = authors
    .map(function (item) {
      return item.name;
    })
    .join(`, `);
  let actions = [
    // Update cells & Add data validations
    function (next) {
      let date = new Date();
      let data = [
        Self.buildRequestUpdateCell(`'${sheetName}'!F3`, [article.title]),
        Self.buildRequestUpdateCell(`'${sheetName}'!F4`, [authorsNames]),
        Self.buildRequestUpdateCell(`'${sheetName}'!F5`, [
          `=LIEN_HYPERTEXTE("${article.URL.url}";"${article.URL.url}")`
        ]),
        Self.buildRequestUpdateCell(`'${sheetName}'!F6`, [
          `=LIEN_HYPERTEXTE("${dataSeerLink.url}";"${dataSeerLink.label}")`
        ]),
        Self.buildRequestUpdateCell(`'${sheetName}'!F7`, [`=LIEN_HYPERTEXTE("${preprint.DOI}";"${preprint.DOI}")`]),
        Self.buildRequestUpdateCell(`'${sheetName}'!F8`, [
          `=LIEN_HYPERTEXTE("${preprint.URL.url}";"${preprint.URL.label}")`
        ]),
        Self.buildRequestUpdateCell(`'${sheetName}'!F9`, [
          `=DATE(${date.getFullYear()};${date.getMonth() + 1};${date.getDate()})`
        ]),
        Self.buildRequestUpdateCell(`'${sheetName}'!F10`, [DAS])
      ];
      return gSheets.spreadsheets.values.batchUpdate(
        {
          // The ID of the spreadsheet to update.
          spreadsheetId: spreadsheetId,
          // Request body metadata
          requestBody: {
            // request body parameters
            data: data,
            valueInputOption: `USER_ENTERED`
          }
        },
        function (err, res) {
          return next(err);
        }
      );
    }
  ];
  return async.mapSeries(
    actions,
    function (action, next) {
      return action(function (err) {
        return next(err);
      });
    },
    function (err) {
      return cb(err);
    }
  );
};

/**
 * This function will fill Universal Journal Report report with given data and return the file ID (google file ID)
 * @param {object} opts - Options available
 * @param {string} opts.spreadsheetId - spreadsheetId
 * @param {object} opts.data - Data available
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR undefined)
 * @returns {undefined} undefined
 */
Self.insertDataInUniversalJournalReportSheets = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `spreadsheetId`) === `undefined`)
    return cb(Error(`Missing required data: opts.spreadsheetId`));
  let spreadsheetId = _.get(opts, `spreadsheetId`);
  let data = _.get(opts, `data`, {});
  let doc = _.get(data, `document`, {});
  let metadata = _.get(data, `metadata`, {});
  let code = _.get(data, `code`, {});
  let software = _.get(data, `software`, {});
  let datasets = _.get(data, `datasets`, {});
  let summary = _.get(data, `summary`, {});
  return Self.getSheets({ spreadsheetId: spreadsheetId }, function (err, sheets) {
    let detailedReportSheetId = Self.getSheetId(sheets, `Compliance Report`);
    let actions = [
      // fill 'Compliance Report'
      function (next) {
        if (detailedReportSheetId instanceof Error) return next(detailedReportSheetId);
        return Self.fillComplianceReportUniversalJournalReportSheet(
          {
            spreadsheetId: spreadsheetId,
            sheetId: detailedReportSheetId,
            data: {
              documentId: doc.id,
              documentToken: doc.token,
              metadata: {
                DAS: metadata.DAS,
                readmeIncluded: metadata.readmeIncluded,
                describesFiles: metadata.describesFiles,
                describesVariables: metadata.describesVariables,
                articleTitle: metadata.articleTitle,
                manuscriptNumber: metadata.manuscript_id,
                authors: metadata.authors
                  .map(function (item) {
                    return item.name;
                  })
                  .join(`, `),
                dataSeerLink: metadata.dataSeerLink
              },

              summary: summary,
              datasets: datasets,
              code: code,
              software: software
            }
          },
          function (err, res) {
            return next(err);
          }
        );
      }
    ];
    return async.mapSeries(
      actions,
      function (action, next) {
        return action(function (err) {
          return next(err);
        });
      },
      function (err) {
        return cb(err);
      }
    );
  });
};

/**
 * This function will fill Compliance Report sheet with given data and return the file ID (google file ID)
 * @param {object} opts - Options available
 * @param {string} opts.spreadsheetId - spreadsheetId
 * @param {object} opts.sheetId - sheetId
 * @param {object} opts.data - Data available
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR undefined)
 * @returns {undefined} undefined
 */
Self.fillComplianceReportUniversalJournalReportSheet = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `spreadsheetId`) === `undefined`)
    return cb(Error(`Missing required data: opts.spreadsheetId`));
  if (typeof _.get(opts, `sheetId`) === `undefined`) return cb(Error(`Missing required data: opts.sheetId`));
  let spreadsheetId = _.get(opts, `spreadsheetId`);
  let sheetId = _.get(opts, `sheetId`);
  let data = _.get(opts, `data`, {});
  let metadata = _.get(data, `metadata`, {});
  let articleTitle = _.get(metadata, `articleTitle`, {});
  let doi = _.get(metadata, `doi`, ``);
  let authors = _.get(metadata, `authors`, ``);
  let summary = _.get(data, `summary`, {});
  let code = _.get(data, `code`, []);
  let software = _.get(data, `software`, []);
  let datasets = _.get(data, `datasets`, []);
  let documentId = _.get(data, `documentId`);
  let documentToken = _.get(data, `documentToken`);
  let sortedDatasets = {};
  // Regroup datasets by datatype
  for (let i = 0; i < datasets.length; i++) {
    let dataset = datasets[i];
    if (typeof sortedDatasets[dataset.type.dataType] === `undefined`)
      sortedDatasets[dataset.type.dataType] = { name: dataset.type.dataType, list: [] };
    sortedDatasets[dataset.type.dataType].list.push(dataset);
  }
  // Compute batches commands
  let batches = [
    // software
    {
      row: { min: 29, max: 29 },
      cells: [],
      data: [
        {
          merges: [{ begin: 0, end: 2 }],
          row: { min: 29, max: 32, insert: 31 },
          cells: [
            { column: `C`, property: `name` },
            { column: `D`, property: `version` },
            { column: `E`, property: `sentences` },
            { column: `F`, property: `URL` },
            { column: `G`, property: `identifier` },
            { column: `H`, property: `notes` }
          ],
          data: software.map(function (item) {
            return {
              reuse: item.reuse,
              name: conf.settings.dataObjectsLinks[`Universal Journal Report`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              version: item.version,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              URL: item.URL,
              identifier: item.RRID,
              notes: item.comments
            };
          })
        }
      ]
    },
    // code
    {
      row: { min: 24, max: 24 },
      cells: [],
      data: [
        {
          merges: [
            { begin: 0, end: 2 },
            { begin: 2, end: 4 }
          ],
          row: { min: 24, max: 27, insert: 26 },
          cells: [
            { column: `C`, property: `name` },
            { column: `E`, property: `sentences` },
            { column: `F`, property: `repository` },
            { column: `G`, property: `identifier` },
            { column: `H`, property: `notes` }
          ],
          data: code.map(function (item) {
            return {
              reuse: item.reuse,
              name: conf.settings.dataObjectsLinks[`Universal Journal Report`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              repository: item.URL,
              identifier: item.DOI,
              notes: item.comments
            };
          })
        }
      ]
    }
  ];
  let keys = Object.keys(sortedDatasets);
  // Build batch objects for datasets
  for (let i = 0; i < keys.length; i++) {
    let key = keys[i];
    let datatype = sortedDatasets[key].name;
    // Do not copy pas the last iteration
    let copyPaste =
      i < keys.length - 1
        ? {
          row: {
            begin: 17,
            end: 22
          },
          column: {
            begin: 0,
            end: 8
          }
        }
        : undefined;
    batches.push({
      copyPaste: copyPaste,
      row: { min: 18, max: 18, insert: 18 },
      cells: [
        {
          column: `C`,
          value: datatype
        }
      ],
      data: [
        {
          merges: [{ begin: 2, end: 4 }],
          row: { min: 18, max: 21, insert: 20 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `name` },
            { column: `E`, property: `sentences` },
            { column: `F`, property: `repository` },
            { column: `G`, property: `identifier` },
            { column: `H`, property: `notes` }
          ],
          data: sortedDatasets[key].list
            .filter(function (item) {
              return true;
            })
            .map(function (item) {
              return {
                reuse: item.reuse,
                name: conf.settings.dataObjectsLinks[`Universal Journal Report`]
                  ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                  : item.name,
                sentences: item.sentences
                  .map(function (s) {
                    return s.text;
                  })
                  .join(` `),
                repository: item.URL,
                identifier: item.PID,
                notes: item.comments
              };
            })
        }
      ]
    });
  }
  return async.mapSeries(
    batches,
    function (batch, _next) {
      // Is there data in this bulk of data
      let noData = batch.data.reduce(function (acc, item) {
        return acc && item.data.length === 0;
      }, true);
      let actions = [
        // Insert rows
        function (n) {
          let requests = [];
          let offset = 0;
          // Copy/Paste template if necessary
          if (typeof batch.copyPaste === `object`) {
            let delta = batch.copyPaste.row.end - batch.copyPaste.row.begin + 1;
            offset += delta;
            requests.push(
              Self.buildRequestInsertRows(sheetId, batch.copyPaste.row.end, batch.copyPaste.row.end + delta + 1, false)
            );
            requests.push(
              Self.buildRequestCopyPaste(
                {
                  sheetId: sheetId,
                  startRowIndex: batch.copyPaste.row.begin,
                  endRowIndex: batch.copyPaste.row.end,
                  startColumnIndex: batch.copyPaste.column.begin,
                  endColumnIndex: batch.copyPaste.column.end
                },
                {
                  sheetId: sheetId,
                  startRowIndex: batch.copyPaste.row.begin + delta,
                  endRowIndex: batch.copyPaste.row.end + delta,
                  startColumnIndex: batch.copyPaste.column.begin,
                  endColumnIndex: batch.copyPaste.column.end
                }
              )
            );
            batch.row.min += offset;
            batch.row.max += offset;
            batch.row.insert += offset;
          }
          // insert rows if necessary
          for (let i = batch.data.length - 1; i >= 0; i--) {
            batch.data[i].row.min += offset;
            batch.data[i].row.insert += offset;
            batch.data[i].row.max += offset;
            if (batch.data[i].data.length > 0) {
              // insert row(s)
              requests.push(
                Self.buildRequestInsertRows(
                  sheetId,
                  batch.data[i].row.insert,
                  batch.data[i].row.insert + batch.data[i].data.length - 1,
                  true
                )
              );
              // merge cells
              for (let j = 0; j < batch.data[i].merges.length; j++) {
                let merge = batch.data[i].merges[j];
                requests.push(
                  Self.buildRequestMergeCells(
                    sheetId,
                    batch.data[i].row.insert,
                    batch.data[i].row.insert + batch.data[i].data.length - 1,
                    merge.begin,
                    merge.end
                  )
                );
              }
              // update borders
              requests.push(
                Self.buildRequestUpdateBorders(
                  sheetId,
                  batch.data[i].row.insert,
                  batch.data[i].row.insert + batch.data[i].data.length - 1,
                  0,
                  8
                )
              );
            }
            // delete row(s) if necessary
            else {
              requests.push(Self.buildRequestDeleteRows(sheetId, batch.data[i].row.min - 1, batch.data[i].row.max));
            }
          }
          // if there is no data at all, delete head row(s)
          if (noData) requests.push(Self.buildRequestDeleteRows(sheetId, batch.row.min - 1, batch.row.max));
          if (requests.length <= 0) return n();
          return gSheets.spreadsheets.batchUpdate(
            {
              // The ID of the spreadsheet to update.
              spreadsheetId: spreadsheetId,
              // Request body metadata
              requestBody: {
                includeSpreadsheetInResponse: false,
                responseIncludeGridData: false,
                // request body parameters
                requests: requests
              }
            },
            function (err, res) {
              setTimeout(function () {
                // process err or result here
                return n(err);
              }, conf.settings.googleAPI[`Universal Journal Report`].timeout);
            }
          );
        },
        // Update cells & Add data validations
        function (n) {
          let data = [];
          let offset = 0;
          // Copy/Paste template if necessary
          if (batch.copyPaste) {
            let delta = batch.copyPaste.row.end - batch.copyPaste.row.begin + 1;
            offset += delta;
          }
          let begin = batch.row.min;
          let end = batch.row.max;
          // fill rows if necessary
          for (let i = 0; i < batch.data.length; i++) {
            // if there is data in this bulk of data
            if (batch.data[i].data.length > 0) {
              batch.data[i].row.max += batch.data[i].data.length - 1;
              end += batch.data[i].row.max;
              // update row property of all the next items
              if (typeof batch.data[i + 1] !== `undefined`) {
                let d = batch.data[i].data.length - 1; // -1 because there is one line by default
                for (let j = i + 1; j < batch.data.length; j++) {
                  batch.data[j].row.min += d;
                  batch.data[j].row.insert += d;
                  batch.data[j].row.max += d;
                }
              }
              // fill row(s)
              for (let j = 0; j < batch.data[i].data.length; j++) {
                let item = batch.data[i].data[j];
                let rowIndex = batch.data[i].row.insert + j;
                data.push(Self.buildRequestUpdateCell(`'Compliance Report'!A${rowIndex}`, [j + 1]));
                for (let k = 0; k < batch.data[i].cells.length; k++) {
                  let info = batch.data[i].cells[k];
                  data.push(
                    Self.buildRequestUpdateCell(`'Compliance Report'!${info.column}${rowIndex}`, [item[info.property]])
                  );
                }
              }
            } else {
              // update row property of all the next items
              let d = batch.data[i].row.max - batch.data[i].row.min + 1;
              for (let j = i + 1; j < batch.data.length; j++) {
                batch.data[j].row.min -= d;
                batch.data[j].row.insert -= d;
                batch.data[j].row.max -= d;
              }
            }
          }
          // if there is data fill head row(s)
          if (batch.cells.length > 0 && batch.row.insert) {
            for (let i = 0; i < batch.cells.length; i++) {
              let rowIndex = batch.row.insert;
              let info = batch.cells[i];
              data.push(Self.buildRequestUpdateCell(`'Compliance Report'!${info.column}${rowIndex}`, [info.value]));
            }
          }
          if (data.length <= 0) return n();
          return gSheets.spreadsheets.values.batchUpdate(
            {
              // The ID of the spreadsheet to update.
              spreadsheetId: spreadsheetId,
              // Request body metadata
              requestBody: {
                // request body parameters
                data: data,
                valueInputOption: `USER_ENTERED`
              }
            },
            function (err, res) {
              setTimeout(function () {
                // process err or result here
                return n(err);
              }, conf.settings.googleAPI[`Universal Journal Report`].timeout);
            }
          );
        }
      ];
      return async.mapSeries(
        actions,
        function (action, next) {
          return action(function (err) {
            return next(err);
          });
        },
        function (err) {
          return _next(err);
        }
      );
    },
    function (err) {
      if (err) return cb(err);
      let date = new Date();
      return gSheets.spreadsheets.values.batchUpdate(
        {
          // The ID of the spreadsheet to update.
          spreadsheetId: spreadsheetId,
          // Request body metadata
          requestBody: {
            // request body parameters
            data: [
              Self.buildRequestUpdateCell(`'Compliance Report'!D3`, [metadata.articleTitle]),
              Self.buildRequestUpdateCell(`'Compliance Report'!D4`, [metadata.manuscriptNumber]),
              Self.buildRequestUpdateCell(`'Compliance Report'!D5`, [metadata.authors]),
              Self.buildRequestUpdateCell(`'Compliance Report'!D6`, [
                `=LIEN_HYPERTEXTE("${metadata.dataSeerLink.url}";"${metadata.dataSeerLink.label}")`
              ]),
              Self.buildRequestUpdateCell(`'Compliance Report'!D7`, [
                `=DATE(${date.getFullYear()};${date.getMonth() + 1};${date.getDate()})`
              ]),
              Self.buildRequestUpdateCell(`'Compliance Report'!D8`, [metadata.DAS.content]),
              Self.buildRequestUpdateCell(`'Compliance Report'!B12`, [metadata.readmeIncluded.value]),
              Self.buildRequestUpdateCell(`'Compliance Report'!B13`, [metadata.describesFiles.value]),
              Self.buildRequestUpdateCell(`'Compliance Report'!B14`, [metadata.describesVariables.value]),
              Self.buildRequestUpdateCell(`'Compliance Report'!D12`, [metadata.readmeIncluded.notes]),
              Self.buildRequestUpdateCell(`'Compliance Report'!D13`, [metadata.describesFiles.notes]),
              Self.buildRequestUpdateCell(`'Compliance Report'!D14`, [metadata.describesVariables.notes])
            ],
            valueInputOption: `USER_ENTERED`
          }
        },
        function (err, res) {
          return cb(err);
        }
      );
    }
  );
};

/**
 * This function will fill AmNat report with given data and return the file ID (google file ID)
 * @param {object} opts - Options available
 * @param {string} opts.spreadsheetId - spreadsheetId
 * @param {object} opts.data - Data available
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR undefined)
 * @returns {undefined} undefined
 */
Self.insertDataInAmNatSheets = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `spreadsheetId`) === `undefined`)
    return cb(Error(`Missing required data: opts.spreadsheetId`));
  let spreadsheetId = _.get(opts, `spreadsheetId`);
  let data = _.get(opts, `data`, {});
  let doc = _.get(data, `document`, {});
  let metadata = _.get(data, `metadata`, {});
  let code = _.get(data, `code`, {});
  let software = _.get(data, `software`, {});
  let datasets = _.get(data, `datasets`, {});
  let summary = _.get(data, `summary`, {});
  return Self.getSheets({ spreadsheetId: spreadsheetId }, function (err, sheets) {
    let detailedReportSheetId = Self.getSheetId(sheets, `Compliance Report`);
    let actions = [
      // fill 'Compliance Report'
      function (next) {
        if (detailedReportSheetId instanceof Error) return next(detailedReportSheetId);
        return Self.fillComplianceReportAmNatSheet(
          {
            spreadsheetId: spreadsheetId,
            sheetId: detailedReportSheetId,
            data: {
              documentId: doc.id,
              documentToken: doc.token,
              metadata: {
                articleTitle: metadata.articleTitle,
                manuscriptNumber: metadata.manuscript_id,
                authors: metadata.authors
                  .map(function (item) {
                    return item.name;
                  })
                  .join(`, `),
                dataSeerLink: metadata.dataSeerLink
              },

              summary: summary,
              datasets: datasets,
              code: code,
              software: software
            }
          },
          function (err, res) {
            return next(err);
          }
        );
      }
    ];
    return async.mapSeries(
      actions,
      function (action, next) {
        return action(function (err) {
          return next(err);
        });
      },
      function (err) {
        return cb(err);
      }
    );
  });
};

/**
 * This function will fill Compliance Report sheet with given data and return the file ID (google file ID)
 * @param {object} opts - Options available
 * @param {string} opts.spreadsheetId - spreadsheetId
 * @param {object} opts.sheetId - sheetId
 * @param {object} opts.data - Data available
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR undefined)
 * @returns {undefined} undefined
 */
Self.fillComplianceReportAmNatSheet = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `spreadsheetId`) === `undefined`)
    return cb(Error(`Missing required data: opts.spreadsheetId`));
  if (typeof _.get(opts, `sheetId`) === `undefined`) return cb(Error(`Missing required data: opts.sheetId`));
  let spreadsheetId = _.get(opts, `spreadsheetId`);
  let sheetId = _.get(opts, `sheetId`);
  let data = _.get(opts, `data`, {});
  let metadata = _.get(data, `metadata`, {});
  let articleTitle = _.get(metadata, `articleTitle`, {});
  let doi = _.get(metadata, `doi`, ``);
  let authors = _.get(metadata, `authors`, ``);
  let summary = _.get(data, `summary`, {});
  let code = _.get(data, `code`, []);
  let software = _.get(data, `software`, []);
  let datasets = _.get(data, `datasets`, []);
  let documentId = _.get(data, `documentId`);
  let documentToken = _.get(data, `documentToken`);
  let sortedDatasets = {};
  // Regroup datasets by datatype
  for (let i = 0; i < datasets.length; i++) {
    let dataset = datasets[i];
    if (typeof sortedDatasets[dataset.type.dataType] === `undefined`)
      sortedDatasets[dataset.type.dataType] = { name: dataset.type.dataType, list: [] };
    sortedDatasets[dataset.type.dataType].list.push(dataset);
  }
  // Compute batches commands
  let batches = [
    // software
    {
      row: { min: 29, max: 29 },
      cells: [],
      data: [
        {
          merges: [{ begin: 0, end: 2 }],
          row: { min: 29, max: 32, insert: 31 },
          cells: [
            { column: `C`, property: `name` },
            { column: `D`, property: `sentences` },
            { column: `E`, property: `URL` },
            { column: `F`, property: `notes` }
          ],
          data: software.map(function (item) {
            return {
              reuse: item.reuse,
              name: conf.settings.dataObjectsLinks[`AmNat`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              URL: item.URL,
              notes: item.comments
            };
          })
        }
      ]
    },
    // code
    {
      row: { min: 24, max: 24 },
      cells: [],
      data: [
        {
          merges: [{ begin: 0, end: 2 }],
          row: { min: 24, max: 27, insert: 26 },
          cells: [
            { column: `C`, property: `name` },
            { column: `D`, property: `sentences` },
            { column: `E`, property: `URL` },
            { column: `F`, property: `notes` }
          ],
          data: code.map(function (item) {
            return {
              reuse: item.reuse,
              name: conf.settings.dataObjectsLinks[`AmNat`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              URL: (item.DOI ? `${item.DOI} ` : ``) + item.URL,
              notes: item.comments
            };
          })
        }
      ]
    }
  ];
  let keys = Object.keys(sortedDatasets);
  // Build batch objects for datasets
  for (let i = 0; i < keys.length; i++) {
    let key = keys[i];
    let datatype = sortedDatasets[key].name;
    // Do not copy pas the last iteration
    let copyPaste =
      i < keys.length - 1
        ? {
          row: {
            begin: 17,
            end: 22
          },
          column: {
            begin: 0,
            end: 6
          }
        }
        : undefined;
    batches.push({
      copyPaste: copyPaste,
      row: { min: 18, max: 18, insert: 18 },
      cells: [
        {
          column: `C`,
          value: datatype
        }
      ],
      data: [
        {
          merges: [],
          row: { min: 18, max: 21, insert: 20 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `name` },
            { column: `D`, property: `sentences` },
            { column: `E`, property: `repository` },
            { column: `F`, property: `notes` }
          ],
          data: sortedDatasets[key].list
            .filter(function (item) {
              return true;
            })
            .map(function (item) {
              return {
                reuse: item.reuse,
                name: conf.settings.dataObjectsLinks[`AmNat`]
                  ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                  : item.name,
                sentences: item.sentences
                  .map(function (s) {
                    return s.text;
                  })
                  .join(` `),
                repository: item.URL,
                notes: item.comments
              };
            })
        }
      ]
    });
  }
  return async.mapSeries(
    batches,
    function (batch, _next) {
      // Is there data in this bulk of data
      let noData = batch.data.reduce(function (acc, item) {
        return acc && item.data.length === 0;
      }, true);
      let actions = [
        // Insert rows
        function (n) {
          let requests = [];
          let offset = 0;
          // Copy/Paste template if necessary
          if (typeof batch.copyPaste === `object`) {
            let delta = batch.copyPaste.row.end - batch.copyPaste.row.begin + 1;
            offset += delta;
            requests.push(
              Self.buildRequestInsertRows(sheetId, batch.copyPaste.row.end, batch.copyPaste.row.end + delta + 1, false)
            );
            requests.push(
              Self.buildRequestCopyPaste(
                {
                  sheetId: sheetId,
                  startRowIndex: batch.copyPaste.row.begin,
                  endRowIndex: batch.copyPaste.row.end,
                  startColumnIndex: batch.copyPaste.column.begin,
                  endColumnIndex: batch.copyPaste.column.end
                },
                {
                  sheetId: sheetId,
                  startRowIndex: batch.copyPaste.row.begin + delta,
                  endRowIndex: batch.copyPaste.row.end + delta,
                  startColumnIndex: batch.copyPaste.column.begin,
                  endColumnIndex: batch.copyPaste.column.end
                }
              )
            );
            batch.row.min += offset;
            batch.row.max += offset;
            batch.row.insert += offset;
          }
          // insert rows if necessary
          for (let i = batch.data.length - 1; i >= 0; i--) {
            batch.data[i].row.min += offset;
            batch.data[i].row.insert += offset;
            batch.data[i].row.max += offset;
            if (batch.data[i].data.length > 0) {
              // insert row(s)
              requests.push(
                Self.buildRequestInsertRows(
                  sheetId,
                  batch.data[i].row.insert,
                  batch.data[i].row.insert + batch.data[i].data.length - 1,
                  true
                )
              );
              // merge cells
              for (let j = 0; j < batch.data[i].merges.length; j++) {
                let merge = batch.data[i].merges[j];
                requests.push(
                  Self.buildRequestMergeCells(
                    sheetId,
                    batch.data[i].row.insert,
                    batch.data[i].row.insert + batch.data[i].data.length - 1,
                    merge.begin,
                    merge.end
                  )
                );
              }
              // update borders
              requests.push(
                Self.buildRequestUpdateBorders(
                  sheetId,
                  batch.data[i].row.insert,
                  batch.data[i].row.insert + batch.data[i].data.length - 1,
                  0,
                  6
                )
              );
            }
            // delete row(s) if necessary
            else {
              requests.push(Self.buildRequestDeleteRows(sheetId, batch.data[i].row.min - 1, batch.data[i].row.max));
            }
          }
          // if there is no data at all, delete head row(s)
          if (noData) requests.push(Self.buildRequestDeleteRows(sheetId, batch.row.min - 1, batch.row.max));
          if (requests.length <= 0) return n();
          return gSheets.spreadsheets.batchUpdate(
            {
              // The ID of the spreadsheet to update.
              spreadsheetId: spreadsheetId,
              // Request body metadata
              requestBody: {
                includeSpreadsheetInResponse: false,
                responseIncludeGridData: false,
                // request body parameters
                requests: requests
              }
            },
            function (err, res) {
              setTimeout(function () {
                // process err or result here
                return n(err);
              }, conf.settings.googleAPI[`AmNat`].timeout);
            }
          );
        },
        // Update cells & Add data validations
        function (n) {
          let data = [];
          let offset = 0;
          // Copy/Paste template if necessary
          if (batch.copyPaste) {
            let delta = batch.copyPaste.row.end - batch.copyPaste.row.begin + 1;
            offset += delta;
          }
          let begin = batch.row.min;
          let end = batch.row.max;
          // fill rows if necessary
          for (let i = 0; i < batch.data.length; i++) {
            // if there is data in this bulk of data
            if (batch.data[i].data.length > 0) {
              batch.data[i].row.max += batch.data[i].data.length - 1;
              end += batch.data[i].row.max;
              // update row property of all the next items
              if (typeof batch.data[i + 1] !== `undefined`) {
                let d = batch.data[i].data.length - 1; // -1 because there is one line by default
                for (let j = i + 1; j < batch.data.length; j++) {
                  batch.data[j].row.min += d;
                  batch.data[j].row.insert += d;
                  batch.data[j].row.max += d;
                }
              }
              // fill row(s)
              for (let j = 0; j < batch.data[i].data.length; j++) {
                let item = batch.data[i].data[j];
                let rowIndex = batch.data[i].row.insert + j;
                data.push(Self.buildRequestUpdateCell(`'Compliance Report'!A${rowIndex}`, [j + 1]));
                for (let k = 0; k < batch.data[i].cells.length; k++) {
                  let info = batch.data[i].cells[k];
                  data.push(
                    Self.buildRequestUpdateCell(`'Compliance Report'!${info.column}${rowIndex}`, [item[info.property]])
                  );
                }
              }
            } else {
              // update row property of all the next items
              let d = batch.data[i].row.max - batch.data[i].row.min + 1;
              for (let j = i + 1; j < batch.data.length; j++) {
                batch.data[j].row.min -= d;
                batch.data[j].row.insert -= d;
                batch.data[j].row.max -= d;
              }
            }
          }
          // if there is data fill head row(s)
          if (batch.cells.length > 0 && batch.row.insert) {
            for (let i = 0; i < batch.cells.length; i++) {
              let rowIndex = batch.row.insert;
              let info = batch.cells[i];
              data.push(Self.buildRequestUpdateCell(`'Compliance Report'!${info.column}${rowIndex}`, [info.value]));
            }
          }
          if (data.length <= 0) return n();
          return gSheets.spreadsheets.values.batchUpdate(
            {
              // The ID of the spreadsheet to update.
              spreadsheetId: spreadsheetId,
              // Request body metadata
              requestBody: {
                // request body parameters
                data: data,
                valueInputOption: `USER_ENTERED`
              }
            },
            function (err, res) {
              setTimeout(function () {
                // process err or result here
                return n(err);
              }, conf.settings.googleAPI[`AmNat`].timeout);
            }
          );
        }
      ];
      return async.mapSeries(
        actions,
        function (action, next) {
          return action(function (err) {
            return next(err);
          });
        },
        function (err) {
          return _next(err);
        }
      );
    },
    function (err) {
      if (err) return cb(err);
      let date = new Date();
      return gSheets.spreadsheets.values.batchUpdate(
        {
          // The ID of the spreadsheet to update.
          spreadsheetId: spreadsheetId,
          // Request body metadata
          requestBody: {
            // request body parameters
            data: [
              Self.buildRequestUpdateCell(`'Compliance Report'!D3`, [metadata.articleTitle]),
              Self.buildRequestUpdateCell(`'Compliance Report'!D4`, [metadata.manuscriptNumber]),
              Self.buildRequestUpdateCell(`'Compliance Report'!D5`, [metadata.authors]),
              Self.buildRequestUpdateCell(`'Compliance Report'!D6`, [
                `=LIEN_HYPERTEXTE("${metadata.dataSeerLink.url}";"${metadata.dataSeerLink.label}")`
              ]),
              Self.buildRequestUpdateCell(`'Compliance Report'!D7`, [
                `=DATE(${date.getFullYear()};${date.getMonth() + 1};${date.getDate()})`
              ])
            ],
            valueInputOption: `USER_ENTERED`
          }
        },
        function (err, res) {
          return cb(err);
        }
      );
    }
  );
};

/**
 * This function will fill DataSeer Generic report with given data and return the file ID (google file ID)
 * @param {object} opts - Options available
 * @param {string} opts.spreadsheetId - spreadsheetId
 * @param {object} opts.data - Data available
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR undefined)
 * @returns {undefined} undefined
 */
Self.insertDataInDataSeerGenericSheets = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `spreadsheetId`) === `undefined`)
    return cb(Error(`Missing required data: opts.spreadsheetId`));
  let spreadsheetId = _.get(opts, `spreadsheetId`);
  let data = _.get(opts, `data`, {});
  let doc = _.get(data, `document`, {});
  let metadata = _.get(data, `metadata`, {});
  let protocols = _.get(data, `protocols`, {});
  let code = _.get(data, `code`, {});
  let software = _.get(data, `software`, {});
  let reagents = _.get(data, `reagents`, {});
  let datasets = _.get(data, `datasets`, {});
  let summary = _.get(data, `summary`, {});
  let filteredDatasets = [
    // Deposit to appropriate repository and cite PID in text
    datasets.filter(function (item) {
      return Self.getRuleKey(item.rules[`default`].rule) === Self.getConfRuleKey(`default`, `datasets`, null, `4`);
    }),
    // Cite dataset unique identifier in text
    datasets.filter(function (item) {
      return Self.getRuleKey(item.rules[`default`].rule) === Self.getConfRuleKey(`default`, `datasets`, null, `5`);
    }),
    // Verify dataset citation
    datasets.filter(function (item) {
      return Self.getRuleKey(item.rules[`default`].rule) === Self.getConfRuleKey(`default`, `datasets`, null, `3`);
    }),
    // Done - Cited correctly
    datasets.filter(function (item) {
      return Self.getRuleKey(item.rules[`default`].rule) === Self.getConfRuleKey(`default`, `datasets`, null, `0`);
    }),
    // Not required, but recommended to include the representative image/video files in raw format with dataset upload.
    datasets.filter(function (item) {
      return Self.getRuleKey(item.rules[`default`].rule) === Self.getConfRuleKey(`default`, `datasets`, null, `1`);
    }),
    // Confirmatory and Quality Control datasets are not required to be included in your dataset upload.
    datasets.filter(function (item) {
      return Self.getRuleKey(item.rules[`default`].rule) === Self.getConfRuleKey(`default`, `datasets`, null, `2`);
    })
  ];
  let filteredCode = [
    // Upload code to Zenodo and provide DOI
    code.filter(function (item) {
      let subType = item.dataType === `other` ? `` : item.subType;
      return Self.getRuleKey(item.rules[`default`].rule) === Self.getConfRuleKey(`default`, `code`, subType, `2`);
    }),
    // Verify citation
    code.filter(function (item) {
      let subType = item.dataType === `other` ? `` : item.subType;
      return Self.getRuleKey(item.rules[`default`].rule) === Self.getConfRuleKey(`default`, `code`, subType, `1`);
    }),
    // Done - Cited correctly
    code.filter(function (item) {
      let subType = item.dataType === `other` ? `` : item.subType;
      return Self.getRuleKey(item.rules[`default`].rule) === Self.getConfRuleKey(`default`, `code`, subType, `0`);
    })
  ];
  let filteredSoftware = [
    // Include missing information in citation
    software.filter(function (item) {
      let subType = item.dataType === `other` ? `` : item.subType;
      return Self.getRuleKey(item.rules[`default`].rule) === Self.getConfRuleKey(`default`, `software`, subType, `2`);
    }),
    // Verify citation
    software.filter(function (item) {
      let subType = item.dataType === `other` ? `` : item.subType;
      return Self.getRuleKey(item.rules[`default`].rule) === Self.getConfRuleKey(`default`, `software`, subType, `1`);
    }),
    // None - Citation meets minimum standards
    software.filter(function (item) {
      let subType = item.dataType === `other` ? `` : item.subType;
      return Self.getRuleKey(item.rules[`default`].rule) === Self.getConfRuleKey(`default`, `software`, subType, `0`);
    })
  ];
  let filteredMaterials = [
    // Assign RRID and cite in text
    reagents.filter(function (item) {
      return Self.getRuleKey(item.rules[`default`].rule) === Self.getConfRuleKey(`default`, `reagents`, null, `3`);
    }),
    // Check for an existing RRID
    reagents.filter(function (item) {
      return Self.getRuleKey(item.rules[`default`].rule) === Self.getConfRuleKey(`default`, `reagents`, null, `2`);
    }),
    // Verify citation
    reagents.filter(function (item) {
      return Self.getRuleKey(item.rules[`default`].rule) === Self.getConfRuleKey(`default`, `reagents`, null, `1`);
    }),
    // Done - Cited correctly
    reagents.filter(function (item) {
      return Self.getRuleKey(item.rules[`default`].rule) === Self.getConfRuleKey(`default`, `reagents`, null, `0`);
    })
  ];
  let filteredProtocols = [
    // Deposit in repository and cite DOI in text
    protocols.filter(function (item) {
      let subType = item.dataType === `other` ? `` : item.subType;
      return Self.getRuleKey(item.rules[`default`].rule) === Self.getConfRuleKey(`default`, `protocols`, subType, `2`);
    }),
    // Include missing information in citation
    protocols.filter(function (item) {
      let subType = item.dataType === `other` ? `` : item.subType;
      return Self.getRuleKey(item.rules[`default`].rule) === Self.getConfRuleKey(`default`, `protocols`, subType, `3`);
    }),
    // Verify citation
    protocols.filter(function (item) {
      let subType = item.dataType === `other` ? `` : item.subType;
      return Self.getRuleKey(item.rules[`default`].rule) === Self.getConfRuleKey(`default`, `protocols`, subType, `1`);
    }),
    // Done - Cited correctly
    protocols.filter(function (item) {
      let subType = item.dataType === `other` ? `` : item.subType;
      return Self.getRuleKey(item.rules[`default`].rule) === Self.getConfRuleKey(`default`, `protocols`, subType, `0`);
    })
  ];
  let filteredDataObject = {
    datasets: {
      filtered: filteredDatasets,
      identified: filteredDatasets.slice(0, 4).flat(),
      shared: filteredDatasets[3]
    },
    code: {
      filtered: filteredCode,
      identified: filteredCode.flat(),
      shared: filteredCode.slice(2).flat()
    },
    software: {
      filtered: filteredSoftware,
      identified: filteredSoftware.flat(),
      shared: filteredSoftware.slice(3).flat()
    },
    materials: {
      filtered: filteredMaterials,
      identified: filteredMaterials.flat(),
      shared: filteredMaterials.slice(3).flat()
    },
    protocols: {
      filtered: filteredProtocols,
      identified: filteredProtocols.flat(),
      shared: filteredProtocols.slice(3).flat()
    }
  };
  return Self.getSheets({ spreadsheetId: spreadsheetId }, function (err, sheets) {
    let detailedReportSheetId = Self.getSheetId(sheets, `Detailed Report`);
    let actions = [
      // fill 'Authors and Affiliations' part of the report
      function (next) {
        if (detailedReportSheetId instanceof Error) return next(detailedReportSheetId);
        return Self.fillAuthorsAndAffiliationDataSeerGenericPart(
          {
            spreadsheetId: spreadsheetId,
            sheetId: detailedReportSheetId,
            data: {
              authors: metadata.authors
            }
          },
          function (err, res) {
            return next(err);
          }
        );
      },
      // fill 'Summary Sheet' part of the report
      function (next) {
        if (detailedReportSheetId instanceof Error) return next(detailedReportSheetId);
        return Self.fillSummaryDataSeerGenericPart(
          {
            spreadsheetId: spreadsheetId,
            sheetId: detailedReportSheetId,
            data: {
              documentId: doc.id,
              documentToken: doc.token,
              articleTitle: metadata.articleTitle,
              authors: metadata.authors,
              dataSeerLink: metadata.dataSeerLink,
              DAS: metadata.DAS
            }
          },
          function (err, res) {
            return next(err);
          }
        );
      },
      // fill 'Compliance Report' part of the report
      function (next) {
        if (detailedReportSheetId instanceof Error) return next(detailedReportSheetId);
        return Self.fillComplianceReportDataSeerGenericPart(
          {
            spreadsheetId: spreadsheetId,
            sheetId: detailedReportSheetId,
            data: {
              documentId: doc.id,
              documentToken: doc.token,

              summary: summary,
              datasets: filteredDataObject.datasets.filtered,
              code: filteredDataObject.code.filtered,
              software: filteredDataObject.software.filtered,
              materials: filteredDataObject.materials.filtered,
              protocols: filteredDataObject.protocols.filtered
            }
          },
          function (err, res) {
            return next(err);
          }
        );
      },
      // fill 'Research Output Availability Statement' part of the report
      function (next) {
        if (detailedReportSheetId instanceof Error) return next(detailedReportSheetId);
        return Self.fillResearchOutputAvailabilityStatementDataSeerGenericPart(
          {
            spreadsheetId: spreadsheetId,
            sheetId: detailedReportSheetId,
            data: {
              documentId: doc.id,
              documentToken: doc.token,
              authors: metadata.authors,
              datasets: filteredDataObject.datasets.filtered[3].filter(function (item) {
                return !item.reuse;
              }),
              code: filteredDataObject.code.filtered[2].filter(function (item) {
                return !item.reuse;
              }),
              software: filteredDataObject.software.filtered[2].filter(function (item) {
                return !item.reuse;
              }),
              materials: filteredDataObject.materials.filtered[3].filter(function (item) {
                return !item.reuse;
              }),
              protocols: filteredDataObject.protocols.filtered[3].filter(function (item) {
                return !item.reuse;
              })
            }
          },
          function (err, res) {
            return next(err);
          }
        );
      }
    ];
    return async.mapSeries(
      actions,
      function (action, next) {
        return action(function (err) {
          return next(err);
        });
      },
      function (err) {
        return cb(err);
      }
    );
  });
};

/**
 * This function will fill Compliance Report part with given data and return the file ID (google file ID)
 * @param {object} opts - Options available
 * @param {string} opts.spreadsheetId - spreadsheetId
 * @param {object} opts.sheetId - sheetId
 * @param {object} opts.data - Data available
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR undefined)
 * @returns {undefined} undefined
 */
Self.fillComplianceReportDataSeerGenericPart = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `spreadsheetId`) === `undefined`)
    return cb(Error(`Missing required data: opts.spreadsheetId`));
  if (typeof _.get(opts, `sheetId`) === `undefined`) return cb(Error(`Missing required data: opts.sheetId`));
  let spreadsheetId = _.get(opts, `spreadsheetId`);
  let sheetId = _.get(opts, `sheetId`);
  let data = _.get(opts, `data`, {});
  let summary = _.get(data, `summary`, []);
  let protocols = _.get(data, `protocols`, []);
  let code = _.get(data, `code`, []);
  let software = _.get(data, `software`, []);
  let materials = _.get(data, `materials`, []);
  let datasets = _.get(data, `datasets`, []);
  let documentId = _.get(data, `documentId`);
  let documentToken = _.get(data, `documentToken`);
  let sortedDatasets = {};
  // Regroup datasets by datatype
  for (let i = 0; i < datasets.length; i++) {
    let dataset = datasets[i];
    if (typeof sortedDatasets[dataset.dataType] === `undefined`)
      sortedDatasets[dataset.dataType] = { name: dataset.dataType, list: [] };
    sortedDatasets[dataset.dataType].list.push(dataset);
  }
  // Compute batches commands
  let batches = [
    // protocols
    {
      sheet: { id: sheetId, name: `Detailed Report` },
      row: { min: 140, max: 140, insert: 140 },
      cells: [],
      params: {
        noDataRow: { min: 141, max: 143, display: conf.settings.displayNoDataSection[`DataSeer Generic`].protocols }
      },
      fn: function (batch) {
        let link = `#gid=${sheetId}&range=B${batch.row.insert}`;
        let label = `Protocols`;
        return Self.buildRequestUpdateCell(`'Detailed Report'!B13`, [`=LIEN_HYPERTEXTE("${link}", "${label}")`]);
      },
      data: [
        {
          merges: [
            { begin: 2, end: 5 },
            { begin: 5, end: 7 },
            { begin: 7, end: 9 },
            { begin: 11, end: 15 }
          ],
          row: { min: 144, max: 149, insert: 147 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `H`, property: `URL` },
            { column: `J`, property: `repository` },
            { column: `K`, property: `protocolType` },
            { column: `L`, property: `notes` }
          ],
          // Deposit in repository and cite DOI in text
          data: protocols[0].map(function (item) {
            return {
              reuse: item.reuse,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`DataSeer Generic`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              protocolType: item.type.url
                ? `=LIEN_HYPERTEXTE("${item.type.url}";"${item.type.label}")`
                : item.type.label,
              URL: item.URL,
              repository: item.DOI
            };
          })
        },
        {
          merges: [
            { begin: 2, end: 5 },
            { begin: 5, end: 7 },
            { begin: 7, end: 9 },
            { begin: 11, end: 15 }
          ],
          row: { min: 150, max: 155, insert: 153 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `H`, property: `URL` },
            { column: `J`, property: `repository` },
            { column: `K`, property: `protocolType` },
            { column: `L`, property: `notes` }
          ],
          // Include missing information in citation
          data: protocols[1].map(function (item) {
            return {
              reuse: item.reuse,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`DataSeer Generic`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              protocolType: item.type.url
                ? `=LIEN_HYPERTEXTE("${item.type.url}";"${item.type.label}")`
                : item.type.label,
              URL: item.URL,
              repository: item.DOI
            };
          })
        },
        {
          merges: [
            { begin: 2, end: 5 },
            { begin: 5, end: 7 },
            { begin: 7, end: 9 },
            { begin: 11, end: 15 }
          ],
          row: { min: 156, max: 161, insert: 159 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `H`, property: `URL` },
            { column: `J`, property: `repository` },
            { column: `K`, property: `protocolType` },
            { column: `L`, property: `notes` }
          ],
          // Verify citation
          data: protocols[2].map(function (item) {
            return {
              reuse: item.reuse,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`DataSeer Generic`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              protocolType: item.type.url
                ? `=LIEN_HYPERTEXTE("${item.type.url}";"${item.type.label}")`
                : item.type.label,
              URL: item.URL,
              repository: item.DOI
            };
          })
        },
        {
          merges: [
            { begin: 2, end: 5 },
            { begin: 5, end: 7 },
            { begin: 7, end: 9 },
            { begin: 11, end: 15 }
          ],
          row: { min: 162, max: 167, insert: 164 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `H`, property: `URL` },
            { column: `J`, property: `repository` },
            { column: `K`, property: `protocolType` },
            { column: `L`, property: `notes` }
          ],
          // Done - Cited correctly
          data: protocols[3].map(function (item) {
            return {
              reuse: item.reuse,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`DataSeer Generic`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              protocolType: item.type.url
                ? `=LIEN_HYPERTEXTE("${item.type.url}";"${item.type.label}")`
                : item.type.label,
              URL: item.URL,
              repository: item.DOI
            };
          })
        }
      ]
    },
    // lab materials
    {
      sheet: { id: sheetId, name: `Detailed Report` },
      row: { min: 106, max: 106, insert: 106 },
      cells: [],
      params: {
        noDataRow: { min: 107, max: 109, display: conf.settings.displayNoDataSection[`DataSeer Generic`].materials }
      },
      fn: function (batch) {
        let link = `#gid=${sheetId}&range=B${batch.row.insert}`;
        let label = `Lab Materials`;
        return Self.buildRequestUpdateCell(`'Detailed Report'!B12`, [`=LIEN_HYPERTEXTE("${link}", "${label}")`]);
      },
      data: [
        {
          merges: [
            { begin: 2, end: 5 },
            { begin: 13, end: 15 }
          ],
          row: { min: 110, max: 115, insert: 113 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `H`, property: `source` },
            { column: `I`, property: `catalog` },
            { column: `J`, property: `RRID` },
            { column: `K`, property: `datatype` },
            { column: `L`, property: `suggestedEntity` },
            { column: `M`, property: `suggestedRRID` },
            { column: `N`, property: `notes` }
          ],
          // Assign RRID and cite in text
          data: materials[0].map(function (item) {
            return {
              reuse: item.reuse,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`DataSeer Generic`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              repository: item.DOI,
              datatype: item.type.url ? `=LIEN_HYPERTEXTE("${item.type.url}";"${item.type.label}")` : item.type.label,
              source: item.source,
              RRID: item.RRID,
              suggestedEntity: item.suggestedEntity,
              catalog: item.catalogNumber,
              suggestedRRID: item.suggestedRRID
            };
          })
        },
        {
          merges: [
            { begin: 2, end: 5 },
            { begin: 13, end: 15 }
          ],
          row: { min: 116, max: 121, insert: 119 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `H`, property: `source` },
            { column: `I`, property: `catalog` },
            { column: `J`, property: `RRID` },
            { column: `K`, property: `datatype` },
            { column: `L`, property: `suggestedEntity` },
            { column: `M`, property: `suggestedRRID` },
            { column: `N`, property: `notes` }
          ],
          // Check for an existing RRID
          data: materials[1].map(function (item) {
            return {
              reuse: item.reuse,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`DataSeer Generic`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              repository: item.DOI,
              datatype: item.type.url ? `=LIEN_HYPERTEXTE("${item.type.url}";"${item.type.label}")` : item.type.label,
              source: item.source,
              RRID: item.RRID,
              suggestedEntity: item.suggestedEntity,
              catalog: item.catalogNumber,
              suggestedRRID: item.suggestedRRID
            };
          })
        },
        {
          merges: [
            { begin: 2, end: 5 },
            { begin: 13, end: 15 }
          ],
          row: { min: 122, max: 127, insert: 125 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `H`, property: `source` },
            { column: `I`, property: `catalog` },
            { column: `J`, property: `RRID` },
            { column: `K`, property: `datatype` },
            { column: `L`, property: `suggestedEntity` },
            { column: `M`, property: `suggestedRRID` },
            { column: `N`, property: `notes` }
          ],
          // Verify citation
          data: materials[2].map(function (item) {
            return {
              reuse: item.reuse,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`DataSeer Generic`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              repository: item.DOI,
              datatype: item.type.url ? `=LIEN_HYPERTEXTE("${item.type.url}";"${item.type.label}")` : item.type.label,
              source: item.source,
              RRID: item.RRID,
              suggestedEntity: item.suggestedEntity,
              catalog: item.catalogNumber,
              suggestedRRID: item.suggestedRRID
            };
          })
        },
        {
          merges: [
            { begin: 2, end: 5 },
            { begin: 13, end: 15 }
          ],
          row: { min: 128, max: 132, insert: 130 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `H`, property: `source` },
            { column: `I`, property: `catalog` },
            { column: `J`, property: `RRID` },
            { column: `K`, property: `datatype` },
            { column: `L`, property: `suggestedEntity` },
            { column: `M`, property: `suggestedRRID` },
            { column: `N`, property: `notes` }
          ],
          // Done - Cited correctly
          data: materials[3].map(function (item) {
            return {
              reuse: item.reuse,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`DataSeer Generic`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              repository: item.DOI,
              datatype: item.type.url ? `=LIEN_HYPERTEXTE("${item.type.url}";"${item.type.label}")` : item.type.label,
              source: item.source,
              RRID: item.RRID,
              suggestedEntity: item.suggestedEntity,
              catalog: item.catalogNumber,
              suggestedRRID: item.suggestedRRID
            };
          })
        },
        {
          merges: [
            { begin: 2, end: 5 },
            { begin: 13, end: 15 }
          ],
          row: { min: 133, max: 139, insert: 136 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `H`, property: `source` },
            { column: `I`, property: `catalog` },
            { column: `J`, property: `RRID` },
            { column: `K`, property: `datatype` },
            { column: `L`, property: `suggestedEntity` },
            { column: `M`, property: `suggestedRRID` },
            { column: `N`, property: `notes` }
          ],
          // Done - Cited correctly
          data: materials[3].map(function (item) {
            return {
              reuse: item.reuse,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`DataSeer Generic`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              repository: item.DOI,
              datatype: item.type.url ? `=LIEN_HYPERTEXTE("${item.type.url}";"${item.type.label}")` : item.type.label,
              source: item.source,
              RRID: item.RRID,
              suggestedEntity: item.suggestedEntity,
              catalog: item.catalogNumber,
              suggestedRRID: item.suggestedRRID
            };
          })
        }
      ]
    },
    // software
    {
      sheet: { id: sheetId, name: `Detailed Report` },
      row: { min: 84, max: 84, insert: 84 },
      cells: [],
      params: {
        noDataRow: { min: 85, max: 87, display: conf.settings.displayNoDataSection[`DataSeer Generic`].software }
      },
      fn: function (batch) {
        let link = `#gid=${sheetId}&range=B${batch.row.insert}`;
        let label = `Software`;
        return Self.buildRequestUpdateCell(`'Detailed Report'!B11`, [`=LIEN_HYPERTEXTE("${link}", "${label}")`]);
      },
      data: [
        {
          merges: [
            { begin: 2, end: 4 },
            { begin: 7, end: 9 },
            { begin: 13, end: 15 }
          ],
          row: { min: 88, max: 93, insert: 91 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `version` },
            { column: `E`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `H`, property: `URL` },
            { column: `J`, property: `RRID` },
            { column: `K`, property: `suggestedEntity` },
            { column: `L`, property: `suggestedRRID` },
            { column: `M`, property: `suggestedURL` },
            { column: `N`, property: `notes` }
          ],
          // Include missing information in citation
          data: software[0].map(function (item) {
            return {
              reuse: item.reuse,
              version: item.version,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`DataSeer Generic`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              URL: item.URL,
              RRID: item.RRID,
              suggestedEntity: item.suggestedEntity,
              suggestedRRID: item.suggestedRRID,
              suggestedURL: item.suggestedURL,
              notes: item.comments
            };
          })
        },
        {
          merges: [
            { begin: 2, end: 4 },
            { begin: 7, end: 9 },
            { begin: 13, end: 15 }
          ],
          row: { min: 94, max: 99, insert: 97 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `version` },
            { column: `E`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `H`, property: `URL` },
            { column: `J`, property: `RRID` },
            { column: `K`, property: `suggestedEntity` },
            { column: `L`, property: `suggestedRRID` },
            { column: `M`, property: `suggestedURL` },
            { column: `N`, property: `notes` }
          ],
          // Verify citation
          data: software[1].map(function (item) {
            return {
              reuse: item.reuse,
              version: item.version,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`DataSeer Generic`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              URL: item.URL,
              RRID: item.RRID,
              suggestedEntity: item.suggestedEntity,
              suggestedRRID: item.suggestedRRID,
              suggestedURL: item.suggestedURL,
              notes: item.comments
            };
          })
        },
        {
          merges: [
            { begin: 2, end: 4 },
            { begin: 7, end: 9 },
            { begin: 13, end: 15 }
          ],
          row: { min: 100, max: 105, insert: 102 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `version` },
            { column: `E`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `H`, property: `URL` },
            { column: `J`, property: `RRID` },
            { column: `K`, property: `suggestedEntity` },
            { column: `L`, property: `suggestedRRID` },
            { column: `M`, property: `suggestedURL` },
            { column: `N`, property: `notes` }
          ],
          // Done - Shared/Cited correctly
          data: software[2].map(function (item) {
            return {
              reuse: item.reuse,
              version: item.version,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`DataSeer Generic`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              URL: item.URL,
              RRID: item.RRID,
              suggestedEntity: item.suggestedEntity,
              suggestedRRID: item.suggestedRRID,
              suggestedURL: item.suggestedURL,
              notes: item.comments
            };
          })
        }
      ]
    },
    // code
    {
      sheet: { id: sheetId, name: `Detailed Report` },
      row: { min: 62, max: 62, insert: 62 },
      cells: [],
      params: {
        noDataRow: { min: 63, max: 65, display: conf.settings.displayNoDataSection[`DataSeer Generic`].code }
      },
      fn: function (batch) {
        let link = `#gid=${sheetId}&range=B${batch.row.insert}`;
        let label = `Code`;
        return Self.buildRequestUpdateCell(`'Detailed Report'!B10`, [`=LIEN_HYPERTEXTE("${link}", "${label}")`]);
      },
      data: [
        {
          merges: [
            { begin: 1, end: 5 },
            { begin: 7, end: 9 },
            { begin: 9, end: 11 },
            { begin: 11, end: 15 }
          ],
          row: { min: 66, max: 71, insert: 69 },
          cells: [
            { column: `B`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `H`, property: `URL` },
            { column: `J`, property: `DOI` },
            { column: `L`, property: `notes` }
          ],
          // Upload code to Zenodo and provide DOI
          data: code[0].map(function (item) {
            return {
              reuse: item.reuse,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`DataSeer Generic`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              DOI: item.DOI,
              URL: item.URL
            };
          })
        },
        {
          merges: [
            { begin: 1, end: 5 },
            { begin: 7, end: 9 },
            { begin: 9, end: 11 },
            { begin: 11, end: 15 }
          ],
          row: { min: 72, max: 77, insert: 75 },
          cells: [
            { column: `B`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `H`, property: `URL` },
            { column: `J`, property: `DOI` },
            { column: `L`, property: `notes` }
          ],
          // Verify citation
          data: code[1].map(function (item) {
            return {
              reuse: item.reuse,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`DataSeer Generic`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              DOI: item.DOI,
              URL: item.URL
            };
          })
        },
        {
          merges: [
            { begin: 1, end: 5 },
            { begin: 7, end: 9 },
            { begin: 9, end: 11 },
            { begin: 11, end: 15 }
          ],
          row: { min: 78, max: 83, insert: 80 },
          cells: [
            { column: `B`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `H`, property: `URL` },
            { column: `J`, property: `DOI` },
            { column: `L`, property: `notes` }
          ],
          // Done - Cited correctly
          data: code[2].map(function (item) {
            return {
              reuse: item.reuse,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`DataSeer Generic`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              DOI: item.DOI,
              URL: item.URL
            };
          })
        }
      ]
    },
    // datasets
    {
      sheet: { id: sheetId, name: `Detailed Report` },
      row: { min: 22, max: 22, insert: 22 },
      cells: [],
      params: {
        noDataRow: { min: 23, max: 25, display: conf.settings.displayNoDataSection[`DataSeer Generic`].datasets }
      },
      fn: function (batch) {
        let link = `#gid=${sheetId}&range=B${batch.row.insert}`;
        let label = `Datasets`;
        return Self.buildRequestUpdateCell(`'Detailed Report'!B9`, [`=LIEN_HYPERTEXTE("${link}", "${label}")`]);
      },
      data: [
        {
          merges: [
            { begin: 7, end: 9 },
            { begin: 12, end: 15 }
          ],
          row: { min: 26, max: 31, insert: 29 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `qc` },
            { column: `D`, property: `representativeImage` },
            { column: `E`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `H`, property: `repository` },
            { column: `J`, property: `uniqueIdentifier` },
            { column: `K`, property: `datatype` },
            { column: `L`, property: `figureOrTable` },
            { column: `M`, property: `notes` }
          ],
          // Deposit to appropriate repository and cite PID in text
          data: datasets[0].map(function (item) {
            return {
              reuse: item.reuse,
              qc: item.qc,
              representativeImage: item.representativeImage,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`DataSeer Generic`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              notes: item.comments,
              figureOrTable: item.associatedFigureOrTable,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              repository: item.URL,
              uniqueIdentifier: item.PID,
              datatype:
                item.type && item.type.url
                  ? `=LIEN_HYPERTEXTE("${item.type.url}";"${item.type.label}")`
                  : item.type.label
            };
          })
        },
        {
          merges: [
            { begin: 7, end: 9 },
            { begin: 12, end: 15 }
          ],
          row: { min: 32, max: 37, insert: 35 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `qc` },
            { column: `D`, property: `representativeImage` },
            { column: `E`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `H`, property: `repository` },
            { column: `J`, property: `uniqueIdentifier` },
            { column: `K`, property: `datatype` },
            { column: `L`, property: `figureOrTable` },
            { column: `M`, property: `notes` }
          ],
          // Cite dataset unique identifier in text
          data: datasets[1].map(function (item) {
            return {
              reuse: item.reuse,
              qc: item.qc,
              representativeImage: item.representativeImage,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`DataSeer Generic`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              notes: item.comments,
              figureOrTable: item.associatedFigureOrTable,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              repository: item.URL,
              uniqueIdentifier: item.PID,
              datatype:
                item.type && item.type.url
                  ? `=LIEN_HYPERTEXTE("${item.type.url}";"${item.type.label}")`
                  : item.type.label
            };
          })
        },
        {
          merges: [
            { begin: 7, end: 9 },
            { begin: 12, end: 15 }
          ],
          row: { min: 38, max: 43, insert: 41 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `qc` },
            { column: `D`, property: `representativeImage` },
            { column: `E`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `H`, property: `repository` },
            { column: `J`, property: `uniqueIdentifier` },
            { column: `K`, property: `datatype` },
            { column: `L`, property: `figureOrTable` },
            { column: `M`, property: `notes` }
          ],
          // Verify dataset citation
          data: datasets[2].map(function (item) {
            return {
              reuse: item.reuse,
              qc: item.qc,
              representativeImage: item.representativeImage,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`DataSeer Generic`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              notes: item.comments,
              figureOrTable: item.associatedFigureOrTable,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              repository: item.URL,
              uniqueIdentifier: item.PID,
              datatype:
                item.type && item.type.url
                  ? `=LIEN_HYPERTEXTE("${item.type.url}";"${item.type.label}")`
                  : item.type.label
            };
          })
        },
        {
          merges: [
            { begin: 7, end: 9 },
            { begin: 12, end: 15 }
          ],
          row: { min: 44, max: 48, insert: 46 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `qc` },
            { column: `D`, property: `representativeImage` },
            { column: `E`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `H`, property: `repository` },
            { column: `J`, property: `uniqueIdentifier` },
            { column: `K`, property: `datatype` },
            { column: `L`, property: `figureOrTable` },
            { column: `M`, property: `notes` }
          ],
          // Done - Shared/Cited correctly
          data: datasets[3].map(function (item) {
            return {
              reuse: item.reuse,
              qc: item.qc,
              representativeImage: item.representativeImage,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`DataSeer Generic`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              notes: item.comments,
              figureOrTable: item.associatedFigureOrTable,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              repository: item.URL,
              uniqueIdentifier: item.PID,
              datatype:
                item.type && item.type.url
                  ? `=LIEN_HYPERTEXTE("${item.type.url}";"${item.type.label}")`
                  : item.type.label
            };
          })
        },
        {
          merges: [
            { begin: 7, end: 9 },
            { begin: 12, end: 15 }
          ],
          row: { min: 49, max: 54, insert: 52 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `qc` },
            { column: `D`, property: `representativeImage` },
            { column: `E`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `H`, property: `repository` },
            { column: `J`, property: `uniqueIdentifier` },
            { column: `K`, property: `datatype` },
            { column: `L`, property: `figureOrTable` },
            { column: `M`, property: `notes` }
          ],
          // Not required, but recommended to include the representative image/video files in raw format with dataset upload.
          data: datasets[4].map(function (item) {
            return {
              reuse: item.reuse,
              qc: item.qc,
              representativeImage: item.representativeImage,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`DataSeer Generic`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              notes: item.comments,
              figureOrTable: item.associatedFigureOrTable,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              repository: item.URL,
              uniqueIdentifier: item.PID,
              datatype:
                item.type && item.type.url
                  ? `=LIEN_HYPERTEXTE("${item.type.url}";"${item.type.label}")`
                  : item.type.label
            };
          })
        },
        {
          merges: [
            { begin: 7, end: 9 },
            { begin: 12, end: 15 }
          ],
          row: { min: 55, max: 61, insert: 58 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `qc` },
            { column: `D`, property: `representativeImage` },
            { column: `E`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `H`, property: `repository` },
            { column: `J`, property: `uniqueIdentifier` },
            { column: `K`, property: `datatype` },
            { column: `L`, property: `figureOrTable` },
            { column: `M`, property: `notes` }
          ],
          // Confirmatory and Quality Control datasets are not required to be included in your dataset upload.
          data: datasets[5].map(function (item) {
            return {
              reuse: item.reuse,
              qc: item.qc,
              representativeImage: item.representativeImage,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`DataSeer Generic`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              notes: item.comments,
              figureOrTable: item.associatedFigureOrTable,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              repository: item.URL,
              uniqueIdentifier: item.PID,
              datatype:
                item.type && item.type.url
                  ? `=LIEN_HYPERTEXTE("${item.type.url}";"${item.type.label}")`
                  : item.type.label
            };
          })
        }
      ]
    }
  ];
  return async.mapSeries(
    batches,
    function (batch, _next) {
      // Is there data in this bulk of data
      let noData = batch.data.reduce(function (acc, item) {
        return acc && item.data.length === 0;
      }, true);
      let actions = [
        // Insert rows
        function (n) {
          let requests = [];
          let offset = 0;
          // if there is data or noDataRow should not be displayed, delete the "noDataRow"
          if ((!noData && batch.params.noDataRow) || !batch.params.noDataRow.display) {
            requests.push(
              Self.buildRequestDeleteRows(batch.sheet.id, batch.params.noDataRow.min - 1, batch.params.noDataRow.max)
            );
            offset -= batch.params.noDataRow.max - batch.params.noDataRow.min + 1;
          }
          // Copy/Paste template if necessary
          if (typeof batch.copyPaste === `object`) {
            let delta = batch.copyPaste.row.end - batch.copyPaste.row.begin + 1;
            offset += delta;
            requests.push(
              Self.buildRequestInsertRows(sheetId, batch.copyPaste.row.end, batch.copyPaste.row.end + delta + 1, false)
            );
            requests.push(
              Self.buildRequestCopyPaste(
                {
                  sheetId: sheetId,
                  startRowIndex: batch.copyPaste.row.begin,
                  endRowIndex: batch.copyPaste.row.end,
                  startColumnIndex: batch.copyPaste.column.begin,
                  endColumnIndex: batch.copyPaste.column.end
                },
                {
                  sheetId: sheetId,
                  startRowIndex: batch.copyPaste.row.begin + delta,
                  endRowIndex: batch.copyPaste.row.end + delta,
                  startColumnIndex: batch.copyPaste.column.begin,
                  endColumnIndex: batch.copyPaste.column.end
                }
              )
            );
            batch.row.min += offset;
            batch.row.max += offset;
            batch.row.insert += offset;
          }
          // insert rows if necessary
          for (let i = batch.data.length - 1; i >= 0; i--) {
            batch.data[i].row.min += offset;
            batch.data[i].row.insert += offset;
            batch.data[i].row.max += offset;
            // if there is data in this bulk of data
            if (batch.data[i].data.length > 0) {
              // insert row(s)
              requests.push(
                Self.buildRequestInsertRows(
                  sheetId,
                  batch.data[i].row.insert,
                  batch.data[i].row.insert + batch.data[i].data.length - 1,
                  true
                )
              );
              // merge cells
              for (let j = 0; j < batch.data[i].merges.length; j++) {
                let merge = batch.data[i].merges[j];
                requests.push(
                  Self.buildRequestMergeCells(
                    sheetId,
                    batch.data[i].row.insert,
                    batch.data[i].row.insert + batch.data[i].data.length - 1,
                    merge.begin,
                    merge.end
                  )
                );
              }
              // update borders
              requests.push(
                Self.buildRequestUpdateBorders(
                  sheetId,
                  batch.data[i].row.insert,
                  batch.data[i].row.insert + batch.data[i].data.length - 1,
                  0,
                  15
                )
              );
            }
            // delete row(s) if necessary
            else {
              requests.push(Self.buildRequestDeleteRows(sheetId, batch.data[i].row.min - 1, batch.data[i].row.max));
            }
          }
          // if there is no data at all, delete head row(s)
          if (noData && !batch.params.noDataRow.display)
            requests.push(Self.buildRequestDeleteRows(sheetId, batch.row.min - 1, batch.row.max));
          if (requests.length <= 0) return n();
          return gSheets.spreadsheets.batchUpdate(
            {
              // The ID of the spreadsheet to update.
              spreadsheetId: spreadsheetId,
              // Request body metadata
              requestBody: {
                includeSpreadsheetInResponse: false,
                responseIncludeGridData: false,
                // request body parameters
                requests: requests
              }
            },
            function (err, res) {
              setTimeout(function () {
                // process err or result here
                return n(err);
              }, conf.settings.googleAPI[`DataSeer Generic`].timeout);
            }
          );
        },
        // Update cells & Add data validations
        function (n) {
          let data = [];
          let offset = 0;
          // Copy/Paste template if necessary
          if (batch.copyPaste) {
            let delta = batch.copyPaste.row.end - batch.copyPaste.row.begin + 1;
            offset += delta;
          }
          let begin = batch.row.min;
          let end = batch.row.max;
          // fill rows if necessary
          if (typeof batch.fn === `function`) data.push(batch.fn(batch));
          for (let i = 0; i < batch.data.length; i++) {
            // if there is data in this bulk of data
            if (batch.data[i].data.length > 0) {
              batch.data[i].row.max += batch.data[i].data.length - 1;
              end += batch.data[i].row.max;
              // update row property of all the next items
              if (typeof batch.data[i + 1] !== `undefined`) {
                let d = batch.data[i].data.length - 1; // -1 because there is one line by default
                for (let j = i + 1; j < batch.data.length; j++) {
                  batch.data[j].row.min += d;
                  batch.data[j].row.insert += d;
                  batch.data[j].row.max += d;
                }
              }
              // fill row(s)
              for (let j = 0; j < batch.data[i].data.length; j++) {
                let item = batch.data[i].data[j];
                let rowIndex = batch.data[i].row.insert + j;
                data.push(Self.buildRequestUpdateCell(`'Detailed Report'!A${rowIndex}`, [j + 1]));
                for (let k = 0; k < batch.data[i].cells.length; k++) {
                  let info = batch.data[i].cells[k];
                  data.push(
                    Self.buildRequestUpdateCell(`'Detailed Report'!${info.column}${rowIndex}`, [item[info.property]])
                  );
                }
              }
            } else {
              // update row property of all the next items
              let d = batch.data[i].row.max - batch.data[i].row.min + 1;
              for (let j = i + 1; j < batch.data.length; j++) {
                batch.data[j].row.min -= d;
                batch.data[j].row.insert -= d;
                batch.data[j].row.max -= d;
              }
            }
          }
          // if there is data fill head row(s)
          if (batch.cells.length > 0 && batch.row.insert) {
            for (let i = 0; i < batch.cells.length; i++) {
              let rowIndex = batch.row.insert;
              let info = batch.cells[i];
              data.push(Self.buildRequestUpdateCell(`'Detailed Report'!${info.column}${rowIndex}`, [info.value]));
            }
          }
          if (data.length <= 0) return n();
          return gSheets.spreadsheets.values.batchUpdate(
            {
              // The ID of the spreadsheet to update.
              spreadsheetId: spreadsheetId,
              // Request body metadata
              requestBody: {
                // request body parameters
                data: data,
                valueInputOption: `USER_ENTERED`
              }
            },
            function (err, res) {
              setTimeout(function () {
                // process err or result here
                return n(err);
              }, conf.settings.googleAPI[`DataSeer Generic`].timeout);
            }
          );
        }
      ];
      return async.mapSeries(
        actions,
        function (action, next) {
          return action(function (err) {
            return next(err);
          });
        },
        function (err) {
          return _next(err);
        }
      );
    },
    function (err) {
      return cb(err);
    }
  );
};

/**
 * This function will fill 'Research Output Availability Statement' part of the report with given data and return the file ID (google file ID)
 * @param {object} opts - Options available
 * @param {string} opts.spreadsheetId - spreadsheetId
 * @param {object} opts.sheetId - sheetId
 * @param {object} opts.data - Data available
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR undefined)
 * @returns {undefined} undefined
 */
Self.fillResearchOutputAvailabilityStatementDataSeerGenericPart = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `spreadsheetId`) === `undefined`)
    return cb(Error(`Missing required data: opts.spreadsheetId`));
  if (typeof _.get(opts, `sheetId`) === `undefined`) return cb(Error(`Missing required data: opts.sheetId`));
  let spreadsheetId = _.get(opts, `spreadsheetId`);
  let sheetId = _.get(opts, `sheetId`);
  let data = _.get(opts, `data`, {});
  let protocols = _.get(data, `protocols`, []);
  let code = _.get(data, `code`, []);
  let software = _.get(data, `software`, []);
  let materials = _.get(data, `materials`, []);
  let datasets = _.get(data, `datasets`, []);
  let authors = _.get(data, `authors`);
  let documentId = _.get(data, `documentId`);
  let documentToken = _.get(data, `documentToken`);
  let orcids = [];
  for (let i = 0; i < authors.length; i++) {
    let author = authors[i];
    let orcidsFromAPI = _.get(author, `orcid.fromAPI`, [])
      .slice(0, 20)
      .filter(function (item) {
        return !!item[`orcid-id`];
      })
      .map(function (item) {
        return item[`orcid-id`];
      })
      .join(`, `);
    let orcidsFromTEI = _.get(author, `orcid.fromTEI`, []).join(`, `);
    let orcid = _.get(author, `orcid.currentValue`, ``);
    if (orcidsFromTEI.length > 0)
      orcids.push({
        name: author.name,
        identifier: orcid ? orcid : orcidsFromTEI ? orcidsFromTEI : ``
      });
  }
  let lines = {
    orcids: orcids.map(function (item) {
      return { name: item.name, URL: ``, identifier: item.identifier, notes: `` };
    }),
    datasets: datasets.map(function (item) {
      return {
        name: conf.settings.dataObjectsLinks[`DataSeer Generic`]
          ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
          : item.name,
        URL: item.URL,
        identifier: item.PID,
        notes: item.comments
      };
    }),
    code: code.map(function (item) {
      return {
        name: conf.settings.dataObjectsLinks[`DataSeer Generic`]
          ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
          : item.name,
        URL: item.URL,
        identifier: item.DOI,
        notes: item.comments
      };
    }),
    software: software.map(function (item) {
      return {
        name: conf.settings.dataObjectsLinks[`DataSeer Generic`]
          ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
          : item.name,
        URL: item.URL,
        identifier: item.RRID,
        notes: item.comments
      };
    }),
    materials: materials.map(function (item) {
      return {
        name: conf.settings.dataObjectsLinks[`DataSeer Generic`]
          ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
          : item.name,
        URL: item.source ? `${item.source} ` : `` + item.catalogNumber ? `${item.catalogNumber} ` : ``,
        identifier: item.RRID,
        notes: item.comments
      };
    }),
    protocols: protocols.map(function (item) {
      return { name: item.name, URL: item.URL, identifier: item.DOI, notes: item.comments };
    }),
    all: []
  };
  // Default values (to avoid offset bug)
  lines.orcids = lines.orcids.length ? lines.orcids : [{ name: ``, URL: ``, identifier: ``, notes: `` }];
  lines.datasets = lines.datasets.length ? lines.datasets : [{ name: ``, URL: ``, identifier: ``, notes: `` }];
  lines.code = lines.code.length ? lines.code : [{ name: ``, URL: ``, identifier: ``, notes: `` }];
  lines.software = lines.software.length ? lines.software : [{ name: ``, URL: ``, identifier: ``, notes: `` }];
  lines.materials = lines.materials.length ? lines.materials : [{ name: ``, URL: ``, identifier: ``, notes: `` }];
  lines.protocols = lines.protocols.length ? lines.protocols : [{ name: ``, URL: ``, identifier: ``, notes: `` }];
  // Concat all data
  lines.all = lines.datasets
    .concat(lines.code)
    .concat(lines.software)
    .concat(lines.materials)
    .concat(lines.protocols)
    .concat(lines.orcids);
  let actions = [
    // Insert rows
    function (next) {
      let requests = [];
      if (conf.settings.ROAS[`DataSeer Generic`]) {
        requests.push(Self.buildRequestInsertRows(sheetId, 16, 16 + lines.orcids.length - 1, true));
        requests.push(Self.buildRequestInsertRows(sheetId, 15, 15 + lines.protocols.length - 1, true));
        requests.push(Self.buildRequestInsertRows(sheetId, 14, 14 + lines.materials.length - 1, true));
        requests.push(Self.buildRequestInsertRows(sheetId, 13, 13 + lines.software.length - 1, true));
        requests.push(Self.buildRequestInsertRows(sheetId, 12, 12 + lines.code.length - 1, true));
        requests.push(Self.buildRequestInsertRows(sheetId, 11, 11 + lines.datasets.length - 1, true));
        requests.push(Self.buildRequestMergeCells(sheetId, 11, 11 + lines.all.length - 1, 1, 5));
        requests.push(Self.buildRequestMergeCells(sheetId, 11, 11 + lines.all.length - 1, 7, 9));
        requests.push(Self.buildRequestMergeCells(sheetId, 11, 11 + lines.all.length - 1, 9, 12));
        requests.push(Self.buildRequestUpdateBorders(sheetId, 11, 11 + lines.all.length - 1, 1, 12));
      } else {
        requests.push(Self.buildRequestDeleteRows(sheetId, 8, 17));
      }
      return gSheets.spreadsheets.batchUpdate(
        {
          // The ID of the spreadsheet to update.
          spreadsheetId: spreadsheetId,
          // Request body metadata
          requestBody: {
            includeSpreadsheetInResponse: false,
            responseIncludeGridData: false,
            // request body parameters
            requests: requests
          }
        },
        function (err, res) {
          return next(err);
        }
      );
    },
    // Update cells & Add data validations
    function (next) {
      if (!conf.settings.ROAS[`DataSeer Generic`]) return next();
      let data = [];
      let offset = 9;
      for (let i = 0; i < lines.all.length; i++) {
        let rowIndex = offset + i;
        data.push(Self.buildRequestUpdateCell(`'Detailed Report'!F${rowIndex}`, [lines.all[i].name]));
        data.push(Self.buildRequestUpdateCell(`'Detailed Report'!G${rowIndex}`, [lines.all[i].URL]));
        data.push(Self.buildRequestUpdateCell(`'Detailed Report'!H${rowIndex}`, [lines.all[i].identifier]));
        data.push(Self.buildRequestUpdateCell(`'Detailed Report'!J${rowIndex}`, [lines.all[i].notes]));
      }
      return gSheets.spreadsheets.values.batchUpdate(
        {
          // The ID of the spreadsheet to update.
          spreadsheetId: spreadsheetId,
          // Request body metadata
          requestBody: {
            // request body parameters
            data: data,
            valueInputOption: `USER_ENTERED`
          }
        },
        function (err, res) {
          return next(err);
        }
      );
    }
  ];
  return async.mapSeries(
    actions,
    function (action, next) {
      return action(function (err) {
        return next(err);
      });
    },
    function (err) {
      return cb(err);
    }
  );
};

/**
 * This function will fill Authors and Affiliation Report part with given data and return the file ID (google file ID)
 * @param {object} opts - Options available
 * @param {string} opts.spreadsheetId - spreadsheetId
 * @param {object} opts.sheetId - sheetId
 * @param {object} opts.data - Data available
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR undefined)
 * @returns {undefined} undefined
 */
Self.fillAuthorsAndAffiliationDataSeerGenericPart = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `spreadsheetId`) === `undefined`)
    return cb(Error(`Missing required data: opts.spreadsheetId`));
  if (typeof _.get(opts, `sheetId`) === `undefined`) return cb(Error(`Missing required data: opts.sheetId`));
  let spreadsheetId = _.get(opts, `spreadsheetId`);
  let sheetId = _.get(opts, `sheetId`);
  let data = _.get(opts, `data`, {});
  let authors = _.get(data, `authors`);
  let begin = 172;
  let actions = [
    // Insert or delete rows
    function (next) {
      let requests = [];
      if (conf.settings.authors[`DataSeer Generic`]) {
        // Lab Materials
        requests.push(Self.buildRequestInsertRows(sheetId, begin, begin + 1 + authors.length - 1, true));
        requests.push(Self.buildRequestMergeCells(sheetId, begin, begin + 1 + authors.length - 1, 2, 6));
        requests.push(Self.buildRequestMergeCells(sheetId, begin, begin + 1 + authors.length - 1, 6, 9));
        requests.push(Self.buildRequestMergeCells(sheetId, begin, begin + 1 + authors.length - 1, 9, 12));
        requests.push(Self.buildRequestUpdateBorders(sheetId, begin, begin + 1 + authors.length - 1, 2, 12));
      } else {
        requests.push(Self.buildRequestDeleteRows(sheetId, begin - 5));
      }
      return gSheets.spreadsheets.batchUpdate(
        {
          // The ID of the spreadsheet to update.
          spreadsheetId: spreadsheetId,
          // Request body metadata
          requestBody: {
            includeSpreadsheetInResponse: false,
            responseIncludeGridData: false,
            // request body parameters
            requests: requests
          }
        },
        function (err, res) {
          return next(err);
        }
      );
    },
    // Update cells & Add data validations
    function (next) {
      if (!conf.settings.authors[`DataSeer Generic`]) return next();
      let data = [];
      let offset = begin;
      for (let i = 0; i < authors.length; i++) {
        let rowIndex = begin + i;
        let orcidsFromAPI = _.get(authors[i], `orcid.fromAPI`, [])
          .slice(0, 20)
          .filter(function (item) {
            return !!item[`orcid-id`];
          })
          .map(function (item) {
            return item[`orcid-id`];
          })
          .join(`, `);
        let orcidsFromTEI = _.get(authors[i], `orcid.fromTEI`, []).join(`, `);
        let orcid = _.get(authors[i], `orcid.currentValue`, ``);
        data.push(Self.buildRequestUpdateCell(`'Detailed Report'!C${rowIndex}`, [authors[i].name]));
        data.push(
          Self.buildRequestUpdateCell(`'Detailed Report'!G${rowIndex}`, [
            orcid ? orcid : orcidsFromTEI ? orcidsFromTEI : ``
          ])
        );
        data.push(
          Self.buildRequestUpdateCell(`'Detailed Report'!J${rowIndex}`, [
            authors[i].orcid.suggestedValues.length ? authors[i].orcid.suggestedValues.join(`, `) : `Not Found`
          ])
        );
      }
      return gSheets.spreadsheets.values.batchUpdate(
        {
          // The ID of the spreadsheet to update.
          spreadsheetId: spreadsheetId,
          // Request body metadata
          requestBody: {
            // request body parameters
            data: data,
            valueInputOption: `USER_ENTERED`
          }
        },
        function (err, res) {
          return next(err);
        }
      );
    }
  ];
  return async.mapSeries(
    actions,
    function (action, next) {
      return action(function (err) {
        return next(err);
      });
    },
    function (err) {
      return cb(err);
    }
  );
};

/**
 * This function will fill summary part with given data and return the file ID (google file ID)
 * @param {object} opts - Options available
 * @param {string} opts.spreadsheetId - spreadsheetId
 * @param {object} opts.sheetId - sheetId
 * @param {object} opts.data - Data available
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR undefined)
 * @returns {undefined} undefined
 */
Self.fillSummaryDataSeerGenericPart = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `spreadsheetId`) === `undefined`)
    return cb(Error(`Missing required data: opts.spreadsheetId`));
  if (typeof _.get(opts, `sheetId`) === `undefined`) return cb(Error(`Missing required data: opts.sheetId`));
  let spreadsheetId = _.get(opts, `spreadsheetId`);
  let sheetId = _.get(opts, `sheetId`);
  let data = _.get(opts, `data`, {});
  let articleTitle = _.get(data, `articleTitle`, {});
  let authors = _.get(data, `authors`, []);
  let documentId = _.get(data, `documentId`);
  let documentToken = _.get(data, `documentToken`);
  let dataSeerLink = _.get(data, `dataSeerLink`, {});
  let DAS = _.get(data, `DAS`, {});
  let authorsNames = authors
    .map(function (item) {
      return item.name;
    })
    .join(`, `);
  let actions = [
    // Update cells & Add data validations
    function (next) {
      let date = new Date();
      let data = [
        Self.buildRequestUpdateCell(`'Detailed Report'!F2`, [articleTitle]),
        Self.buildRequestUpdateCell(`'Detailed Report'!F3`, [authorsNames]),
        Self.buildRequestUpdateCell(`'Detailed Report'!F4`, [
          `=LIEN_HYPERTEXTE("${dataSeerLink.url}";"${dataSeerLink.label}")`
        ]),
        Self.buildRequestUpdateCell(`'Detailed Report'!F5`, [
          `=DATE(${date.getFullYear()};${date.getMonth() + 1};${date.getDate()})`
        ]),
        Self.buildRequestUpdateCell(`'Detailed Report'!F6`, [DAS.content])
      ];
      return gSheets.spreadsheets.values.batchUpdate(
        {
          // The ID of the spreadsheet to update.
          spreadsheetId: spreadsheetId,
          // Request body metadata
          requestBody: {
            // request body parameters
            data: data,
            valueInputOption: `USER_ENTERED`
          }
        },
        function (err, res) {
          return next(err);
        }
      );
    }
  ];
  return async.mapSeries(
    actions,
    function (action, next) {
      return action(function (err) {
        return next(err);
      });
    },
    function (err) {
      return cb(err);
    }
  );
};

/**
 * This function will fill ASAP report with given data and return the file ID (google file ID)
 * @param {object} opts - Options available
 * @param {string} opts.spreadsheetId - spreadsheetId
 * @param {object} opts.data - Data available
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR undefined)
 * @returns {undefined} undefined
 */
Self.insertDataInASAPSheets = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `spreadsheetId`) === `undefined`)
    return cb(Error(`Missing required data: opts.spreadsheetId`));
  let spreadsheetId = _.get(opts, `spreadsheetId`);
  let data = _.get(opts, `data`, {});
  let doc = _.get(data, `document`, {});
  let metadata = _.get(data, `metadata`, {});
  let protocols = _.get(data, `protocols`, {});
  let code = _.get(data, `code`, {});
  let software = _.get(data, `software`, {});
  let reagents = _.get(data, `reagents`, {});
  let datasets = _.get(data, `datasets`, {});
  let summary = _.get(data, `summary`, {});
  let dataObjectsMetadata = _.get(data, `dataObjectsMetadata`, {});
  let filteredDatasets = [
    // Deposit to appropriate repository and cite PID in text
    datasets.filter(function (item) {
      return Self.getRuleKey(item.rules[`ASAP`].rule) === Self.getConfRuleKey(`ASAP`, `datasets`, null, `4`);
    }),
    // Cite dataset unique identifier in text
    datasets.filter(function (item) {
      return Self.getRuleKey(item.rules[`ASAP`].rule) === Self.getConfRuleKey(`ASAP`, `datasets`, null, `5`);
    }),
    // Verify dataset citation
    datasets.filter(function (item) {
      return Self.getRuleKey(item.rules[`ASAP`].rule) === Self.getConfRuleKey(`ASAP`, `datasets`, null, `3`);
    }),
    // Done - Cited correctly
    datasets.filter(function (item) {
      return Self.getRuleKey(item.rules[`ASAP`].rule) === Self.getConfRuleKey(`ASAP`, `datasets`, null, `0`);
    }),
    // Not required, but recommended to include the representative image/video files in raw format with dataset upload.
    datasets.filter(function (item) {
      return Self.getRuleKey(item.rules[`ASAP`].rule) === Self.getConfRuleKey(`ASAP`, `datasets`, null, `1`);
    }),
    // Confirmatory and Quality Control datasets are not required to be included in your dataset upload.
    datasets.filter(function (item) {
      return Self.getRuleKey(item.rules[`ASAP`].rule) === Self.getConfRuleKey(`ASAP`, `datasets`, null, `2`);
    })
  ];
  let filteredCode = [
    // Upload code to Zenodo and provide DOI
    code.filter(function (item) {
      let subType = item.dataType === `other` ? `` : item.subType;
      return Self.getRuleKey(item.rules[`ASAP`].rule) === Self.getConfRuleKey(`ASAP`, `code`, subType, `2`);
    }),
    // Verify citation
    code.filter(function (item) {
      let subType = item.dataType === `other` ? `` : item.subType;
      return Self.getRuleKey(item.rules[`ASAP`].rule) === Self.getConfRuleKey(`ASAP`, `code`, subType, `1`);
    }),
    // Done - Cited correctly
    code.filter(function (item) {
      let subType = item.dataType === `other` ? `` : item.subType;
      return Self.getRuleKey(item.rules[`ASAP`].rule) === Self.getConfRuleKey(`ASAP`, `code`, subType, `0`);
    })
  ];
  let filteredSoftware = [
    // Include missing information in citation
    software.filter(function (item) {
      let subType = item.dataType === `other` ? `` : item.subType;
      return Self.getRuleKey(item.rules[`ASAP`].rule) === Self.getConfRuleKey(`ASAP`, `software`, subType, `2`);
    }),
    // Verify citation
    software.filter(function (item) {
      let subType = item.dataType === `other` ? `` : item.subType;
      return Self.getRuleKey(item.rules[`ASAP`].rule) === Self.getConfRuleKey(`ASAP`, `software`, subType, `1`);
    }),
    // Done - Citation meets minimum standards
    software.filter(function (item) {
      let subType = item.dataType === `other` ? `` : item.subType;
      return Self.getRuleKey(item.rules[`ASAP`].rule) === Self.getConfRuleKey(`ASAP`, `software`, subType, `0`);
    })
  ];
  let filteredMaterials = [
    // Assign RRID and cite in text
    reagents.filter(function (item) {
      return Self.getRuleKey(item.rules[`ASAP`].rule) === Self.getConfRuleKey(`ASAP`, `reagents`, null, `3`);
    }),
    // Check for an existing RRID
    reagents.filter(function (item) {
      return Self.getRuleKey(item.rules[`ASAP`].rule) === Self.getConfRuleKey(`ASAP`, `reagents`, null, `2`);
    }),
    // Verify citation
    reagents.filter(function (item) {
      return Self.getRuleKey(item.rules[`ASAP`].rule) === Self.getConfRuleKey(`ASAP`, `reagents`, null, `1`);
    }),
    // Done - Cited correctly
    reagents.filter(function (item) {
      return Self.getRuleKey(item.rules[`ASAP`].rule) === Self.getConfRuleKey(`ASAP`, `reagents`, null, `0`);
    })
  ];
  let filteredProtocols = [
    // Deposit in repository and cite DOI in text
    protocols.filter(function (item) {
      let subType = item.dataType === `other` ? `` : item.subType;
      return Self.getRuleKey(item.rules[`ASAP`].rule) === Self.getConfRuleKey(`ASAP`, `protocols`, subType, `2`);
    }),
    // Confirm citations meet minimum standards
    protocols.filter(function (item) {
      let subType = item.dataType === `other` ? `` : item.subType;
      return Self.getRuleKey(item.rules[`ASAP`].rule) === Self.getConfRuleKey(`ASAP`, `protocols`, subType, `3`);
    }),
    // Verify citation
    protocols.filter(function (item) {
      let subType = item.dataType === `other` ? `` : item.subType;
      return Self.getRuleKey(item.rules[`ASAP`].rule) === Self.getConfRuleKey(`ASAP`, `protocols`, subType, `1`);
    }),
    // Done - Cited correctly
    protocols.filter(function (item) {
      let subType = item.dataType === `other` ? `` : item.subType;
      return Self.getRuleKey(item.rules[`ASAP`].rule) === Self.getConfRuleKey(`ASAP`, `protocols`, subType, `0`);
    })
  ];
  let filteredDataObject = {
    datasets: {
      filtered: filteredDatasets,
      identified: filteredDatasets.slice(0, 4).flat(),
      shared: filteredDatasets[3]
    },
    code: {
      filtered: filteredCode,
      identified: filteredCode.flat(),
      shared: filteredCode.slice(2).flat()
    },
    software: {
      filtered: filteredSoftware,
      identified: filteredSoftware.flat(),
      shared: filteredSoftware.slice(2).flat()
    },
    materials: {
      filtered: filteredMaterials,
      identified: filteredMaterials.flat(),
      shared: filteredMaterials.slice(3).flat()
    },
    protocols: {
      filtered: filteredProtocols,
      identified: filteredProtocols.flat(),
      shared: filteredProtocols.slice(3).flat()
    }
  };
  return Self.getSheets({ spreadsheetId: spreadsheetId }, function (err, sheets) {
    let summarySheetId = Self.getSheetId(sheets, `Summary Sheet`);
    let authorsAndAffiliationSheetId = Self.getSheetId(sheets, `Authors and Affiliation`);
    let datasetsReportSheetId = Self.getSheetId(sheets, `Datasets`);
    let codeAndSoftwareReportSheetId = Self.getSheetId(sheets, `Code and Software`);
    let labMaterialsReportSheetId = Self.getSheetId(sheets, `Lab Materials`);
    let protocolsReportSheetId = Self.getSheetId(sheets, `Protocols`);
    let ChartsSheetId = Self.getSheetId(sheets, `Charts`);
    let actions = [
      // fill 'Summary Sheet'
      function (next) {
        if (summarySheetId instanceof Error) return next(summarySheetId);
        return Self.fillSummaryASAPSheet(
          {
            spreadsheetId: spreadsheetId,
            sheetId: summarySheetId,
            data: {
              documentId: doc.id,
              token: doc.token,
              DAS: metadata.DAS,
              articleTitle: metadata.articleTitle,
              doi: metadata.doi,
              authors: metadata.authors,
              dataSeerLink: metadata.dataSeerLink,
              originalFileLink: metadata.originalFileLink,
              affiliationAcknowledgementsLicenseNotes: metadata.affiliationAcknowledgementsLicenseNotes,
              protocols: {
                notes: dataObjectsMetadata.protocols.notes,
                new: {
                  identified: filteredDataObject.protocols.identified.filter(function (item) {
                    return !item.reuse;
                  }).length,
                  shared: filteredDataObject.protocols.shared.filter(function (item) {
                    return !item.reuse;
                  }).length
                },
                reuse: {
                  identified: filteredDataObject.protocols.identified.filter(function (item) {
                    return item.reuse;
                  }).length,
                  shared: filteredDataObject.protocols.shared.filter(function (item) {
                    return item.reuse;
                  }).length
                }
              },
              codeAndSoftware: {
                notes: dataObjectsMetadata.codeAndSoftware.notes,
                code: {
                  identified: filteredDataObject.code.identified.length,
                  shared: filteredDataObject.code.shared.length
                },
                software: {
                  identified: filteredDataObject.software.identified.length,
                  shared: filteredDataObject.software.shared.length
                }
              },
              materials: {
                notes: dataObjectsMetadata.materials.notes,
                new: {
                  identified: filteredDataObject.materials.identified.filter(function (item) {
                    return !item.reuse;
                  }).length,
                  shared: filteredDataObject.materials.shared.filter(function (item) {
                    return !item.reuse;
                  }).length
                },
                reuse: {
                  identified: filteredDataObject.materials.identified.filter(function (item) {
                    return item.reuse;
                  }).length,
                  shared: filteredDataObject.materials.shared.filter(function (item) {
                    return item.reuse;
                  }).length
                }
              },
              datasets: {
                notes: dataObjectsMetadata.datasets.notes,
                new: {
                  identified: filteredDataObject.datasets.identified.filter(function (item) {
                    return !item.reuse;
                  }).length,
                  shared: filteredDataObject.datasets.shared.filter(function (item) {
                    return !item.reuse;
                  }).length
                },
                reuse: {
                  identified: filteredDataObject.datasets.identified.filter(function (item) {
                    return item.reuse;
                  }).length,
                  shared: filteredDataObject.datasets.shared.filter(function (item) {
                    return item.reuse;
                  }).length
                }
              }
            }
          },
          function (err, res) {
            return next(err);
          }
        );
      },
      // fill 'Research Output Availability Statement' part of the report
      function (next) {
        if (summarySheetId instanceof Error) return next(summarySheetId);
        return Self.fillResearchOutputAvailabilityStatementAndOtherInformationASAPPart(
          {
            spreadsheetId: spreadsheetId,
            sheetId: summarySheetId,
            data: {
              documentId: doc.id,
              documentToken: doc.token,
              authors: metadata.authors,
              roas: {
                datasets: filteredDataObject.datasets.filtered[3].filter(function (item) {
                  return !item.reuse;
                }),
                code: filteredDataObject.code.filtered[2].filter(function (item) {
                  return !item.reuse;
                }),
                software: filteredDataObject.software.filtered[2].filter(function (item) {
                  return !item.reuse;
                }),
                materials: filteredDataObject.materials.filtered[3].filter(function (item) {
                  return !item.reuse;
                }),
                protocols: filteredDataObject.protocols.filtered[3].filter(function (item) {
                  return !item.reuse;
                })
              },
              otherInformation: {
                datasets: datasets,
                code: code,
                software: software,
                materials: reagents,
                protocols: protocols
              }
            }
          },
          function (err, res) {
            return next(err);
          }
        );
      },
      // fill 'Authors and Affiliations'
      function (next) {
        if (authorsAndAffiliationSheetId instanceof Error) return next(authorsAndAffiliationSheetId);
        return Self.fillAuthorsAndAffiliationASAPSheet(
          {
            spreadsheetId: spreadsheetId,
            sheetId: authorsAndAffiliationSheetId,
            data: {
              metadata: metadata
            }
          },
          function (err, res) {
            return next(err);
          }
        );
      },
      // fill 'dataObject pages'
      function (next) {
        if (datasetsReportSheetId instanceof Error) return next(datasetsReportSheetId);
        if (codeAndSoftwareReportSheetId instanceof Error) return next(codeAndSoftwareReportSheetId);
        if (labMaterialsReportSheetId instanceof Error) return next(labMaterialsReportSheetId);
        if (protocolsReportSheetId instanceof Error) return next(protocolsReportSheetId);
        return Self.fillDataObjectsTabsASAPSheet(
          {
            spreadsheetId: spreadsheetId,
            sheets: {
              'datasets': { id: datasetsReportSheetId, name: `Datasets` },
              'code': { id: codeAndSoftwareReportSheetId, name: `Code and Software` },
              'software': { id: codeAndSoftwareReportSheetId, name: `Code and Software` },
              'codeAndSoftware': { id: codeAndSoftwareReportSheetId, name: `Code and Software` },
              'materials': { id: labMaterialsReportSheetId, name: `Lab Materials` },
              'protocols': { id: protocolsReportSheetId, name: `Protocols` }
            },
            data: {
              documentId: doc.id,
              documentToken: doc.token,

              summary: summary,
              datasets: filteredDataObject.datasets.filtered,
              code: filteredDataObject.code.filtered,
              software: filteredDataObject.software.filtered,
              materials: filteredDataObject.materials.filtered,
              protocols: filteredDataObject.protocols.filtered
            }
          },
          function (err, res) {
            return next(err);
          }
        );
      },
      // fill 'Charts'
      function (next) {
        if (ChartsSheetId instanceof Error) return next(ChartsSheetId);
        return Self.fillChartsASAPSheet(
          {
            spreadsheetId: spreadsheetId,
            sheetId: ChartsSheetId,
            data: {
              documentId: doc.id,
              documentToken: doc.token,
              token: doc.token,
              dataseerDomain: metadata.dataseerDomain
            }
          },
          function (err, res) {
            return next(err);
          }
        );
      }
    ];
    return async.mapSeries(
      actions,
      function (action, next) {
        return action(function (err) {
          return next(err);
        });
      },
      function (err) {
        return cb(err);
      }
    );
  });
};

/**
 * This function will fill 'Research Output Availability Statement' part of the report with given data and return the file ID (google file ID)
 * @param {object} opts - Options available
 * @param {string} opts.spreadsheetId - spreadsheetId
 * @param {object} opts.sheetId - sheetId
 * @param {object} opts.data - Data available
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR undefined)
 * @returns {undefined} undefined
 */
Self.fillResearchOutputAvailabilityStatementAndOtherInformationASAPPart = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `spreadsheetId`) === `undefined`)
    return cb(Error(`Missing required data: opts.spreadsheetId`));
  if (typeof _.get(opts, `sheetId`) === `undefined`) return cb(Error(`Missing required data: opts.sheetId`));
  let spreadsheetId = _.get(opts, `spreadsheetId`);
  let sheetId = _.get(opts, `sheetId`);
  let data = _.get(opts, `data`, {});
  let roas = {
    protocols: _.get(data, `roas.protocols`, []),
    code: _.get(data, `roas.code`, []),
    software: _.get(data, `roas.software`, []),
    materials: _.get(data, `roas.materials`, []),
    datasets: _.get(data, `roas.datasets`, [])
  };
  let otherInformation = {
    protocols: _.get(data, `otherInformation.protocols`, []),
    code: _.get(data, `otherInformation.code`, []),
    software: _.get(data, `otherInformation.software`, []),
    materials: _.get(data, `otherInformation.materials`, []),
    datasets: _.get(data, `otherInformation.datasets`, [])
  };
  let documentId = _.get(data, `documentId`);
  let documentToken = _.get(data, `documentToken`);
  let animalModels = otherInformation.materials
    .filter(function (item) {
      return item.subType === `organism`;
    })
    .map(function (item) {
      return {
        name: conf.settings.dataObjectsLinks[`ASAP`]
          ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
          : item.name,
        URL: item.source ? `${item.source} ` : `` + item.catalogNumber ? `${item.catalogNumber} ` : ``,
        identifier: item.RRID,
        notes: item.comments
      };
    });
  let cellLines = otherInformation.materials
    .filter(function (item) {
      return item.subType === `cell line`;
    })
    .map(function (item) {
      return {
        name: conf.settings.dataObjectsLinks[`ASAP`]
          ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
          : item.name,
        URL: item.source ? `${item.source} ` : `` + item.catalogNumber ? `${item.catalogNumber} ` : ``,
        identifier: item.RRID,
        notes: item.comments
      };
    });
  let lines = {
    datasets: roas.datasets.map(function (item) {
      return {
        name: conf.settings.dataObjectsLinks[`ASAP`]
          ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
          : item.name,
        URL: item.URL,
        identifier: item.PID,
        notes: item.comments
      };
    }),
    codeAndSoftware: roas.code
      .map(function (item) {
        return {
          name: conf.settings.dataObjectsLinks[`ASAP`]
            ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
            : item.name,
          URL: item.URL,
          identifier: item.DOI,
          notes: item.comments
        };
      })
      .concat(
        roas.software.map(function (item) {
          return {
            name: conf.settings.dataObjectsLinks[`ASAP`]
              ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
              : item.name,
            URL: item.URL,
            identifier: item.RRID,
            notes: item.comments
          };
        })
      ),
    materials: roas.materials.map(function (item) {
      return {
        name: conf.settings.dataObjectsLinks[`ASAP`]
          ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
          : item.name,
        URL: item.RRID,
        identifier: item.RRID,
        notes: item.comments
      };
    }),
    protocols: roas.protocols.map(function (item) {
      return {
        name: conf.settings.dataObjectsLinks[`ASAP`]
          ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
          : item.name,
        URL: item.URL,
        identifier: item.DOI,
        notes: item.comments
      };
    }),
    all: []
  };
  // Default values (to avoid offset bug)
  lines.datasets = lines.datasets.length ? lines.datasets : [{ name: ``, URL: ``, identifier: ``, notes: `` }];
  lines.codeAndSoftware = lines.codeAndSoftware.length
    ? lines.codeAndSoftware
    : [{ name: ``, URL: ``, identifier: ``, notes: `` }];
  lines.materials = lines.materials.length ? lines.materials : [{ name: ``, URL: ``, identifier: ``, notes: `` }];
  lines.protocols = lines.protocols.length ? lines.protocols : [{ name: ``, URL: ``, identifier: ``, notes: `` }];
  // Concat all data
  lines.all = lines.datasets.concat(lines.codeAndSoftware).concat(lines.materials).concat(lines.protocols);
  let actions = [
    // Insert rows
    function (next) {
      let otherInformation = [];
      if (cellLines.length > 1) {
        otherInformation.push(Self.buildRequestInsertRows(sheetId, 49, 49 + cellLines.length - 1, true));
        otherInformation.push(
          Self.buildRequestUpdateBorders(sheetId, 49, 49 + cellLines.length - 1, 3, 4, GRAY_BORDERS)
        );
      }
      if (animalModels.length > 1) {
        otherInformation.push(Self.buildRequestInsertRows(sheetId, 48, 48 + animalModels.length - 1, true));
        otherInformation.push(
          Self.buildRequestUpdateBorders(sheetId, 48, 48 + animalModels.length - 1, 3, 4, GRAY_BORDERS)
        );
      }
      // Headers of "Other Information" section
      otherInformation.push(Self.buildRequestUpdateBorders(sheetId, 47, 48, 0, 4, GRAY_BORDERS));
      let offset = animalModels.length > 1 ? animalModels.length - 1 : 0;
      otherInformation.push(Self.buildRequestUpdateBorders(sheetId, 48 + offset, 49 + offset, 0, 4, GRAY_BORDERS));
      offset += cellLines.length > 1 ? cellLines.length - 1 : 0;
      otherInformation.push(Self.buildRequestUpdateBorders(sheetId, 49 + offset, 50 + offset, 0, 4, GRAY_BORDERS));
      let researchOutputAvailabilityStatement = [];
      if (lines.protocols.length > 1)
        researchOutputAvailabilityStatement.push(
          Self.buildRequestInsertRows(sheetId, 44, 44 + lines.protocols.length - 1, true)
        );
      if (lines.materials.length > 1)
        researchOutputAvailabilityStatement.push(
          Self.buildRequestInsertRows(sheetId, 43, 43 + lines.materials.length - 1, true)
        );
      if (lines.codeAndSoftware.length > 1)
        researchOutputAvailabilityStatement.push(
          Self.buildRequestInsertRows(sheetId, 42, 42 + lines.codeAndSoftware.length - 1, true)
        );
      if (lines.datasets.length > 1)
        researchOutputAvailabilityStatement.push(
          Self.buildRequestInsertRows(sheetId, 41, 41 + lines.datasets.length - 1, true)
        );
      researchOutputAvailabilityStatement.push(
        Self.buildRequestUpdateBorders(sheetId, 40, 40 + lines.all.length, 6, 9, GRAY_BORDERS)
      );
      researchOutputAvailabilityStatement.push(
        Self.buildRequestUpdateBorders(sheetId, 40, 40 + lines.all.length, 5, 6, BLACK_BORDERS)
      );
      let deleteOffsetOfSections = [
        Self.buildRequestDeleteRange(sheetId, 38, 40 + lines.all.length, 0, 4, `ROWS`) // Other Information section
      ];
      let requests = otherInformation.concat(researchOutputAvailabilityStatement).concat(deleteOffsetOfSections);
      return gSheets.spreadsheets.batchUpdate(
        {
          // The ID of the spreadsheet to update.
          spreadsheetId: spreadsheetId,
          // Request body metadata
          requestBody: {
            includeSpreadsheetInResponse: false,
            responseIncludeGridData: false,
            // request body parameters
            requests: requests
          }
        },
        function (err, res) {
          return next(err);
        }
      );
    },
    // Update cells & Add data validations
    function (next) {
      let data = [];
      let offset = 41;
      for (let i = 0; i < lines.all.length; i++) {
        let rowIndex = offset + i;
        data.push(Self.buildRequestUpdateCell(`'Summary Sheet'!G${rowIndex}`, [lines.all[i].name]));
        data.push(
          Self.buildRequestUpdateCell(`'Summary Sheet'!H${rowIndex}`, [
            lines.all[i].URL ? lines.all[i].URL : lines.all[i].identifier
          ])
        );
        data.push(
          Self.buildRequestUpdateCell(`'Summary Sheet'!I${rowIndex}`, [
            `=IMPORTDATA("${Url.build(`/api/identifiers/customList/isIn`, {
              token: documentToken,
              minScore: 1,
              contain: true
            })}&name="&H${rowIndex})`
          ])
        );
      }
      offset = 42; // Because this section is now on the left of ROAS section
      if (animalModels.length > 0) {
        data.push(Self.buildRequestUpdateCell(`'Summary Sheet'!B${offset}`, [animalModels.length]));
        for (let i = 0; i < animalModels.length; i++) {
          let rowIndex = offset + i;
          data.push(Self.buildRequestUpdateCell(`'Summary Sheet'!D${rowIndex}`, [animalModels[i].name]));
        }
      }
      offset += animalModels.length > 0 ? animalModels.length : 1;
      if (cellLines.length > 0) {
        data.push(Self.buildRequestUpdateCell(`'Summary Sheet'!B${offset}`, [cellLines.length]));
        for (let i = 0; i < cellLines.length; i++) {
          let rowIndex = offset + i;
          data.push(Self.buildRequestUpdateCell(`'Summary Sheet'!D${rowIndex}`, [cellLines[i].name]));
        }
      }
      return gSheets.spreadsheets.values.batchUpdate(
        {
          // The ID of the spreadsheet to update.
          spreadsheetId: spreadsheetId,
          // Request body metadata
          requestBody: {
            // request body parameters
            data: data,
            valueInputOption: `USER_ENTERED`
          }
        },
        function (err, res) {
          return next(err);
        }
      );
    }
  ];
  return async.mapSeries(
    actions,
    function (action, next) {
      return action(function (err) {
        return next(err);
      });
    },
    function (err) {
      return cb(err);
    }
  );
};

/**
 * This function will fill charts sheet with given data and return the file ID (google file ID)
 * @param {object} opts - Options available
 * @param {string} opts.spreadsheetId - spreadsheetId
 * @param {object} opts.sheetId - sheetId
 * @param {object} opts.data - Data available
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR undefined)
 * @returns {undefined} undefined
 */
Self.fillChartsASAPSheet = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `spreadsheetId`) === `undefined`)
    return cb(Error(`Missing required data: opts.spreadsheetId`));
  if (typeof _.get(opts, `sheetId`) === `undefined`) return cb(Error(`Missing required data: opts.sheetId`));
  let spreadsheetId = _.get(opts, `spreadsheetId`);
  let sheetId = _.get(opts, `sheetId`);
  let data = _.get(opts, `data`, {});
  let documentId = _.get(data, `documentId`);
  let documentToken = _.get(data, `documentToken`);
  let token = _.get(data, `token`);
  let dataseerDomain = _.get(data, `dataseerDomain`);
  let _data = [
    Self.buildRequestUpdateCell(`'Charts'!N2`, [dataseerDomain]),
    Self.buildRequestUpdateCell(`'Charts'!N3`, [documentId]),
    Self.buildRequestUpdateCell(`'Charts'!N4`, [token])
  ];
  return gSheets.spreadsheets.values.batchUpdate(
    {
      // The ID of the spreadsheet to update.
      spreadsheetId: spreadsheetId,
      // Request body metadata
      requestBody: {
        // request body parameters
        data: _data,
        valueInputOption: `USER_ENTERED`
      }
    },
    function (err, res) {
      return cb(err);
    }
  );
};

/**
 * This function will fill Detailed Report sheet with given data and return the file ID (google file ID)
 * @param {object} opts - Options available
 * @param {string} opts.spreadsheetId - spreadsheetId
 * @param {object} opts.sheets - All sheets
 * @param {object} opts.data - Data available
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR undefined)
 * @returns {undefined} undefined
 */
Self.fillDataObjectsTabsASAPSheet = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `spreadsheetId`) === `undefined`)
    return cb(Error(`Missing required data: opts.spreadsheetId`));
  if (typeof _.get(opts, `sheets`) === `undefined`) return cb(Error(`Missing required data: opts.sheets`));
  let spreadsheetId = _.get(opts, `spreadsheetId`);
  let sheets = _.get(opts, `sheets`);
  let datasetsReportSheet = _.get(sheets, `datasets`);
  let codeReportSheet = _.get(sheets, `code`);
  let softwareReportSheet = _.get(sheets, `software`);
  let codeAndSoftwareReportSheet = _.get(sheets, `codeAndSoftware`);
  let materialsReportSheet = _.get(sheets, `materials`);
  let protocolsReportSheet = _.get(sheets, `protocols`);
  let data = _.get(opts, `data`, {});
  let summary = _.get(data, `summary`, []);
  let protocols = _.get(data, `protocols`, []);
  let code = _.get(data, `code`, []);
  let software = _.get(data, `software`, []);
  let materials = _.get(data, `materials`, []);
  let datasets = _.get(data, `datasets`, []);
  let documentId = _.get(data, `documentId`);
  let documentToken = _.get(data, `documentToken`);
  let sortedDatasets = {};
  // Regroup datasets by datatype
  for (let i = 0; i < datasets.length; i++) {
    let dataset = datasets[i];
    if (typeof sortedDatasets[dataset.dataType] === `undefined`)
      sortedDatasets[dataset.dataType] = { name: dataset.dataType, list: [] };
    sortedDatasets[dataset.dataType].list.push(dataset);
  }
  // Compute batches commands
  let batches = [
    // protocols
    {
      sheet: protocolsReportSheet,
      row: { min: 3, max: 3, insert: 3 },
      column: { min: 0, max: 8 },
      params: {
        noDataRow: { min: 4, max: 7 }
      },
      cells: [],
      data: [
        {
          merges: [],
          row: { min: 8, max: 13, insert: 11 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `issue` },
            { column: `D`, property: `name` },
            { column: `E`, property: `URL` },
            { column: `F`, property: `DOI` },
            { column: `G`, property: `protocolType` },
            { column: `H`, property: `notes` }
          ],
          // Deposit in repository and cite DOI in text
          data: protocols[0].map(function (item) {
            return {
              reuse: item.reuse,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`ASAP`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              DOI: item.DOI,
              URL: item.URL,
              protocolType: item.type.url
                ? `=LIEN_HYPERTEXTE("${item.type.url}";"${item.type.label}")`
                : item.type.label,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `)
            };
          })
        },
        {
          merges: [],
          row: { min: 14, max: 19, insert: 17 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `issue` },
            { column: `D`, property: `name` },
            { column: `E`, property: `URL` },
            { column: `F`, property: `DOI` },
            { column: `G`, property: `protocolType` },
            { column: `H`, property: `notes` }
          ],
          // Confirm citations meet minimum standards
          data: protocols[1].map(function (item) {
            return {
              reuse: item.reuse,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`ASAP`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              DOI: item.DOI,
              URL: item.URL,
              protocolType: item.type.url
                ? `=LIEN_HYPERTEXTE("${item.type.url}";"${item.type.label}")`
                : item.type.label,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `)
            };
          })
        },
        {
          merges: [],
          row: { min: 20, max: 25, insert: 23 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `issue` },
            { column: `D`, property: `name` },
            { column: `E`, property: `URL` },
            { column: `F`, property: `DOI` },
            { column: `G`, property: `protocolType` },
            { column: `H`, property: `notes` }
          ],
          // Verify citation
          data: protocols[2].map(function (item) {
            return {
              reuse: item.reuse,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`ASAP`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              DOI: item.DOI,
              URL: item.URL,
              protocolType: item.type.url
                ? `=LIEN_HYPERTEXTE("${item.type.url}";"${item.type.label}")`
                : item.type.label,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `)
            };
          })
        },
        {
          merges: [],
          row: { min: 26, max: 30, insert: 28 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `issue` },
            { column: `D`, property: `name` },
            { column: `E`, property: `URL` },
            { column: `F`, property: `DOI` },
            { column: `G`, property: `protocolType` },
            { column: `H`, property: `notes` }
          ],
          // Done - Cited correctly
          data: protocols[3].map(function (item) {
            return {
              reuse: item.reuse,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`ASAP`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              DOI: item.DOI,
              URL: item.URL,
              protocolType: item.type.url
                ? `=LIEN_HYPERTEXTE("${item.type.url}";"${item.type.label}")`
                : item.type.label,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `)
            };
          })
        }
      ]
    },
    // lab materials
    {
      sheet: materialsReportSheet,
      row: { min: 3, max: 3, insert: 3 },
      column: { min: 0, max: 12 },
      params: {
        noDataRow: { min: 4, max: 7 }
      },
      cells: [],
      data: [
        {
          merges: [],
          row: { min: 8, max: 13, insert: 11 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `issue` },
            { column: `D`, property: `name` },
            { column: `E`, property: `sentences` },
            { column: `F`, property: `source` },
            { column: `G`, property: `catalog` },
            { column: `H`, property: `RRID` },
            { column: `I`, property: `datatype` },
            { column: `J`, property: `suggestedEntity` },
            { column: `K`, property: `suggestedRRID` },
            { column: `L`, property: `notes` }
          ],
          // Assign RRID and cite in text
          data: materials[0].map(function (item) {
            return {
              reuse: item.reuse,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`ASAP`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              repository: item.DOI,
              datatype: item.type.url ? `=LIEN_HYPERTEXTE("${item.type.url}";"${item.type.label}")` : item.type.label,
              source: item.source,
              RRID: item.RRID,
              suggestedEntity: item.suggestedEntity,
              catalog: item.catalogNumber,
              suggestedRRID: item.suggestedRRID
            };
          })
        },
        {
          merges: [],
          row: { min: 14, max: 19, insert: 17 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `issue` },
            { column: `D`, property: `name` },
            { column: `E`, property: `sentences` },
            { column: `F`, property: `source` },
            { column: `G`, property: `catalog` },
            { column: `H`, property: `RRID` },
            { column: `I`, property: `datatype` },
            { column: `J`, property: `suggestedEntity` },
            { column: `K`, property: `suggestedRRID` },
            { column: `L`, property: `notes` }
          ],
          // Check for an existing RRID
          data: materials[1].map(function (item) {
            return {
              reuse: item.reuse,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`ASAP`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              repository: item.DOI,
              datatype: item.type.url ? `=LIEN_HYPERTEXTE("${item.type.url}";"${item.type.label}")` : item.type.label,
              source: item.source,
              RRID: item.RRID,
              suggestedEntity: item.suggestedEntity,
              catalog: item.catalogNumber,
              suggestedRRID: item.suggestedRRID
            };
          })
        },
        {
          merges: [],
          row: { min: 20, max: 25, insert: 23 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `issue` },
            { column: `D`, property: `name` },
            { column: `E`, property: `sentences` },
            { column: `F`, property: `source` },
            { column: `G`, property: `catalog` },
            { column: `H`, property: `RRID` },
            { column: `I`, property: `datatype` },
            { column: `J`, property: `suggestedEntity` },
            { column: `K`, property: `suggestedRRID` },
            { column: `L`, property: `notes` }
          ],
          // Verify citation
          data: materials[2].map(function (item) {
            return {
              reuse: item.reuse,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`ASAP`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              repository: item.DOI,
              datatype: item.type.url ? `=LIEN_HYPERTEXTE("${item.type.url}";"${item.type.label}")` : item.type.label,
              source: item.source,
              RRID: item.RRID,
              suggestedEntity: item.suggestedEntity,
              catalog: item.catalogNumber,
              suggestedRRID: item.suggestedRRID
            };
          })
        },
        {
          merges: [],
          row: { min: 26, max: 30, insert: 28 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `issue` },
            { column: `D`, property: `name` },
            { column: `E`, property: `sentences` },
            { column: `F`, property: `source` },
            { column: `G`, property: `catalog` },
            { column: `H`, property: `RRID` },
            { column: `I`, property: `datatype` },
            { column: `J`, property: `suggestedEntity` },
            { column: `K`, property: `suggestedRRID` },
            { column: `L`, property: `notes` }
          ],
          // Done - Cited correctly
          data: materials[3].map(function (item) {
            return {
              reuse: item.reuse,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`ASAP`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              repository: item.DOI,
              datatype: item.type.url ? `=LIEN_HYPERTEXTE("${item.type.url}";"${item.type.label}")` : item.type.label,
              source: item.source,
              RRID: item.RRID,
              suggestedEntity: item.suggestedEntity,
              catalog: item.catalogNumber,
              suggestedRRID: item.suggestedRRID
            };
          })
        },
        {
          merges: [],
          row: { min: 31, max: 36, insert: 34 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `issue` },
            { column: `D`, property: `name` },
            { column: `E`, property: `sentences` },
            { column: `F`, property: `source` },
            { column: `G`, property: `catalog` },
            { column: `H`, property: `RRID` },
            { column: `I`, property: `datatype` },
            { column: `J`, property: `suggestedEntity` },
            { column: `K`, property: `suggestedRRID` },
            { column: `L`, property: `notes` }
          ],
          // None - Citation meets minimum standards
          data: []
        }
      ]
    },
    // code and software
    // software
    {
      sheet: codeAndSoftwareReportSheet,
      row: { min: 26, max: 26, insert: 26 },
      column: { min: 0, max: 11 },
      params: {
        noDataRow: { min: 27, max: 30 }
      },
      cells: [],
      data: [
        {
          merges: [],
          row: { min: 31, max: 36, insert: 34 },
          cells: [
            { column: `B`, property: `issue` },
            { column: `C`, property: `version` },
            { column: `D`, property: `name` },
            { column: `E`, property: `sentences` },
            { column: `F`, property: `URL` },
            { column: `G`, property: `RRID` },
            { column: `H`, property: `suggestedEntity` },
            { column: `I`, property: `suggestedRRID` },
            { column: `J`, property: `suggestedURL` },
            { column: `K`, property: `notes` }
          ],
          // Include missing information in citation
          data: software[0].map(function (item) {
            return {
              reuse: item.reuse,
              version: item.version,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`ASAP`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              URL: item.URL,
              RRID: item.RRID,
              suggestedEntity: item.suggestedEntity,
              suggestedRRID: item.suggestedRRID,
              suggestedURL: item.suggestedURL,
              notes: item.comments
            };
          })
        },
        {
          merges: [],
          row: { min: 37, max: 42, insert: 40 },
          cells: [
            { column: `B`, property: `issue` },
            { column: `C`, property: `version` },
            { column: `D`, property: `name` },
            { column: `E`, property: `sentences` },
            { column: `F`, property: `URL` },
            { column: `G`, property: `RRID` },
            { column: `H`, property: `suggestedEntity` },
            { column: `I`, property: `suggestedRRID` },
            { column: `J`, property: `suggestedURL` },
            { column: `K`, property: `notes` }
          ],
          // Verify citation
          data: software[1].map(function (item) {
            return {
              reuse: item.reuse,
              version: item.version,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`ASAP`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              URL: item.URL,
              RRID: item.RRID,
              suggestedEntity: item.suggestedEntity,
              suggestedRRID: item.suggestedRRID,
              suggestedURL: item.suggestedURL,
              notes: item.comments
            };
          })
        },
        {
          merges: [],
          row: { min: 43, max: 48, insert: 46 },
          cells: [
            { column: `B`, property: `issue` },
            { column: `C`, property: `version` },
            { column: `D`, property: `name` },
            { column: `E`, property: `sentences` },
            { column: `F`, property: `URL` },
            { column: `G`, property: `RRID` },
            { column: `H`, property: `suggestedEntity` },
            { column: `I`, property: `suggestedRRID` },
            { column: `J`, property: `suggestedURL` },
            { column: `K`, property: `notes` }
          ],
          // Done - Citation meets minimum standards
          data: software[2].map(function (item) {
            return {
              reuse: item.reuse,
              version: item.version,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`ASAP`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              URL: item.URL,
              RRID: item.RRID,
              suggestedEntity: item.suggestedEntity,
              suggestedRRID: item.suggestedRRID,
              suggestedURL: item.suggestedURL,
              notes: item.comments
            };
          })
        }
      ]
    },
    // code
    {
      sheet: codeAndSoftwareReportSheet,
      row: { min: 3, max: 3, insert: 3 },
      column: { min: 0, max: 11 },
      params: {
        noDataRow: { min: 4, max: 7 }
      },
      cells: [],
      data: [
        {
          merges: [
            { begin: 1, end: 3 },
            { begin: 6, end: 8 },
            { begin: 8, end: 11 }
          ],
          row: { min: 8, max: 13, insert: 11 },
          cells: [
            { column: `B`, property: `issue` },
            { column: `D`, property: `name` },
            { column: `E`, property: `sentences` },
            { column: `F`, property: `URL` },
            { column: `G`, property: `DOI` },
            { column: `I`, property: `notes` }
          ],
          // Upload code to Zenodo and provide DOI
          data: code[0].map(function (item) {
            return {
              reuse: item.reuse,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`ASAP`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              DOI: item.DOI,
              URL: item.URL
            };
          })
        },
        {
          merges: [
            { begin: 1, end: 3 },
            { begin: 6, end: 8 },
            { begin: 8, end: 11 }
          ],
          row: { min: 14, max: 19, insert: 17 },
          cells: [
            { column: `B`, property: `issue` },
            { column: `D`, property: `name` },
            { column: `E`, property: `sentences` },
            { column: `F`, property: `URL` },
            { column: `G`, property: `DOI` },
            { column: `I`, property: `notes` }
          ],
          // Verify citation
          data: code[1].map(function (item) {
            return {
              reuse: item.reuse,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`ASAP`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              DOI: item.DOI,
              URL: item.URL
            };
          })
        },
        {
          merges: [
            { begin: 1, end: 3 },
            { begin: 6, end: 8 },
            { begin: 8, end: 11 }
          ],
          row: { min: 20, max: 25, insert: 22 },
          cells: [
            { column: `B`, property: `issue` },
            { column: `D`, property: `name` },
            { column: `E`, property: `sentences` },
            { column: `F`, property: `URL` },
            { column: `G`, property: `DOI` },
            { column: `I`, property: `notes` }
          ],
          // Done - Cited correctly
          data: code[2].map(function (item) {
            return {
              reuse: item.reuse,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`ASAP`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              DOI: item.DOI,
              URL: item.URL
            };
          })
        }
      ]
    },
    // datasets
    {
      sheet: datasetsReportSheet,
      row: { min: 3, max: 3, insert: 3 },
      column: { min: 0, max: 12 },
      params: {
        noDataRow: { min: 4, max: 7 }
      },
      cells: [],
      data: [
        {
          merges: [],
          row: { min: 8, max: 13, insert: 11 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `qc` },
            { column: `D`, property: `representativeImage` },
            { column: `E`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `H`, property: `URL` },
            { column: `I`, property: `PID` },
            { column: `J`, property: `notes` },
            { column: `K`, property: `figureOrTable` },
            { column: `L`, property: `datatype` }
          ],
          // Deposit to appropriate repository and cite PID in text
          data: datasets[0].map(function (item) {
            return {
              reuse: item.reuse,
              qc: item.qc,
              representativeImage: item.representativeImage,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`ASAP`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              URL: item.URL,
              PID: item.PID,
              notes: item.comments,
              figureOrTable: item.associatedFigureOrTable,
              datatype:
                item.type && item.type.url
                  ? `=LIEN_HYPERTEXTE("${item.type.url}";"${item.type.label}")`
                  : item.type.label
            };
          })
        },
        {
          merges: [],
          row: { min: 14, max: 19, insert: 17 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `qc` },
            { column: `D`, property: `representativeImage` },
            { column: `E`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `H`, property: `URL` },
            { column: `I`, property: `PID` },
            { column: `J`, property: `notes` },
            { column: `K`, property: `figureOrTable` },
            { column: `L`, property: `datatype` }
          ],
          // Cite dataset unique identifier in text
          data: datasets[1].map(function (item) {
            return {
              reuse: item.reuse,
              qc: item.qc,
              representativeImage: item.representativeImage,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`ASAP`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              URL: item.URL,
              PID: item.PID,
              notes: item.comments,
              figureOrTable: item.associatedFigureOrTable,
              datatype:
                item.type && item.type.url
                  ? `=LIEN_HYPERTEXTE("${item.type.url}";"${item.type.label}")`
                  : item.type.label
            };
          })
        },
        {
          merges: [],
          row: { min: 20, max: 25, insert: 23 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `qc` },
            { column: `D`, property: `representativeImage` },
            { column: `E`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `H`, property: `URL` },
            { column: `I`, property: `PID` },
            { column: `J`, property: `notes` },
            { column: `K`, property: `figureOrTable` },
            { column: `L`, property: `datatype` }
          ],
          // Verify dataset citation
          data: datasets[2].map(function (item) {
            return {
              reuse: item.reuse,
              qc: item.qc,
              representativeImage: item.representativeImage,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`ASAP`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              URL: item.URL,
              PID: item.PID,
              notes: item.comments,
              figureOrTable: item.associatedFigureOrTable,
              datatype:
                item.type && item.type.url
                  ? `=LIEN_HYPERTEXTE("${item.type.url}";"${item.type.label}")`
                  : item.type.label
            };
          })
        },
        {
          merges: [],
          row: { min: 26, max: 30, insert: 28 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `qc` },
            { column: `D`, property: `representativeImage` },
            { column: `E`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `H`, property: `URL` },
            { column: `I`, property: `PID` },
            { column: `J`, property: `notes` },
            { column: `K`, property: `figureOrTable` },
            { column: `L`, property: `datatype` }
          ],
          // Done - Cited correctly
          data: datasets[3].map(function (item) {
            return {
              reuse: item.reuse,
              qc: item.qc,
              representativeImage: item.representativeImage,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`ASAP`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              URL: item.URL,
              PID: item.PID,
              notes: item.comments,
              figureOrTable: item.associatedFigureOrTable,
              datatype:
                item.type && item.type.url
                  ? `=LIEN_HYPERTEXTE("${item.type.url}";"${item.type.label}")`
                  : item.type.label
            };
          })
        },
        {
          merges: [],
          row: { min: 31, max: 36, insert: 34 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `qc` },
            { column: `D`, property: `representativeImage` },
            { column: `E`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `H`, property: `URL` },
            { column: `I`, property: `PID` },
            { column: `J`, property: `notes` },
            { column: `K`, property: `figureOrTable` },
            { column: `L`, property: `datatype` }
          ],
          // Not required, but recommended to include the representative image/video files in raw format with dataset upload.
          data: datasets[4].map(function (item) {
            return {
              reuse: item.reuse,
              qc: item.qc,
              representativeImage: item.representativeImage,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`ASAP`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              URL: item.URL,
              PID: item.PID,
              notes: item.comments,
              figureOrTable: item.associatedFigureOrTable,
              datatype:
                item.type && item.type.url
                  ? `=LIEN_HYPERTEXTE("${item.type.url}";"${item.type.label}")`
                  : item.type.label
            };
          })
        },
        {
          merges: [],
          row: { min: 37, max: 42, insert: 40 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `qc` },
            { column: `D`, property: `representativeImage` },
            { column: `E`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `H`, property: `URL` },
            { column: `I`, property: `PID` },
            { column: `J`, property: `notes` },
            { column: `K`, property: `figureOrTable` },
            { column: `L`, property: `datatype` }
          ],
          // Confirmatory and Quality Control datasets are not required to be included in your dataset upload.
          data: datasets[5].map(function (item) {
            return {
              reuse: item.reuse,
              qc: item.qc,
              representativeImage: item.representativeImage,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`ASAP`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              URL: item.URL,
              PID: item.PID,
              notes: item.comments,
              figureOrTable: item.associatedFigureOrTable,
              datatype:
                item.type && item.type.url
                  ? `=LIEN_HYPERTEXTE("${item.type.url}";"${item.type.label}")`
                  : item.type.label
            };
          })
        }
      ]
    }
  ];
  return async.mapSeries(
    batches,
    function (batch, _next) {
      // Is there data in this bulk of data
      let noData = batch.data.reduce(function (acc, item) {
        return acc && item.data.length === 0;
      }, true);
      let actions = [
        // Insert rows
        function (n) {
          let requests = [];
          let offset = 0;
          // if there is data, delete the "noDataRow"
          if (!noData && batch.params.noDataRow) {
            requests.push(
              Self.buildRequestDeleteRows(batch.sheet.id, batch.params.noDataRow.min - 1, batch.params.noDataRow.max)
            );
            offset -= batch.params.noDataRow.max - batch.params.noDataRow.min + 1;
          }
          // insert rows if necessary
          for (let i = batch.data.length - 1; i >= 0; i--) {
            batch.data[i].row.min += offset;
            batch.data[i].row.insert += offset;
            batch.data[i].row.max += offset;
            if (batch.data[i].data.length > 0) {
              // insert row(s)
              requests.push(
                Self.buildRequestInsertRows(
                  batch.sheet.id,
                  batch.data[i].row.insert,
                  batch.data[i].row.insert + batch.data[i].data.length - 1,
                  true
                )
              );
              // merge cells
              for (let j = 0; j < batch.data[i].merges.length; j++) {
                let merge = batch.data[i].merges[j];
                requests.push(
                  Self.buildRequestMergeCells(
                    batch.sheet.id,
                    batch.data[i].row.insert,
                    batch.data[i].row.insert + batch.data[i].data.length - 1,
                    merge.begin,
                    merge.end
                  )
                );
              }
              // update borders
              requests.push(
                Self.buildRequestUpdateBorders(
                  batch.sheet.id,
                  batch.data[i].row.insert,
                  batch.data[i].row.insert + batch.data[i].data.length - 1,
                  batch.column.min,
                  batch.column.max
                )
              );
            }
            // delete row(s) if necessary
            else {
              requests.push(
                Self.buildRequestDeleteRows(batch.sheet.id, batch.data[i].row.min - 1, batch.data[i].row.max)
              );
            }
          }
          if (requests.length <= 0) return n();
          return gSheets.spreadsheets.batchUpdate(
            {
              // The ID of the spreadsheet to update.
              spreadsheetId: spreadsheetId,
              // Request body metadata
              requestBody: {
                includeSpreadsheetInResponse: false,
                responseIncludeGridData: false,
                // request body parameters
                requests: requests
              }
            },
            function (err, res) {
              setTimeout(function () {
                // process err or result here
                return n(err);
              }, conf.settings.googleAPI[`ASAP`].timeout);
            }
          );
        },
        // Update cells & Add data validations
        function (n) {
          let data = [];
          let offset = 0;
          // Copy/Paste template if necessary
          if (batch.copyPaste) {
            let delta = batch.copyPaste.row.end - batch.copyPaste.row.begin + 1;
            offset += delta;
          }
          // fill rows if necessary
          for (let i = 0; i < batch.data.length; i++) {
            // if there is data in this bulk of data
            if (batch.data[i].data.length > 0) {
              batch.data[i].row.max += batch.data[i].data.length - 1;
              // update row property of all the next items
              if (typeof batch.data[i + 1] !== `undefined`) {
                let d = batch.data[i].data.length - 1; // -1 because there is one line by default
                for (let j = i + 1; j < batch.data.length; j++) {
                  batch.data[j].row.min += d;
                  batch.data[j].row.insert += d;
                  batch.data[j].row.max += d;
                }
              }
              // fill row(s)
              for (let j = 0; j < batch.data[i].data.length; j++) {
                let item = batch.data[i].data[j];
                let rowIndex = batch.data[i].row.insert + j;
                data.push(Self.buildRequestUpdateCell(`${batch.sheet.name}!A${rowIndex}`, [j + 1]));
                for (let k = 0; k < batch.data[i].cells.length; k++) {
                  let info = batch.data[i].cells[k];
                  data.push(
                    Self.buildRequestUpdateCell(`${batch.sheet.name}!${info.column}${rowIndex}`, [item[info.property]])
                  );
                }
              }
            } else {
              // update row property of all the next items
              let d = batch.data[i].row.max - batch.data[i].row.min + 1;
              for (let j = i + 1; j < batch.data.length; j++) {
                batch.data[j].row.min -= d;
                batch.data[j].row.insert -= d;
                batch.data[j].row.max -= d;
              }
            }
          }
          // if there is data fill head row(s)
          if (batch.cells.length > 0 && batch.row.insert) {
            for (let i = 0; i < batch.cells.length; i++) {
              let rowIndex = batch.row.insert;
              let info = batch.cells[i];
              data.push(Self.buildRequestUpdateCell(`${batch.sheet.name}!${info.column}${rowIndex}`, [info.value]));
            }
          }
          if (data.length <= 0) return n();
          return gSheets.spreadsheets.values.batchUpdate(
            {
              // The ID of the spreadsheet to update.
              spreadsheetId: spreadsheetId,
              // Request body metadata
              requestBody: {
                // request body parameters
                data: data,
                valueInputOption: `USER_ENTERED`
              }
            },
            function (err, res) {
              setTimeout(function () {
                // process err or result here
                return n(err);
              }, conf.settings.googleAPI[`ASAP`].timeout);
            }
          );
        }
      ];
      return async.mapSeries(
        actions,
        function (action, next) {
          return action(function (err) {
            return next(err);
          });
        },
        function (err) {
          return _next(err);
        }
      );
    },
    function (err) {
      return cb(err);
    }
  );
};

/**
 * This function will fill Authors and Affiliation Report sheet with given data and return the file ID (google file ID)
 * @param {object} opts - Options available
 * @param {string} opts.spreadsheetId - spreadsheetId
 * @param {object} opts.sheetId - sheetId
 * @param {object} opts.data - Data available
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR undefined)
 * @returns {undefined} undefined
 */
Self.fillAuthorsAndAffiliationASAPSheet = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `spreadsheetId`) === `undefined`)
    return cb(Error(`Missing required data: opts.spreadsheetId`));
  if (typeof _.get(opts, `sheetId`) === `undefined`) return cb(Error(`Missing required data: opts.sheetId`));
  let spreadsheetId = _.get(opts, `spreadsheetId`);
  let sheetId = _.get(opts, `sheetId`);
  let data = _.get(opts, `data`, {});
  let metadata = _.get(data, `metadata`);
  let authors = _.get(metadata, `authors`);
  let actions = [
    // Insert rows
    function (next) {
      let requests = [
        // Lab Materials
        Self.buildRequestInsertRows(sheetId, 10, 11 + authors.length - 1, true),
        Self.buildRequestUpdateBorders(sheetId, 10, 11 + authors.length - 1, 0, 5)
      ];
      return gSheets.spreadsheets.batchUpdate(
        {
          // The ID of the spreadsheet to update.
          spreadsheetId: spreadsheetId,
          // Request body metadata
          requestBody: {
            includeSpreadsheetInResponse: false,
            responseIncludeGridData: false,
            // request body parameters
            requests: requests
          }
        },
        function (err, res) {
          return next(err);
        }
      );
    },
    // Update cells & Add data validations
    function (next) {
      let data = [];
      data.push(Self.buildRequestUpdateCell(`'Authors and Affiliation'!D4`, [metadata.acknowledgement]));
      data.push(Self.buildRequestUpdateCell(`'Authors and Affiliation'!D5`, [metadata.affiliation]));
      data.push(Self.buildRequestUpdateCell(`'Authors and Affiliation'!D6`, [metadata.license]));
      let offset = 10;
      for (let i = 0; i < authors.length; i++) {
        let rowIndex = 10 + i;
        let orcidsFromAPI = _.get(authors[i], `orcid.fromAPI`, [])
          .slice(0, 20)
          .filter(function (item) {
            return !!item[`orcid-id`];
          })
          .map(function (item) {
            return item[`orcid-id`];
          })
          .join(`, `);
        let orcidsFromTEI = _.get(authors[i], `orcid.fromTEI`, []).join(`, `);
        data.push(Self.buildRequestUpdateCell(`'Authors and Affiliation'!A${rowIndex}`, [authors[i].name]));
        data.push(
          Self.buildRequestUpdateCell(`'Authors and Affiliation'!B${rowIndex}`, [
            authors[i].orcid.ASAPAffiliationInUpload ? true : false
          ])
        );
        data.push(
          Self.buildRequestUpdateCell(`'Authors and Affiliation'!C${rowIndex}`, [
            authors[i].orcid.partOfASAPNetwork ? true : false
          ])
        );
        data.push(
          Self.buildRequestUpdateCell(`'Authors and Affiliation'!D${rowIndex}`, [
            authors[i].orcid.currentValue ? authors[i].orcid.currentValue : orcidsFromTEI
          ])
        );
        data.push(
          Self.buildRequestUpdateCell(`'Authors and Affiliation'!E${rowIndex}`, [
            authors[i].orcid.suggestedValues.join(`, `)
          ])
        );
      }
      return gSheets.spreadsheets.values.batchUpdate(
        {
          // The ID of the spreadsheet to update.
          spreadsheetId: spreadsheetId,
          // Request body metadata
          requestBody: {
            // request body parameters
            data: data,
            valueInputOption: `USER_ENTERED`
          }
        },
        function (err, res) {
          return next(err);
        }
      );
    }
  ];
  return async.mapSeries(
    actions,
    function (action, next) {
      return action(function (err) {
        return next(err);
      });
    },
    function (err) {
      return cb(err);
    }
  );
};

/**
 * This function will fill summary sheet with given data and return the file ID (google file ID)
 * @param {object} opts - Options available
 * @param {string} opts.spreadsheetId - spreadsheetId
 * @param {object} opts.sheetId - sheetId
 * @param {object} opts.data - Data available
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR undefined)
 * @returns {undefined} undefined
 */
Self.fillSummaryASAPSheet = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `spreadsheetId`) === `undefined`)
    return cb(Error(`Missing required data: opts.spreadsheetId`));
  if (typeof _.get(opts, `sheetId`) === `undefined`) return cb(Error(`Missing required data: opts.sheetId`));
  let spreadsheetId = _.get(opts, `spreadsheetId`);
  let sheetId = _.get(opts, `sheetId`);
  let data = _.get(opts, `data`, {});
  let articleTitle = _.get(data, `articleTitle`, {});
  let doi = _.get(data, `doi`, ``);
  let DAS = _.get(data, `DAS.content`, ``);
  let authors = _.get(data, `authors`, []);
  let documentId = _.get(data, `documentId`);
  let documentToken = _.get(data, `documentToken`);
  let token = _.get(data, `token`);
  let dataSeerLink = _.get(data, `dataSeerLink`, {});
  let originalFileLink = _.get(data, `originalFileLink`, {});
  let affiliationAcknowledgementsLicenseNotes = _.get(data, `affiliationAcknowledgementsLicenseNotes`, {});
  let protocols = _.get(data, `protocols`, { new: { identified: 0, shared: 0 }, reuse: { identified: 0, shared: 0 } });
  let codeAndSoftware = _.get(data, `codeAndSoftware`, {
    code: { identified: 0, shared: 0 },
    software: { identified: 0, shared: 0 }
  });
  let materials = _.get(data, `materials`, {
    new: { identified: 0, shared: 0 },
    reuse: { identified: 0, shared: 0 }
  });
  let datasets = _.get(data, `datasets`, { new: { identified: 0, shared: 0 }, reuse: { identified: 0, shared: 0 } });
  let authorsNames = authors
    .map(function (item) {
      return item.name;
    })
    .join(`, `);
  let actions = [
    // Update cells & Add data validations
    function (next) {
      let date = new Date();
      let data = [
        Self.buildRequestUpdateCell(`'Summary Sheet'!B3`, [articleTitle]),
        Self.buildRequestUpdateCell(`'Summary Sheet Data'!I2`, [doi]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!B5`, [authorsNames]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!B9`, [
          `=LIEN_HYPERTEXTE("${dataSeerLink.url}";"${dataSeerLink.label}")`
        ]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!B8`, [
          originalFileLink && originalFileLink.url
            ? `=LIEN_HYPERTEXTE("${originalFileLink.url}";"${originalFileLink.url}")`
            : ``
        ]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!B10`, [
          `=DATE(${date.getFullYear()};${date.getMonth() + 1};${date.getDate()})`
        ]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!D14`, [datasets.notes]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!D15`, [codeAndSoftware.notes]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!D16`, [materials.notes]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!D17`, [protocols.notes]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!D18`, [affiliationAcknowledgementsLicenseNotes]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!B22`, [datasets.new.identified]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!C22`, [datasets.new.shared]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!B23`, [datasets.reuse.identified]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!C23`, [datasets.reuse.shared]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!B26`, [codeAndSoftware.code.identified]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!C26`, [codeAndSoftware.code.shared]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!B27`, [codeAndSoftware.software.identified]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!C27`, [codeAndSoftware.software.shared]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!B30`, [materials.new.identified]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!C30`, [materials.new.shared]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!B31`, [materials.reuse.identified]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!C31`, [materials.reuse.shared]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!B34`, [protocols.new.identified + protocols.reuse.identified]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!C34`, [protocols.new.shared + protocols.reuse.shared]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!F37`, [DAS.replace(/\s+/gm, ` `)])
      ];
      return gSheets.spreadsheets.values.batchUpdate(
        {
          // The ID of the spreadsheet to update.
          spreadsheetId: spreadsheetId,
          // Request body metadata
          requestBody: {
            // request body parameters
            data: data,
            valueInputOption: `USER_ENTERED`
          }
        },
        function (err, res) {
          return next(err);
        }
      );
    }
  ];
  return async.mapSeries(
    actions,
    function (action, next) {
      return action(function (err) {
        return next(err);
      });
    },
    function (err) {
      return cb(err);
    }
  );
};

/**
 * This function will fill ASAP PPMI report with given data and return the file ID (google file ID)
 * @param {object} opts - Options available
 * @param {string} opts.spreadsheetId - spreadsheetId
 * @param {object} opts.data - Data available
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR undefined)
 * @returns {undefined} undefined
 */
Self.insertDataInASAPPPMISheets = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `spreadsheetId`) === `undefined`)
    return cb(Error(`Missing required data: opts.spreadsheetId`));
  let spreadsheetId = _.get(opts, `spreadsheetId`);
  let data = _.get(opts, `data`, {});
  let doc = _.get(data, `document`, {});
  let metadata = _.get(data, `metadata`, {});
  let protocols = _.get(data, `protocols`, {});
  let code = _.get(data, `code`, {});
  let software = _.get(data, `software`, {});
  let reagents = _.get(data, `reagents`, {});
  let datasets = _.get(data, `datasets`, {});
  let summary = _.get(data, `summary`, {});
  let dataObjectsMetadata = _.get(data, `dataObjectsMetadata`, {});
  let filteredDatasets = [
    // Cite PPMI dataset unique identifier in text
    datasets.filter(function (item) {
      return Self.getRuleKey(item.rules[`ASAP-PPMI`].rule) === Self.getConfRuleKey(`ASAP-PPMI`, `datasets`, null, `4`);
    }),
    // Cite PPMI dataset unique identifier in text (reuse)
    datasets.filter(function (item) {
      return Self.getRuleKey(item.rules[`ASAP-PPMI`].rule) === Self.getConfRuleKey(`ASAP-PPMI`, `datasets`, null, `5`);
    }),
    // Cite dataset unique identifier in text
    datasets.filter(function (item) {
      return Self.getRuleKey(item.rules[`ASAP-PPMI`].rule) === Self.getConfRuleKey(`ASAP-PPMI`, `datasets`, null, `6`);
    }),
    // Verify dataset citation
    datasets.filter(function (item) {
      return Self.getRuleKey(item.rules[`ASAP-PPMI`].rule) === Self.getConfRuleKey(`ASAP-PPMI`, `datasets`, null, `3`);
    }),
    // Done - Cited correctly
    datasets.filter(function (item) {
      return Self.getRuleKey(item.rules[`ASAP-PPMI`].rule) === Self.getConfRuleKey(`ASAP-PPMI`, `datasets`, null, `0`);
    }),
    // Not required, but recommended to include the representative image/video files in raw format with dataset upload.
    datasets.filter(function (item) {
      return Self.getRuleKey(item.rules[`ASAP-PPMI`].rule) === Self.getConfRuleKey(`ASAP-PPMI`, `datasets`, null, `1`);
    }),
    // Confirmatory and Quality Control datasets are not required to be included in your dataset upload.
    datasets.filter(function (item) {
      return Self.getRuleKey(item.rules[`ASAP-PPMI`].rule) === Self.getConfRuleKey(`ASAP-PPMI`, `datasets`, null, `2`);
    })
  ];
  let filteredCode = [
    // Upload code to Zenodo and provide DOI
    code.filter(function (item) {
      let subType = item.dataType === `other` ? `` : item.subType;
      return Self.getRuleKey(item.rules[`ASAP-PPMI`].rule) === Self.getConfRuleKey(`ASAP-PPMI`, `code`, subType, `2`);
    }),
    // Verify citation
    code.filter(function (item) {
      let subType = item.dataType === `other` ? `` : item.subType;
      return Self.getRuleKey(item.rules[`ASAP-PPMI`].rule) === Self.getConfRuleKey(`ASAP-PPMI`, `code`, subType, `1`);
    }),
    // Done - Cited correctly
    code.filter(function (item) {
      let subType = item.dataType === `other` ? `` : item.subType;
      return Self.getRuleKey(item.rules[`ASAP-PPMI`].rule) === Self.getConfRuleKey(`ASAP-PPMI`, `code`, subType, `0`);
    })
  ];
  let filteredSoftware = [
    // Include missing information in citation
    software.filter(function (item) {
      let subType = item.dataType === `other` ? `` : item.subType;
      return (
        Self.getRuleKey(item.rules[`ASAP-PPMI`].rule) === Self.getConfRuleKey(`ASAP-PPMI`, `software`, subType, `2`)
      );
    }),
    // Verify citation
    software.filter(function (item) {
      let subType = item.dataType === `other` ? `` : item.subType;
      return (
        Self.getRuleKey(item.rules[`ASAP-PPMI`].rule) === Self.getConfRuleKey(`ASAP-PPMI`, `software`, subType, `1`)
      );
    }),
    // Done - Citation meets minimum standards
    software.filter(function (item) {
      let subType = item.dataType === `other` ? `` : item.subType;
      return (
        Self.getRuleKey(item.rules[`ASAP-PPMI`].rule) === Self.getConfRuleKey(`ASAP-PPMI`, `software`, subType, `0`)
      );
    })
  ];
  let filteredMaterials = [
    // Assign RRID and cite in text
    reagents.filter(function (item) {
      return Self.getRuleKey(item.rules[`ASAP-PPMI`].rule) === Self.getConfRuleKey(`ASAP-PPMI`, `reagents`, null, `3`);
    }),
    // Check for an existing RRID
    reagents.filter(function (item) {
      return Self.getRuleKey(item.rules[`ASAP-PPMI`].rule) === Self.getConfRuleKey(`ASAP-PPMI`, `reagents`, null, `2`);
    }),
    // Verify citation
    reagents.filter(function (item) {
      return Self.getRuleKey(item.rules[`ASAP-PPMI`].rule) === Self.getConfRuleKey(`ASAP-PPMI`, `reagents`, null, `1`);
    }),
    // Done - Cited correctly
    reagents.filter(function (item) {
      return Self.getRuleKey(item.rules[`ASAP-PPMI`].rule) === Self.getConfRuleKey(`ASAP-PPMI`, `reagents`, null, `0`);
    })
  ];
  let filteredProtocols = [
    // Deposit in repository and cite DOI in text
    protocols.filter(function (item) {
      let subType = item.dataType === `other` ? `` : item.subType;
      return (
        Self.getRuleKey(item.rules[`ASAP-PPMI`].rule) === Self.getConfRuleKey(`ASAP-PPMI`, `protocols`, subType, `2`)
      );
    }),
    // Confirm citations meet minimum standards
    protocols.filter(function (item) {
      let subType = item.dataType === `other` ? `` : item.subType;
      return (
        Self.getRuleKey(item.rules[`ASAP-PPMI`].rule) === Self.getConfRuleKey(`ASAP-PPMI`, `protocols`, subType, `3`)
      );
    }),
    // Verify citation
    protocols.filter(function (item) {
      let subType = item.dataType === `other` ? `` : item.subType;
      return (
        Self.getRuleKey(item.rules[`ASAP-PPMI`].rule) === Self.getConfRuleKey(`ASAP-PPMI`, `protocols`, subType, `1`)
      );
    }),
    // Done - Cited correctly
    protocols.filter(function (item) {
      let subType = item.dataType === `other` ? `` : item.subType;
      return (
        Self.getRuleKey(item.rules[`ASAP-PPMI`].rule) === Self.getConfRuleKey(`ASAP-PPMI`, `protocols`, subType, `0`)
      );
    })
  ];
  let filteredDataObject = {
    datasets: {
      filtered: filteredDatasets,
      identified: filteredDatasets.slice(0, 5).flat(),
      shared: filteredDatasets[4]
    },
    code: {
      filtered: filteredCode,
      identified: filteredCode.flat(),
      shared: filteredCode.slice(2).flat()
    },
    software: {
      filtered: filteredSoftware,
      identified: filteredSoftware.flat(),
      shared: filteredSoftware.slice(2).flat()
    },
    materials: {
      filtered: filteredMaterials,
      identified: filteredMaterials.flat(),
      shared: filteredMaterials.slice(3).flat()
    },
    protocols: {
      filtered: filteredProtocols,
      identified: filteredProtocols.flat(),
      shared: filteredProtocols.slice(3).flat()
    }
  };
  return Self.getSheets({ spreadsheetId: spreadsheetId }, function (err, sheets) {
    let summarySheetId = Self.getSheetId(sheets, `Summary Sheet`);
    let authorsAndAffiliationSheetId = Self.getSheetId(sheets, `Authors and Affiliation`);
    let datasetsReportSheetId = Self.getSheetId(sheets, `Datasets`);
    let codeAndSoftwareReportSheetId = Self.getSheetId(sheets, `Code and Software`);
    let labMaterialsReportSheetId = Self.getSheetId(sheets, `Lab Materials`);
    let protocolsReportSheetId = Self.getSheetId(sheets, `Protocols`);
    let ChartsSheetId = Self.getSheetId(sheets, `Charts`);
    let actions = [
      // fill 'Summary Sheet'
      function (next) {
        if (summarySheetId instanceof Error) return next(summarySheetId);
        return Self.fillSummaryASAPPPMISheet(
          {
            spreadsheetId: spreadsheetId,
            sheetId: summarySheetId,
            data: {
              documentId: doc.id,
              token: doc.token,
              DAS: metadata.DAS,
              articleTitle: metadata.articleTitle,
              doi: metadata.doi,
              authors: metadata.authors,
              dataSeerLink: metadata.dataSeerLink,
              originalFileLink: metadata.originalFileLink,
              affiliationAcknowledgementsLicenseNotes: metadata.affiliationAcknowledgementsLicenseNotes,
              protocols: {
                notes: dataObjectsMetadata.protocols.notes,
                new: {
                  identified: filteredDataObject.protocols.identified.filter(function (item) {
                    return !item.reuse;
                  }).length,
                  shared: filteredDataObject.protocols.shared.filter(function (item) {
                    return !item.reuse;
                  }).length
                },
                reuse: {
                  identified: filteredDataObject.protocols.identified.filter(function (item) {
                    return item.reuse;
                  }).length,
                  shared: filteredDataObject.protocols.shared.filter(function (item) {
                    return item.reuse;
                  }).length
                }
              },
              codeAndSoftware: {
                notes: dataObjectsMetadata.codeAndSoftware.notes,
                code: {
                  identified: filteredDataObject.code.identified.length,
                  shared: filteredDataObject.code.shared.length
                },
                software: {
                  identified: filteredDataObject.software.identified.length,
                  shared: filteredDataObject.software.shared.length
                }
              },
              materials: {
                notes: dataObjectsMetadata.materials.notes,
                new: {
                  identified: filteredDataObject.materials.identified.filter(function (item) {
                    return !item.reuse;
                  }).length,
                  shared: filteredDataObject.materials.shared.filter(function (item) {
                    return !item.reuse;
                  }).length
                },
                reuse: {
                  identified: filteredDataObject.materials.identified.filter(function (item) {
                    return item.reuse;
                  }).length,
                  shared: filteredDataObject.materials.shared.filter(function (item) {
                    return item.reuse;
                  }).length
                }
              },
              datasets: {
                notes: dataObjectsMetadata.datasets.notes,
                new: {
                  identified: filteredDataObject.datasets.identified.filter(function (item) {
                    return !item.reuse;
                  }).length,
                  shared: filteredDataObject.datasets.shared.filter(function (item) {
                    return !item.reuse;
                  }).length
                },
                reuse: {
                  identified: filteredDataObject.datasets.identified.filter(function (item) {
                    return item.reuse;
                  }).length,
                  shared: filteredDataObject.datasets.shared.filter(function (item) {
                    return item.reuse;
                  }).length
                }
              }
            }
          },
          function (err, res) {
            return next(err);
          }
        );
      },
      // fill 'Research Output Availability Statement' part of the report
      function (next) {
        if (summarySheetId instanceof Error) return next(summarySheetId);
        return Self.fillResearchOutputAvailabilityStatementAndOtherInformationASAPPPMIPart(
          {
            spreadsheetId: spreadsheetId,
            sheetId: summarySheetId,
            data: {
              documentId: doc.id,
              documentToken: doc.token,
              authors: metadata.authors,
              roas: {
                datasets: filteredDataObject.datasets.filtered[4].filter(function (item) {
                  return !item.reuse;
                }),
                code: filteredDataObject.code.filtered[2].filter(function (item) {
                  return !item.reuse;
                }),
                software: filteredDataObject.software.filtered[2].filter(function (item) {
                  return !item.reuse;
                }),
                materials: filteredDataObject.materials.filtered[3].filter(function (item) {
                  return !item.reuse;
                }),
                protocols: filteredDataObject.protocols.filtered[3].filter(function (item) {
                  return !item.reuse;
                })
              },
              otherInformation: {
                datasets: datasets,
                code: code,
                software: software,
                materials: reagents,
                protocols: protocols
              }
            }
          },
          function (err, res) {
            return next(err);
          }
        );
      },
      // fill 'Authors and Affiliations'
      function (next) {
        if (authorsAndAffiliationSheetId instanceof Error) return next(authorsAndAffiliationSheetId);
        return Self.fillAuthorsAndAffiliationASAPPPMISheet(
          {
            spreadsheetId: spreadsheetId,
            sheetId: authorsAndAffiliationSheetId,
            data: {
              metadata: metadata
            }
          },
          function (err, res) {
            return next(err);
          }
        );
      },
      // fill 'dataObject pages'
      function (next) {
        if (datasetsReportSheetId instanceof Error) return next(datasetsReportSheetId);
        if (codeAndSoftwareReportSheetId instanceof Error) return next(codeAndSoftwareReportSheetId);
        if (labMaterialsReportSheetId instanceof Error) return next(labMaterialsReportSheetId);
        if (protocolsReportSheetId instanceof Error) return next(protocolsReportSheetId);
        return Self.fillDataObjectsTabsASAPPPMISheet(
          {
            spreadsheetId: spreadsheetId,
            sheets: {
              'datasets': { id: datasetsReportSheetId, name: `Datasets` },
              'code': { id: codeAndSoftwareReportSheetId, name: `Code and Software` },
              'software': { id: codeAndSoftwareReportSheetId, name: `Code and Software` },
              'codeAndSoftware': { id: codeAndSoftwareReportSheetId, name: `Code and Software` },
              'materials': { id: labMaterialsReportSheetId, name: `Lab Materials` },
              'protocols': { id: protocolsReportSheetId, name: `Protocols` }
            },
            data: {
              documentId: doc.id,
              documentToken: doc.token,

              summary: summary,
              datasets: filteredDataObject.datasets.filtered,
              code: filteredDataObject.code.filtered,
              software: filteredDataObject.software.filtered,
              materials: filteredDataObject.materials.filtered,
              protocols: filteredDataObject.protocols.filtered
            }
          },
          function (err, res) {
            return next(err);
          }
        );
      },
      // fill 'Charts'
      function (next) {
        if (ChartsSheetId instanceof Error) return next(ChartsSheetId);
        return Self.fillChartsASAPPPMISheet(
          {
            spreadsheetId: spreadsheetId,
            sheetId: ChartsSheetId,
            data: {
              documentId: doc.id,
              documentToken: doc.token,
              token: doc.token,
              dataseerDomain: metadata.dataseerDomain
            }
          },
          function (err, res) {
            return next(err);
          }
        );
      }
    ];
    return async.mapSeries(
      actions,
      function (action, next) {
        return action(function (err) {
          return next(err);
        });
      },
      function (err) {
        return cb(err);
      }
    );
  });
};

/**
 * This function will fill 'Research Output Availability Statement' part of the report with given data and return the file ID (google file ID)
 * @param {object} opts - Options available
 * @param {string} opts.spreadsheetId - spreadsheetId
 * @param {object} opts.sheetId - sheetId
 * @param {object} opts.data - Data available
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR undefined)
 * @returns {undefined} undefined
 */
Self.fillResearchOutputAvailabilityStatementAndOtherInformationASAPPPMIPart = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `spreadsheetId`) === `undefined`)
    return cb(Error(`Missing required data: opts.spreadsheetId`));
  if (typeof _.get(opts, `sheetId`) === `undefined`) return cb(Error(`Missing required data: opts.sheetId`));
  let spreadsheetId = _.get(opts, `spreadsheetId`);
  let sheetId = _.get(opts, `sheetId`);
  let data = _.get(opts, `data`, {});
  let roas = {
    protocols: _.get(data, `roas.protocols`, []),
    code: _.get(data, `roas.code`, []),
    software: _.get(data, `roas.software`, []),
    materials: _.get(data, `roas.materials`, []),
    datasets: _.get(data, `roas.datasets`, [])
  };
  let otherInformation = {
    protocols: _.get(data, `otherInformation.protocols`, []),
    code: _.get(data, `otherInformation.code`, []),
    software: _.get(data, `otherInformation.software`, []),
    materials: _.get(data, `otherInformation.materials`, []),
    datasets: _.get(data, `otherInformation.datasets`, [])
  };
  let documentId = _.get(data, `documentId`);
  let documentToken = _.get(data, `documentToken`);
  let animalModels = otherInformation.materials
    .filter(function (item) {
      return item.subType === `organism`;
    })
    .map(function (item) {
      return {
        name: conf.settings.dataObjectsLinks[`ASAP-PPMI`]
          ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
          : item.name,
        URL: item.source ? `${item.source} ` : `` + item.catalogNumber ? `${item.catalogNumber} ` : ``,
        identifier: item.RRID,
        notes: item.comments
      };
    });
  let cellLines = otherInformation.materials
    .filter(function (item) {
      return item.subType === `cell line`;
    })
    .map(function (item) {
      return {
        name: conf.settings.dataObjectsLinks[`ASAP-PPMI`]
          ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
          : item.name,
        URL: item.source ? `${item.source} ` : `` + item.catalogNumber ? `${item.catalogNumber} ` : ``,
        identifier: item.RRID,
        notes: item.comments
      };
    });
  let lines = {
    datasets: roas.datasets.map(function (item) {
      return {
        name: conf.settings.dataObjectsLinks[`ASAP-PPMI`]
          ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
          : item.name,
        URL: item.URL,
        identifier: item.PID,
        notes: item.comments
      };
    }),
    codeAndSoftware: roas.code
      .map(function (item) {
        return {
          name: conf.settings.dataObjectsLinks[`ASAP-PPMI`]
            ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
            : item.name,
          URL: item.URL,
          identifier: item.DOI,
          notes: item.comments
        };
      })
      .concat(
        roas.software.map(function (item) {
          return {
            name: conf.settings.dataObjectsLinks[`ASAP-PPMI`]
              ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
              : item.name,
            URL: item.URL,
            identifier: item.RRID,
            notes: item.comments
          };
        })
      ),
    materials: roas.materials.map(function (item) {
      return {
        name: conf.settings.dataObjectsLinks[`ASAP-PPMI`]
          ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
          : item.name,
        URL: item.RRID,
        identifier: item.RRID,
        notes: item.comments
      };
    }),
    protocols: roas.protocols.map(function (item) {
      return {
        name: conf.settings.dataObjectsLinks[`ASAP-PPMI`]
          ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
          : item.name,
        URL: item.URL,
        identifier: item.DOI,
        notes: item.comments
      };
    }),
    all: []
  };
  // Default values (to avoid offset bug)
  lines.datasets = lines.datasets.length ? lines.datasets : [{ name: ``, URL: ``, identifier: ``, notes: `` }];
  lines.codeAndSoftware = lines.codeAndSoftware.length
    ? lines.codeAndSoftware
    : [{ name: ``, URL: ``, identifier: ``, notes: `` }];
  lines.materials = lines.materials.length ? lines.materials : [{ name: ``, URL: ``, identifier: ``, notes: `` }];
  lines.protocols = lines.protocols.length ? lines.protocols : [{ name: ``, URL: ``, identifier: ``, notes: `` }];
  // Concat all data
  lines.all = lines.datasets.concat(lines.codeAndSoftware).concat(lines.materials).concat(lines.protocols);
  let actions = [
    // Insert rows
    function (next) {
      let otherInformation = [];
      if (cellLines.length > 1) {
        otherInformation.push(Self.buildRequestInsertRows(sheetId, 49, 49 + cellLines.length - 1, true));
        otherInformation.push(
          Self.buildRequestUpdateBorders(sheetId, 49, 49 + cellLines.length - 1, 3, 4, GRAY_BORDERS)
        );
      }
      if (animalModels.length > 1) {
        otherInformation.push(Self.buildRequestInsertRows(sheetId, 48, 48 + animalModels.length - 1, true));
        otherInformation.push(
          Self.buildRequestUpdateBorders(sheetId, 48, 48 + animalModels.length - 1, 3, 4, GRAY_BORDERS)
        );
      }
      // Headers of "Other Information" section
      otherInformation.push(Self.buildRequestUpdateBorders(sheetId, 47, 48, 0, 4, GRAY_BORDERS));
      let offset = animalModels.length > 1 ? animalModels.length - 1 : 0;
      otherInformation.push(Self.buildRequestUpdateBorders(sheetId, 48 + offset, 49 + offset, 0, 4, GRAY_BORDERS));
      offset += cellLines.length > 1 ? cellLines.length - 1 : 0;
      otherInformation.push(Self.buildRequestUpdateBorders(sheetId, 49 + offset, 50 + offset, 0, 4, GRAY_BORDERS));
      let researchOutputAvailabilityStatement = [];
      if (lines.protocols.length > 1)
        researchOutputAvailabilityStatement.push(
          Self.buildRequestInsertRows(sheetId, 44, 44 + lines.protocols.length - 1, true)
        );
      if (lines.materials.length > 1)
        researchOutputAvailabilityStatement.push(
          Self.buildRequestInsertRows(sheetId, 43, 43 + lines.materials.length - 1, true)
        );
      if (lines.codeAndSoftware.length > 1)
        researchOutputAvailabilityStatement.push(
          Self.buildRequestInsertRows(sheetId, 42, 42 + lines.codeAndSoftware.length - 1, true)
        );
      if (lines.datasets.length > 1)
        researchOutputAvailabilityStatement.push(
          Self.buildRequestInsertRows(sheetId, 41, 41 + lines.datasets.length - 1, true)
        );
      researchOutputAvailabilityStatement.push(
        Self.buildRequestUpdateBorders(sheetId, 40, 40 + lines.all.length, 6, 8, GRAY_BORDERS)
      );
      researchOutputAvailabilityStatement.push(
        Self.buildRequestUpdateBorders(sheetId, 40, 40 + lines.all.length, 5, 6, BLACK_BORDERS)
      );
      let deleteOffsetOfSections = [
        Self.buildRequestDeleteRange(sheetId, 38, 40 + lines.all.length, 0, 4, `ROWS`) // Other Information section
      ];
      let requests = otherInformation.concat(researchOutputAvailabilityStatement).concat(deleteOffsetOfSections);
      return gSheets.spreadsheets.batchUpdate(
        {
          // The ID of the spreadsheet to update.
          spreadsheetId: spreadsheetId,
          // Request body metadata
          requestBody: {
            includeSpreadsheetInResponse: false,
            responseIncludeGridData: false,
            // request body parameters
            requests: requests
          }
        },
        function (err, res) {
          return next(err);
        }
      );
    },
    // Update cells & Add data validations
    function (next) {
      let data = [];
      let offset = 41;
      for (let i = 0; i < lines.all.length; i++) {
        let rowIndex = offset + i;
        data.push(Self.buildRequestUpdateCell(`'Summary Sheet'!G${rowIndex}`, [lines.all[i].name]));
        data.push(
          Self.buildRequestUpdateCell(`'Summary Sheet'!H${rowIndex}`, [
            lines.all[i].URL ? lines.all[i].URL : lines.all[i].identifier
          ])
        );
      }
      offset = 42; // Because this section is now on the left of ROAS section
      if (animalModels.length > 0) {
        data.push(Self.buildRequestUpdateCell(`'Summary Sheet'!B${offset}`, [animalModels.length]));
        for (let i = 0; i < animalModels.length; i++) {
          let rowIndex = offset + i;
          data.push(Self.buildRequestUpdateCell(`'Summary Sheet'!D${rowIndex}`, [animalModels[i].name]));
        }
      }
      offset += animalModels.length > 0 ? animalModels.length : 1;
      if (cellLines.length > 0) {
        data.push(Self.buildRequestUpdateCell(`'Summary Sheet'!B${offset}`, [cellLines.length]));
        for (let i = 0; i < cellLines.length; i++) {
          let rowIndex = offset + i;
          data.push(Self.buildRequestUpdateCell(`'Summary Sheet'!D${rowIndex}`, [cellLines[i].name]));
        }
      }
      return gSheets.spreadsheets.values.batchUpdate(
        {
          // The ID of the spreadsheet to update.
          spreadsheetId: spreadsheetId,
          // Request body metadata
          requestBody: {
            // request body parameters
            data: data,
            valueInputOption: `USER_ENTERED`
          }
        },
        function (err, res) {
          return next(err);
        }
      );
    }
  ];
  return async.mapSeries(
    actions,
    function (action, next) {
      return action(function (err) {
        return next(err);
      });
    },
    function (err) {
      return cb(err);
    }
  );
};

/**
 * This function will fill charts sheet with given data and return the file ID (google file ID)
 * @param {object} opts - Options available
 * @param {string} opts.spreadsheetId - spreadsheetId
 * @param {object} opts.sheetId - sheetId
 * @param {object} opts.data - Data available
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR undefined)
 * @returns {undefined} undefined
 */
Self.fillChartsASAPPPMISheet = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `spreadsheetId`) === `undefined`)
    return cb(Error(`Missing required data: opts.spreadsheetId`));
  if (typeof _.get(opts, `sheetId`) === `undefined`) return cb(Error(`Missing required data: opts.sheetId`));
  let spreadsheetId = _.get(opts, `spreadsheetId`);
  let sheetId = _.get(opts, `sheetId`);
  let data = _.get(opts, `data`, {});
  let documentId = _.get(data, `documentId`);
  let documentToken = _.get(data, `documentToken`);
  let token = _.get(data, `token`);
  let dataseerDomain = _.get(data, `dataseerDomain`);
  let _data = [
    Self.buildRequestUpdateCell(`'Charts'!N2`, [dataseerDomain]),
    Self.buildRequestUpdateCell(`'Charts'!N3`, [documentId]),
    Self.buildRequestUpdateCell(`'Charts'!N4`, [token])
  ];
  return gSheets.spreadsheets.values.batchUpdate(
    {
      // The ID of the spreadsheet to update.
      spreadsheetId: spreadsheetId,
      // Request body metadata
      requestBody: {
        // request body parameters
        data: _data,
        valueInputOption: `USER_ENTERED`
      }
    },
    function (err, res) {
      return cb(err);
    }
  );
};

/**
 * This function will fill Detailed Report sheet with given data and return the file ID (google file ID)
 * @param {object} opts - Options available
 * @param {string} opts.spreadsheetId - spreadsheetId
 * @param {object} opts.sheets - All sheets
 * @param {object} opts.data - Data available
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR undefined)
 * @returns {undefined} undefined
 */
Self.fillDataObjectsTabsASAPPPMISheet = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `spreadsheetId`) === `undefined`)
    return cb(Error(`Missing required data: opts.spreadsheetId`));
  if (typeof _.get(opts, `sheets`) === `undefined`) return cb(Error(`Missing required data: opts.sheets`));
  let spreadsheetId = _.get(opts, `spreadsheetId`);
  let sheets = _.get(opts, `sheets`);
  let datasetsReportSheet = _.get(sheets, `datasets`);
  let codeReportSheet = _.get(sheets, `code`);
  let softwareReportSheet = _.get(sheets, `software`);
  let codeAndSoftwareReportSheet = _.get(sheets, `codeAndSoftware`);
  let materialsReportSheet = _.get(sheets, `materials`);
  let protocolsReportSheet = _.get(sheets, `protocols`);
  let data = _.get(opts, `data`, {});
  let summary = _.get(data, `summary`, []);
  let protocols = _.get(data, `protocols`, []);
  let code = _.get(data, `code`, []);
  let software = _.get(data, `software`, []);
  let materials = _.get(data, `materials`, []);
  let datasets = _.get(data, `datasets`, []);
  let documentId = _.get(data, `documentId`);
  let documentToken = _.get(data, `documentToken`);
  let sortedDatasets = {};
  // Regroup datasets by datatype
  for (let i = 0; i < datasets.length; i++) {
    let dataset = datasets[i];
    if (typeof sortedDatasets[dataset.dataType] === `undefined`)
      sortedDatasets[dataset.dataType] = { name: dataset.dataType, list: [] };
    sortedDatasets[dataset.dataType].list.push(dataset);
  }
  // Compute batches commands
  let batches = [
    // protocols
    {
      sheet: protocolsReportSheet,
      row: { min: 3, max: 3, insert: 3 },
      column: { min: 0, max: 8 },
      params: {
        noDataRow: { min: 4, max: 7 }
      },
      cells: [],
      data: [
        {
          merges: [],
          row: { min: 8, max: 13, insert: 11 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `issue` },
            { column: `D`, property: `name` },
            { column: `E`, property: `URL` },
            { column: `F`, property: `DOI` },
            { column: `G`, property: `protocolType` },
            { column: `H`, property: `notes` }
          ],
          // Deposit in repository and cite DOI in text
          data: protocols[0].map(function (item) {
            return {
              reuse: item.reuse,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`ASAP-PPMI`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              DOI: item.DOI,
              URL: item.URL,
              protocolType: item.type.url
                ? `=LIEN_HYPERTEXTE("${item.type.url}";"${item.type.label}")`
                : item.type.label,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `)
            };
          })
        },
        {
          merges: [],
          row: { min: 14, max: 19, insert: 17 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `issue` },
            { column: `D`, property: `name` },
            { column: `E`, property: `URL` },
            { column: `F`, property: `DOI` },
            { column: `G`, property: `protocolType` },
            { column: `H`, property: `notes` }
          ],
          // Confirm citations meet minimum standards
          data: protocols[1].map(function (item) {
            return {
              reuse: item.reuse,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`ASAP-PPMI`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              DOI: item.DOI,
              URL: item.URL,
              protocolType: item.type.url
                ? `=LIEN_HYPERTEXTE("${item.type.url}";"${item.type.label}")`
                : item.type.label,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `)
            };
          })
        },
        {
          merges: [],
          row: { min: 20, max: 25, insert: 23 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `issue` },
            { column: `D`, property: `name` },
            { column: `E`, property: `URL` },
            { column: `F`, property: `DOI` },
            { column: `G`, property: `protocolType` },
            { column: `H`, property: `notes` }
          ],
          // Verify citation
          data: protocols[2].map(function (item) {
            return {
              reuse: item.reuse,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`ASAP-PPMI`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              DOI: item.DOI,
              URL: item.URL,
              protocolType: item.type.url
                ? `=LIEN_HYPERTEXTE("${item.type.url}";"${item.type.label}")`
                : item.type.label,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `)
            };
          })
        },
        {
          merges: [],
          row: { min: 26, max: 30, insert: 28 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `issue` },
            { column: `D`, property: `name` },
            { column: `E`, property: `URL` },
            { column: `F`, property: `DOI` },
            { column: `G`, property: `protocolType` },
            { column: `H`, property: `notes` }
          ],
          // Done - Cited correctly
          data: protocols[3].map(function (item) {
            return {
              reuse: item.reuse,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`ASAP-PPMI`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              DOI: item.DOI,
              URL: item.URL,
              protocolType: item.type.url
                ? `=LIEN_HYPERTEXTE("${item.type.url}";"${item.type.label}")`
                : item.type.label,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `)
            };
          })
        }
      ]
    },
    // lab materials
    {
      sheet: materialsReportSheet,
      row: { min: 3, max: 3, insert: 3 },
      column: { min: 0, max: 12 },
      params: {
        noDataRow: { min: 4, max: 7 }
      },
      cells: [],
      data: [
        {
          merges: [],
          row: { min: 8, max: 13, insert: 11 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `issue` },
            { column: `D`, property: `name` },
            { column: `E`, property: `sentences` },
            { column: `F`, property: `source` },
            { column: `G`, property: `catalog` },
            { column: `H`, property: `RRID` },
            { column: `I`, property: `datatype` },
            { column: `J`, property: `suggestedEntity` },
            { column: `K`, property: `suggestedRRID` },
            { column: `L`, property: `notes` }
          ],
          // Assign RRID and cite in text
          data: materials[0].map(function (item) {
            return {
              reuse: item.reuse,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`ASAP-PPMI`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              repository: item.DOI,
              datatype: item.type.url ? `=LIEN_HYPERTEXTE("${item.type.url}";"${item.type.label}")` : item.type.label,
              source: item.source,
              RRID: item.RRID,
              suggestedEntity: item.suggestedEntity,
              catalog: item.catalogNumber,
              suggestedRRID: item.suggestedRRID
            };
          })
        },
        {
          merges: [],
          row: { min: 14, max: 19, insert: 17 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `issue` },
            { column: `D`, property: `name` },
            { column: `E`, property: `sentences` },
            { column: `F`, property: `source` },
            { column: `G`, property: `catalog` },
            { column: `H`, property: `RRID` },
            { column: `I`, property: `datatype` },
            { column: `J`, property: `suggestedEntity` },
            { column: `K`, property: `suggestedRRID` },
            { column: `L`, property: `notes` }
          ],
          // Check for an existing RRID
          data: materials[1].map(function (item) {
            return {
              reuse: item.reuse,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`ASAP-PPMI`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              repository: item.DOI,
              datatype: item.type.url ? `=LIEN_HYPERTEXTE("${item.type.url}";"${item.type.label}")` : item.type.label,
              source: item.source,
              RRID: item.RRID,
              suggestedEntity: item.suggestedEntity,
              catalog: item.catalogNumber,
              suggestedRRID: item.suggestedRRID
            };
          })
        },
        {
          merges: [],
          row: { min: 20, max: 25, insert: 23 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `issue` },
            { column: `D`, property: `name` },
            { column: `E`, property: `sentences` },
            { column: `F`, property: `source` },
            { column: `G`, property: `catalog` },
            { column: `H`, property: `RRID` },
            { column: `I`, property: `datatype` },
            { column: `J`, property: `suggestedEntity` },
            { column: `K`, property: `suggestedRRID` },
            { column: `L`, property: `notes` }
          ],
          // Verify citation
          data: materials[2].map(function (item) {
            return {
              reuse: item.reuse,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`ASAP-PPMI`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              repository: item.DOI,
              datatype: item.type.url ? `=LIEN_HYPERTEXTE("${item.type.url}";"${item.type.label}")` : item.type.label,
              source: item.source,
              RRID: item.RRID,
              suggestedEntity: item.suggestedEntity,
              catalog: item.catalogNumber,
              suggestedRRID: item.suggestedRRID
            };
          })
        },
        {
          merges: [],
          row: { min: 26, max: 30, insert: 28 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `issue` },
            { column: `D`, property: `name` },
            { column: `E`, property: `sentences` },
            { column: `F`, property: `source` },
            { column: `G`, property: `catalog` },
            { column: `H`, property: `RRID` },
            { column: `I`, property: `datatype` },
            { column: `J`, property: `suggestedEntity` },
            { column: `K`, property: `suggestedRRID` },
            { column: `L`, property: `notes` }
          ],
          // Done - Cited correctly
          data: materials[3].map(function (item) {
            return {
              reuse: item.reuse,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`ASAP-PPMI`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              repository: item.DOI,
              datatype: item.type.url ? `=LIEN_HYPERTEXTE("${item.type.url}";"${item.type.label}")` : item.type.label,
              source: item.source,
              RRID: item.RRID,
              suggestedEntity: item.suggestedEntity,
              catalog: item.catalogNumber,
              suggestedRRID: item.suggestedRRID
            };
          })
        },
        {
          merges: [],
          row: { min: 31, max: 36, insert: 34 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `issue` },
            { column: `D`, property: `name` },
            { column: `E`, property: `sentences` },
            { column: `F`, property: `source` },
            { column: `G`, property: `catalog` },
            { column: `H`, property: `RRID` },
            { column: `I`, property: `datatype` },
            { column: `J`, property: `suggestedEntity` },
            { column: `K`, property: `suggestedRRID` },
            { column: `L`, property: `notes` }
          ],
          // None - Citation meets minimum standards
          data: []
        }
      ]
    },
    // code and software
    // software
    {
      sheet: codeAndSoftwareReportSheet,
      row: { min: 26, max: 26, insert: 26 },
      column: { min: 0, max: 11 },
      params: {
        noDataRow: { min: 27, max: 30 }
      },
      cells: [],
      data: [
        {
          merges: [],
          row: { min: 31, max: 36, insert: 34 },
          cells: [
            { column: `B`, property: `issue` },
            { column: `C`, property: `version` },
            { column: `D`, property: `name` },
            { column: `E`, property: `sentences` },
            { column: `F`, property: `URL` },
            { column: `G`, property: `RRID` },
            { column: `H`, property: `suggestedEntity` },
            { column: `I`, property: `suggestedRRID` },
            { column: `J`, property: `suggestedURL` },
            { column: `K`, property: `notes` }
          ],
          // Include missing information in citation
          data: software[0].map(function (item) {
            return {
              reuse: item.reuse,
              version: item.version,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`ASAP-PPMI`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              URL: item.URL,
              RRID: item.RRID,
              suggestedEntity: item.suggestedEntity,
              suggestedRRID: item.suggestedRRID,
              suggestedURL: item.suggestedURL,
              notes: item.comments
            };
          })
        },
        {
          merges: [],
          row: { min: 37, max: 42, insert: 40 },
          cells: [
            { column: `B`, property: `issue` },
            { column: `C`, property: `version` },
            { column: `D`, property: `name` },
            { column: `E`, property: `sentences` },
            { column: `F`, property: `URL` },
            { column: `G`, property: `RRID` },
            { column: `H`, property: `suggestedEntity` },
            { column: `I`, property: `suggestedRRID` },
            { column: `J`, property: `suggestedURL` },
            { column: `K`, property: `notes` }
          ],
          // Verify citation
          data: software[1].map(function (item) {
            return {
              reuse: item.reuse,
              version: item.version,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`ASAP-PPMI`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              URL: item.URL,
              RRID: item.RRID,
              suggestedEntity: item.suggestedEntity,
              suggestedRRID: item.suggestedRRID,
              suggestedURL: item.suggestedURL,
              notes: item.comments
            };
          })
        },
        {
          merges: [],
          row: { min: 43, max: 48, insert: 46 },
          cells: [
            { column: `B`, property: `issue` },
            { column: `C`, property: `version` },
            { column: `D`, property: `name` },
            { column: `E`, property: `sentences` },
            { column: `F`, property: `URL` },
            { column: `G`, property: `RRID` },
            { column: `H`, property: `suggestedEntity` },
            { column: `I`, property: `suggestedRRID` },
            { column: `J`, property: `suggestedURL` },
            { column: `K`, property: `notes` }
          ],
          // Done - Citation meets minimum standards
          data: software[2].map(function (item) {
            return {
              reuse: item.reuse,
              version: item.version,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`ASAP-PPMI`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              URL: item.URL,
              RRID: item.RRID,
              suggestedEntity: item.suggestedEntity,
              suggestedRRID: item.suggestedRRID,
              suggestedURL: item.suggestedURL,
              notes: item.comments
            };
          })
        }
      ]
    },
    // code
    {
      sheet: codeAndSoftwareReportSheet,
      row: { min: 3, max: 3, insert: 3 },
      column: { min: 0, max: 11 },
      params: {
        noDataRow: { min: 4, max: 7 }
      },
      cells: [],
      data: [
        {
          merges: [
            { begin: 1, end: 3 },
            { begin: 6, end: 8 },
            { begin: 8, end: 11 }
          ],
          row: { min: 8, max: 13, insert: 11 },
          cells: [
            { column: `B`, property: `issue` },
            { column: `D`, property: `name` },
            { column: `E`, property: `sentences` },
            { column: `F`, property: `URL` },
            { column: `G`, property: `DOI` },
            { column: `I`, property: `notes` }
          ],
          // Upload code to Zenodo and provide DOI
          data: code[0].map(function (item) {
            return {
              reuse: item.reuse,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`ASAP-PPMI`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              DOI: item.DOI,
              URL: item.URL
            };
          })
        },
        {
          merges: [
            { begin: 1, end: 3 },
            { begin: 6, end: 8 },
            { begin: 8, end: 11 }
          ],
          row: { min: 14, max: 19, insert: 17 },
          cells: [
            { column: `B`, property: `issue` },
            { column: `D`, property: `name` },
            { column: `E`, property: `sentences` },
            { column: `F`, property: `URL` },
            { column: `G`, property: `DOI` },
            { column: `I`, property: `notes` }
          ],
          // Verify citation
          data: code[1].map(function (item) {
            return {
              reuse: item.reuse,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`ASAP-PPMI`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              DOI: item.DOI,
              URL: item.URL
            };
          })
        },
        {
          merges: [
            { begin: 1, end: 3 },
            { begin: 6, end: 8 },
            { begin: 8, end: 11 }
          ],
          row: { min: 20, max: 25, insert: 22 },
          cells: [
            { column: `B`, property: `issue` },
            { column: `D`, property: `name` },
            { column: `E`, property: `sentences` },
            { column: `F`, property: `URL` },
            { column: `G`, property: `DOI` },
            { column: `I`, property: `notes` }
          ],
          // Done - Cited correctly
          data: code[2].map(function (item) {
            return {
              reuse: item.reuse,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`ASAP-PPMI`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              DOI: item.DOI,
              URL: item.URL
            };
          })
        }
      ]
    },
    // datasets
    {
      sheet: datasetsReportSheet,
      row: { min: 3, max: 3, insert: 3 },
      column: { min: 0, max: 12 },
      params: {
        noDataRow: { min: 4, max: 7 }
      },
      cells: [],
      data: [
        {
          merges: [],
          row: { min: 8, max: 13, insert: 11 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `qc` },
            { column: `D`, property: `representativeImage` },
            { column: `E`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `H`, property: `URL` },
            { column: `I`, property: `PID` },
            { column: `J`, property: `notes` },
            { column: `K`, property: `figureOrTable` },
            { column: `L`, property: `datatype` }
          ],
          // Cite PPMI dataset unique identifier in text
          data: datasets[0].map(function (item) {
            return {
              reuse: item.reuse,
              qc: item.qc,
              representativeImage: item.representativeImage,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`ASAP-PPMI`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              URL: item.URL,
              PID: item.PID,
              notes: item.comments,
              figureOrTable: item.associatedFigureOrTable,
              datatype:
                item.type && item.type.url
                  ? `=LIEN_HYPERTEXTE("${item.type.url}";"${item.type.label}")`
                  : item.type.label
            };
          })
        },
        {
          merges: [],
          row: { min: 14, max: 19, insert: 17 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `qc` },
            { column: `D`, property: `representativeImage` },
            { column: `E`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `H`, property: `URL` },
            { column: `I`, property: `PID` },
            { column: `J`, property: `notes` },
            { column: `K`, property: `figureOrTable` },
            { column: `L`, property: `datatype` }
          ],
          // Cite PPMI dataset unique identifier in text (reuse)
          data: datasets[1].map(function (item) {
            return {
              reuse: item.reuse,
              qc: item.qc,
              representativeImage: item.representativeImage,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`ASAP-PPMI`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              URL: item.URL,
              PID: item.PID,
              notes: item.comments,
              figureOrTable: item.associatedFigureOrTable,
              datatype:
                item.type && item.type.url
                  ? `=LIEN_HYPERTEXTE("${item.type.url}";"${item.type.label}")`
                  : item.type.label
            };
          })
        },
        {
          merges: [],
          row: { min: 20, max: 25, insert: 23 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `qc` },
            { column: `D`, property: `representativeImage` },
            { column: `E`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `H`, property: `URL` },
            { column: `I`, property: `PID` },
            { column: `J`, property: `notes` },
            { column: `K`, property: `figureOrTable` },
            { column: `L`, property: `datatype` }
          ],
          // Cite dataset unique identifier in text
          data: datasets[2].map(function (item) {
            return {
              reuse: item.reuse,
              qc: item.qc,
              representativeImage: item.representativeImage,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`ASAP-PPMI`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              URL: item.URL,
              PID: item.PID,
              notes: item.comments,
              figureOrTable: item.associatedFigureOrTable,
              datatype:
                item.type && item.type.url
                  ? `=LIEN_HYPERTEXTE("${item.type.url}";"${item.type.label}")`
                  : item.type.label
            };
          })
        },
        {
          merges: [],
          row: { min: 26, max: 31, insert: 29 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `qc` },
            { column: `D`, property: `representativeImage` },
            { column: `E`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `H`, property: `URL` },
            { column: `I`, property: `PID` },
            { column: `J`, property: `notes` },
            { column: `K`, property: `figureOrTable` },
            { column: `L`, property: `datatype` }
          ],
          // Verify dataset citation
          data: datasets[3].map(function (item) {
            return {
              reuse: item.reuse,
              qc: item.qc,
              representativeImage: item.representativeImage,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`ASAP-PPMI`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              URL: item.URL,
              PID: item.PID,
              notes: item.comments,
              figureOrTable: item.associatedFigureOrTable,
              datatype:
                item.type && item.type.url
                  ? `=LIEN_HYPERTEXTE("${item.type.url}";"${item.type.label}")`
                  : item.type.label
            };
          })
        },
        {
          merges: [],
          row: { min: 32, max: 36, insert: 34 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `qc` },
            { column: `D`, property: `representativeImage` },
            { column: `E`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `H`, property: `URL` },
            { column: `I`, property: `PID` },
            { column: `J`, property: `notes` },
            { column: `K`, property: `figureOrTable` },
            { column: `L`, property: `datatype` }
          ],
          // Done - Cited correctly
          data: datasets[4].map(function (item) {
            return {
              reuse: item.reuse,
              qc: item.qc,
              representativeImage: item.representativeImage,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`ASAP-PPMI`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              URL: item.URL,
              PID: item.PID,
              notes: item.comments,
              figureOrTable: item.associatedFigureOrTable,
              datatype:
                item.type && item.type.url
                  ? `=LIEN_HYPERTEXTE("${item.type.url}";"${item.type.label}")`
                  : item.type.label
            };
          })
        },
        {
          merges: [],
          row: { min: 37, max: 42, insert: 40 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `qc` },
            { column: `D`, property: `representativeImage` },
            { column: `E`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `H`, property: `URL` },
            { column: `I`, property: `PID` },
            { column: `J`, property: `notes` },
            { column: `K`, property: `figureOrTable` },
            { column: `L`, property: `datatype` }
          ],
          // Not required, but recommended to include the representative image/video files in raw format with dataset upload.
          data: datasets[5].map(function (item) {
            return {
              reuse: item.reuse,
              qc: item.qc,
              representativeImage: item.representativeImage,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`ASAP-PPMI`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              URL: item.URL,
              PID: item.PID,
              notes: item.comments,
              figureOrTable: item.associatedFigureOrTable,
              datatype:
                item.type && item.type.url
                  ? `=LIEN_HYPERTEXTE("${item.type.url}";"${item.type.label}")`
                  : item.type.label
            };
          })
        },
        {
          merges: [],
          row: { min: 43, max: 48, insert: 46 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `qc` },
            { column: `D`, property: `representativeImage` },
            { column: `E`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `H`, property: `URL` },
            { column: `I`, property: `PID` },
            { column: `J`, property: `notes` },
            { column: `K`, property: `figureOrTable` },
            { column: `L`, property: `datatype` }
          ],
          // Confirmatory and Quality Control datasets are not required to be included in your dataset upload.
          data: datasets[6].map(function (item) {
            return {
              reuse: item.reuse,
              qc: item.qc,
              representativeImage: item.representativeImage,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`ASAP-PPMI`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              URL: item.URL,
              PID: item.PID,
              notes: item.comments,
              figureOrTable: item.associatedFigureOrTable,
              datatype:
                item.type && item.type.url
                  ? `=LIEN_HYPERTEXTE("${item.type.url}";"${item.type.label}")`
                  : item.type.label
            };
          })
        }
      ]
    }
  ];
  return async.mapSeries(
    batches,
    function (batch, _next) {
      // Is there data in this bulk of data
      let noData = batch.data.reduce(function (acc, item) {
        return acc && item.data.length === 0;
      }, true);
      let actions = [
        // Insert rows
        function (n) {
          let requests = [];
          let offset = 0;
          // if there is data, delete the "noDataRow"
          if (!noData && batch.params.noDataRow) {
            requests.push(
              Self.buildRequestDeleteRows(batch.sheet.id, batch.params.noDataRow.min - 1, batch.params.noDataRow.max)
            );
            offset -= batch.params.noDataRow.max - batch.params.noDataRow.min + 1;
          }
          // insert rows if necessary
          for (let i = batch.data.length - 1; i >= 0; i--) {
            batch.data[i].row.min += offset;
            batch.data[i].row.insert += offset;
            batch.data[i].row.max += offset;
            if (batch.data[i].data.length > 0) {
              // insert row(s)
              requests.push(
                Self.buildRequestInsertRows(
                  batch.sheet.id,
                  batch.data[i].row.insert,
                  batch.data[i].row.insert + batch.data[i].data.length - 1,
                  true
                )
              );
              // merge cells
              for (let j = 0; j < batch.data[i].merges.length; j++) {
                let merge = batch.data[i].merges[j];
                requests.push(
                  Self.buildRequestMergeCells(
                    batch.sheet.id,
                    batch.data[i].row.insert,
                    batch.data[i].row.insert + batch.data[i].data.length - 1,
                    merge.begin,
                    merge.end
                  )
                );
              }
              // update borders
              requests.push(
                Self.buildRequestUpdateBorders(
                  batch.sheet.id,
                  batch.data[i].row.insert,
                  batch.data[i].row.insert + batch.data[i].data.length - 1,
                  batch.column.min,
                  batch.column.max
                )
              );
            }
            // delete row(s) if necessary
            else {
              requests.push(
                Self.buildRequestDeleteRows(batch.sheet.id, batch.data[i].row.min - 1, batch.data[i].row.max)
              );
            }
          }
          if (requests.length <= 0) return n();
          return gSheets.spreadsheets.batchUpdate(
            {
              // The ID of the spreadsheet to update.
              spreadsheetId: spreadsheetId,
              // Request body metadata
              requestBody: {
                includeSpreadsheetInResponse: false,
                responseIncludeGridData: false,
                // request body parameters
                requests: requests
              }
            },
            function (err, res) {
              setTimeout(function () {
                // process err or result here
                return n(err);
              }, conf.settings.googleAPI[`ASAP-PPMI`].timeout);
            }
          );
        },
        // Update cells & Add data validations
        function (n) {
          let data = [];
          let offset = 0;
          // Copy/Paste template if necessary
          if (batch.copyPaste) {
            let delta = batch.copyPaste.row.end - batch.copyPaste.row.begin + 1;
            offset += delta;
          }
          // fill rows if necessary
          for (let i = 0; i < batch.data.length; i++) {
            // if there is data in this bulk of data
            if (batch.data[i].data.length > 0) {
              batch.data[i].row.max += batch.data[i].data.length - 1;
              // update row property of all the next items
              if (typeof batch.data[i + 1] !== `undefined`) {
                let d = batch.data[i].data.length - 1; // -1 because there is one line by default
                for (let j = i + 1; j < batch.data.length; j++) {
                  batch.data[j].row.min += d;
                  batch.data[j].row.insert += d;
                  batch.data[j].row.max += d;
                }
              }
              // fill row(s)
              for (let j = 0; j < batch.data[i].data.length; j++) {
                let item = batch.data[i].data[j];
                let rowIndex = batch.data[i].row.insert + j;
                data.push(Self.buildRequestUpdateCell(`${batch.sheet.name}!A${rowIndex}`, [j + 1]));
                for (let k = 0; k < batch.data[i].cells.length; k++) {
                  let info = batch.data[i].cells[k];
                  data.push(
                    Self.buildRequestUpdateCell(`${batch.sheet.name}!${info.column}${rowIndex}`, [item[info.property]])
                  );
                }
              }
            } else {
              // update row property of all the next items
              let d = batch.data[i].row.max - batch.data[i].row.min + 1;
              for (let j = i + 1; j < batch.data.length; j++) {
                batch.data[j].row.min -= d;
                batch.data[j].row.insert -= d;
                batch.data[j].row.max -= d;
              }
            }
          }
          // if there is data fill head row(s)
          if (batch.cells.length > 0 && batch.row.insert) {
            for (let i = 0; i < batch.cells.length; i++) {
              let rowIndex = batch.row.insert;
              let info = batch.cells[i];
              data.push(Self.buildRequestUpdateCell(`${batch.sheet.name}!${info.column}${rowIndex}`, [info.value]));
            }
          }
          if (data.length <= 0) return n();
          return gSheets.spreadsheets.values.batchUpdate(
            {
              // The ID of the spreadsheet to update.
              spreadsheetId: spreadsheetId,
              // Request body metadata
              requestBody: {
                // request body parameters
                data: data,
                valueInputOption: `USER_ENTERED`
              }
            },
            function (err, res) {
              setTimeout(function () {
                // process err or result here
                return n(err);
              }, conf.settings.googleAPI[`ASAP-PPMI`].timeout);
            }
          );
        }
      ];
      return async.mapSeries(
        actions,
        function (action, next) {
          return action(function (err) {
            return next(err);
          });
        },
        function (err) {
          return _next(err);
        }
      );
    },
    function (err) {
      return cb(err);
    }
  );
};

/**
 * This function will fill Authors and Affiliation Report sheet with given data and return the file ID (google file ID)
 * @param {object} opts - Options available
 * @param {string} opts.spreadsheetId - spreadsheetId
 * @param {object} opts.sheetId - sheetId
 * @param {object} opts.data - Data available
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR undefined)
 * @returns {undefined} undefined
 */
Self.fillAuthorsAndAffiliationASAPPPMISheet = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `spreadsheetId`) === `undefined`)
    return cb(Error(`Missing required data: opts.spreadsheetId`));
  if (typeof _.get(opts, `sheetId`) === `undefined`) return cb(Error(`Missing required data: opts.sheetId`));
  let spreadsheetId = _.get(opts, `spreadsheetId`);
  let sheetId = _.get(opts, `sheetId`);
  let data = _.get(opts, `data`, {});
  let metadata = _.get(data, `metadata`);
  let authors = _.get(metadata, `authors`);
  let actions = [
    // Insert rows
    function (next) {
      let requests = [
        // Lab Materials
        Self.buildRequestInsertRows(sheetId, 10, 11 + authors.length - 1, true),
        Self.buildRequestMergeCells(sheetId, 10, 11 + authors.length - 1, 0, 3),
        Self.buildRequestUpdateBorders(sheetId, 10, 11 + authors.length - 1, 0, 5)
      ];
      return gSheets.spreadsheets.batchUpdate(
        {
          // The ID of the spreadsheet to update.
          spreadsheetId: spreadsheetId,
          // Request body metadata
          requestBody: {
            includeSpreadsheetInResponse: false,
            responseIncludeGridData: false,
            // request body parameters
            requests: requests
          }
        },
        function (err, res) {
          return next(err);
        }
      );
    },
    // Update cells & Add data validations
    function (next) {
      let data = [];
      data.push(Self.buildRequestUpdateCell(`'Authors and Affiliation'!D4`, [metadata.acknowledgement]));
      data.push(Self.buildRequestUpdateCell(`'Authors and Affiliation'!D5`, [metadata.affiliation]));
      data.push(Self.buildRequestUpdateCell(`'Authors and Affiliation'!D6`, [metadata.license]));
      let offset = 10;
      for (let i = 0; i < authors.length; i++) {
        let rowIndex = 10 + i;
        let orcidsFromAPI = _.get(authors[i], `orcid.fromAPI`, [])
          .slice(0, 20)
          .filter(function (item) {
            return !!item[`orcid-id`];
          })
          .map(function (item) {
            return item[`orcid-id`];
          })
          .join(`, `);
        let orcidsFromTEI = _.get(authors[i], `orcid.fromTEI`, []).join(`, `);
        data.push(Self.buildRequestUpdateCell(`'Authors and Affiliation'!A${rowIndex}`, [authors[i].name]));
        data.push(
          Self.buildRequestUpdateCell(`'Authors and Affiliation'!D${rowIndex}`, [
            authors[i].orcid.currentValue ? authors[i].orcid.currentValue : orcidsFromTEI
          ])
        );
        data.push(
          Self.buildRequestUpdateCell(`'Authors and Affiliation'!E${rowIndex}`, [
            authors[i].orcid.suggestedValues.join(`, `)
          ])
        );
      }
      return gSheets.spreadsheets.values.batchUpdate(
        {
          // The ID of the spreadsheet to update.
          spreadsheetId: spreadsheetId,
          // Request body metadata
          requestBody: {
            // request body parameters
            data: data,
            valueInputOption: `USER_ENTERED`
          }
        },
        function (err, res) {
          return next(err);
        }
      );
    }
  ];
  return async.mapSeries(
    actions,
    function (action, next) {
      return action(function (err) {
        return next(err);
      });
    },
    function (err) {
      return cb(err);
    }
  );
};

/**
 * This function will fill summary sheet with given data and return the file ID (google file ID)
 * @param {object} opts - Options available
 * @param {string} opts.spreadsheetId - spreadsheetId
 * @param {object} opts.sheetId - sheetId
 * @param {object} opts.data - Data available
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR undefined)
 * @returns {undefined} undefined
 */
Self.fillSummaryASAPPPMISheet = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `spreadsheetId`) === `undefined`)
    return cb(Error(`Missing required data: opts.spreadsheetId`));
  if (typeof _.get(opts, `sheetId`) === `undefined`) return cb(Error(`Missing required data: opts.sheetId`));
  let spreadsheetId = _.get(opts, `spreadsheetId`);
  let sheetId = _.get(opts, `sheetId`);
  let data = _.get(opts, `data`, {});
  let articleTitle = _.get(data, `articleTitle`, {});
  let doi = _.get(data, `doi`, ``);
  let DAS = _.get(data, `DAS.content`, ``);
  let authors = _.get(data, `authors`, []);
  let documentId = _.get(data, `documentId`);
  let documentToken = _.get(data, `documentToken`);
  let token = _.get(data, `token`);
  let dataSeerLink = _.get(data, `dataSeerLink`, {});
  let originalFileLink = _.get(data, `originalFileLink`, {});
  let affiliationAcknowledgementsLicenseNotes = _.get(data, `affiliationAcknowledgementsLicenseNotes`, {});
  let protocols = _.get(data, `protocols`, { new: { identified: 0, shared: 0 }, reuse: { identified: 0, shared: 0 } });
  let codeAndSoftware = _.get(data, `codeAndSoftware`, {
    code: { identified: 0, shared: 0 },
    software: { identified: 0, shared: 0 }
  });
  let materials = _.get(data, `materials`, {
    new: { identified: 0, shared: 0 },
    reuse: { identified: 0, shared: 0 }
  });
  let datasets = _.get(data, `datasets`, { new: { identified: 0, shared: 0 }, reuse: { identified: 0, shared: 0 } });
  let authorsNames = authors
    .map(function (item) {
      return item.name;
    })
    .join(`, `);
  let actions = [
    // Update cells & Add data validations
    function (next) {
      let date = new Date();
      let data = [
        Self.buildRequestUpdateCell(`'Summary Sheet'!B3`, [articleTitle]),
        Self.buildRequestUpdateCell(`'Summary Sheet Data'!I2`, [doi]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!B5`, [authorsNames]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!B9`, [
          `=LIEN_HYPERTEXTE("${dataSeerLink.url}";"${dataSeerLink.label}")`
        ]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!B8`, [
          originalFileLink && originalFileLink.url
            ? `=LIEN_HYPERTEXTE("${originalFileLink.url}";"${originalFileLink.url}")`
            : ``
        ]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!B10`, [
          `=DATE(${date.getFullYear()};${date.getMonth() + 1};${date.getDate()})`
        ]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!D14`, [datasets.notes]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!D15`, [codeAndSoftware.notes]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!D16`, [materials.notes]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!D17`, [protocols.notes]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!D18`, [affiliationAcknowledgementsLicenseNotes]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!B22`, [datasets.new.identified]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!C22`, [datasets.new.shared]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!B23`, [datasets.reuse.identified]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!C23`, [datasets.reuse.shared]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!B26`, [codeAndSoftware.code.identified]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!C26`, [codeAndSoftware.code.shared]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!B27`, [codeAndSoftware.software.identified]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!C27`, [codeAndSoftware.software.shared]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!B30`, [materials.new.identified]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!C30`, [materials.new.shared]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!B31`, [materials.reuse.identified]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!C31`, [materials.reuse.shared]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!B34`, [protocols.new.identified + protocols.reuse.identified]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!C34`, [protocols.new.shared + protocols.reuse.shared]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!F37`, [DAS.replace(/\s/gm, ` `)])
      ];
      return gSheets.spreadsheets.values.batchUpdate(
        {
          // The ID of the spreadsheet to update.
          spreadsheetId: spreadsheetId,
          // Request body metadata
          requestBody: {
            // request body parameters
            data: data,
            valueInputOption: `USER_ENTERED`
          }
        },
        function (err, res) {
          return next(err);
        }
      );
    }
  ];
  return async.mapSeries(
    actions,
    function (action, next) {
      return action(function (err) {
        return next(err);
      });
    },
    function (err) {
      return cb(err);
    }
  );
};

/**
 * This function will fill ASAP GP2 report with given data and return the file ID (google file ID)
 * @param {object} opts - Options available
 * @param {string} opts.spreadsheetId - spreadsheetId
 * @param {object} opts.data - Data available
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR undefined)
 * @returns {undefined} undefined
 */
Self.insertDataInASAPGP2Sheets = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `spreadsheetId`) === `undefined`)
    return cb(Error(`Missing required data: opts.spreadsheetId`));
  let spreadsheetId = _.get(opts, `spreadsheetId`);
  let data = _.get(opts, `data`, {});
  let doc = _.get(data, `document`, {});
  let metadata = _.get(data, `metadata`, {});
  let protocols = _.get(data, `protocols`, {});
  let code = _.get(data, `code`, {});
  let software = _.get(data, `software`, {});
  let reagents = _.get(data, `reagents`, {});
  let datasets = _.get(data, `datasets`, {});
  let summary = _.get(data, `summary`, {});
  let dataObjectsMetadata = _.get(data, `dataObjectsMetadata`, {});
  let filteredDatasets = [
    // Deposit to appropriate repository and cite PID in text
    datasets.filter(function (item) {
      return Self.getRuleKey(item.rules[`ASAP-GP2`].rule) === Self.getConfRuleKey(`ASAP-GP2`, `datasets`, null, `4`);
    }),
    // Cite dataset unique identifier in text
    datasets.filter(function (item) {
      return Self.getRuleKey(item.rules[`ASAP-GP2`].rule) === Self.getConfRuleKey(`ASAP-GP2`, `datasets`, null, `5`);
    }),
    // Verify dataset citation
    datasets.filter(function (item) {
      return Self.getRuleKey(item.rules[`ASAP-GP2`].rule) === Self.getConfRuleKey(`ASAP-GP2`, `datasets`, null, `3`);
    }),
    // Done - Cited correctly
    datasets.filter(function (item) {
      return Self.getRuleKey(item.rules[`ASAP-GP2`].rule) === Self.getConfRuleKey(`ASAP-GP2`, `datasets`, null, `0`);
    }),
    // Not required, but recommended to include the representative image/video files in raw format with dataset upload.
    datasets.filter(function (item) {
      return Self.getRuleKey(item.rules[`ASAP-GP2`].rule) === Self.getConfRuleKey(`ASAP-GP2`, `datasets`, null, `1`);
    }),
    // Confirmatory and Quality Control datasets are not required to be included in your dataset upload.
    datasets.filter(function (item) {
      return Self.getRuleKey(item.rules[`ASAP-GP2`].rule) === Self.getConfRuleKey(`ASAP-GP2`, `datasets`, null, `2`);
    })
  ];
  let filteredCode = [
    // Upload code to Zenodo and provide DOI
    code.filter(function (item) {
      let subType = item.dataType === `other` ? `` : item.subType;
      return Self.getRuleKey(item.rules[`ASAP-GP2`].rule) === Self.getConfRuleKey(`ASAP-GP2`, `code`, subType, `2`);
    }),
    // Verify citation
    code.filter(function (item) {
      let subType = item.dataType === `other` ? `` : item.subType;
      return Self.getRuleKey(item.rules[`ASAP-GP2`].rule) === Self.getConfRuleKey(`ASAP-GP2`, `code`, subType, `1`);
    }),
    // Done - Cited correctly
    code.filter(function (item) {
      let subType = item.dataType === `other` ? `` : item.subType;
      return Self.getRuleKey(item.rules[`ASAP-GP2`].rule) === Self.getConfRuleKey(`ASAP-GP2`, `code`, subType, `0`);
    })
  ];
  let filteredSoftware = [
    // Include missing information in citation
    software.filter(function (item) {
      let subType = item.dataType === `other` ? `` : item.subType;
      return Self.getRuleKey(item.rules[`ASAP-GP2`].rule) === Self.getConfRuleKey(`ASAP-GP2`, `software`, subType, `2`);
    }),
    // Verify citation
    software.filter(function (item) {
      let subType = item.dataType === `other` ? `` : item.subType;
      return Self.getRuleKey(item.rules[`ASAP-GP2`].rule) === Self.getConfRuleKey(`ASAP-GP2`, `software`, subType, `1`);
    }),
    // Done - Citation meets minimum standards
    software.filter(function (item) {
      let subType = item.dataType === `other` ? `` : item.subType;
      return Self.getRuleKey(item.rules[`ASAP-GP2`].rule) === Self.getConfRuleKey(`ASAP-GP2`, `software`, subType, `0`);
    })
  ];
  let filteredMaterials = [
    // Assign RRID and cite in text
    reagents.filter(function (item) {
      return Self.getRuleKey(item.rules[`ASAP-GP2`].rule) === Self.getConfRuleKey(`ASAP-GP2`, `reagents`, null, `3`);
    }),
    // Check for an existing RRID
    reagents.filter(function (item) {
      return Self.getRuleKey(item.rules[`ASAP-GP2`].rule) === Self.getConfRuleKey(`ASAP-GP2`, `reagents`, null, `2`);
    }),
    // Verify citation
    reagents.filter(function (item) {
      return Self.getRuleKey(item.rules[`ASAP-GP2`].rule) === Self.getConfRuleKey(`ASAP-GP2`, `reagents`, null, `1`);
    }),
    // Done - Cited correctly
    reagents.filter(function (item) {
      return Self.getRuleKey(item.rules[`ASAP-GP2`].rule) === Self.getConfRuleKey(`ASAP-GP2`, `reagents`, null, `0`);
    })
  ];
  let filteredProtocols = [
    // Deposit in repository and cite DOI in text
    protocols.filter(function (item) {
      let subType = item.dataType === `other` ? `` : item.subType;
      return (
        Self.getRuleKey(item.rules[`ASAP-GP2`].rule) === Self.getConfRuleKey(`ASAP-GP2`, `protocols`, subType, `2`)
      );
    }),
    // Confirm citations meet minimum standards
    protocols.filter(function (item) {
      let subType = item.dataType === `other` ? `` : item.subType;
      return (
        Self.getRuleKey(item.rules[`ASAP-GP2`].rule) === Self.getConfRuleKey(`ASAP-GP2`, `protocols`, subType, `3`)
      );
    }),
    // Verify citation
    protocols.filter(function (item) {
      let subType = item.dataType === `other` ? `` : item.subType;
      return (
        Self.getRuleKey(item.rules[`ASAP-GP2`].rule) === Self.getConfRuleKey(`ASAP-GP2`, `protocols`, subType, `1`)
      );
    }),
    // Done - Cited correctly
    protocols.filter(function (item) {
      let subType = item.dataType === `other` ? `` : item.subType;
      return (
        Self.getRuleKey(item.rules[`ASAP-GP2`].rule) === Self.getConfRuleKey(`ASAP-GP2`, `protocols`, subType, `0`)
      );
    })
  ];
  let filteredDataObject = {
    datasets: {
      filtered: filteredDatasets,
      identified: filteredDatasets.slice(0, 4).flat(),
      shared: filteredDatasets[3]
    },
    code: {
      filtered: filteredCode,
      identified: filteredCode.flat(),
      shared: filteredCode.slice(2).flat()
    },
    software: {
      filtered: filteredSoftware,
      identified: filteredSoftware.flat(),
      shared: filteredSoftware.slice(2).flat()
    },
    materials: {
      filtered: filteredMaterials,
      identified: filteredMaterials.flat(),
      shared: filteredMaterials.slice(3).flat()
    },
    protocols: {
      filtered: filteredProtocols,
      identified: filteredProtocols.flat(),
      shared: filteredProtocols.slice(3).flat()
    }
  };
  return Self.getSheets({ spreadsheetId: spreadsheetId }, function (err, sheets) {
    let summarySheetId = Self.getSheetId(sheets, `Summary Sheet`);
    let authorsAndAffiliationSheetId = Self.getSheetId(sheets, `Authors and Affiliation`);
    let datasetsReportSheetId = Self.getSheetId(sheets, `Datasets`);
    let codeAndSoftwareReportSheetId = Self.getSheetId(sheets, `Code and Software`);
    let labMaterialsReportSheetId = Self.getSheetId(sheets, `Lab Materials`);
    let protocolsReportSheetId = Self.getSheetId(sheets, `Protocols`);
    let ChartsSheetId = Self.getSheetId(sheets, `Charts`);
    let actions = [
      // fill 'Summary Sheet'
      function (next) {
        if (summarySheetId instanceof Error) return next(summarySheetId);
        return Self.fillSummaryASAPGP2Sheet(
          {
            spreadsheetId: spreadsheetId,
            sheetId: summarySheetId,
            data: {
              documentId: doc.id,
              token: doc.token,
              DAS: metadata.DAS,
              articleTitle: metadata.articleTitle,
              doi: metadata.doi,
              authors: metadata.authors,
              dataSeerLink: metadata.dataSeerLink,
              originalFileLink: metadata.originalFileLink,
              affiliationAcknowledgementsLicenseNotes: metadata.affiliationAcknowledgementsLicenseNotes,
              protocols: {
                notes: dataObjectsMetadata.protocols.notes,
                new: {
                  identified: filteredDataObject.protocols.identified.filter(function (item) {
                    return !item.reuse;
                  }).length,
                  shared: filteredDataObject.protocols.shared.filter(function (item) {
                    return !item.reuse;
                  }).length
                },
                reuse: {
                  identified: filteredDataObject.protocols.identified.filter(function (item) {
                    return item.reuse;
                  }).length,
                  shared: filteredDataObject.protocols.shared.filter(function (item) {
                    return item.reuse;
                  }).length
                }
              },
              codeAndSoftware: {
                notes: dataObjectsMetadata.codeAndSoftware.notes,
                code: {
                  identified: filteredDataObject.code.identified.length,
                  shared: filteredDataObject.code.shared.length
                },
                software: {
                  identified: filteredDataObject.software.identified.length,
                  shared: filteredDataObject.software.shared.length
                }
              },
              materials: {
                notes: dataObjectsMetadata.materials.notes,
                new: {
                  identified: filteredDataObject.materials.identified.filter(function (item) {
                    return !item.reuse;
                  }).length,
                  shared: filteredDataObject.materials.shared.filter(function (item) {
                    return !item.reuse;
                  }).length
                },
                reuse: {
                  identified: filteredDataObject.materials.identified.filter(function (item) {
                    return item.reuse;
                  }).length,
                  shared: filteredDataObject.materials.shared.filter(function (item) {
                    return item.reuse;
                  }).length
                }
              },
              datasets: {
                notes: dataObjectsMetadata.datasets.notes,
                new: {
                  identified: filteredDataObject.datasets.identified.filter(function (item) {
                    return !item.reuse;
                  }).length,
                  shared: filteredDataObject.datasets.shared.filter(function (item) {
                    return !item.reuse;
                  }).length
                },
                reuse: {
                  identified: filteredDataObject.datasets.identified.filter(function (item) {
                    return item.reuse;
                  }).length,
                  shared: filteredDataObject.datasets.shared.filter(function (item) {
                    return item.reuse;
                  }).length
                }
              }
            }
          },
          function (err, res) {
            return next(err);
          }
        );
      },
      // fill 'Research Output Availability Statement' part of the report
      function (next) {
        if (summarySheetId instanceof Error) return next(summarySheetId);
        return Self.fillResearchOutputAvailabilityStatementAndOtherInformationASAPGP2Part(
          {
            spreadsheetId: spreadsheetId,
            sheetId: summarySheetId,
            data: {
              documentId: doc.id,
              documentToken: doc.token,
              authors: metadata.authors,
              roas: {
                datasets: filteredDataObject.datasets.filtered[3].filter(function (item) {
                  return !item.reuse;
                }),
                code: filteredDataObject.code.filtered[2].filter(function (item) {
                  return !item.reuse;
                }),
                software: filteredDataObject.software.filtered[2].filter(function (item) {
                  return !item.reuse;
                }),
                materials: filteredDataObject.materials.filtered[3].filter(function (item) {
                  return !item.reuse;
                }),
                protocols: filteredDataObject.protocols.filtered[3].filter(function (item) {
                  return !item.reuse;
                })
              },
              otherInformation: {
                datasets: datasets,
                code: code,
                software: software,
                materials: reagents,
                protocols: protocols
              }
            }
          },
          function (err, res) {
            return next(err);
          }
        );
      },
      // fill 'Authors and Affiliations'
      function (next) {
        if (authorsAndAffiliationSheetId instanceof Error) return next(authorsAndAffiliationSheetId);
        return Self.fillAuthorsAndAffiliationASAPGP2Sheet(
          {
            spreadsheetId: spreadsheetId,
            sheetId: authorsAndAffiliationSheetId,
            data: {
              metadata: metadata
            }
          },
          function (err, res) {
            return next(err);
          }
        );
      },
      // fill 'dataObject pages'
      function (next) {
        if (datasetsReportSheetId instanceof Error) return next(datasetsReportSheetId);
        if (codeAndSoftwareReportSheetId instanceof Error) return next(codeAndSoftwareReportSheetId);
        if (labMaterialsReportSheetId instanceof Error) return next(labMaterialsReportSheetId);
        if (protocolsReportSheetId instanceof Error) return next(protocolsReportSheetId);
        return Self.fillDataObjectsTabsASAPGP2Sheet(
          {
            spreadsheetId: spreadsheetId,
            sheets: {
              'datasets': { id: datasetsReportSheetId, name: `Datasets` },
              'code': { id: codeAndSoftwareReportSheetId, name: `Code and Software` },
              'software': { id: codeAndSoftwareReportSheetId, name: `Code and Software` },
              'codeAndSoftware': { id: codeAndSoftwareReportSheetId, name: `Code and Software` },
              'materials': { id: labMaterialsReportSheetId, name: `Lab Materials` },
              'protocols': { id: protocolsReportSheetId, name: `Protocols` }
            },
            data: {
              documentId: doc.id,
              documentToken: doc.token,

              summary: summary,
              datasets: filteredDataObject.datasets.filtered,
              code: filteredDataObject.code.filtered,
              software: filteredDataObject.software.filtered,
              materials: filteredDataObject.materials.filtered,
              protocols: filteredDataObject.protocols.filtered
            }
          },
          function (err, res) {
            return next(err);
          }
        );
      },
      // fill 'Charts'
      function (next) {
        if (ChartsSheetId instanceof Error) return next(ChartsSheetId);
        return Self.fillChartsASAPGP2Sheet(
          {
            spreadsheetId: spreadsheetId,
            sheetId: ChartsSheetId,
            data: {
              documentId: doc.id,
              documentToken: doc.token,
              token: doc.token,
              dataseerDomain: metadata.dataseerDomain
            }
          },
          function (err, res) {
            return next(err);
          }
        );
      }
    ];
    return async.mapSeries(
      actions,
      function (action, next) {
        return action(function (err) {
          return next(err);
        });
      },
      function (err) {
        return cb(err);
      }
    );
  });
};

/**
 * This function will fill 'Research Output Availability Statement' part of the report with given data and return the file ID (google file ID)
 * @param {object} opts - Options available
 * @param {string} opts.spreadsheetId - spreadsheetId
 * @param {object} opts.sheetId - sheetId
 * @param {object} opts.data - Data available
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR undefined)
 * @returns {undefined} undefined
 */
Self.fillResearchOutputAvailabilityStatementAndOtherInformationASAPGP2Part = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `spreadsheetId`) === `undefined`)
    return cb(Error(`Missing required data: opts.spreadsheetId`));
  if (typeof _.get(opts, `sheetId`) === `undefined`) return cb(Error(`Missing required data: opts.sheetId`));
  let spreadsheetId = _.get(opts, `spreadsheetId`);
  let sheetId = _.get(opts, `sheetId`);
  let data = _.get(opts, `data`, {});
  let roas = {
    protocols: _.get(data, `roas.protocols`, []),
    code: _.get(data, `roas.code`, []),
    software: _.get(data, `roas.software`, []),
    materials: _.get(data, `roas.materials`, []),
    datasets: _.get(data, `roas.datasets`, [])
  };
  let otherInformation = {
    protocols: _.get(data, `otherInformation.protocols`, []),
    code: _.get(data, `otherInformation.code`, []),
    software: _.get(data, `otherInformation.software`, []),
    materials: _.get(data, `otherInformation.materials`, []),
    datasets: _.get(data, `otherInformation.datasets`, [])
  };
  let documentId = _.get(data, `documentId`);
  let documentToken = _.get(data, `documentToken`);
  let animalModels = otherInformation.materials
    .filter(function (item) {
      return item.subType === `organism`;
    })
    .map(function (item) {
      return {
        name: conf.settings.dataObjectsLinks[`ASAP-GP2`]
          ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
          : item.name,
        URL: item.source ? `${item.source} ` : `` + item.catalogNumber ? `${item.catalogNumber} ` : ``,
        identifier: item.RRID,
        notes: item.comments
      };
    });
  let cellLines = otherInformation.materials
    .filter(function (item) {
      return item.subType === `cell line`;
    })
    .map(function (item) {
      return {
        name: conf.settings.dataObjectsLinks[`ASAP-GP2`]
          ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
          : item.name,
        URL: item.source ? `${item.source} ` : `` + item.catalogNumber ? `${item.catalogNumber} ` : ``,
        identifier: item.RRID,
        notes: item.comments
      };
    });
  let lines = {
    datasets: roas.datasets.map(function (item) {
      return {
        name: conf.settings.dataObjectsLinks[`ASAP-GP2`]
          ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
          : item.name,
        URL: item.URL,
        identifier: item.PID,
        notes: item.comments
      };
    }),
    codeAndSoftware: roas.code
      .map(function (item) {
        return {
          name: conf.settings.dataObjectsLinks[`ASAP-GP2`]
            ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
            : item.name,
          URL: item.URL,
          identifier: item.DOI,
          notes: item.comments
        };
      })
      .concat(
        roas.software.map(function (item) {
          return {
            name: conf.settings.dataObjectsLinks[`ASAP-GP2`]
              ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
              : item.name,
            URL: item.URL,
            identifier: item.RRID,
            notes: item.comments
          };
        })
      ),
    materials: roas.materials.map(function (item) {
      return {
        name: conf.settings.dataObjectsLinks[`ASAP-GP2`]
          ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
          : item.name,
        URL: item.RRID,
        identifier: item.RRID,
        notes: item.comments
      };
    }),
    protocols: roas.protocols.map(function (item) {
      return {
        name: conf.settings.dataObjectsLinks[`ASAP-GP2`]
          ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
          : item.name,
        URL: item.URL,
        identifier: item.DOI,
        notes: item.comments
      };
    }),
    all: []
  };
  // Default values (to avoid offset bug)
  lines.datasets = lines.datasets.length ? lines.datasets : [{ name: ``, URL: ``, identifier: ``, notes: `` }];
  lines.codeAndSoftware = lines.codeAndSoftware.length
    ? lines.codeAndSoftware
    : [{ name: ``, URL: ``, identifier: ``, notes: `` }];
  lines.materials = lines.materials.length ? lines.materials : [{ name: ``, URL: ``, identifier: ``, notes: `` }];
  lines.protocols = lines.protocols.length ? lines.protocols : [{ name: ``, URL: ``, identifier: ``, notes: `` }];
  // Concat all data
  lines.all = lines.datasets.concat(lines.codeAndSoftware).concat(lines.materials).concat(lines.protocols);
  let actions = [
    // Insert rows
    function (next) {
      let otherInformation = [];
      if (cellLines.length > 1) {
        otherInformation.push(Self.buildRequestInsertRows(sheetId, 49, 49 + cellLines.length - 1, true));
        otherInformation.push(
          Self.buildRequestUpdateBorders(sheetId, 49, 49 + cellLines.length - 1, 3, 4, GRAY_BORDERS)
        );
      }
      if (animalModels.length > 1) {
        otherInformation.push(Self.buildRequestInsertRows(sheetId, 48, 48 + animalModels.length - 1, true));
        otherInformation.push(
          Self.buildRequestUpdateBorders(sheetId, 48, 48 + animalModels.length - 1, 3, 4, GRAY_BORDERS)
        );
      }
      // Headers of "Other Information" section
      otherInformation.push(Self.buildRequestUpdateBorders(sheetId, 47, 48, 0, 4, GRAY_BORDERS));
      let offset = animalModels.length > 1 ? animalModels.length - 1 : 0;
      otherInformation.push(Self.buildRequestUpdateBorders(sheetId, 48 + offset, 49 + offset, 0, 4, GRAY_BORDERS));
      offset += cellLines.length > 1 ? cellLines.length - 1 : 0;
      otherInformation.push(Self.buildRequestUpdateBorders(sheetId, 49 + offset, 50 + offset, 0, 4, GRAY_BORDERS));
      let researchOutputAvailabilityStatement = [];
      if (lines.protocols.length > 1)
        researchOutputAvailabilityStatement.push(
          Self.buildRequestInsertRows(sheetId, 44, 44 + lines.protocols.length - 1, true)
        );
      if (lines.materials.length > 1)
        researchOutputAvailabilityStatement.push(
          Self.buildRequestInsertRows(sheetId, 43, 43 + lines.materials.length - 1, true)
        );
      if (lines.codeAndSoftware.length > 1)
        researchOutputAvailabilityStatement.push(
          Self.buildRequestInsertRows(sheetId, 42, 42 + lines.codeAndSoftware.length - 1, true)
        );
      if (lines.datasets.length > 1)
        researchOutputAvailabilityStatement.push(
          Self.buildRequestInsertRows(sheetId, 41, 41 + lines.datasets.length - 1, true)
        );
      researchOutputAvailabilityStatement.push(
        Self.buildRequestUpdateBorders(sheetId, 40, 40 + lines.all.length, 6, 8, GRAY_BORDERS)
      );
      researchOutputAvailabilityStatement.push(
        Self.buildRequestUpdateBorders(sheetId, 40, 40 + lines.all.length, 5, 6, BLACK_BORDERS)
      );
      let deleteOffsetOfSections = [
        Self.buildRequestDeleteRange(sheetId, 38, 40 + lines.all.length, 0, 4, `ROWS`) // Other Information section
      ];
      let requests = otherInformation.concat(researchOutputAvailabilityStatement).concat(deleteOffsetOfSections);
      return gSheets.spreadsheets.batchUpdate(
        {
          // The ID of the spreadsheet to update.
          spreadsheetId: spreadsheetId,
          // Request body metadata
          requestBody: {
            includeSpreadsheetInResponse: false,
            responseIncludeGridData: false,
            // request body parameters
            requests: requests
          }
        },
        function (err, res) {
          return next(err);
        }
      );
    },
    // Update cells & Add data validations
    function (next) {
      let data = [];
      let offset = 41;
      for (let i = 0; i < lines.all.length; i++) {
        let rowIndex = offset + i;
        data.push(Self.buildRequestUpdateCell(`'Summary Sheet'!G${rowIndex}`, [lines.all[i].name]));
        data.push(
          Self.buildRequestUpdateCell(`'Summary Sheet'!H${rowIndex}`, [
            lines.all[i].URL ? lines.all[i].URL : lines.all[i].identifier
          ])
        );
      }
      offset = 42; // Because this section is now on the left of ROAS section
      if (animalModels.length > 0) {
        data.push(Self.buildRequestUpdateCell(`'Summary Sheet'!B${offset}`, [animalModels.length]));
        for (let i = 0; i < animalModels.length; i++) {
          let rowIndex = offset + i;
          data.push(Self.buildRequestUpdateCell(`'Summary Sheet'!D${rowIndex}`, [animalModels[i].name]));
        }
      }
      offset += animalModels.length > 0 ? animalModels.length : 1;
      if (cellLines.length > 0) {
        data.push(Self.buildRequestUpdateCell(`'Summary Sheet'!B${offset}`, [cellLines.length]));
        for (let i = 0; i < cellLines.length; i++) {
          let rowIndex = offset + i;
          data.push(Self.buildRequestUpdateCell(`'Summary Sheet'!D${rowIndex}`, [cellLines[i].name]));
        }
      }
      return gSheets.spreadsheets.values.batchUpdate(
        {
          // The ID of the spreadsheet to update.
          spreadsheetId: spreadsheetId,
          // Request body metadata
          requestBody: {
            // request body parameters
            data: data,
            valueInputOption: `USER_ENTERED`
          }
        },
        function (err, res) {
          return next(err);
        }
      );
    }
  ];
  return async.mapSeries(
    actions,
    function (action, next) {
      return action(function (err) {
        return next(err);
      });
    },
    function (err) {
      return cb(err);
    }
  );
};

/**
 * This function will fill charts sheet with given data and return the file ID (google file ID)
 * @param {object} opts - Options available
 * @param {string} opts.spreadsheetId - spreadsheetId
 * @param {object} opts.sheetId - sheetId
 * @param {object} opts.data - Data available
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR undefined)
 * @returns {undefined} undefined
 */
Self.fillChartsASAPGP2Sheet = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `spreadsheetId`) === `undefined`)
    return cb(Error(`Missing required data: opts.spreadsheetId`));
  if (typeof _.get(opts, `sheetId`) === `undefined`) return cb(Error(`Missing required data: opts.sheetId`));
  let spreadsheetId = _.get(opts, `spreadsheetId`);
  let sheetId = _.get(opts, `sheetId`);
  let data = _.get(opts, `data`, {});
  let documentId = _.get(data, `documentId`);
  let documentToken = _.get(data, `documentToken`);
  let token = _.get(data, `token`);
  let dataseerDomain = _.get(data, `dataseerDomain`);
  let _data = [
    Self.buildRequestUpdateCell(`'Charts'!N2`, [dataseerDomain]),
    Self.buildRequestUpdateCell(`'Charts'!N3`, [documentId]),
    Self.buildRequestUpdateCell(`'Charts'!N4`, [token])
  ];
  return gSheets.spreadsheets.values.batchUpdate(
    {
      // The ID of the spreadsheet to update.
      spreadsheetId: spreadsheetId,
      // Request body metadata
      requestBody: {
        // request body parameters
        data: _data,
        valueInputOption: `USER_ENTERED`
      }
    },
    function (err, res) {
      return cb(err);
    }
  );
};

/**
 * This function will fill Detailed Report sheet with given data and return the file ID (google file ID)
 * @param {object} opts - Options available
 * @param {string} opts.spreadsheetId - spreadsheetId
 * @param {object} opts.sheets - All sheets
 * @param {object} opts.data - Data available
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR undefined)
 * @returns {undefined} undefined
 */
Self.fillDataObjectsTabsASAPGP2Sheet = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `spreadsheetId`) === `undefined`)
    return cb(Error(`Missing required data: opts.spreadsheetId`));
  if (typeof _.get(opts, `sheets`) === `undefined`) return cb(Error(`Missing required data: opts.sheets`));
  let spreadsheetId = _.get(opts, `spreadsheetId`);
  let sheets = _.get(opts, `sheets`);
  let datasetsReportSheet = _.get(sheets, `datasets`);
  let codeReportSheet = _.get(sheets, `code`);
  let softwareReportSheet = _.get(sheets, `software`);
  let codeAndSoftwareReportSheet = _.get(sheets, `codeAndSoftware`);
  let materialsReportSheet = _.get(sheets, `materials`);
  let protocolsReportSheet = _.get(sheets, `protocols`);
  let data = _.get(opts, `data`, {});
  let summary = _.get(data, `summary`, []);
  let protocols = _.get(data, `protocols`, []);
  let code = _.get(data, `code`, []);
  let software = _.get(data, `software`, []);
  let materials = _.get(data, `materials`, []);
  let datasets = _.get(data, `datasets`, []);
  let documentId = _.get(data, `documentId`);
  let documentToken = _.get(data, `documentToken`);
  let sortedDatasets = {};
  // Regroup datasets by datatype
  for (let i = 0; i < datasets.length; i++) {
    let dataset = datasets[i];
    if (typeof sortedDatasets[dataset.dataType] === `undefined`)
      sortedDatasets[dataset.dataType] = { name: dataset.dataType, list: [] };
    sortedDatasets[dataset.dataType].list.push(dataset);
  }
  // Compute batches commands
  let batches = [
    // protocols
    {
      sheet: protocolsReportSheet,
      row: { min: 3, max: 3, insert: 3 },
      column: { min: 0, max: 8 },
      params: {
        noDataRow: { min: 4, max: 7 }
      },
      cells: [],
      data: [
        {
          merges: [],
          row: { min: 8, max: 13, insert: 11 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `issue` },
            { column: `D`, property: `name` },
            { column: `E`, property: `URL` },
            { column: `F`, property: `DOI` },
            { column: `G`, property: `protocolType` },
            { column: `H`, property: `notes` }
          ],
          // Deposit in repository and cite DOI in text
          data: protocols[0].map(function (item) {
            return {
              reuse: item.reuse,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`ASAP-GP2`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              DOI: item.DOI,
              URL: item.URL,
              protocolType: item.type.url
                ? `=LIEN_HYPERTEXTE("${item.type.url}";"${item.type.label}")`
                : item.type.label,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `)
            };
          })
        },
        {
          merges: [],
          row: { min: 14, max: 19, insert: 17 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `issue` },
            { column: `D`, property: `name` },
            { column: `E`, property: `URL` },
            { column: `F`, property: `DOI` },
            { column: `G`, property: `protocolType` },
            { column: `H`, property: `notes` }
          ],
          // Confirm citations meet minimum standards
          data: protocols[1].map(function (item) {
            return {
              reuse: item.reuse,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`ASAP-GP2`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              DOI: item.DOI,
              URL: item.URL,
              protocolType: item.type.url
                ? `=LIEN_HYPERTEXTE("${item.type.url}";"${item.type.label}")`
                : item.type.label,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `)
            };
          })
        },
        {
          merges: [],
          row: { min: 20, max: 25, insert: 23 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `issue` },
            { column: `D`, property: `name` },
            { column: `E`, property: `URL` },
            { column: `F`, property: `DOI` },
            { column: `G`, property: `protocolType` },
            { column: `H`, property: `notes` }
          ],
          // Verify citation
          data: protocols[2].map(function (item) {
            return {
              reuse: item.reuse,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`ASAP-GP2`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              DOI: item.DOI,
              URL: item.URL,
              protocolType: item.type.url
                ? `=LIEN_HYPERTEXTE("${item.type.url}";"${item.type.label}")`
                : item.type.label,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `)
            };
          })
        },
        {
          merges: [],
          row: { min: 26, max: 30, insert: 28 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `issue` },
            { column: `D`, property: `name` },
            { column: `E`, property: `URL` },
            { column: `F`, property: `DOI` },
            { column: `G`, property: `protocolType` },
            { column: `H`, property: `notes` }
          ],
          // Done - Cited correctly
          data: protocols[3].map(function (item) {
            return {
              reuse: item.reuse,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`ASAP-GP2`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              DOI: item.DOI,
              URL: item.URL,
              protocolType: item.type.url
                ? `=LIEN_HYPERTEXTE("${item.type.url}";"${item.type.label}")`
                : item.type.label,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `)
            };
          })
        }
      ]
    },
    // lab materials
    {
      sheet: materialsReportSheet,
      row: { min: 3, max: 3, insert: 3 },
      column: { min: 0, max: 12 },
      params: {
        noDataRow: { min: 4, max: 7 }
      },
      cells: [],
      data: [
        {
          merges: [],
          row: { min: 8, max: 13, insert: 11 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `issue` },
            { column: `D`, property: `name` },
            { column: `E`, property: `sentences` },
            { column: `F`, property: `source` },
            { column: `G`, property: `catalog` },
            { column: `H`, property: `RRID` },
            { column: `I`, property: `datatype` },
            { column: `J`, property: `suggestedEntity` },
            { column: `K`, property: `suggestedRRID` },
            { column: `L`, property: `notes` }
          ],
          // Assign RRID and cite in text
          data: materials[0].map(function (item) {
            return {
              reuse: item.reuse,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`ASAP-GP2`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              repository: item.DOI,
              datatype: item.type.url ? `=LIEN_HYPERTEXTE("${item.type.url}";"${item.type.label}")` : item.type.label,
              source: item.source,
              RRID: item.RRID,
              suggestedEntity: item.suggestedEntity,
              catalog: item.catalogNumber,
              suggestedRRID: item.suggestedRRID
            };
          })
        },
        {
          merges: [],
          row: { min: 14, max: 19, insert: 17 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `issue` },
            { column: `D`, property: `name` },
            { column: `E`, property: `sentences` },
            { column: `F`, property: `source` },
            { column: `G`, property: `catalog` },
            { column: `H`, property: `RRID` },
            { column: `I`, property: `datatype` },
            { column: `J`, property: `suggestedEntity` },
            { column: `K`, property: `suggestedRRID` },
            { column: `L`, property: `notes` }
          ],
          // Check for an existing RRID
          data: materials[1].map(function (item) {
            return {
              reuse: item.reuse,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`ASAP-GP2`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              repository: item.DOI,
              datatype: item.type.url ? `=LIEN_HYPERTEXTE("${item.type.url}";"${item.type.label}")` : item.type.label,
              source: item.source,
              RRID: item.RRID,
              suggestedEntity: item.suggestedEntity,
              catalog: item.catalogNumber,
              suggestedRRID: item.suggestedRRID
            };
          })
        },
        {
          merges: [],
          row: { min: 20, max: 25, insert: 23 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `issue` },
            { column: `D`, property: `name` },
            { column: `E`, property: `sentences` },
            { column: `F`, property: `source` },
            { column: `G`, property: `catalog` },
            { column: `H`, property: `RRID` },
            { column: `I`, property: `datatype` },
            { column: `J`, property: `suggestedEntity` },
            { column: `K`, property: `suggestedRRID` },
            { column: `L`, property: `notes` }
          ],
          // Verify citation
          data: materials[2].map(function (item) {
            return {
              reuse: item.reuse,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`ASAP-GP2`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              repository: item.DOI,
              datatype: item.type.url ? `=LIEN_HYPERTEXTE("${item.type.url}";"${item.type.label}")` : item.type.label,
              source: item.source,
              RRID: item.RRID,
              suggestedEntity: item.suggestedEntity,
              catalog: item.catalogNumber,
              suggestedRRID: item.suggestedRRID
            };
          })
        },
        {
          merges: [],
          row: { min: 26, max: 30, insert: 28 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `issue` },
            { column: `D`, property: `name` },
            { column: `E`, property: `sentences` },
            { column: `F`, property: `source` },
            { column: `G`, property: `catalog` },
            { column: `H`, property: `RRID` },
            { column: `I`, property: `datatype` },
            { column: `J`, property: `suggestedEntity` },
            { column: `K`, property: `suggestedRRID` },
            { column: `L`, property: `notes` }
          ],
          // Done - Cited correctly
          data: materials[3].map(function (item) {
            return {
              reuse: item.reuse,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`ASAP-GP2`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              repository: item.DOI,
              datatype: item.type.url ? `=LIEN_HYPERTEXTE("${item.type.url}";"${item.type.label}")` : item.type.label,
              source: item.source,
              RRID: item.RRID,
              suggestedEntity: item.suggestedEntity,
              catalog: item.catalogNumber,
              suggestedRRID: item.suggestedRRID
            };
          })
        },
        {
          merges: [],
          row: { min: 31, max: 36, insert: 34 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `issue` },
            { column: `D`, property: `name` },
            { column: `E`, property: `sentences` },
            { column: `F`, property: `source` },
            { column: `G`, property: `catalog` },
            { column: `H`, property: `RRID` },
            { column: `I`, property: `datatype` },
            { column: `J`, property: `suggestedEntity` },
            { column: `K`, property: `suggestedRRID` },
            { column: `L`, property: `notes` }
          ],
          // None - Citation meets minimum standards
          data: []
        }
      ]
    },
    // code and software
    // software
    {
      sheet: codeAndSoftwareReportSheet,
      row: { min: 26, max: 26, insert: 26 },
      column: { min: 0, max: 11 },
      params: {
        noDataRow: { min: 27, max: 30 }
      },
      cells: [],
      data: [
        {
          merges: [],
          row: { min: 31, max: 36, insert: 34 },
          cells: [
            { column: `B`, property: `issue` },
            { column: `C`, property: `version` },
            { column: `D`, property: `name` },
            { column: `E`, property: `sentences` },
            { column: `F`, property: `URL` },
            { column: `G`, property: `RRID` },
            { column: `H`, property: `suggestedEntity` },
            { column: `I`, property: `suggestedRRID` },
            { column: `J`, property: `suggestedURL` },
            { column: `K`, property: `notes` }
          ],
          // Include missing information in citation
          data: software[0].map(function (item) {
            return {
              reuse: item.reuse,
              version: item.version,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`ASAP-GP2`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              URL: item.URL,
              RRID: item.RRID,
              suggestedEntity: item.suggestedEntity,
              suggestedRRID: item.suggestedRRID,
              suggestedURL: item.suggestedURL,
              notes: item.comments
            };
          })
        },
        {
          merges: [],
          row: { min: 37, max: 42, insert: 40 },
          cells: [
            { column: `B`, property: `issue` },
            { column: `C`, property: `version` },
            { column: `D`, property: `name` },
            { column: `E`, property: `sentences` },
            { column: `F`, property: `URL` },
            { column: `G`, property: `RRID` },
            { column: `H`, property: `suggestedEntity` },
            { column: `I`, property: `suggestedRRID` },
            { column: `J`, property: `suggestedURL` },
            { column: `K`, property: `notes` }
          ],
          // Verify citation
          data: software[1].map(function (item) {
            return {
              reuse: item.reuse,
              version: item.version,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`ASAP-GP2`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              URL: item.URL,
              RRID: item.RRID,
              suggestedEntity: item.suggestedEntity,
              suggestedRRID: item.suggestedRRID,
              suggestedURL: item.suggestedURL,
              notes: item.comments
            };
          })
        },
        {
          merges: [],
          row: { min: 43, max: 48, insert: 46 },
          cells: [
            { column: `B`, property: `issue` },
            { column: `C`, property: `version` },
            { column: `D`, property: `name` },
            { column: `E`, property: `sentences` },
            { column: `F`, property: `URL` },
            { column: `G`, property: `RRID` },
            { column: `H`, property: `suggestedEntity` },
            { column: `I`, property: `suggestedRRID` },
            { column: `J`, property: `suggestedURL` },
            { column: `K`, property: `notes` }
          ],
          // Done - Citation meets minimum standards
          data: software[2].map(function (item) {
            return {
              reuse: item.reuse,
              version: item.version,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`ASAP-GP2`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              URL: item.URL,
              RRID: item.RRID,
              suggestedEntity: item.suggestedEntity,
              suggestedRRID: item.suggestedRRID,
              suggestedURL: item.suggestedURL,
              notes: item.comments
            };
          })
        }
      ]
    },
    // code
    {
      sheet: codeAndSoftwareReportSheet,
      row: { min: 3, max: 3, insert: 3 },
      column: { min: 0, max: 11 },
      params: {
        noDataRow: { min: 4, max: 7 }
      },
      cells: [],
      data: [
        {
          merges: [
            { begin: 1, end: 3 },
            { begin: 6, end: 8 },
            { begin: 8, end: 11 }
          ],
          row: { min: 8, max: 13, insert: 11 },
          cells: [
            { column: `B`, property: `issue` },
            { column: `D`, property: `name` },
            { column: `E`, property: `sentences` },
            { column: `F`, property: `URL` },
            { column: `G`, property: `DOI` },
            { column: `I`, property: `notes` }
          ],
          // Upload code to Zenodo and provide DOI
          data: code[0].map(function (item) {
            return {
              reuse: item.reuse,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`ASAP-GP2`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              DOI: item.DOI,
              URL: item.URL
            };
          })
        },
        {
          merges: [
            { begin: 1, end: 3 },
            { begin: 6, end: 8 },
            { begin: 8, end: 11 }
          ],
          row: { min: 14, max: 19, insert: 17 },
          cells: [
            { column: `B`, property: `issue` },
            { column: `D`, property: `name` },
            { column: `E`, property: `sentences` },
            { column: `F`, property: `URL` },
            { column: `G`, property: `DOI` },
            { column: `I`, property: `notes` }
          ],
          // Verify citation
          data: code[1].map(function (item) {
            return {
              reuse: item.reuse,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`ASAP-GP2`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              DOI: item.DOI,
              URL: item.URL
            };
          })
        },
        {
          merges: [
            { begin: 1, end: 3 },
            { begin: 6, end: 8 },
            { begin: 8, end: 11 }
          ],
          row: { min: 20, max: 25, insert: 22 },
          cells: [
            { column: `B`, property: `issue` },
            { column: `D`, property: `name` },
            { column: `E`, property: `sentences` },
            { column: `F`, property: `URL` },
            { column: `G`, property: `DOI` },
            { column: `I`, property: `notes` }
          ],
          // Done - Cited correctly
          data: code[2].map(function (item) {
            return {
              reuse: item.reuse,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`ASAP-GP2`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              DOI: item.DOI,
              URL: item.URL
            };
          })
        }
      ]
    },
    // datasets
    {
      sheet: datasetsReportSheet,
      row: { min: 3, max: 3, insert: 3 },
      column: { min: 0, max: 12 },
      params: {
        noDataRow: { min: 4, max: 7 }
      },
      cells: [],
      data: [
        {
          merges: [],
          row: { min: 8, max: 13, insert: 11 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `qc` },
            { column: `D`, property: `representativeImage` },
            { column: `E`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `H`, property: `URL` },
            { column: `I`, property: `PID` },
            { column: `J`, property: `notes` },
            { column: `K`, property: `figureOrTable` },
            { column: `L`, property: `datatype` }
          ],
          // Deposit to appropriate repository and cite PID in text
          data: datasets[0].map(function (item) {
            return {
              reuse: item.reuse,
              qc: item.qc,
              representativeImage: item.representativeImage,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`ASAP-GP2`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              URL: item.URL,
              PID: item.PID,
              notes: item.comments,
              figureOrTable: item.associatedFigureOrTable,
              datatype:
                item.type && item.type.url
                  ? `=LIEN_HYPERTEXTE("${item.type.url}";"${item.type.label}")`
                  : item.type.label
            };
          })
        },
        {
          merges: [],
          row: { min: 14, max: 19, insert: 17 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `qc` },
            { column: `D`, property: `representativeImage` },
            { column: `E`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `H`, property: `URL` },
            { column: `I`, property: `PID` },
            { column: `J`, property: `notes` },
            { column: `K`, property: `figureOrTable` },
            { column: `L`, property: `datatype` }
          ],
          // Cite dataset unique identifier in text
          data: datasets[1].map(function (item) {
            return {
              reuse: item.reuse,
              qc: item.qc,
              representativeImage: item.representativeImage,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`ASAP-GP2`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              URL: item.URL,
              PID: item.PID,
              notes: item.comments,
              figureOrTable: item.associatedFigureOrTable,
              datatype:
                item.type && item.type.url
                  ? `=LIEN_HYPERTEXTE("${item.type.url}";"${item.type.label}")`
                  : item.type.label
            };
          })
        },
        {
          merges: [],
          row: { min: 20, max: 25, insert: 23 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `qc` },
            { column: `D`, property: `representativeImage` },
            { column: `E`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `H`, property: `URL` },
            { column: `I`, property: `PID` },
            { column: `J`, property: `notes` },
            { column: `K`, property: `figureOrTable` },
            { column: `L`, property: `datatype` }
          ],
          // Verify dataset citation
          data: datasets[2].map(function (item) {
            return {
              reuse: item.reuse,
              qc: item.qc,
              representativeImage: item.representativeImage,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`ASAP-GP2`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              URL: item.URL,
              PID: item.PID,
              notes: item.comments,
              figureOrTable: item.associatedFigureOrTable,
              datatype:
                item.type && item.type.url
                  ? `=LIEN_HYPERTEXTE("${item.type.url}";"${item.type.label}")`
                  : item.type.label
            };
          })
        },
        {
          merges: [],
          row: { min: 26, max: 30, insert: 28 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `qc` },
            { column: `D`, property: `representativeImage` },
            { column: `E`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `H`, property: `URL` },
            { column: `I`, property: `PID` },
            { column: `J`, property: `notes` },
            { column: `K`, property: `figureOrTable` },
            { column: `L`, property: `datatype` }
          ],
          // Done - Cited correctly
          data: datasets[3].map(function (item) {
            return {
              reuse: item.reuse,
              qc: item.qc,
              representativeImage: item.representativeImage,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`ASAP-GP2`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              URL: item.URL,
              PID: item.PID,
              notes: item.comments,
              figureOrTable: item.associatedFigureOrTable,
              datatype:
                item.type && item.type.url
                  ? `=LIEN_HYPERTEXTE("${item.type.url}";"${item.type.label}")`
                  : item.type.label
            };
          })
        },
        {
          merges: [],
          row: { min: 31, max: 36, insert: 34 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `qc` },
            { column: `D`, property: `representativeImage` },
            { column: `E`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `H`, property: `URL` },
            { column: `I`, property: `PID` },
            { column: `J`, property: `notes` },
            { column: `K`, property: `figureOrTable` },
            { column: `L`, property: `datatype` }
          ],
          // Not required, but recommended to include the representative image/video files in raw format with dataset upload.
          data: datasets[4].map(function (item) {
            return {
              reuse: item.reuse,
              qc: item.qc,
              representativeImage: item.representativeImage,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`ASAP-GP2`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              URL: item.URL,
              PID: item.PID,
              notes: item.comments,
              figureOrTable: item.associatedFigureOrTable,
              datatype:
                item.type && item.type.url
                  ? `=LIEN_HYPERTEXTE("${item.type.url}";"${item.type.label}")`
                  : item.type.label
            };
          })
        },
        {
          merges: [],
          row: { min: 37, max: 42, insert: 40 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `qc` },
            { column: `D`, property: `representativeImage` },
            { column: `E`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `H`, property: `URL` },
            { column: `I`, property: `PID` },
            { column: `J`, property: `notes` },
            { column: `K`, property: `figureOrTable` },
            { column: `L`, property: `datatype` }
          ],
          // Confirmatory and Quality Control datasets are not required to be included in your dataset upload.
          data: datasets[5].map(function (item) {
            return {
              reuse: item.reuse,
              qc: item.qc,
              representativeImage: item.representativeImage,
              issue: !!item.issues,
              name: conf.settings.dataObjectsLinks[`ASAP-GP2`]
                ? Self.buildDataObjectLink(documentId, documentToken, item._id.toString(), item.name)
                : item.name,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              URL: item.URL,
              PID: item.PID,
              notes: item.comments,
              figureOrTable: item.associatedFigureOrTable,
              datatype:
                item.type && item.type.url
                  ? `=LIEN_HYPERTEXTE("${item.type.url}";"${item.type.label}")`
                  : item.type.label
            };
          })
        }
      ]
    }
  ];
  return async.mapSeries(
    batches,
    function (batch, _next) {
      // Is there data in this bulk of data
      let noData = batch.data.reduce(function (acc, item) {
        return acc && item.data.length === 0;
      }, true);
      let actions = [
        // Insert rows
        function (n) {
          let requests = [];
          let offset = 0;
          // if there is data, delete the "noDataRow"
          if (!noData && batch.params.noDataRow) {
            requests.push(
              Self.buildRequestDeleteRows(batch.sheet.id, batch.params.noDataRow.min - 1, batch.params.noDataRow.max)
            );
            offset -= batch.params.noDataRow.max - batch.params.noDataRow.min + 1;
          }
          // insert rows if necessary
          for (let i = batch.data.length - 1; i >= 0; i--) {
            batch.data[i].row.min += offset;
            batch.data[i].row.insert += offset;
            batch.data[i].row.max += offset;
            if (batch.data[i].data.length > 0) {
              // insert row(s)
              requests.push(
                Self.buildRequestInsertRows(
                  batch.sheet.id,
                  batch.data[i].row.insert,
                  batch.data[i].row.insert + batch.data[i].data.length - 1,
                  true
                )
              );
              // merge cells
              for (let j = 0; j < batch.data[i].merges.length; j++) {
                let merge = batch.data[i].merges[j];
                requests.push(
                  Self.buildRequestMergeCells(
                    batch.sheet.id,
                    batch.data[i].row.insert,
                    batch.data[i].row.insert + batch.data[i].data.length - 1,
                    merge.begin,
                    merge.end
                  )
                );
              }
              // update borders
              requests.push(
                Self.buildRequestUpdateBorders(
                  batch.sheet.id,
                  batch.data[i].row.insert,
                  batch.data[i].row.insert + batch.data[i].data.length - 1,
                  batch.column.min,
                  batch.column.max
                )
              );
            }
            // delete row(s) if necessary
            else {
              requests.push(
                Self.buildRequestDeleteRows(batch.sheet.id, batch.data[i].row.min - 1, batch.data[i].row.max)
              );
            }
          }
          if (requests.length <= 0) return n();
          return gSheets.spreadsheets.batchUpdate(
            {
              // The ID of the spreadsheet to update.
              spreadsheetId: spreadsheetId,
              // Request body metadata
              requestBody: {
                includeSpreadsheetInResponse: false,
                responseIncludeGridData: false,
                // request body parameters
                requests: requests
              }
            },
            function (err, res) {
              setTimeout(function () {
                // process err or result here
                return n(err);
              }, conf.settings.googleAPI[`ASAP-GP2`].timeout);
            }
          );
        },
        // Update cells & Add data validations
        function (n) {
          let data = [];
          let offset = 0;
          // Copy/Paste template if necessary
          if (batch.copyPaste) {
            let delta = batch.copyPaste.row.end - batch.copyPaste.row.begin + 1;
            offset += delta;
          }
          // fill rows if necessary
          for (let i = 0; i < batch.data.length; i++) {
            // if there is data in this bulk of data
            if (batch.data[i].data.length > 0) {
              batch.data[i].row.max += batch.data[i].data.length - 1;
              // update row property of all the next items
              if (typeof batch.data[i + 1] !== `undefined`) {
                let d = batch.data[i].data.length - 1; // -1 because there is one line by default
                for (let j = i + 1; j < batch.data.length; j++) {
                  batch.data[j].row.min += d;
                  batch.data[j].row.insert += d;
                  batch.data[j].row.max += d;
                }
              }
              // fill row(s)
              for (let j = 0; j < batch.data[i].data.length; j++) {
                let item = batch.data[i].data[j];
                let rowIndex = batch.data[i].row.insert + j;
                data.push(Self.buildRequestUpdateCell(`${batch.sheet.name}!A${rowIndex}`, [j + 1]));
                for (let k = 0; k < batch.data[i].cells.length; k++) {
                  let info = batch.data[i].cells[k];
                  data.push(
                    Self.buildRequestUpdateCell(`${batch.sheet.name}!${info.column}${rowIndex}`, [item[info.property]])
                  );
                }
              }
            } else {
              // update row property of all the next items
              let d = batch.data[i].row.max - batch.data[i].row.min + 1;
              for (let j = i + 1; j < batch.data.length; j++) {
                batch.data[j].row.min -= d;
                batch.data[j].row.insert -= d;
                batch.data[j].row.max -= d;
              }
            }
          }
          // if there is data fill head row(s)
          if (batch.cells.length > 0 && batch.row.insert) {
            for (let i = 0; i < batch.cells.length; i++) {
              let rowIndex = batch.row.insert;
              let info = batch.cells[i];
              data.push(Self.buildRequestUpdateCell(`${batch.sheet.name}!${info.column}${rowIndex}`, [info.value]));
            }
          }
          if (data.length <= 0) return n();
          return gSheets.spreadsheets.values.batchUpdate(
            {
              // The ID of the spreadsheet to update.
              spreadsheetId: spreadsheetId,
              // Request body metadata
              requestBody: {
                // request body parameters
                data: data,
                valueInputOption: `USER_ENTERED`
              }
            },
            function (err, res) {
              setTimeout(function () {
                // process err or result here
                return n(err);
              }, conf.settings.googleAPI[`ASAP-GP2`].timeout);
            }
          );
        }
      ];
      return async.mapSeries(
        actions,
        function (action, next) {
          return action(function (err) {
            return next(err);
          });
        },
        function (err) {
          return _next(err);
        }
      );
    },
    function (err) {
      return cb(err);
    }
  );
};

/**
 * This function will fill Authors and Affiliation Report sheet with given data and return the file ID (google file ID)
 * @param {object} opts - Options available
 * @param {string} opts.spreadsheetId - spreadsheetId
 * @param {object} opts.sheetId - sheetId
 * @param {object} opts.data - Data available
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR undefined)
 * @returns {undefined} undefined
 */
Self.fillAuthorsAndAffiliationASAPGP2Sheet = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `spreadsheetId`) === `undefined`)
    return cb(Error(`Missing required data: opts.spreadsheetId`));
  if (typeof _.get(opts, `sheetId`) === `undefined`) return cb(Error(`Missing required data: opts.sheetId`));
  let spreadsheetId = _.get(opts, `spreadsheetId`);
  let sheetId = _.get(opts, `sheetId`);
  let data = _.get(opts, `data`, {});
  let metadata = _.get(data, `metadata`);
  let authors = _.get(metadata, `authors`);
  let actions = [
    // Insert rows
    function (next) {
      let requests = [
        // Lab Materials
        Self.buildRequestInsertRows(sheetId, 10, 11 + authors.length - 1, true),
        Self.buildRequestMergeCells(sheetId, 10, 11 + authors.length - 1, 0, 3),
        Self.buildRequestUpdateBorders(sheetId, 10, 11 + authors.length - 1, 0, 5)
      ];
      return gSheets.spreadsheets.batchUpdate(
        {
          // The ID of the spreadsheet to update.
          spreadsheetId: spreadsheetId,
          // Request body metadata
          requestBody: {
            includeSpreadsheetInResponse: false,
            responseIncludeGridData: false,
            // request body parameters
            requests: requests
          }
        },
        function (err, res) {
          return next(err);
        }
      );
    },
    // Update cells & Add data validations
    function (next) {
      let data = [];
      data.push(Self.buildRequestUpdateCell(`'Authors and Affiliation'!D4`, [metadata.acknowledgement]));
      data.push(Self.buildRequestUpdateCell(`'Authors and Affiliation'!D5`, [metadata.affiliation]));
      data.push(Self.buildRequestUpdateCell(`'Authors and Affiliation'!D6`, [metadata.license]));
      let offset = 10;
      for (let i = 0; i < authors.length; i++) {
        let rowIndex = 10 + i;
        let orcidsFromAPI = _.get(authors[i], `orcid.fromAPI`, [])
          .slice(0, 20)
          .filter(function (item) {
            return !!item[`orcid-id`];
          })
          .map(function (item) {
            return item[`orcid-id`];
          })
          .join(`, `);
        let orcidsFromTEI = _.get(authors[i], `orcid.fromTEI`, []).join(`, `);
        data.push(Self.buildRequestUpdateCell(`'Authors and Affiliation'!A${rowIndex}`, [authors[i].name]));
        data.push(
          Self.buildRequestUpdateCell(`'Authors and Affiliation'!D${rowIndex}`, [
            authors[i].orcid.currentValue ? authors[i].orcid.currentValue : orcidsFromTEI
          ])
        );
        data.push(
          Self.buildRequestUpdateCell(`'Authors and Affiliation'!E${rowIndex}`, [
            authors[i].orcid.suggestedValues.join(`, `)
          ])
        );
      }
      return gSheets.spreadsheets.values.batchUpdate(
        {
          // The ID of the spreadsheet to update.
          spreadsheetId: spreadsheetId,
          // Request body metadata
          requestBody: {
            // request body parameters
            data: data,
            valueInputOption: `USER_ENTERED`
          }
        },
        function (err, res) {
          return next(err);
        }
      );
    }
  ];
  return async.mapSeries(
    actions,
    function (action, next) {
      return action(function (err) {
        return next(err);
      });
    },
    function (err) {
      return cb(err);
    }
  );
};

/**
 * This function will fill summary sheet with given data and return the file ID (google file ID)
 * @param {object} opts - Options available
 * @param {string} opts.spreadsheetId - spreadsheetId
 * @param {object} opts.sheetId - sheetId
 * @param {object} opts.data - Data available
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR undefined)
 * @returns {undefined} undefined
 */
Self.fillSummaryASAPGP2Sheet = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `spreadsheetId`) === `undefined`)
    return cb(Error(`Missing required data: opts.spreadsheetId`));
  if (typeof _.get(opts, `sheetId`) === `undefined`) return cb(Error(`Missing required data: opts.sheetId`));
  let spreadsheetId = _.get(opts, `spreadsheetId`);
  let sheetId = _.get(opts, `sheetId`);
  let data = _.get(opts, `data`, {});
  let articleTitle = _.get(data, `articleTitle`, {});
  let doi = _.get(data, `doi`, ``);
  let DAS = _.get(data, `DAS.content`, ``);
  let authors = _.get(data, `authors`, []);
  let documentId = _.get(data, `documentId`);
  let documentToken = _.get(data, `documentToken`);
  let token = _.get(data, `token`);
  let dataSeerLink = _.get(data, `dataSeerLink`, {});
  let originalFileLink = _.get(data, `originalFileLink`, {});
  let affiliationAcknowledgementsLicenseNotes = _.get(data, `affiliationAcknowledgementsLicenseNotes`, {});
  let protocols = _.get(data, `protocols`, { new: { identified: 0, shared: 0 }, reuse: { identified: 0, shared: 0 } });
  let codeAndSoftware = _.get(data, `codeAndSoftware`, {
    code: { identified: 0, shared: 0 },
    software: { identified: 0, shared: 0 }
  });
  let materials = _.get(data, `materials`, {
    new: { identified: 0, shared: 0 },
    reuse: { identified: 0, shared: 0 }
  });
  let datasets = _.get(data, `datasets`, { new: { identified: 0, shared: 0 }, reuse: { identified: 0, shared: 0 } });
  let authorsNames = authors
    .map(function (item) {
      return item.name;
    })
    .join(`, `);
  let actions = [
    // Update cells & Add data validations
    function (next) {
      let date = new Date();
      let data = [
        Self.buildRequestUpdateCell(`'Summary Sheet'!B3`, [articleTitle]),
        Self.buildRequestUpdateCell(`'Summary Sheet Data'!I2`, [doi]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!B5`, [authorsNames]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!B9`, [
          `=LIEN_HYPERTEXTE("${dataSeerLink.url}";"${dataSeerLink.label}")`
        ]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!B8`, [
          originalFileLink && originalFileLink.url
            ? `=LIEN_HYPERTEXTE("${originalFileLink.url}";"${originalFileLink.url}")`
            : ``
        ]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!B10`, [
          `=DATE(${date.getFullYear()};${date.getMonth() + 1};${date.getDate()})`
        ]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!D14`, [datasets.notes]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!D15`, [codeAndSoftware.notes]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!D16`, [materials.notes]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!D17`, [protocols.notes]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!D18`, [affiliationAcknowledgementsLicenseNotes]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!B22`, [datasets.new.identified]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!C22`, [datasets.new.shared]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!B23`, [datasets.reuse.identified]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!C23`, [datasets.reuse.shared]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!B26`, [codeAndSoftware.code.identified]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!C26`, [codeAndSoftware.code.shared]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!B27`, [codeAndSoftware.software.identified]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!C27`, [codeAndSoftware.software.shared]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!B30`, [materials.new.identified]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!C30`, [materials.new.shared]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!B31`, [materials.reuse.identified]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!C31`, [materials.reuse.shared]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!B34`, [protocols.new.identified + protocols.reuse.identified]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!C34`, [protocols.new.shared + protocols.reuse.shared]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!F37`, [DAS.replace(/\s/gm, ` `)])
      ];
      return gSheets.spreadsheets.values.batchUpdate(
        {
          // The ID of the spreadsheet to update.
          spreadsheetId: spreadsheetId,
          // Request body metadata
          requestBody: {
            // request body parameters
            data: data,
            valueInputOption: `USER_ENTERED`
          }
        },
        function (err, res) {
          return next(err);
        }
      );
    }
  ];
  return async.mapSeries(
    actions,
    function (action, next) {
      return action(function (err) {
        return next(err);
      });
    },
    function (err) {
      return cb(err);
    }
  );
};

/**
 * This function will build the request object to update a cell value (used in google API spreadsheet values batchUpdate request)
 * @param {integer} sheetId - sheetId
 * @param {integer} startIndex - startIndex
 * @param {integer} endIndex - endIndex
 * @returns {object} The request object
 */
Self.buildRequestUpdateCell = function (range, values) {
  if (typeof range === `undefined`) throw new Error(`Missing required data: range`);
  if (typeof values === `undefined`) throw new Error(`Missing required data: values`);
  if (!Array.isArray(values)) throw new Error(`Bad data: values should be an Array`);
  let cellValues = values.map(function (item) {
    if (typeof item === `string`) {
      if (item.length <= 4999) return item;
      else return item.substring(0, 4996) + `...`;
    } else return item;
  });
  return {
    range: range, // Update single cell
    values: [cellValues]
  };
};

/**
 * This function will build the request object to insert row(s) (used in google API spreadsheet batchRequest requests)
 * @param {integer} sheetId - sheetId
 * @param {integer} startIndex - startIndex
 * @param {integer} endIndex - endIndex
 * @param {boolean} inheritFromBefore - inheritFromBefore
 * @returns {object} The request object
 */
Self.buildRequestInsertRows = function (sheetId, startIndex, endIndex, inheritFromBefore = true) {
  if (typeof sheetId === `undefined`) throw new Error(`Missing required data: sheetId`);
  if (typeof startIndex === `undefined`) throw new Error(`Missing required data: startIndex`);
  if (typeof endIndex === `undefined`) throw new Error(`Missing required data: endIndex`);
  return {
    insertDimension: {
      range: {
        sheetId: sheetId,
        dimension: `ROWS`,
        startIndex: startIndex,
        endIndex: endIndex
      },
      inheritFromBefore: inheritFromBefore
    }
  };
};

/**
 * This function will build the request object to delete row(s) (used in google API spreadsheet batchRequest requests)
 * @param {integer} sheetId - sheetId
 * @param {integer} startIndex - startIndex
 * @param {integer} endIndex - endIndex
 * @returns {object} The request object
 */
Self.buildRequestDeleteRows = function (sheetId, startIndex, endIndex) {
  if (typeof sheetId === `undefined`) throw new Error(`Missing required data: sheetId`);
  if (typeof startIndex === `undefined`) throw new Error(`Missing required data: startIndex`);
  return {
    deleteDimension: {
      range: {
        sheetId: sheetId,
        dimension: `ROWS`,
        startIndex: startIndex,
        endIndex: endIndex
      }
    }
  };
};

/**
 * This function will build the request object to delete a sheet (used in google API spreadsheet batchRequest requests)
 * @param {integer} sheetId - sheetId
 * @returns {object} The request object
 */
Self.buildRequestDeleteSheet = function (sheetId) {
  if (typeof sheetId === `undefined`) throw new Error(`Missing required data: sheetId`);
  return {
    deleteSheet: {
      sheetId: sheetId
    }
  };
};

/**
 * This function will build the request object to rename a sheet (used in google API spreadsheet batchRequest requests)
 * @param {integer} sheetId - sheetId
 * @param {string} title - title
 * @returns {object} The request object
 */
Self.buildRequestUpdateSheetTitle = function (sheetId, title) {
  if (typeof sheetId === `undefined`) throw new Error(`Missing required data: sheetId`);
  if (typeof title === `undefined`) throw new Error(`Missing required data: title`);
  return {
    updateSheetProperties: {
      properties: {
        sheetId: sheetId,
        title: title
      },
      fields: `title`
    }
  };
};

/**
 * This function will build the request object to insert a row (used in google API spreadsheet batchRequest requests)
 * @param {integer} sheetId - sheetId
 * @param {integer} startRowIndex - startRowIndex
 * @param {integer} endRowIndex - endRowIndex
 * @param {integer} startColumnIndex - startColumnIndex
 * @param {integer} endColumnIndex - endColumnIndex
 * @param {array} list - endColumnIndex
 * @param {boolean} showCustomUi - showCustomUi
 * @param {boolean} strict - strict
 * @returns {object} The request object
 */
Self.buildRequestAddDataValidationList = function (
  sheetId,
  startRowIndex,
  endRowIndex,
  startColumnIndex,
  endColumnIndex,
  list = [],
  showCustomUi = true,
  strict = true
) {
  if (typeof sheetId === `undefined`) throw new Error(`Missing required data: sheetId`);
  if (typeof startRowIndex === `undefined`) throw new Error(`Missing required data: startRowIndex`);
  if (typeof endRowIndex === `undefined`) throw new Error(`Missing required data: endRowIndex`);
  if (typeof startColumnIndex === `undefined`) throw new Error(`Missing required data: startColumnIndex`);
  if (typeof endColumnIndex === `undefined`) throw new Error(`Missing required data: endColumnIndex`);
  return {
    setDataValidation: {
      range: {
        sheetId: sheetId,
        startRowIndex: startRowIndex,
        endRowIndex: endRowIndex,
        startColumnIndex: startColumnIndex,
        endColumnIndex: endColumnIndex
      },
      rule: {
        condition: {
          type: `ONE_OF_LIST`,
          values: list.map(function (item) {
            return {
              userEnteredValue: item
            };
          })
        },
        showCustomUi: showCustomUi,
        strict: strict
      }
    }
  };
};

/**
 * This function will build the request object to copy/paste values of given range (used in google API spreadsheet batchUpdate requests)
 * @param {object} source - source
 * @param {integer} sheetId - sheetId of source
 * @param {integer} startRowIndex - startRowIndex of source
 * @param {integer} endRowIndex - endRowIndex of source
 * @param {integer} startColumnIndex - startColumnIndex of source
 * @param {integer} endColumnIndex - endColumnIndex of source
 * @param {object} destination - destination
 * @param {integer} sheetId - sheetId of destination
 * @param {integer} startRowIndex - startRowIndex of destination
 * @param {integer} endRowIndex - endRowIndex of destination
 * @param {integer} startColumnIndex - startColumnIndex of destination
 * @param {integer} endColumnIndex - endColumnIndex of destination
 * @returns {object} The request object
 */
Self.buildRequestCopyPaste = function (
  source = {},
  destination = {},
  pasteType = `PASTE_NORMAL`,
  pasteOrientation = `NORMAL`
) {
  if (typeof source === `undefined`) throw new Error(`Missing required data: source`);
  if (typeof destination === `undefined`) throw new Error(`Missing required data: destination`);
  return {
    copyPaste: {
      source: {
        sheetId: source.sheetId,
        startRowIndex: source.startRowIndex,
        endRowIndex: source.endRowIndex,
        startColumnIndex: source.startColumnIndex,
        endColumnIndex: source.endColumnIndex
      },
      destination: {
        sheetId: destination.sheetId,
        startRowIndex: destination.startRowIndex,
        endRowIndex: destination.endRowIndex,
        startColumnIndex: destination.startColumnIndex,
        endColumnIndex: destination.endColumnIndex
      },
      pasteType: pasteType,
      pasteOrientation: pasteOrientation
    }
  };
};

/**
 * This function will build the request object to paste data of given range (used in google API spreadsheet batchUpdate requests)
 * @returns {object} The request object
 */
Self.buildRequestPasteData = function (
  sheetId,
  data,
  rowIndex,
  columnIndex,
  pasteType = `PASTE_NORMAL`,
  delimiter = `\t`
) {
  if (typeof sheetId === `undefined`) throw new Error(`Missing required data: sheetId`);
  if (typeof rowIndex === `undefined`) throw new Error(`Missing required data: rowIndex`);
  if (typeof columnIndex === `undefined`) throw new Error(`Missing required data: columnIndex`);
  if (typeof data === `undefined`) throw new Error(`Missing required data: data`);
  return {
    pasteData: {
      coordinate: {
        sheetId: sheetId,
        rowIndex: rowIndex,
        columnIndex: columnIndex
      },
      data: data,
      type: pasteType,
      delimiter: delimiter
    }
  };
};

/**
 * This function will build the request object to cut/paste values of given range (used in google API spreadsheet batchUpdate requests)
 * @param {object} source - source
 * @param {integer} sheetId - sheetId of source
 * @param {integer} startRowIndex - startRowIndex of source
 * @param {integer} endRowIndex - endRowIndex of source
 * @param {integer} startColumnIndex - startColumnIndex of source
 * @param {integer} endColumnIndex - endColumnIndex of source
 * @param {object} destination - destination
 * @param {integer} sheetId - sheetId of destination
 * @param {integer} rowIndex - rowIndex of destination
 * @param {integer} columnIndex - columnIndex of destination
 * @returns {object} The request object
 */
Self.buildRequestCutPaste = function (source = {}, destination = {}, pasteType = `PASTE_NORMAL`) {
  if (typeof source === `undefined`) throw new Error(`Missing required data: source`);
  if (typeof destination === `undefined`) throw new Error(`Missing required data: destination`);
  return {
    cutPaste: {
      source: {
        sheetId: source.sheetId,
        startRowIndex: source.startRowIndex,
        endRowIndex: source.endRowIndex,
        startColumnIndex: source.startColumnIndex,
        endColumnIndex: source.endColumnIndex
      },
      destination: {
        sheetId: destination.sheetId,
        rowIndex: destination.rowIndex,
        columnIndex: destination.columnIndex
      },
      pasteType: pasteType
    }
  };
};

/**
 * This function will build the request object to merge cells of given range (used in google API spreadsheet batchUpdate requests)
 * @param {integer} sheetId - sheetId
 * @param {integer} startRowIndex - startRowIndex
 * @param {integer} endRowIndex - endRowIndex
 * @param {integer} startColumnIndex - startColumnIndex
 * @param {integer} endColumnIndex - endColumnIndex
 * @param {string} mergeType - source
 * @returns {object} The request object
 */
Self.buildRequestMergeCells = function (
  sheetId,
  startRowIndex,
  endRowIndex,
  startColumnIndex,
  endColumnIndex,
  mergeType = `MERGE_ROWS`
) {
  if (typeof sheetId === `undefined`) throw new Error(`Missing required data: sheetId`);
  if (typeof startRowIndex === `undefined`) throw new Error(`Missing required data: startRowIndex`);
  if (typeof endRowIndex === `undefined`) throw new Error(`Missing required data: endRowIndex`);
  if (typeof startColumnIndex === `undefined`) throw new Error(`Missing required data: startColumnIndex`);
  if (typeof endColumnIndex === `undefined`) throw new Error(`Missing required data: endColumnIndex`);
  return {
    mergeCells: {
      mergeType: mergeType,
      range: {
        sheetId: sheetId,
        startRowIndex: startRowIndex,
        endRowIndex: endRowIndex,
        startColumnIndex: startColumnIndex,
        endColumnIndex: endColumnIndex
      }
    }
  };
};

/**
 * This function will build the request object to update border of given range (used in google API spreadsheet batchUpdate requests)
 * @param {integer} sheetId - sheetId
 * @param {integer} startRowIndex - startRowIndex
 * @param {integer} endRowIndex - endRowIndex
 * @param {integer} startColumnIndex - startColumnIndex
 * @param {integer} endColumnIndex - endColumnIndex
 * @param {object} borders - borders
 * @returns {object} The request object
 */
Self.buildRequestUpdateBorders = function (
  sheetId,
  startRowIndex,
  endRowIndex,
  startColumnIndex,
  endColumnIndex,
  borders = BLACK_BORDERS
) {
  if (typeof sheetId === `undefined`) throw new Error(`Missing required data: sheetId`);
  if (typeof startRowIndex === `undefined`) throw new Error(`Missing required data: startRowIndex`);
  if (typeof endRowIndex === `undefined`) throw new Error(`Missing required data: endRowIndex`);
  if (typeof startColumnIndex === `undefined`) throw new Error(`Missing required data: startColumnIndex`);
  if (typeof endColumnIndex === `undefined`) throw new Error(`Missing required data: endColumnIndex`);
  return {
    updateBorders: {
      range: {
        sheetId: sheetId,
        startRowIndex: startRowIndex,
        endRowIndex: endRowIndex,
        startColumnIndex: startColumnIndex,
        endColumnIndex: endColumnIndex
      },
      top: borders.top,
      bottom: borders.bottom,
      left: borders.left,
      right: borders.right,
      innerHorizontal: borders.innerHorizontal,
      innerVertical: borders.innerVertical
    }
  };
};

/**
 * This function will build the request object to delete a range (used in google API spreadsheet values batchUpdate request)
 * @param {integer} sheetId - sheetId
 * @param {integer} startRowIndex - startRowIndex
 * @param {integer} endRowIndex - endRowIndex
 * @param {integer} startColumnIndex - startColumnIndex
 * @param {integer} endColumnIndex - endColumnIndex
 * @param {string} shiftDimension - shiftDimension
 * @returns {object} The request object
 */
Self.buildRequestDeleteRange = function (
  sheetId,
  startRowIndex,
  endRowIndex,
  startColumnIndex,
  endColumnIndex,
  shiftDimension = `ROWS`
) {
  if (typeof sheetId === `undefined`) throw new Error(`Missing required data: sheetId`);
  if (typeof startRowIndex === `undefined`) throw new Error(`Missing required data: startRowIndex`);
  if (typeof endRowIndex === `undefined`) throw new Error(`Missing required data: endRowIndex`);
  if (typeof startColumnIndex === `undefined`) throw new Error(`Missing required data: startColumnIndex`);
  if (typeof endColumnIndex === `undefined`) throw new Error(`Missing required data: endColumnIndex`);
  if (typeof shiftDimension === `undefined`) throw new Error(`Missing required data: shiftDimension`);
  return {
    deleteRange: {
      range: {
        sheetId: sheetId,
        startRowIndex: startRowIndex,
        endRowIndex: endRowIndex,
        startColumnIndex: startColumnIndex,
        endColumnIndex: endColumnIndex
      },
      shiftDimension: shiftDimension
    }
  };
};

/**
 * This function will build the request object to insert a range (used in google API spreadsheet values batchUpdate request)
 * @param {integer} sheetId - sheetId
 * @param {integer} startRowIndex - startRowIndex
 * @param {integer} endRowIndex - endRowIndex
 * @param {integer} startColumnIndex - startColumnIndex
 * @param {integer} endColumnIndex - endColumnIndex
 * @param {string} shiftDimension - shiftDimension
 * @returns {object} The request object
 */
Self.buildRequestInsertRange = function (
  sheetId,
  startRowIndex,
  endRowIndex,
  startColumnIndex,
  endColumnIndex,
  shiftDimension = `ROWS`
) {
  if (typeof sheetId === `undefined`) throw new Error(`Missing required data: sheetId`);
  if (typeof startRowIndex === `undefined`) throw new Error(`Missing required data: startRowIndex`);
  if (typeof endRowIndex === `undefined`) throw new Error(`Missing required data: endRowIndex`);
  if (typeof startColumnIndex === `undefined`) throw new Error(`Missing required data: startColumnIndex`);
  if (typeof endColumnIndex === `undefined`) throw new Error(`Missing required data: endColumnIndex`);
  if (typeof shiftDimension === `undefined`) throw new Error(`Missing required data: shiftDimension`);
  return {
    insertRange: {
      range: {
        sheetId: sheetId,
        startRowIndex: startRowIndex,
        endRowIndex: endRowIndex,
        startColumnIndex: startColumnIndex,
        endColumnIndex: endColumnIndex
      },
      shiftDimension: shiftDimension
    }
  };
};

/**
 * This function will build the URL to a given dataObject in the new GUI
 * @param {string} documentId - documentId
 * @param {string} documentToken - documentToken
 * @param {string} dataObjectId - dataObjectId
 * @param {string} label - label
 * @returns {string} The URL
 */
Self.buildDataObjectLink = function (documentId, documentToken, dataObjectId, label) {
  if (typeof documentId === `undefined`) throw new Error(`Missing required data: documentId`);
  if (typeof documentToken === `undefined`) throw new Error(`Missing required data: documentToken`);
  if (typeof dataObjectId === `undefined`) throw new Error(`Missing required data: dataObjectId`);
  if (typeof label === `undefined`) throw new Error(`Missing required data: label`);
  return `=LIEN_HYPERTEXTE("${Url.build(`/documents/${documentId}`, {
    token: documentToken,
    view: `datasets`,
    selectedDataObjectId: dataObjectId
  })}";"${label}")`;
};

/**
 * This function will return all ASAP authors
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR undefined)
 * @returns {undefined} undefined
 */
Self.getASAPAuthors = function (cb) {
  const fileId = ASAPAuthorsConf.fileId;
  const spreadsheetName = ASAPAuthorsConf.spreadsheetName;
  if (typeof fileId === `undefined`) throw new Error(`Missing required data: fileId`);
  if (typeof spreadsheetName === `undefined`) throw new Error(`Missing required data: spreadsheetName`);
  const range = `'${spreadsheetName}'!A:I`;
  return Self.getSheetLines({ spreadsheetId: fileId, spreadsheetRange: range }, function (err, res) {
    if (err) return cb(err);
    if (!res || !Array.isArray(res)) return cb(null, new Error(`unable to find data in response`));
    let authors = [];
    if (res.length <= 1) return cb(null, authors);
    for (let i = 1; i < res.length; i++) {
      let row = res[i];
      authors.push({
        'lastname': row[2],
        'firstname': row[3],
        'email': row[7],
        'orcid': row[8]
      });
    }
    return cb(null, authors);
  });
};

Self.getSheetLines = function ({ spreadsheetId, spreadsheetRange, chunkSize = 2000 }, cb) {
  let allData = [];
  let hasMoreData = true;
  const [[startColumn, startRow], [endColumn, endRow]] = Self.splitRange(spreadsheetRange);
  let currentRow = Math.min(startRow, endRow);
  const sheetName = Self.extractSheetName(spreadsheetRange);
  return async.doWhilst(
    function (callback) {
      const range = `${sheetName}!${startColumn}${currentRow}:${endColumn}${currentRow + chunkSize - 1}`;
      return gSheets.spreadsheets.values.get({ spreadsheetId: spreadsheetId, range: range }, function (err, res) {
        // Handle error
        if (err) {
          // Case error is not "exceeds grid limits"
          if (err.toString().indexOf(`exceeds grid limits`) < 0) return callback(err);
          // Case error is "exceeds grid limits"
          hasMoreData = false;
          return callback();
        }
        if (!res || !res.data || !Array.isArray(res.data.values)) return callback();
        const data = res.data.values || [];
        allData = allData.concat(data);
        if (data.length < chunkSize) hasMoreData = false;
        else currentRow += chunkSize;
        return callback();
      });
    },
    function (callback) {
      return callback(null, hasMoreData);
    },
    function (err) {
      // Handle error
      return cb(err, allData);
    }
  );
};

Self.splitRange = function (range) {
  const regexWithNumbers = /([A-Z]+)(\d+):([A-Z]+)(\d+)/;
  const regexWithoutNumbers = /([A-Z]+):([A-Z]+)/;

  let match = range.match(regexWithNumbers);
  if (match) {
    const [, startCol, startRow, endCol, endRow] = match;
    return [
      [startCol, parseInt(startRow)],
      [endCol, parseInt(endRow)]
    ];
  }

  match = range.match(regexWithoutNumbers);
  if (match) {
    const [, startCol, endCol] = match;
    return [
      [startCol, 1],
      [endCol, Infinity]
    ];
  }

  throw new Error(`Invalid range format`);
};

Self.extractSheetName = function (range) {
  const lastExclamationMarkIndex = range.lastIndexOf(`!`);
  if (lastExclamationMarkIndex === -1) {
    throw new Error(`Invalid range format`);
  }
  return range.substring(0, lastExclamationMarkIndex);
};

/**
 * This function will return all ASAP authors
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR undefined)
 * @returns {undefined} undefined
 */
Self.getChangesConfData = function (opts, cb) {
  let config = _.get(opts, `config`);
  let kind = _.get(opts, `kind`);
  if (typeof config === `undefined`) return cb(Error(`Missing required data: opts.config`));
  if (config !== `DS_LOGS` && config !== `ASAP_REPORTS`)
    return cb(Error(`Invalid required data: opts.config must be "DS_LOGS" or "ASAP_REPORTS"`));
  let changesConf = config === `DS_LOGS` ? changesLogsConf : changesReportsConf;
  if (Object.keys(changesConf.configFiles).indexOf(kind) === -1)
    return cb(Error(`Invalid required data: opts.kind must be ${Object.keys(changesConf.configFiles).join(`, `)}`));
  const spreadsheetId = changesConf.configFiles[kind].spreadsheetId;
  const spreadsheetName = changesConf.configFiles[kind].spreadsheetName;
  const spreadsheetRange = changesConf.configFiles[kind].spreadsheetRange;
  if (typeof spreadsheetId === `undefined`) throw new Error(`Missing required data: spreadsheetId`);
  if (typeof spreadsheetName === `undefined`) throw new Error(`Missing required data: spreadsheetName`);
  if (typeof spreadsheetRange === `undefined`) throw new Error(`Missing required data: spreadsheetRange`);
  const range = `'${spreadsheetName}'!${spreadsheetRange}`;
  return Self.getSheetLines({ spreadsheetId: spreadsheetId, spreadsheetRange: range }, function (err, res) {
    if (err) return cb(err);
    if (!res || !Array.isArray(res)) return cb(null, new Error(`unable to find data in response`));
    let documents = [];
    if (res.length <= 1) return cb(null, documents);
    for (let i = 1; i < res.length; i++) {
      let row = res[i];
      if (config === `DS_LOGS`) {
        if (typeof row[1] !== `undefined`)
          documents.push({
            'selected': row[0] === `TRUE`,
            '_id': row[1],
            'name': row[2]
          });
      }
      // TO DO : Take correct cells indexes
      if (config === `ASAP_REPORTS`) {
        if (typeof row[1] !== `undefined`)
          documents.push({
            'selected': row[1] === `TRUE`,
            'hasReport': row[0] === `TRUE`,
            'sameReport': row[12] === `TRUE`,
            'name': row[2],
            'old': row[11],
            'new': row[10]
          });
      }
    }
    return cb(null, documents);
  });
};

/**
 * This function will return all "custom" list of software
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR undefined)
 * @returns {undefined} undefined
 */
Self.getCustomSoftware = function (cb) {
  const fileId = customSoftwareConf.fileId;
  let customList = [];
  return async.mapSeries(
    customSoftwareConf.spreadsheets,
    function (item, next) {
      const spreadsheetName = item.spreadsheetName;
      const spreadsheetRange = item.spreadsheetRange;
      if (typeof fileId === `undefined`) throw new Error(`Missing required data: fileId`);
      if (typeof spreadsheetName === `undefined`) throw new Error(`Missing required data: spreadsheetName`);
      const range = `'${spreadsheetName}'!${spreadsheetRange}`;
      return Self.getSheetLines({ spreadsheetId: fileId, spreadsheetRange: range }, function (err, res) {
        if (err) return next(err);
        if (!res || !Array.isArray(res)) return next(new Error(`unable to find data in response`));
        if (res.length <= 1) return next();
        for (let i = 1; i < res.length; i++) {
          let row = res[i];
          let isCommandLine = row[5] === `TRUE`;
          let isSoftware = row[7] === `TRUE`;
          let canAlsoBeGUI = row[8] === `TRUE`;
          let name = row[0].replace(/\s+/gim, ` `);
          if (!!name)
            customList.push({
              'tag': item.tag,
              'name': name,
              'suggestedEntity': row[1] ? row[1].replace(/\s+/gim, ` `) : ``,
              'suggestedURL': row[2] ? row[2].replace(/\s+/gim, ` `) : ``,
              'suggestedRRID': row[3] ? row[3].replace(/\s+/gim, ` `) : ``,
              'RRID': row[4] ? row[4].replace(/\s+/gim, ` `) : ``,
              'isCommandLine': isCommandLine,
              'parentLanguage': row[6] ? row[6].replace(/\s+/gim, ` `) : ``,
              'isSoftware': isSoftware,
              'canAlsoBeGUI': canAlsoBeGUI,
              'tokens': name.split(` `)
            });
        }
        return next();
      });
    },
    function (err) {
      return cb(err, customList);
    }
  );
};

/**
 * This function will return all "custom" list of reagents
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR undefined)
 * @returns {undefined} undefined
 */
Self.getCustomReagents = function (cb) {
  const fileId = customReagentsConf.fileId;
  let customList = [];
  return async.mapSeries(
    customReagentsConf.spreadsheets,
    function (item, next) {
      const spreadsheetName = item.spreadsheetName;
      const spreadsheetRange = item.spreadsheetRange;
      if (typeof fileId === `undefined`) throw new Error(`Missing required data: fileId`);
      if (typeof spreadsheetName === `undefined`) throw new Error(`Missing required data: spreadsheetName`);
      const range = `'${spreadsheetName}'!${spreadsheetRange}`;
      return Self.getSheetLines({ spreadsheetId: fileId, spreadsheetRange: range }, function (err, res) {
        if (err) return next(err);
        if (!res || !Array.isArray(res)) return next(new Error(`unable to find data in response`));
        if (res.length <= 1) return next();
        for (let i = 1; i < res.length; i++) {
          let row = res[i];
          let reuse = row[8] === `TRUE`;
          let name = row[0].replace(/\s+/gim, ` `);
          if (!!name)
            customList.push({
              'tag': item.tag,
              'name': name,
              'subType': row[9] ? row[9].replace(/\s+/gim, ` `) : ``,
              'suggestedEntity': row[4] ? row[4].replace(/\s+/gim, ` `) : ``,
              'suggestedRRID': row[5] ? row[5].replace(/\s+/gim, ` `) : ``,
              'RRID': row[3] ? row[3].replace(/\s+/gim, ` `) : ``,
              'reuse': reuse,
              'source': row[1] ? row[1].replace(/\s+/gim, ` `) : ``,
              'catalogNumber': row[2] ? row[2].replace(/\s+/gim, ` `) : ``,
              'comments': row[6] ? row[6].replace(/\s+/gim, ` `) : ``,
              'tokens': name.split(` `)
            });
        }
        return next();
      });
    },
    function (err) {
      return cb(err, customList);
    }
  );
};

// /**
//  * This function will return all "custom" list of identifiers
//  * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR undefined)
//  * @returns {undefined} undefined
//  */
// Self.getCustomIdentifiers = function (cb) {
//   const fileId = customIdentifiersConf.fileId;
//   let customList = [];
//   return async.mapSeries(
//     customIdentifiersConf.spreadsheets,
//     function (item, next) {
//       const spreadsheetName = item.spreadsheetName;
//       const spreadsheetRange = item.spreadsheetRange;
//       if (typeof fileId === `undefined`) throw new Error(`Missing required data: fileId`);
//       if (typeof spreadsheetName === `undefined`) throw new Error(`Missing required data: spreadsheetName`);
//       const range = `'${spreadsheetName}'!${spreadsheetRange}`;
//       return Self.getSheetLines({ spreadsheetId: fileId, spreadsheetRange: range }, function (err, res) {
//         if (err) return next(err);
//         if (!res || !Array.isArray(res)) return next(new Error(`unable to find data in response`));
//         if (res.length <= 1) return next();
//         for (let i = 1; i < res.length; i++) {
//           let row = res[i];
//           let name = row[0].replace(/\s+/gim, ` `);
//           if (!!name)
//             customList.push({
//               'tag': item.tag,
//               'name': name,
//               'link': row[1] ? row[1].replace(/\s+/gim, ` `) : ``,
//               'DOI': row[2] ? row[2].replace(/\s+/gim, ` `) : ``,
//               'RRID': row[3] ? row[3].replace(/\s+/gim, ` `) : ``,
//               'accessionNumber': row[4] ? row[4].replace(/\s+/gim, ` `) : ``,
//               'catalogNumber': row[5] ? row[5].replace(/\s+/gim, ` `) : ``,
//               'tokens': name.split(` `)
//             });
//         }
//         return next();
//       });
//     },
//     function (err) {
//       return cb(err, customList);
//     }
//   );
// };

/**
 * This function will return all "custom" list of identifiers
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR undefined)
 * @returns {undefined} undefined
 */
Self.getCustomIdentifiers = function (cb) {
  const fileId = customIdentifiersConf.fileId;
  let customList = [];
  return async.mapSeries(
    customIdentifiersConf.spreadsheets,
    function (item, next) {
      const spreadsheetName = item.spreadsheetName;
      const spreadsheetRange = item.spreadsheetRange;
      if (typeof fileId === `undefined`) throw new Error(`Missing required data: fileId`);
      if (typeof spreadsheetName === `undefined`) throw new Error(`Missing required data: spreadsheetName`);
      const range = `'${spreadsheetName}'!${spreadsheetRange}`;
      return Self.getSheetLines({ spreadsheetId: fileId, spreadsheetRange: range }, function (err, res) {
        if (err) return next(err);
        if (!res || !Array.isArray(res)) return next(new Error(`unable to find data in response`));
        if (res.length <= 1) return next();
        for (let i = 1; i < res.length; i++) {
          let row = res[i];
          let name = row[0] ? row[0].replace(/\s+/gim, ` `) : ``;
          let identifier = row[1] ? row[1].replace(/\s+/gim, ` `) : ``;
          if (!!identifier)
            customList.push({
              'tag': item.tag,
              'name': identifier,
              'relatedTo': name,
              'tokens': identifier.split(` `)
            });
        }
        return next();
      });
    },
    function (err) {
      return cb(err, customList);
    }
  );
};

/**
 * This function will create the Sheets file and return the file ID (google file ID)
 * @param {object} opts - Options available
 * @param {object} opts.data - Data available
 * @param {string} opts.data.name - Name of the document
 * @param {string} opts.data.permission - Permission of the document
 * @param {string} opts.folder - Folder id (google file ID)
 * @param {string} opts.template - File id (google file ID) of the template
 * @param {boolean} opts.[erase] - Erase existing file (default: false)
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR undefined)
 * @returns {undefined} undefined
 */
Self.createSheetsFile = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `data.name`) === `undefined`) return cb(Error(`Missing required data: opts.data.name`));
  let erase = _.get(opts, `erase`, false);
  let _opts = {
    template: opts.template,
    folder: opts.folder,
    data: { name: opts.data.name, permission: opts.data.permission }
  };
  return Self.getSheetsFileId(_opts, function (err, res) {
    if (err) return cb(err);
    // Case report does not exist yet
    if (res instanceof Error)
      return Self._createSheetsFile(_opts, function (err, res) {
        if (err) return cb(err);
        return cb(err, res);
      });
    // If it should not be erased, return google file ID
    if (!erase) return cb(null, res);
    // Erase file & re-create it
    return Self._deleteSheetsFile({ folder: opts.folder, data: { fileId: res } }, function (err, res) {
      if (err) return cb(err);
      return Self._createSheetsFile(_opts, function (err, res) {
        if (err) return cb(err);
        return cb(err, res);
      });
    });
  });
};

/**
 * This function will create the report file and return the report file ID (google file ID)
 * @param {object} opts - Options available
 * @param {string} opts.folder - Parent folder
 * @param {object} opts.data - Data available
 * @param {string} opts.data.name - Name of the document
 * @param {string} opts.data.permission - Permission of the document
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR undefined)
 * @returns {undefined} undefined
 */
Self._createSheetsFile = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `folder`) === `undefined`) return cb(Error(`Missing required data: opts.folder`));
  if (typeof _.get(opts, `data.name`) === `undefined`) return cb(Error(`Missing required data: opts.data.name`));
  if (typeof _.get(opts, `data.permission`) === `undefined`)
    return cb(Error(`Missing required data: opts.data.permission`));
  // There is no existing document : create it
  return drive.files.copy(
    {
      // The ID of the file to copy.
      fileId: opts.template,
      // Request body metadata
      requestBody: {
        'parents': [opts.folder],
        'name': opts.data.name
      }
    },
    function (err, res) {
      if (err) return cb(err);
      let id = res.data.id;
      return drive.permissions.create(
        {
          resource: {
            'type': `anyone`,
            'role': opts.data.permission
          },
          fileId: id,
          fields: `id`
        },
        function (err, res) {
          if (err) return cb(err);
          return cb(null, id);
        }
      );
    }
  );
};

/**
 * This function will delete the google drive file with the given name
 * @param {object} opts - Options available
 * @param {string} opts.folder - Parent folder
 * @param {object} opts.data - Data available
 * @param {string} opts.data.name - Name of the document
 * @param {boolean} opts.[ignore] - Ignore error (default: false)
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: true OR Error)
 * @returns {undefined} undefined
 */
Self.deleteSheetsFile = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `folder`) === `undefined`) return cb(Error(`Missing required data: opts.folder`));
  if (typeof _.get(opts, `data.name`) === `undefined`) return cb(Error(`Missing required data: opts.data.name`));
  let ignore = _.get(opts, `ignore`, false);
  return Self.getSheetsFileId({ folder: opts.folder, data: { name: opts.data.name } }, function (err, res) {
    if (err) return cb(err);
    // Case report does not exist
    if (res instanceof Error) {
      if (ignore) return cb(err, true);
      return cb(null, res);
    }
    // Erase file
    return Self._deleteSheetsFile({ folder: opts.folder, data: { fileId: res } }, function (err, res) {
      if (err) return cb(err);
      return cb(err, true);
    });
  });
};

/**
 * This function will delete the google drive file with the given ID
 * @param {object} opts - Options available
 * @param {object} opts.data - Data available
 * @param {string} opts.data.fileId - File id
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR undefined)
 * @returns {undefined} undefined
 */
Self._deleteSheetsFile = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `folder`) === `undefined`) return cb(Error(`Missing required data: opts.folder`));
  if (typeof _.get(opts, `data.fileId`) === `undefined`) return cb(Error(`Missing required data: opts.data.fileId`));
  // Check all optionnal data
  return drive.files.delete(
    {
      // The ID of the file to copy.
      fileId: opts.data.fileId,
      // Request body metadata
      requestBody: {
        'parents': [opts.folder]
      }
    },
    function (err, res) {
      if (err) return cb(err);
      return cb(null, res.data.id);
    }
  );
};

/**
 * This function will create the report file and return the file ID (google file ID)
 * @param {object} opts - Options available
 * @param {object} opts.data - Data available
 * @param {string} opts.data.name - Name of the document
 * @param {string} opts.data.permission - Permission of the document
 * @param {string} opts.folder - Folder id (google file ID)
 * @param {string} opts.template - File id (google file ID) of the template
 * @param {boolean} opts.[erase] - Erase existing file (default: false)
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR undefined)
 * @returns {undefined} undefined
 */
Self.createReportFile = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `data.name`) === `undefined`) return cb(Error(`Missing required data: opts.data.name`));
  let erase = _.get(opts, `erase`, false);
  let _opts = {
    template: opts.template,
    folder: opts.folder,
    data: { name: opts.data.name, permission: opts.data.permission }
  };
  if (!erase)
    return Self._createReportFile(_opts, function (err, res) {
      if (err) return cb(err);
      return cb(err, res);
    });
  return Self.getReportFileId(_opts, function (err, res) {
    if (err) return cb(err);
    // Case report does not exist yet
    if (res instanceof Error)
      return Self._createReportFile(_opts, function (err, res) {
        if (err) return cb(err);
        return cb(err, res);
      });
    // Erase file & re-create it
    return Self._deleteReportFile({ folder: opts.folder, data: { fileId: res } }, function (err, res) {
      if (err) return cb(err);
      return Self._createReportFile(_opts, function (err, res) {
        if (err) return cb(err);
        return cb(err, res);
      });
    });
  });
};

/**
 * This function will create the report file and return the report file ID (google file ID)
 * @param {object} opts - Options available
 * @param {string} opts.folder - Parent folder
 * @param {object} opts.data - Data available
 * @param {string} opts.data.name - Name of the document
 * @param {string} opts.data.permission - Permission of the document
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR undefined)
 * @returns {undefined} undefined
 */
Self._createReportFile = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `folder`) === `undefined`) return cb(Error(`Missing required data: opts.folder`));
  if (typeof _.get(opts, `data.name`) === `undefined`) return cb(Error(`Missing required data: opts.data.name`));
  if (typeof _.get(opts, `data.permission`) === `undefined`)
    return cb(Error(`Missing required data: opts.data.permission`));
  // There is no existing document : create it
  return drive.files.copy(
    {
      // The ID of the file to copy.
      fileId: opts.template,
      // Request body metadata
      requestBody: {
        'parents': [opts.folder],
        'name': opts.data.name
      }
    },
    function (err, res) {
      if (err) return cb(err);
      let id = res.data.id;
      return drive.permissions.create(
        {
          resource: {
            'type': `anyone`,
            'role': opts.data.permission
          },
          fileId: id,
          fields: `id`
        },
        function (err, res) {
          if (err) return cb(err);
          return cb(null, id);
        }
      );
    }
  );
};

/**
 * This function will delete the google drive file with the given name
 * @param {object} opts - Options available
 * @param {string} opts.folder - Parent folder
 * @param {object} opts.data - Data available
 * @param {string} opts.data.name - Name of the document
 * @param {boolean} opts.[ignore] - Ignore error (default: false)
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: true OR Error)
 * @returns {undefined} undefined
 */
Self.deleteReportFile = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `folder`) === `undefined`) return cb(Error(`Missing required data: opts.folder`));
  if (typeof _.get(opts, `data.name`) === `undefined`) return cb(Error(`Missing required data: opts.data.name`));
  let ignore = _.get(opts, `ignore`, false);
  return Self.getReportFileId({ folder: opts.folder, data: { name: opts.data.name } }, function (err, res) {
    if (err) return cb(err);
    // Case report does not exist
    if (res instanceof Error) {
      if (ignore) return cb(err, true);
      return cb(null, res);
    }
    // Erase file
    return Self._deleteReportFile({ folder: opts.folder, data: { fileId: res } }, function (err, res) {
      if (err) return cb(err);
      return cb(err, true);
    });
  });
};

/**
 * This function will delete the google drive file with the given ID
 * @param {object} opts - Options available
 * @param {object} opts.data - Data available
 * @param {string} opts.data.fileId - File id
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR undefined)
 * @returns {undefined} undefined
 */
Self._deleteReportFile = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `folder`) === `undefined`) return cb(Error(`Missing required data: opts.folder`));
  if (typeof _.get(opts, `data.fileId`) === `undefined`) return cb(Error(`Missing required data: opts.data.fileId`));
  // Check all optionnal data
  return drive.files.delete(
    {
      // The ID of the file to copy.
      fileId: opts.data.fileId,
      // Request body metadata
      requestBody: {
        'parents': [opts.folder]
      }
    },
    function (err, res) {
      if (err) return cb(err);
      return cb(null, res.data.id);
    }
  );
};

module.exports = Self;
