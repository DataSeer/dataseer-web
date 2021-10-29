/*
 * @prettier
 */

'use strict';

const _ = require(`lodash`);
const async = require(`async`);
const path = require(`path`);
const { google } = require(`googleapis`);

const googleAPICredentials = require(`../conf/services/googleAPICredentials.json`);
const conf = require(`../conf/reports.json`);

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

let Self = {};

/**
 * This function return the report file ID (google file ID)
 * @param {object} opts - Options available
 * @param {object} opts.data - Data available
 * @param {string} opts.data.name - Name of the document
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR Error)
 * @returns {undefined} undefined
 */
Self.getReportFileId = function (opts = {}, cb) {
  let pageToken = null;
  let ids = [];
  return async.doWhilst(
    function (callback) {
      return drive.files.list(
        {
          q: `name='${opts.data.name}'`,
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
 * This function return the sheet ID (google sheet ID)
 * @param {array} list - List of google sheets
 * @returns {integer} google sheet ID OR Error
 */
Self.getSheetId = function (list, sheetTitle = ``) {
  let sheets = Array.isArray(list) ? list : [];
  let sheet = sheets.filter(function (item) {
    return _.get(item, `properties.title`, undefined) === sheetTitle;
  });
  if (sheet.length !== 1) return cb(null, new Error(`sheet with title ${sheetTitle} not found`));
  let sheetId = sheet.length === 1 ? sheet[0].properties.sheetId : undefined;
  if (!sheetId) return new Error(`SheetId not found`);
  return sheetId;
};

/**
 * This function return the sheets (google sheets)
 * @param {object} opts - Options available
 * @param {object} opts.spreadsheetId - spreadsheetId
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google sheets OR Error)
 * @returns {undefined} undefined
 */
Self.getSheets = function (opts, cb) {
  if (typeof _.get(opts, `spreadsheetId`) === `undefined`)
    return cb(Error(`Missing required data: opts.spreadsheetId`));
  let spreadsheetId = _.get(opts, `spreadsheetId`);
  return gSheets.spreadsheets.get(
    {
      // The spreadsheet to request.
      spreadsheetId: spreadsheetId,
      includeGridData: false // TODO: Update placeholder value.
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
 * This function will build the report and return the file ID (google file ID)
 * @param {object} opts - Options available
 * @param {object} opts.data - Data available
 * @param {string} opts.data.filename - filename
 * @param {object} opts.data.dataTypesInfos - dataTypesInfos
 * @param {object} opts.data.metadata - metadata
 * @param {object} opts.data.metadata.articleTitle - articleTitle
 * @param {object} opts.data.metadata.doi - doi
 * @param {object} opts.data.metadata.authors - authors
 * @param {object} opts.data.metadata.dataSeerLink - dataSeerLink
 * @param {array} opts.data.datasets - datasets
 * @param {array} opts.data.protocols - protocols
 * @param {array} opts.data.reagents - reagents
 * @param {array} opts.data.codes - codes
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR undefined)
 * @returns {undefined} undefined
 */
Self.buildReport = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(conf, `folder`) === `undefined`) return cb(Error(`Missing required data: conf.folder`));
  if (typeof _.get(conf, `template`) === `undefined`) return cb(Error(`Missing required data: conf.template`));
  if (typeof _.get(opts, `data.filename`) === `undefined`)
    return cb(Error(`Missing required data: opts.data.filename`));
  let filename = _.get(opts, `data.filename`);
  return Self.createReportFile({ data: { name: filename }, erase: true }, function (err, id) {
    if (err) return cb(err);
    // Case report does not exist yet
    if (!id) return cb(null, new Error(`Report file not created in the google API drive`));
    return Self.insertDataInSheets({ spreadsheetId: id, data: opts.data }, function (err) {
      if (err) return cb(err);
      return cb(null, id);
    });
  });
};

/**
 * This function will fill summary sheet with given data and return the file ID (google file ID)
 * @param {object} opts - Options available
 * @param {object} opts.spreadsheetId - spreadsheetId
 * @param {object} opts.data - Data available
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR undefined)
 * @returns {undefined} undefined
 */
Self.insertDataInSheets = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `spreadsheetId`) === `undefined`)
    return cb(Error(`Missing required data: opts.spreadsheetId`));
  let spreadsheetId = _.get(opts, `spreadsheetId`);
  let data = _.get(opts, `data`, {});
  let metadata = _.get(data, `metadata`, {});
  let protocols = _.get(data, `protocols`, {});
  let codes = _.get(data, `codes`, {});
  let reagents = _.get(data, `reagents`, {});
  let datasets = _.get(data, `datasets`, {});
  let summary = _.get(data, `summary`, {});
  return Self.getSheets({ spreadsheetId: spreadsheetId }, function (err, sheets) {
    let summarySheetId = Self.getSheetId(sheets, `Summary Sheet`);
    let complianceReportId = Self.getSheetId(sheets, `Compliance Report`);
    let actions = [
      // fill 'Summary Sheet'
      function (next) {
        if (summarySheetId instanceof Error) return next(summarySheetId);
        return Self.fillSummarySheet(
          {
            spreadsheetId: spreadsheetId,
            sheetId: summarySheetId,
            data: {
              dataTypesInfos: data.dataTypesInfos,
              articleTitle: metadata.articleTitle,
              doi: metadata.doi,
              authors: metadata.authors,
              dataSeerLink: metadata.dataSeerLink,
              protocols: {
                new: protocols.filter(function (item) {
                  return !item.reuse;
                }).length,
                reuse: protocols.filter(function (item) {
                  return item.reuse;
                }).length
              },
              codeAndSoftware: {
                new: codes.filter(function (item) {
                  return !item.reuse;
                }).length,
                reuse: codes.filter(function (item) {
                  return item.reuse;
                }).length
              },
              materialsResources: {
                new: reagents.filter(function (item) {
                  return !item.reuse;
                }).length,
                reuse: reagents.filter(function (item) {
                  return item.reuse;
                }).length
              },
              newDatasets: datasets.filter(function (item) {
                return !item.reuse;
              }),
              reUseDatasets: datasets.filter(function (item) {
                return item.reuse;
              })
            }
          },
          function (err, res) {
            return next(err);
          }
        );
      },
      // fill 'Compliance Report'
      function (next) {
        if (complianceReportId instanceof Error) return next(complianceReportId);
        return Self.fillComplianceReport(
          {
            spreadsheetId: spreadsheetId,
            sheetId: complianceReportId,
            data: {
              dataTypesInfos: data.dataTypesInfos,
              summary: data.summary,
              protocols: protocols,
              datasets: datasets,
              codeAndSoftware: codes,
              labMaterials: reagents
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
 * This function will fill summary sheet with given data and return the file ID (google file ID)
 * @param {object} opts - Options available
 * @param {object} opts.spreadsheetId - spreadsheetId
 * @param {object} opts.sheetId - sheetId
 * @param {object} opts.data - Data available
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR undefined)
 * @returns {undefined} undefined
 */
Self.fillSummarySheet = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `spreadsheetId`) === `undefined`)
    return cb(Error(`Missing required data: opts.spreadsheetId`));
  if (typeof _.get(opts, `sheetId`) === `undefined`) return cb(Error(`Missing required data: opts.sheetId`));
  let spreadsheetId = _.get(opts, `spreadsheetId`);
  let sheetId = _.get(opts, `sheetId`);
  let data = _.get(opts, `data`, {});
  let dataTypesInfos = _.get(data, `dataTypesInfos`, {});
  let dataTypes = Object.keys(dataTypesInfos.dataTypes);
  let articleTitle = _.get(data, `articleTitle`, {});
  let doi = _.get(data, `doi`, ``);
  let authors = _.get(data, `authors`, ``);
  let dataSeerLink = _.get(data, `dataSeerLink`, ``);
  let protocols = _.get(data, `protocols`, { new: 0, reuse: 0 });
  let codeAndSoftware = _.get(data, `codeAndSoftware`, { new: 0, reuse: 0 });
  let materialsResources = _.get(data, `materialsResources`, { new: 0, reuse: 0 });
  let newDatasets = _.get(data, `newDatasets`, []);
  let reUseDatasets = _.get(data, `reUseDatasets`, []);
  let batches = {
    newDatasets: newDatasets.map(function (item) {
      return { datatype: item.dataType, subtype: item.subType, notes: item.comments };
    }),
    reUseDatasets: reUseDatasets.map(function (item) {
      return { datatype: item.dataType, subtype: item.subType, notes: item.comments };
    })
  };
  let actions = [
    // Insert rows for re-use datasets & new datasets
    function (next) {
      let requests = [
        Self.buildRequestInsertRows(sheetId, 25, 26 + reUseDatasets.length - 1, true),
        Self.buildRequestInsertRows(sheetId, 22, 23 + newDatasets.length - 1, true)
      ];
      for (let i = 0; i < batches.reUseDatasets.length; i++) {
        let dataset = batches.reUseDatasets[i];
        let index = 25 + batches.newDatasets.length + i;
        requests.push(Self.buildRequestUpdateBorders(sheetId, index, index + 1, 0, 3));
      }
      for (let i = 0; i < batches.newDatasets.length; i++) {
        let dataset = batches.newDatasets[i];
        let index = 22 + i;
        requests.push(Self.buildRequestUpdateBorders(sheetId, index, index + 1, 0, 3));
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
      let requests = [];
      let offset = reUseDatasets.length + newDatasets.length;
      let date = new Date();
      let data = [
        Self.buildRequestUpdateCell(`'Summary Sheet'!E1`, [
          `=DATE(${date.getFullYear()};${date.getMonth()};${date.getDate()})`
        ]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!B2`, [articleTitle]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!B3`, [doi]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!B4`, [authors]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!B6`, [`=LIEN_HYPERTEXTE("${dataSeerLink}")`]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!B18`, [protocols.new]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!B19`, [protocols.reuse]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!B${28 + offset}`, [codeAndSoftware.new]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!B${29 + offset}`, [codeAndSoftware.reuse]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!B${32 + offset}`, [materialsResources.new]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!B${33 + offset}`, [materialsResources.reuse])
      ];
      for (let i = 0; i < batches.reUseDatasets.length; i++) {
        let dataset = batches.reUseDatasets[i];
        let index = 25 + batches.newDatasets.length + i;
        data.push(Self.buildRequestUpdateCell(`'Summary Sheet'!A${index}`, [dataset.datatype]));
        data.push(Self.buildRequestUpdateCell(`'Summary Sheet'!B${index}`, [dataset.subtype]));
        data.push(Self.buildRequestUpdateCell(`'Summary Sheet'!C${index}`, [dataset.notes]));
        if (dataset.datatype)
          requests.push(Self.buildRequestAddDataValidationList(sheetId, index - 1, index, 0, 1, dataTypes));
        if (dataset.datatype)
          requests.push(
            Self.buildRequestAddDataValidationList(
              sheetId,
              index - 1,
              index,
              1,
              2,
              dataTypesInfos.dataTypes[dataset.datatype]
            )
          );
      }
      for (let i = 0; i < batches.newDatasets.length; i++) {
        let dataset = batches.newDatasets[i];
        let index = 22 + i;
        data.push(Self.buildRequestUpdateCell(`'Summary Sheet'!A${index}`, [dataset.datatype]));
        data.push(Self.buildRequestUpdateCell(`'Summary Sheet'!B${index}`, [dataset.subtype]));
        data.push(Self.buildRequestUpdateCell(`'Summary Sheet'!C${index}`, [dataset.notes]));
        if (dataset.datatype)
          requests.push(Self.buildRequestAddDataValidationList(sheetId, index - 1, index, 0, 1, dataTypes));
        if (dataset.datatype)
          requests.push(
            Self.buildRequestAddDataValidationList(
              sheetId,
              index - 1,
              index,
              1,
              2,
              dataTypesInfos.dataTypes[dataset.datatype]
            )
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
          if (err) return next(err);
          if (requests.length === 0) return next(err);
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
 * @param {object} opts.spreadsheetId - spreadsheetId
 * @param {object} opts.sheetId - sheetId
 * @param {object} opts.data - Data available
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR undefined)
 * @returns {undefined} undefined
 */
Self.fillComplianceReport = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `spreadsheetId`) === `undefined`)
    return cb(Error(`Missing required data: opts.spreadsheetId`));
  if (typeof _.get(opts, `sheetId`) === `undefined`) return cb(Error(`Missing required data: opts.sheetId`));
  let spreadsheetId = _.get(opts, `spreadsheetId`);
  let sheetId = _.get(opts, `sheetId`);
  let data = _.get(opts, `data`, {});
  let dataTypesInfos = _.get(data, `dataTypesInfos`, {});
  let dataTypes = Object.keys(dataTypesInfos.dataTypes);
  let summary = _.get(data, `summary`, []);
  let protocols = _.get(data, `protocols`, []);
  let codeAndSoftware = _.get(data, `codeAndSoftware`, []);
  let labMaterials = _.get(data, `labMaterials`, []);
  let datasets = _.get(data, `datasets`, []);
  let sortedDatasets = {};
  // Regroup datasets by datatype
  for (let i = 0; i < datasets.length; i++) {
    let dataset = datasets[i];
    if (typeof sortedDatasets[dataset.dataType] === `undefined`)
      sortedDatasets[dataset.dataType] = { name: dataset.dataType, list: [] };
    sortedDatasets[dataset.dataType].list.push(dataset);
  }
  // Compute batches commands
  let batches = {
    protocols: protocols.map(function (item) {
      return {
        reuse: item.reuse,
        sentences: item.sentences
          .map(function (s) {
            return s.text;
          })
          .join(` `),
        link: item.DOI,
        notes: item.comments
      };
    }),
    codeAndSoftware: codeAndSoftware.map(function (item) {
      return {
        reuse: item.reuse,
        name: item.name,
        sentences: item.sentences
          .map(function (s) {
            return s.text;
          })
          .join(` `),
        link: item.DOI,
        datatype: item.type.url ? `=LIEN_HYPERTEXTE("${item.type.url}";"${item.type.label}")` : item.type.label,
        notes: item.comments
      };
    }),
    labMaterials: labMaterials.map(function (item) {
      return {
        reuse: item.reuse,
        name: item.name,
        sentences: item.sentences
          .map(function (s) {
            return s.text;
          })
          .join(` `),
        link: item.DOI,
        datatype: item.type.label,
        notes: item.comments
      };
    })
  };
  let actions = [
    // Insert rows
    function (next) {
      let requests = [
        // Lab Materials
        Self.buildRequestInsertRows(sheetId, 26, 27 + labMaterials.length - 1, true),
        Self.buildRequestUpdateBorders(sheetId, 26, 27 + labMaterials.length - 1, 0, 9),
        // Code & Software
        Self.buildRequestInsertRows(sheetId, 21, 22 + codeAndSoftware.length - 1, true),
        Self.buildRequestUpdateBorders(sheetId, 21, 22 + codeAndSoftware.length - 1, 0, 9)
      ];
      // Datasets
      let keys = Object.keys(sortedDatasets);
      for (let i = 0; i < keys.length; i++) {
        let key = keys[i];
        let infos = sortedDatasets[key];
        requests.push(Self.buildRequestInsertRows(sheetId, 17, 18, false));
        requests.push(Self.buildRequestInsertRows(sheetId, 17, 18, false));
        requests.push(Self.buildRequestInsertRows(sheetId, 17, 18, false));
        requests.push(Self.buildRequestInsertRows(sheetId, 17, 18, false));
        requests.push(Self.buildRequestInsertRows(sheetId, 17, 18, false));
        requests.push(
          Self.buildRequestCopyPaste(
            { sheetId: sheetId, startRowIndex: 13, endRowIndex: 17, startColumnIndex: 0, endColumnIndex: 10 },
            { sheetId: sheetId, startRowIndex: 18, endRowIndex: 22, startColumnIndex: 0, endColumnIndex: 10 }
          )
        );
        for (let j = 0; j < infos.list.length; j++) {
          requests.push(Self.buildRequestInsertRows(sheetId, 21, 22, true));
        }
        requests.push(Self.buildRequestUpdateBorders(sheetId, 21, 22 + infos.list.length - 1, 0, 9));
      }
      // Delete template rows for Datasets
      requests.push(Self.buildRequestDeleteRows(sheetId, 12, 18));
      // Protocols
      requests.push(Self.buildRequestInsertRows(sheetId, 11, 12 + protocols.length - 1, true));
      requests.push(Self.buildRequestUpdateBorders(sheetId, 11, 12 + protocols.length - 1, 0, 8));
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
      let rowOffset = 11;
      // Protocols
      for (let i = 0; i < batches.protocols.length; i++) {
        let protocol = batches.protocols[i];
        let rowIndex = rowOffset + i;
        data.push(Self.buildRequestUpdateCell(`'Compliance Report'!A${rowIndex}`, [i + 1]));
        data.push(Self.buildRequestUpdateCell(`'Compliance Report'!B${rowIndex}`, [protocol.reuse]));
        data.push(Self.buildRequestUpdateCell(`'Compliance Report'!E${rowIndex}`, [protocol.sentences]));
        data.push(Self.buildRequestUpdateCell(`'Compliance Report'!F${rowIndex}`, [protocol.link]));
        data.push(Self.buildRequestUpdateCell(`'Compliance Report'!G${rowIndex}`, [protocol.notes]));
      }
      rowOffset = rowOffset + batches.protocols.length + 4;
      // Datasets
      let keys = Object.keys(sortedDatasets);
      for (var i = keys.length - 1; i >= 0; i--) {
        let key = keys[i];
        let infos = sortedDatasets[key];
        data.push(Self.buildRequestUpdateCell(`'Compliance Report'!C${rowOffset - 2}`, [`Datasets - ${infos.name}`]));
        let begin = rowOffset + 0;
        for (let j = 0; j < infos.list.length; j++) {
          let dataset = infos.list[j];
          let rowIndex = rowOffset + j;
          data.push(Self.buildRequestUpdateCell(`'Compliance Report'!A${rowIndex}`, [j + 1]));
          data.push(Self.buildRequestUpdateCell(`'Compliance Report'!B${rowIndex}`, [dataset.reuse]));
          data.push(Self.buildRequestUpdateCell(`'Compliance Report'!E${rowIndex}`, [dataset.name]));
          data.push(
            Self.buildRequestUpdateCell(`'Compliance Report'!F${rowIndex}`, [
              dataset.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `)
            ])
          );
          data.push(
            Self.buildRequestUpdateCell(`'Compliance Report'!H${rowIndex}`, [
              dataset.type.url ? `=LIEN_HYPERTEXTE("${dataset.type.url}";"${dataset.type.label}")` : dataset.type.label
            ])
          );
          data.push(Self.buildRequestUpdateCell(`'Compliance Report'!I${rowIndex}`, [dataset.DOI]));
        }
        let end = rowOffset + infos.list.length;
        rowOffset = end + 5;
        data.push(
          Self.buildRequestUpdateCell(`'Compliance Report'!B${rowOffset - 4}`, [`=NB.SI(B${begin}:B${end};VRAI)`])
        );
      }
      // Code & Software
      for (let i = 0; i < batches.codeAndSoftware.length; i++) {
        let item = batches.codeAndSoftware[i];
        let rowIndex = rowOffset + i;
        data.push(Self.buildRequestUpdateCell(`'Compliance Report'!A${rowIndex}`, [i + 1]));
        data.push(Self.buildRequestUpdateCell(`'Compliance Report'!B${rowIndex}`, [item.reuse]));
        data.push(Self.buildRequestUpdateCell(`'Compliance Report'!E${rowIndex}`, [item.name]));
        data.push(Self.buildRequestUpdateCell(`'Compliance Report'!F${rowIndex}`, [item.sentences]));
        data.push(Self.buildRequestUpdateCell(`'Compliance Report'!G${rowIndex}`, [item.link]));
        data.push(Self.buildRequestUpdateCell(`'Compliance Report'!H${rowIndex}`, [item.datatype]));
        data.push(Self.buildRequestUpdateCell(`'Compliance Report'!I${rowIndex}`, [item.notes]));
      }
      data.push(
        Self.buildRequestUpdateCell(`'Compliance Report'!B${rowOffset + batches.codeAndSoftware.length + 1}`, [
          `=NB.SI(B${rowOffset}:B${rowOffset + batches.codeAndSoftware.length};VRAI)`
        ])
      );
      rowOffset += batches.codeAndSoftware.length + 5;
      // Lab Materails
      for (let i = 0; i < batches.labMaterials.length; i++) {
        let item = batches.labMaterials[i];
        let rowIndex = rowOffset + i;
        data.push(Self.buildRequestUpdateCell(`'Compliance Report'!A${rowIndex}`, [i + 1]));
        data.push(Self.buildRequestUpdateCell(`'Compliance Report'!B${rowIndex}`, [item.reuse]));
        data.push(Self.buildRequestUpdateCell(`'Compliance Report'!E${rowIndex}`, [item.name]));
        data.push(Self.buildRequestUpdateCell(`'Compliance Report'!F${rowIndex}`, [item.sentences]));
        data.push(Self.buildRequestUpdateCell(`'Compliance Report'!G${rowIndex}`, [item.datatype]));
        data.push(Self.buildRequestUpdateCell(`'Compliance Report'!I${rowIndex}`, [item.notes]));
      }
      data.push(
        Self.buildRequestUpdateCell(`'Compliance Report'!B${rowOffset + batches.labMaterials.length + 1}`, [
          `=NB.SI(B${rowOffset}:B${rowOffset + batches.labMaterials.length};VRAI)`
        ])
      );
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
  return {
    range: range, // Update single cell
    values: [values]
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
  if (typeof endIndex === `undefined`) throw new Error(`Missing required data: endIndex`);
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
Self.buildRequestCopyPaste = function (source = {}, destination = {}) {
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
      pasteType: `PASTE_NORMAL`
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
 * @returns {object} The request object
 */
Self.buildRequestUpdateBorders = function (sheetId, startRowIndex, endRowIndex, startColumnIndex, endColumnIndex) {
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
      top: {
        style: `SOLID`,
        width: 1,
        color: {
          red: 0,
          green: 0,
          blue: 0,
          alpha: 1
        }
      },
      bottom: {
        style: `SOLID`,
        width: 1,
        color: {
          red: 0,
          green: 0,
          blue: 0,
          alpha: 1
        }
      },
      left: {
        style: `SOLID`,
        width: 1,
        color: {
          red: 0,
          green: 0,
          blue: 0,
          alpha: 1
        }
      },
      right: {
        style: `SOLID`,
        width: 1,
        color: {
          red: 0,
          green: 0,
          blue: 0,
          alpha: 1
        }
      },
      innerHorizontal: {
        style: `SOLID`,
        width: 1,
        color: {
          red: 0,
          green: 0,
          blue: 0,
          alpha: 1
        }
      },
      innerVertical: {
        style: `SOLID`,
        width: 1,
        color: {
          red: 0,
          green: 0,
          blue: 0,
          alpha: 1
        }
      }
    }
  };
};

/**
 * This function will create the report file and return the file ID (google file ID)
 * @param {object} opts - Options available
 * @param {object} opts.data - Data available
 * @param {string} opts.data.name - Name of the document
 * @param {boolean} opts.[erase] - Erase existing file (default: false)
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR undefined)
 * @returns {undefined} undefined
 */
Self.createReportFile = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(conf, `folder`) === `undefined`) return cb(Error(`Missing required data: conf.folder`));
  if (typeof _.get(conf, `template`) === `undefined`) return cb(Error(`Missing required data: conf.template`));
  if (typeof _.get(opts, `data.name`) === `undefined`) return cb(Error(`Missing required data: opts.data.name`));
  let erase = _.get(opts, `erase`, false);
  let _opts = { data: { name: opts.data.name } };
  return Self.getReportFileId(_opts, function (err, res) {
    if (err) return cb(err);
    // Case report does not exist yet
    if (res instanceof Error)
      return Self._createReportFile(_opts, function (err, res) {
        if (err) return cb(err);
        return cb(err, res);
      });
    // If it should not be erased, return google file ID
    if (!erase) return cb(null, res);
    // Erase file & re-create it
    return Self._deleteReportFile({ data: { fileId: res } }, function (err, res) {
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
 * @param {object} opts.data - Data available
 * @param {string} opts.data.name - Name of the document
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR undefined)
 * @returns {undefined} undefined
 */
Self._createReportFile = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(conf, `folder`) === `undefined`) return cb(Error(`Missing required data: conf.folder`));
  if (typeof _.get(conf, `template`) === `undefined`) return cb(Error(`Missing required data: conf.template`));
  if (typeof _.get(opts, `data.name`) === `undefined`) return cb(Error(`Missing required data: opts.data.name`));
  // There is no existing document : create it
  return drive.files.copy(
    {
      // The ID of the file to copy.
      fileId: conf.template,
      // Request body metadata
      requestBody: {
        'parents': [conf.folder],
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
            'role': `reader`
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
 * @param {object} opts.data - Data available
 * @param {string} opts.data.name - Name of the document
 * @param {boolean} opts.[ignore] - Ignore error (default: false)
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: true OR Error)
 * @returns {undefined} undefined
 */
Self.deleteReportFile = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(conf, `folder`) === `undefined`) return cb(Error(`Missing required data: conf.folder`));
  if (typeof _.get(conf, `template`) === `undefined`) return cb(Error(`Missing required data: conf.template`));
  if (typeof _.get(opts, `data.name`) === `undefined`) return cb(Error(`Missing required data: opts.data.name`));
  let ignore = _.get(opts, `ignore`, false);
  return Self.getReportFileId({ data: { name: opts.data.name } }, function (err, res) {
    if (err) return cb(err);
    // Case report does not exist
    if (res instanceof Error) {
      if (ignore) return cb(err, true);
      return cb(null, res);
    }
    // Erase file
    return Self._deleteReportFile({ data: { fileId: res } }, function (err, res) {
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
  if (typeof _.get(conf, `folder`) === `undefined`) return cb(Error(`Missing required data: conf.folder`));
  if (typeof _.get(opts, `data.fileId`) === `undefined`) return cb(Error(`Missing required data: opts.data.fileId`));
  // Check all optionnal data
  return drive.files.delete(
    {
      // The ID of the file to copy.
      fileId: opts.data.fileId,
      // Request body metadata
      requestBody: {
        'parents': [conf.folder]
      }
    },
    function (err, res) {
      if (err) return cb(err);
      return cb(null, res.data.id);
    }
  );
};

module.exports = Self;
