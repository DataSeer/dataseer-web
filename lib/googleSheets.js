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
  let name = _.get(opts, `data.name`);
  if (kind) {
    if (kind !== `ASAP` && kind !== `AmNat` && kind !== `DataSeer Generic`)
      return cb(Error(`Invalid required data: opts.kind must be 'ASAP or 'AmNat' or 'DataSeer Generic'`));
    if (typeof _.get(conf, `folders.${kind}`) === `undefined`)
      return cb(Error(`Missing required data: conf.folders.${kind}`));
    folder = _.get(conf, `folders.${kind}`);
  }
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
 * @param {string} opts.spreadsheetId - spreadsheetId
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
 * @param {string} opts.filename - filename (of the report)
 * @param {string} opts.kind - What kind of report (available values : ASAP or AmNat)
 * @param {object} opts.data - Data available (for the report)
 * @param {string} opts.data.doc - document data
 * @param {object} opts.data.dataTypesInfos - dataTypesInfos
 * @param {object} opts.data.metadata - metadata
 * @param {object} opts.data.metadata.articleTitle - articleTitle
 * @param {object} opts.data.metadata.doi - doi
 * @param {object} opts.data.metadata.authors - authors
 * @param {array} opts.data.datasets - datasets
 * @param {array} opts.data.protocols - protocols
 * @param {array} opts.data.reagents - reagents
 * @param {array} opts.data.codes - codes
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR undefined)
 * @returns {undefined} undefined
 */
Self.buildReport = function (opts = {}, cb) {
  // Check all required data
  let kind = _.get(opts, `kind`);
  if (typeof kind === `undefined`) return cb(Error(`Missing required data: opts.kind`));
  if (kind !== `ASAP` && kind !== `AmNat` && kind !== `DataSeer Generic`)
    return cb(Error(`Invalid required data: opts.kind must be 'ASAP or 'AmNat' or 'DataSeer Generic'`));
  if (typeof _.get(conf, `folders.${kind}`) === `undefined`)
    return cb(Error(`Missing required data: conf.folders.${kind}`));
  if (typeof _.get(conf, `templates.${kind}`) === `undefined`)
    return cb(Error(`Missing required data: conf.templates.${kind}`));
  if (typeof _.get(opts, `filename`) === `undefined`) return cb(Error(`Missing required data: opts.data.filename`));
  let filename = _.get(opts, `filename`);
  if (conf.prefix) filename = conf.prefix + filename;
  let template = _.get(conf, `templates.${kind}`);
  let folder = _.get(conf, `folders.${kind}`);
  return Self.createReportFile(
    { template: template, folder: folder, data: { name: filename }, erase: true },
    function (err, id) {
      if (err) return cb(err);
      // Case report does not exist yet
      if (!id) return cb(null, new Error(`Report file not created in the google API drive`));
      if (kind === `ASAP`)
        return Self.insertDataInASAPSheets({ spreadsheetId: id, data: opts.data }, function (err) {
          if (err) return cb(err);
          return cb(null, id);
        });
      else if (kind === `DataSeer Generic`)
        return Self.insertDataInDataSeerGenericSheets({ spreadsheetId: id, data: opts.data }, function (err) {
          if (err) return cb(err);
          return cb(null, id);
        });
      else if (kind === `AmNat`)
        return Self.insertDataInAmNatSheets({ spreadsheetId: id, data: opts.data }, function (err) {
          if (err) return cb(err);
          return cb(null, id);
        });
      else return cb(null, new Error(`Unavailable functionality`));
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
  let doc = _.get(data, `doc`, {});
  let metadata = _.get(data, `metadata`, {});
  let codes = _.get(data, `codes`, {});
  let softwares = _.get(data, `softwares`, {});
  let datasets = _.get(data, `datasets`, {});
  let summary = _.get(data, `summary`, {});
  let dataTypesInfos = _.get(data, `dataTypesInfos`, {});
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
              dataTypesInfos: dataTypesInfos,
              summary: summary,
              datasets: datasets,
              codes: codes,
              softwares: softwares
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
  let dataTypesInfos = _.get(data, `dataTypesInfos`, {});
  let dataTypes = Object.keys(dataTypesInfos.dataTypes);
  let codes = _.get(data, `codes`, []);
  let softwares = _.get(data, `softwares`, []);
  let datasets = _.get(data, `datasets`, []);
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
    // softwares
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
          data: softwares.map(function (item) {
            return {
              reuse: item.reuse,
              name: item.name,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              URL: item.DOI,
              notes: item.comments
            };
          })
        }
      ]
    },
    // codes
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
          data: codes.map(function (item) {
            return {
              reuse: item.reuse,
              name: item.name,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              URL: item.DOI,
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
                name: item.name,
                sentences: item.sentences
                  .map(function (s) {
                    return s.text;
                  })
                  .join(` `),
                repository: item.DOI,
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
      let actions = [
        // Insert rows
        function (n) {
          let requests = [];
          let noData = true;
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
            // if there is data in this bulk of data
            noData = noData && batch.data[i].data.length === 0;
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
              }, 500);
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
              }, 500);
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
  let doc = _.get(data, `doc`, {});
  let metadata = _.get(data, `metadata`, {});
  let protocols = _.get(data, `protocols`, {});
  let codes = _.get(data, `codes`, {});
  let softwares = _.get(data, `softwares`, {});
  let reagents = _.get(data, `reagents`, {});
  let datasets = _.get(data, `datasets`, {});
  let summary = _.get(data, `summary`, {});
  let dataTypesInfos = _.get(data, `dataTypesInfos`, {});
  let filteredDatasets = [
    //      a              b                    c                      d               e            f
    // item.reuse      item.qc      item.representativeImage      item.issues      item.DOI      item.PID
    // Deposit to appropriate repository and cite PID in text
    datasets.filter(function (item) {
      /*  (! a * ! b * ! c * ! d * ! e * ! f) */
      /*
        (!item.reuse && !item.qc && !item.representativeImage && !item.issues && !item.DOI && !item.PID)
      */
      return !item.reuse && !item.qc && !item.representativeImage && !item.issues && !item.DOI && !item.PID;
    }),
    // Cite dataset unique identifier in text
    datasets.filter(function (item) {
      /* ( a * ! b * ! c * ! d * ! e * ! f) */
      /*
        (item.reuse && !item.qc && !item.representativeImage && !item.issues && !item.DOI && !item.PID)
      */
      return item.reuse && !item.qc && !item.representativeImage && !item.issues && !item.DOI && !item.PID;
    }),
    // Verify dataset citation
    datasets.filter(function (item) {
      /* (a * ! b * c * d * e * ! f) + (! a * d * ! e * ! f) + (b * d * ! e * ! f) + (! c * d * ! e * ! f) */
      /*
        (item.reuse && !item.qc && item.representativeImage && item.issues && item.DOI && !item.PID) ||
        (!item.reuse && item.issues && !item.DOI && !item.PID) ||
        (item.qc && item.issues && !item.DOI && !item.PID) ||
        (!item.representativeImage && item.issues && !item.DOI && !item.PID)
      */
      return (
        (item.reuse && !item.qc && item.representativeImage && item.issues && item.DOI && !item.PID) ||
        (!item.reuse && item.issues && !item.DOI && !item.PID) ||
        (item.qc && item.issues && !item.DOI && !item.PID) ||
        (!item.representativeImage && item.issues && !item.DOI && !item.PID)
      );
    }),
    // Done - Cited correctly
    datasets.filter(function (item) {
      /* (a * ! c * ! d * ! e * f) + (! a * b * ! d * e * ! f) + (! b * ! c * ! d * ! e * f) + (c * ! d * e * ! f) */
      /*
        (item.reuse && !item.representativeImage && !item.issues && !item.DOI && item.PID) ||
        (!item.reuse && item.qc && !item.issues && item.DOI && !item.PID) ||
        (!item.qc && !item.representativeImage && !item.issues && !item.DOI && item.PID) ||
        (item.representativeImage && !item.issues && item.DOI && !item.PID)
      */
      return (
        (item.reuse && !item.representativeImage && !item.issues && !item.DOI && item.PID) ||
        (!item.reuse && item.qc && !item.issues && item.DOI && !item.PID) ||
        (!item.qc && !item.representativeImage && !item.issues && !item.DOI && item.PID) ||
        (item.representativeImage && !item.issues && item.DOI && !item.PID)
      );
    }),
    // Not required, but recommended to include the representative image/video files in raw format with dataset upload.
    datasets.filter(function (item) {
      /* (b * ! d * ! e * ! f) + (c * ! d * ! e * ! f) */
      /*
        (item.qc && !item.issues && !item.DOI && !item.PID) ||
        (item.representativeImage && !item.issues && !item.DOI && !item.PID)
      */
      return (
        (item.qc && !item.issues && !item.DOI && !item.PID) ||
        (item.representativeImage && !item.issues && !item.DOI && !item.PID)
      );
    }),
    // Confirmatory and Quality Control datasets are not required to be included in your dataset upload.
    datasets.filter(function (item) {
      /* (! a * b * ! c * ! d * ! e * ! f) */
      /*
        (!item.reuse && item.qc && !item.representativeImage && !item.issues && !item.DOI && !item.PID)
      */
      return !item.reuse && item.qc && !item.representativeImage && !item.issues && !item.DOI && !item.PID;
    })
    //      a              b                    c                      d               e            f
    // item.reuse      item.qc      item.representativeImage      item.issues      item.DOI      item.PID
  ];
  let filteredCodes = [
    //         a             b              c
    // item.issues     item.comments     item.DOI
    // Upload code to Zenodo and provide DOI
    codes.filter(function (item) {
      /* (! a * ! b * ! c)  */
      /*
        (!item.issues && !item.comments && !item.comments)
      */
      return !item.issues && !item.comments && (!item.DOI || item.DOI.indexOf(`https://github.com/`) < 0);
    }),
    // Verify citation
    codes.filter(function (item) {
      /* (a * ! c) */
      /*
        (item.issues && !item.comments) // Not sure so keep old filter
      */
      return item.issues;
    }),
    // Done - Cited correctly
    codes.filter(function (item) {
      /* (! a * b * ! c) + (! a * ! b * c) */
      /*
        // Not sure so keep old filter
        (!item.issues && item.comments && !item.DOI) ||
        (!item.issues && !item.comments && item.DOI)
      */
      return !item.issues && (item.comments || item.DOI || item.DOI.indexOf(`https://github.com/`) > -1);
    })
    //         a             b              c
    // item.issues     item.comments     item.DOI
  ];
  let filteredSoftwares = [
    //      a                b                 c               d              e               f
    // item.reuse      item.version      item.issues      item.DOI      item.RRID      item.suggestedEntity
    // Register tool to get missing information
    softwares.filter(function (item) {
      /* (! a * ! b * c * ! d * ! f) + (! a * ! b * ! c * d * ! e * ! f) */
      /*
        // Not sure so keep old filter
        (!item.issues && item.comments && !item.DOI) ||
        (!item.issues && !item.comments && item.DOI)
      */
      return (
        (!item.reuse && !item.version && item.issues && !item.DOI && !item.suggestedEntity) ||
        (!item.reuse && !item.version && !item.issues && item.DOI && !item.RRID && !item.suggestedEntity)
      );
    }),
    // Include missing information in citation
    softwares.filter(function (item) {
      /* (a * b * ! c * ! e) + (a * ! c * ! d * ! e) + (a * ! c * ! e * ! f) */
      /*
        (item.reuse && item.version && !item.issues && !item.RRID) ||
        (item.reuse && !item.issues && !item.DOI && !item.RRID) ||
        (item.reuse && !item.issues && !item.RRID && !item.suggestedEntity)
      */
      return (
        (item.reuse && item.version && !item.issues && !item.RRID) ||
        (item.reuse && !item.issues && !item.DOI && !item.RRID) ||
        (item.reuse && !item.issues && !item.RRID && !item.suggestedEntity)
      );
    }),
    // Verify citation
    softwares.filter(function (item) {
      /* (a * c * ! f) + (! b * c * ! f) + (c * d * ! f) + (c * e * ! f) */
      /*
        (item.reuse && item.issues && !item.suggestedEntity) ||
        (!item.version && item.issues && !item.suggestedEntity) ||
        (item.issues && item.DOI && !item.suggestedEntity) ||
        (item.issues && item.RRID && !item.suggestedEntity)
      */
      return (
        (item.reuse && item.issues && !item.suggestedEntity) ||
        (!item.version && item.issues && !item.suggestedEntity) ||
        (item.issues && item.DOI && !item.suggestedEntity) ||
        (item.issues && item.RRID && !item.suggestedEntity)
      );
    }),
    // Done - Cited correctly
    softwares.filter(function (item) {
      /* (a * b * ! c * d * ! e * f) + (b * ! c * d * e * ! f) */
      /*
        (item.reuse && item.version && !item.issues && item.DOI && !item.RRID && item.suggestedEntity) ||
        (item.version && !item.issues && item.DOI && item.RRID && !item.suggestedEntity)
      */
      return (
        (item.reuse && item.version && !item.issues && item.DOI && !item.RRID && item.suggestedEntity) ||
        (item.version && !item.issues && item.DOI && item.RRID && !item.suggestedEntity)
      );
    }),
    // None - Citation meets minimum standards
    softwares.filter(function (item) {
      /* (a * b * ! c * d * ! e) + (! b * ! c * e * ! f) + (! c * ! d * e * ! f) */
      /*
        (item.reuse && item.version && !item.issues && item.DOI && !item.RRID) ||
        (!item.version && !item.issues && item.RRID && !item.suggestedEntity) ||
        (!item.issues && !item.DOI && item.RRID && !item.suggestedEntity)
      */
      return (
        (item.reuse && item.version && !item.issues && item.DOI && !item.RRID) ||
        (!item.version && !item.issues && item.RRID && !item.suggestedEntity) ||
        (!item.issues && !item.DOI && item.RRID && !item.suggestedEntity)
      );
    })
    //      a                b                 c               d              e               f
    // item.reuse      item.version      item.issues      item.DOI      item.RRID      item.suggestedEntity
  ];
  let filteredMaterials = [
    //      a              b                  c                   d                  e                 f
    // item.reuse      item.issues      item.source      item.catalogNumber      item.RRID      item.suggestedEntity
    // Assign RRID and cite in text
    reagents.filter(function (item) {
      /* (! a * ! b * ! d * ! e) + (! a * ! b * ! e * ! f) */
      /*
        (!item.reuse && !item.issues && !item.catalogNumber && !item.RRID) ||
        (!item.reuse && !item.issues && !item.RRID && !item.suggestedEntity)
      */
      return (
        (!item.reuse && !item.issues && !item.catalogNumber && !item.RRID) ||
        (!item.reuse && !item.issues && !item.RRID && !item.suggestedEntity)
      );
    }),
    // Check for an existing RRID
    reagents.filter(function (item) {
      /* (a * ! b * c * ! e) + (a * ! b * ! d * ! e) + (a * ! b * ! e * ! f) */
      /*
        (item.reuse && !item.issues && item.source && !item.RRID) ||
        (item.reuse && !item.issues && !item.catalogNumber && !item.RRID) ||
        (item.reuse && !item.issues && !item.RRID && !item.suggestedEntity)
      */
      return (
        (item.reuse && !item.issues && item.source && !item.RRID) ||
        (item.reuse && !item.issues && !item.catalogNumber && !item.RRID) ||
        (item.reuse && !item.issues && !item.RRID && !item.suggestedEntity)
      );
    }),
    // Verify citation
    reagents.filter(function (item) {
      /* (a * b * c * d * ! e) + (a * b * c * ! e * ! f) + (a * b * d * ! e * ! f) + (! a * b * c * d * e * ! f) + (b * ! c * ! d * e * ! f) */
      /*
        (item.reuse && item.issues && item.source && item.catalogNumber && !item.RRID) ||
        (item.reuse && item.issues && item.source && !item.RRID && !item.suggestedEntity) ||
        (item.reuse && item.issues && item.catalogNumber && !item.RRID && !item.suggestedEntity) ||
        (!item.reuse && item.issues && item.source && item.catalogNumber && item.RRID && !item.suggestedEntity) ||
        (item.issues && !item.source && !item.catalogNumber && item.RRID && !item.suggestedEntity)
      */
      return (
        (item.reuse && item.issues && item.source && item.catalogNumber && !item.RRID) ||
        (item.reuse && item.issues && item.source && !item.RRID && !item.suggestedEntity) ||
        (item.reuse && item.issues && item.catalogNumber && !item.RRID && !item.suggestedEntity) ||
        (!item.reuse && item.issues && item.source && item.catalogNumber && item.RRID && !item.suggestedEntity) ||
        (item.issues && !item.source && !item.catalogNumber && item.RRID && !item.suggestedEntity)
      );
    }),
    // Done - Cited correctly
    reagents.filter(function (item) {
      /* (a * ! b * c * d * ! e) + (! b * e * ! f) */
      /*
        (item.reuse && !item.issues && item.source && item.catalogNumber && !item.RRID) ||
        (!item.issues && item.RRID && !item.suggestedEntity)
      */
      return (
        (item.reuse && !item.qc && item.issues && item.DOI && !item.RRID) ||
        (!item.qc && item.RRID && !item.suggestedEntity)
      );
    }),
    // None - Citation meets minimum standards
    reagents.filter(function (item) {
      /* From Github issue */
      return !item.RRID && item.catalogNumber && !item.issues && (item.suggestedEntity || item.source);
    })
    //      a              b                  c                   d                  e                 f
    // item.reuse      item.issues      item.source      item.catalogNumber      item.RRID      item.suggestedEntity
  ];
  let filteredProtocols = [
    //         a             b             c
    // item.reuse     item.issues     item.DOI
    // Deposit in repository and cite DOI in text
    protocols.filter(function (item) {
      /* (! a * ! b * ! c) */
      /*
        (!item.reuse && !item.issues && !item.DOI)
      */
      return !item.reuse && !item.issues && !item.DOI;
    }),
    // Include missing information in citation
    protocols.filter(function (item) {
      /* (a * ! b) */
      /*
        (item.reuse && !item.issues)
      */
      return item.reuse && !item.issues && (item.DOI === `` || !Params.isURL(item.DOI));
    }),
    // Verify citation
    protocols.filter(function (item) {
      /* (b * c) */
      /*
        (item.issues && item.DOI)
      */
      return item.issues;
    }),
    // Done - Cited correctly
    protocols.filter(function (item) {
      /* (! b * c) */
      /*
        (!item.issues && item.DOI)
      */
      return !item.issues && (item.DOI.indexOf(`Manufacturer's Instructions`) > -1 || Params.isURL(item.DOI));
    })
    //         a             b             c
    // item.reuse     item.issues     item.DOI
  ];
  let filteredDataObject = {
    datasets: {
      filtered: filteredDatasets,
      identified: filteredDatasets.slice(0, 4).flat(),
      shared: filteredDatasets[3]
    },
    codes: {
      filtered: filteredCodes,
      identified: filteredCodes.flat(),
      shared: filteredCodes.slice(2).flat()
    },
    softwares: {
      filtered: filteredSoftwares,
      identified: filteredSoftwares.flat(),
      shared: filteredSoftwares.slice(3).flat()
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
              articleTitle: metadata.articleTitle,
              authors: metadata.authors,
              dataSeerLink: metadata.dataSeerLink
            }
          },
          function (err, res) {
            return next(err);
          }
        );
      },
      // fill 'Detailed Report' part of the report
      function (next) {
        if (detailedReportSheetId instanceof Error) return next(detailedReportSheetId);
        return Self.fillDetailedReportDataSeerGenericPart(
          {
            spreadsheetId: spreadsheetId,
            sheetId: detailedReportSheetId,
            data: {
              dataTypesInfos: dataTypesInfos,
              summary: summary,
              datasets: filteredDataObject.datasets.filtered,
              codes: filteredDataObject.codes.filtered,
              softwares: filteredDataObject.softwares.filtered,
              materials: filteredDataObject.materials.filtered,
              protocols: filteredDataObject.protocols.filtered
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
 * This function will fill Detailed Report part with given data and return the file ID (google file ID)
 * @param {object} opts - Options available
 * @param {string} opts.spreadsheetId - spreadsheetId
 * @param {object} opts.sheetId - sheetId
 * @param {object} opts.data - Data available
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR undefined)
 * @returns {undefined} undefined
 */
Self.fillDetailedReportDataSeerGenericPart = function (opts = {}, cb) {
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
  let codes = _.get(data, `codes`, []);
  let softwares = _.get(data, `softwares`, []);
  let materials = _.get(data, `materials`, []);
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
  let batches = [
    // protocols
    {
      row: { min: 154, max: 154, insert: 154 },
      cells: [],
      data: [
        {
          merges: [
            { begin: 2, end: 5 },
            { begin: 5, end: 7 },
            { begin: 7, end: 13 }
          ],
          row: { min: 155, max: 162, insert: 160 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `H`, property: `repository` },
            { column: `N`, property: `notes` }
          ],
          data: protocols[0].map(function (item) {
            return {
              reuse: item.reuse,
              issue: !!item.issues,
              name: item.name,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              repository: item.DOI
            };
          })
        },
        {
          merges: [
            { begin: 2, end: 5 },
            { begin: 5, end: 7 },
            { begin: 7, end: 13 }
          ],
          row: { min: 163, max: 170, insert: 168 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `H`, property: `repository` },
            { column: `N`, property: `notes` }
          ],
          data: protocols[1].map(function (item) {
            return {
              reuse: item.reuse,
              issue: !!item.issues,
              name: item.name,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              repository: item.DOI
            };
          })
        },
        {
          merges: [
            { begin: 2, end: 5 },
            { begin: 5, end: 7 },
            { begin: 7, end: 13 }
          ],
          row: { min: 171, max: 178, insert: 176 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `H`, property: `repository` },
            { column: `N`, property: `notes` }
          ],
          data: protocols[2].map(function (item) {
            return {
              reuse: item.reuse,
              issue: !!item.issues,
              name: item.name,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              repository: item.DOI
            };
          })
        },
        {
          merges: [
            { begin: 2, end: 5 },
            { begin: 5, end: 7 },
            { begin: 7, end: 13 }
          ],
          row: { min: 179, max: 185, insert: 182 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `H`, property: `repository` },
            { column: `N`, property: `notes` }
          ],
          data: protocols[3].map(function (item) {
            return {
              reuse: item.reuse,
              issue: !!item.issues,
              name: item.name,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              repository: item.DOI
            };
          })
        }
      ]
    },
    // lab materials
    {
      row: { min: 122, max: 122, insert: 122 },
      cells: [],
      data: [
        {
          merges: [{ begin: 2, end: 5 }],
          row: { min: 123, max: 130, insert: 128 },
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
          data: materials[0].map(function (item) {
            return {
              reuse: item.reuse,
              issue: !!item.issues,
              name: item.name,
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
          merges: [{ begin: 2, end: 5 }],
          row: { min: 131, max: 138, insert: 136 },
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
          data: materials[1].map(function (item) {
            return {
              reuse: item.reuse,
              issue: !!item.issues,
              name: item.name,
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
          merges: [{ begin: 2, end: 5 }],
          row: { min: 139, max: 146, insert: 144 },
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
          data: materials[2].map(function (item) {
            return {
              reuse: item.reuse,
              issue: !!item.issues,
              name: item.name,
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
          merges: [{ begin: 2, end: 5 }],
          row: { min: 147, max: 153, insert: 150 },
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
          data: materials[3].concat(materials[4]).map(function (item) {
            return {
              reuse: item.reuse,
              issue: !!item.issues,
              name: item.name,
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
      row: { min: 90, max: 90, insert: 90 },
      cells: [],
      data: [
        {
          merges: [
            { begin: 2, end: 4 },
            { begin: 7, end: 9 },
            { begin: 9, end: 11 }
          ],
          row: { min: 91, max: 98, insert: 96 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `version` },
            { column: `E`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `H`, property: `URL` },
            { column: `J`, property: `RRID` },
            { column: `L`, property: `suggestedEntity` },
            { column: `M`, property: `suggestedRRID` },
            { column: `N`, property: `suggestedURL` }
          ],
          data: softwares[0].map(function (item) {
            return {
              reuse: item.reuse,
              version: item.version,
              issue: !!item.issues,
              name: item.name,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              URL: item.DOI,
              RRID: item.RRID,
              suggestedEntity: item.suggestedEntity,
              suggestedRRID: item.suggestedRRID,
              suggestedURL: item.suggestedURL
            };
          })
        },
        {
          merges: [
            { begin: 2, end: 4 },
            { begin: 7, end: 9 },
            { begin: 9, end: 11 }
          ],
          row: { min: 99, max: 106, insert: 104 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `version` },
            { column: `E`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `H`, property: `URL` },
            { column: `J`, property: `RRID` },
            { column: `L`, property: `suggestedEntity` },
            { column: `M`, property: `suggestedRRID` },
            { column: `N`, property: `suggestedURL` }
          ],
          data: softwares[1].map(function (item) {
            return {
              reuse: item.reuse,
              version: item.version,
              issue: !!item.issues,
              name: item.name,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              URL: item.DOI,
              RRID: item.RRID,
              suggestedEntity: item.suggestedEntity,
              suggestedRRID: item.suggestedRRID,
              suggestedURL: item.suggestedURL
            };
          })
        },
        {
          merges: [
            { begin: 2, end: 4 },
            { begin: 7, end: 9 },
            { begin: 9, end: 11 }
          ],
          row: { min: 107, max: 114, insert: 112 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `version` },
            { column: `E`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `H`, property: `URL` },
            { column: `J`, property: `RRID` },
            { column: `L`, property: `suggestedEntity` },
            { column: `M`, property: `suggestedRRID` },
            { column: `N`, property: `suggestedURL` }
          ],
          data: softwares[2].map(function (item) {
            return {
              reuse: item.reuse,
              version: item.version,
              issue: !!item.issues,
              name: item.name,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              URL: item.DOI,
              RRID: item.RRID,
              suggestedEntity: item.suggestedEntity,
              suggestedRRID: item.suggestedRRID,
              suggestedURL: item.suggestedURL
            };
          })
        },
        {
          merges: [
            { begin: 2, end: 4 },
            { begin: 7, end: 9 },
            { begin: 9, end: 11 }
          ],
          row: { min: 115, max: 121, insert: 118 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `version` },
            { column: `E`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `H`, property: `URL` },
            { column: `J`, property: `RRID` },
            { column: `L`, property: `suggestedEntity` },
            { column: `M`, property: `suggestedRRID` },
            { column: `N`, property: `suggestedURL` }
          ],
          data: softwares[3].concat(softwares[4]).map(function (item) {
            return {
              reuse: item.reuse,
              version: item.version,
              issue: !!item.issues,
              name: item.name,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              URL: item.DOI,
              RRID: item.RRID,
              suggestedEntity: item.suggestedEntity,
              suggestedRRID: item.suggestedRRID,
              suggestedURL: item.suggestedURL
            };
          })
        }
      ]
    },
    // code
    {
      row: { min: 66, max: 66, insert: 66 },
      cells: [],
      data: [
        {
          merges: [
            { begin: 1, end: 5 },
            { begin: 7, end: 9 },
            { begin: 9, end: 13 }
          ],
          row: { min: 67, max: 74, insert: 72 },
          cells: [
            { column: `B`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `H`, property: `DOI` },
            { column: `J`, property: `URL` },
            { column: `N`, property: `notes` }
          ],
          data: codes[0].map(function (item) {
            return {
              reuse: item.reuse,
              issue: !!item.issues,
              name: item.name,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              DOI: item.DOI,
              URL: item.comments
            };
          })
        },
        {
          merges: [
            { begin: 1, end: 5 },
            { begin: 7, end: 9 },
            { begin: 9, end: 13 }
          ],
          row: { min: 75, max: 82, insert: 80 },
          cells: [
            { column: `B`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `H`, property: `DOI` },
            { column: `J`, property: `URL` },
            { column: `N`, property: `notes` }
          ],
          data: codes[1].map(function (item) {
            return {
              reuse: item.reuse,
              issue: !!item.issues,
              name: item.name,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              DOI: item.DOI,
              URL: item.comments
            };
          })
        },
        {
          merges: [
            { begin: 1, end: 5 },
            { begin: 7, end: 9 },
            { begin: 9, end: 13 }
          ],
          row: { min: 83, max: 89, insert: 86 },
          cells: [
            { column: `B`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `H`, property: `DOI` },
            { column: `J`, property: `URL` },
            { column: `N`, property: `notes` }
          ],
          data: codes[2].map(function (item) {
            return {
              reuse: item.reuse,
              issue: !!item.issues,
              name: item.name,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              DOI: item.DOI,
              URL: item.comments
            };
          })
        }
      ]
    },
    // datasets
    {
      row: { min: 18, max: 18, insert: 18 },
      cells: [],
      data: [
        {
          merges: [
            { begin: 6, end: 9 },
            { begin: 11, end: 13 }
          ],
          row: { min: 19, max: 26, insert: 24 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `qc` },
            { column: `D`, property: `representativeImage` },
            { column: `E`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `J`, property: `repository` },
            { column: `K`, property: `uniqueIdentifier` },
            { column: `L`, property: `datatype` },
            { column: `N`, property: `notes` }
          ],
          data: datasets[0].map(function (item) {
            return {
              reuse: item.reuse,
              qc: item.qc,
              representativeImage: item.representativeImage,
              issue: !!item.issues,
              name: item.name,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              repository: item.DOI,
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
            { begin: 6, end: 9 },
            { begin: 11, end: 13 }
          ],
          row: { min: 27, max: 34, insert: 32 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `qc` },
            { column: `D`, property: `representativeImage` },
            { column: `E`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `J`, property: `repository` },
            { column: `K`, property: `uniqueIdentifier` },
            { column: `L`, property: `datatype` },
            { column: `N`, property: `notes` }
          ],
          data: datasets[1].map(function (item) {
            return {
              reuse: item.reuse,
              qc: item.qc,
              representativeImage: item.representativeImage,
              issue: !!item.issues,
              name: item.name,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              repository: item.DOI,
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
            { begin: 6, end: 9 },
            { begin: 11, end: 13 }
          ],
          row: { min: 35, max: 42, insert: 40 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `qc` },
            { column: `D`, property: `representativeImage` },
            { column: `E`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `J`, property: `repository` },
            { column: `K`, property: `uniqueIdentifier` },
            { column: `L`, property: `datatype` },
            { column: `N`, property: `notes` }
          ],
          data: datasets[2].map(function (item) {
            return {
              reuse: item.reuse,
              qc: item.qc,
              representativeImage: item.representativeImage,
              issue: !!item.issues,
              name: item.name,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              repository: item.DOI,
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
            { begin: 6, end: 9 },
            { begin: 11, end: 13 }
          ],
          row: { min: 43, max: 48, insert: 46 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `qc` },
            { column: `D`, property: `representativeImage` },
            { column: `E`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `J`, property: `repository` },
            { column: `K`, property: `uniqueIdentifier` },
            { column: `L`, property: `datatype` },
            { column: `N`, property: `notes` }
          ],
          data: datasets[3].map(function (item) {
            return {
              reuse: item.reuse,
              qc: item.qc,
              representativeImage: item.representativeImage,
              issue: !!item.issues,
              name: item.name,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              repository: item.DOI,
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
            { begin: 6, end: 9 },
            { begin: 11, end: 13 }
          ],
          row: { min: 49, max: 56, insert: 54 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `qc` },
            { column: `D`, property: `representativeImage` },
            { column: `E`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `J`, property: `repository` },
            { column: `K`, property: `uniqueIdentifier` },
            { column: `L`, property: `datatype` },
            { column: `N`, property: `notes` }
          ],
          data: datasets[4].map(function (item) {
            return {
              reuse: item.reuse,
              qc: item.qc,
              representativeImage: item.representativeImage,
              issue: !!item.issues,
              name: item.name,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              repository: item.DOI,
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
            { begin: 6, end: 9 },
            { begin: 11, end: 13 }
          ],
          row: { min: 57, max: 65, insert: 62 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `qc` },
            { column: `D`, property: `representativeImage` },
            { column: `E`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `J`, property: `repository` },
            { column: `K`, property: `uniqueIdentifier` },
            { column: `L`, property: `datatype` },
            { column: `N`, property: `notes` }
          ],
          data: datasets[5].map(function (item) {
            return {
              reuse: item.reuse,
              qc: item.qc,
              representativeImage: item.representativeImage,
              issue: !!item.issues,
              name: item.name,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              repository: item.DOI,
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
      let actions = [
        // Insert rows
        function (n) {
          let requests = [];
          let noData = true;
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
            // if there is data in this bulk of data
            noData = noData && batch.data[i].data.length === 0;
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
                  14
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
              }, 500);
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
              }, 500);
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
  let actions = [
    // Insert rows
    function (next) {
      let requests = [
        // Lab Materials
        Self.buildRequestInsertRows(sheetId, 190, 191 + authors.length - 1, true),
        Self.buildRequestMergeCells(sheetId, 190, 191 + authors.length - 1, 2, 6),
        Self.buildRequestMergeCells(sheetId, 190, 191 + authors.length - 1, 6, 9),
        Self.buildRequestMergeCells(sheetId, 190, 191 + authors.length - 1, 9, 12),
        Self.buildRequestUpdateBorders(sheetId, 190, 191 + authors.length - 1, 2, 12)
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
      let offset = 190;
      for (let i = 0; i < authors.length; i++) {
        let rowIndex = 190 + i;
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
        data.push(Self.buildRequestUpdateCell(`'Detailed Report'!C${rowIndex}`, [authors[i].name]));
        data.push(Self.buildRequestUpdateCell(`'Detailed Report'!G${rowIndex}`, [orcidsFromTEI]));
        data.push(
          Self.buildRequestUpdateCell(`'Detailed Report'!J${rowIndex}`, [
            `=SIERREUR(RECHERCHEV($A${190 + i},Authors!$A$2:$I,9,FALSE), "Not found")`
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
        Self.buildRequestUpdateCell(`'Detailed Report'!F2`, [articleTitle]),
        Self.buildRequestUpdateCell(`'Detailed Report'!F3`, [authorsNames]),
        Self.buildRequestUpdateCell(`'Detailed Report'!F4`, [
          `=LIEN_HYPERTEXTE("${dataSeerLink.url}";"${dataSeerLink.label}")`
        ]),
        Self.buildRequestUpdateCell(`'Detailed Report'!F5`, [
          `=DATE(${date.getFullYear()};${date.getMonth() + 1};${date.getDate()})`
        ])
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
  let doc = _.get(data, `doc`, {});
  let metadata = _.get(data, `metadata`, {});
  let protocols = _.get(data, `protocols`, {});
  let codes = _.get(data, `codes`, {});
  let softwares = _.get(data, `softwares`, {});
  let reagents = _.get(data, `reagents`, {});
  let datasets = _.get(data, `datasets`, {});
  let summary = _.get(data, `summary`, {});
  let dataTypesInfos = _.get(data, `dataTypesInfos`, {});
  let filteredDatasets = [
    // Deposit to appropriate repository and cite PID in text
    datasets.filter(function (item) {
      return !item.reuse && !item.DOI && !item.qc && !item.representativeImage && !item.issues;
    }),
    // Cite dataset unique identifier in text
    datasets.filter(function (item) {
      return item.reuse && !item.DOI && !item.qc && !item.representativeImage && !item.issues;
    }),
    // Verify dataset citation
    datasets.filter(function (item) {
      return item.issues;
    }),
    // Done - Cited correctly
    datasets.filter(function (item) {
      return (
        (item.DOI && !item.qc && !item.issues) ||
        (item.DOI && item.representativeImage && !item.issues) ||
        (item.DOI && item.reuse && !item.issues)
      );
    }),
    // Not required, but recommended to include the representative image/video files in raw format with dataset upload.
    datasets.filter(function (item) {
      return item.representativeImage;
    }),
    // Confirmatory and Quality Control datasets are not required to be included in your dataset upload.
    datasets.filter(function (item) {
      return item.qc;
    })
  ];
  let filteredCodes = [
    // Upload code to Zenodo and provide DOI
    codes.filter(function (item) {
      return !item.reuse && !item.issues && (!item.DOI || item.DOI.indexOf(`https://github.com/`) > -1);
    }),
    // Verify citation
    codes.filter(function (item) {
      return !item.reuse && item.issues;
    }),
    // Done - Cited correctly
    codes.filter(function (item) {
      return !item.reuse && !item.issues && item.DOI && item.DOI.indexOf(`https://github.com/`) === -1;
    })
  ];
  let filteredSoftwares = [
    // Register tool to get missing information
    softwares.filter(function (item) {
      return !item.reuse && !item.RRID && !item.issues;
    }),
    // Include missing information in citation
    softwares.filter(function (item) {
      return (
        (item.reuse && !item.RRID && !item.DOI && !item.issues) ||
        (item.reuse && !item.RRID && !item.qc && !item.issues)
      );
    }),
    // Verify citation
    softwares.filter(function (item) {
      return item.issues;
    }),
    // Done - Cited correctly
    softwares.filter(function (item) {
      return item.RRID && item.version && !item.issues && item.DOI;
    }),
    // None - Citation meets minimum standards
    softwares.filter(function (item) {
      return (
        (item.RRID && !item.version && !item.issues) ||
        (item.RRID && !item.issues && !item.DOI) ||
        (item.reuse && !item.RRID && item.version && !item.issues && (item.DOI || item.suggestedEntity))
      );
    })
  ];
  let filteredMaterials = [
    // Assign RRID and cite in text
    reagents.filter(function (item) {
      return !item.reuse && !item.RRID && !item.issues;
    }),
    // Check for an existing RRID
    reagents.filter(function (item) {
      return item.reuse && !item.RRID && !item.issues;
    }),
    // Verify citation
    reagents.filter(function (item) {
      return item.issues;
    }),
    // Done - Cited correctly
    reagents.filter(function (item) {
      return (item.RRID && !item.issues) || (item.RRID && item.catalogNumber);
    }),
    // None - Citation meets minimum standards
    reagents.filter(function (item) {
      return !item.RRID && item.catalogNumber && !item.issues && (item.suggestedEntity || item.source);
    })
  ];
  let filteredProtocols = [
    // Deposit in repository and cite DOI in text
    protocols.filter(function (item) {
      return !item.reuse && !item.issues && !item.DOI;
    }),
    // Include missing information in citation
    protocols.filter(function (item) {
      return item.reuse && !item.issues && (item.DOI === `` || !Params.isURL(item.DOI));
    }),
    // Verify citation
    protocols.filter(function (item) {
      return item.issues;
    }),
    // Done - Cited correctly
    protocols.filter(function (item) {
      return !item.issues && (item.DOI === `Manufacturer's Instructions` || Params.isURL(item.DOI));
    })
  ];
  let filteredDataObject = {
    datasets: {
      filtered: filteredDatasets,
      identified: filteredDatasets.slice(0, 4).flat(),
      shared: filteredDatasets[3]
    },
    codes: {
      filtered: filteredCodes,
      identified: filteredCodes.flat(),
      shared: filteredCodes.slice(2).flat()
    },
    softwares: {
      filtered: filteredSoftwares,
      identified: filteredSoftwares.flat(),
      shared: filteredSoftwares.slice(3).flat()
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
    let detailedReportSheetId = Self.getSheetId(sheets, `Detailed Report`);
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
              dataTypesInfos: dataTypesInfos,
              articleTitle: metadata.articleTitle,
              doi: metadata.doi,
              authors: metadata.authors,
              dataSeerLink: metadata.dataSeerLink,
              protocols: {
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
                code: {
                  identified: filteredDataObject.codes.identified.length,
                  shared: filteredDataObject.codes.shared.length
                },
                software: {
                  identified: filteredDataObject.softwares.identified.length,
                  shared: filteredDataObject.softwares.shared.length
                }
              },
              materials: {
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
      // fill 'Authors and Affiliations'
      function (next) {
        if (authorsAndAffiliationSheetId instanceof Error) return next(authorsAndAffiliationSheetId);
        return Self.fillAuthorsAndAffiliationASAPSheet(
          {
            spreadsheetId: spreadsheetId,
            sheetId: authorsAndAffiliationSheetId,
            data: {
              authors: metadata.authors
            }
          },
          function (err, res) {
            return next(err);
          }
        );
      },
      // fill 'Detailed Report'
      function (next) {
        if (detailedReportSheetId instanceof Error) return next(detailedReportSheetId);
        return Self.fillDetailedReportASAPSheet(
          {
            spreadsheetId: spreadsheetId,
            sheetId: detailedReportSheetId,
            data: {
              dataTypesInfos: dataTypesInfos,
              summary: summary,
              datasets: filteredDataObject.datasets.filtered,
              codes: filteredDataObject.codes.filtered,
              softwares: filteredDataObject.softwares.filtered,
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
 * @param {object} opts.sheetId - sheetId
 * @param {object} opts.data - Data available
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR undefined)
 * @returns {undefined} undefined
 */
Self.fillDetailedReportASAPSheet = function (opts = {}, cb) {
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
  let codes = _.get(data, `codes`, []);
  let softwares = _.get(data, `softwares`, []);
  let materials = _.get(data, `materials`, []);
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
  let batches = [
    // protocols
    {
      row: { min: 156, max: 156, insert: 156 },
      cells: [],
      data: [
        {
          merges: [
            { begin: 2, end: 5 },
            { begin: 5, end: 7 },
            { begin: 7, end: 13 }
          ],
          row: { min: 157, max: 164, insert: 162 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `H`, property: `repository` },
            { column: `N`, property: `notes` }
          ],
          data: protocols[0].map(function (item) {
            return {
              reuse: item.reuse,
              issue: !!item.issues,
              name: item.name,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              repository: item.DOI
            };
          })
        },
        {
          merges: [
            { begin: 2, end: 5 },
            { begin: 5, end: 7 },
            { begin: 7, end: 13 }
          ],
          row: { min: 165, max: 172, insert: 170 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `H`, property: `repository` },
            { column: `N`, property: `notes` }
          ],
          data: protocols[1].map(function (item) {
            return {
              reuse: item.reuse,
              issue: !!item.issues,
              name: item.name,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              repository: item.DOI
            };
          })
        },
        {
          merges: [
            { begin: 2, end: 5 },
            { begin: 5, end: 7 },
            { begin: 7, end: 13 }
          ],
          row: { min: 173, max: 180, insert: 178 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `H`, property: `repository` },
            { column: `N`, property: `notes` }
          ],
          data: protocols[2].map(function (item) {
            return {
              reuse: item.reuse,
              issue: !!item.issues,
              name: item.name,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              repository: item.DOI
            };
          })
        },
        {
          merges: [
            { begin: 2, end: 5 },
            { begin: 5, end: 7 },
            { begin: 7, end: 13 }
          ],
          row: { min: 181, max: 186, insert: 184 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `H`, property: `repository` },
            { column: `N`, property: `notes` }
          ],
          data: protocols[3].map(function (item) {
            return {
              reuse: item.reuse,
              issue: !!item.issues,
              name: item.name,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              repository: item.DOI
            };
          })
        }
      ]
    },
    // lab materials
    {
      row: { min: 116, max: 116, insert: 116 },
      cells: [],
      data: [
        {
          merges: [{ begin: 2, end: 5 }],
          row: { min: 117, max: 124, insert: 122 },
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
          data: materials[0].map(function (item) {
            return {
              reuse: item.reuse,
              issue: !!item.issues,
              name: item.name,
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
          merges: [{ begin: 2, end: 5 }],
          row: { min: 125, max: 132, insert: 130 },
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
          data: materials[1].map(function (item) {
            return {
              reuse: item.reuse,
              issue: !!item.issues,
              name: item.name,
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
          merges: [{ begin: 2, end: 5 }],
          row: { min: 133, max: 140, insert: 138 },
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
          data: materials[2].map(function (item) {
            return {
              reuse: item.reuse,
              issue: !!item.issues,
              name: item.name,
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
          merges: [{ begin: 2, end: 5 }],
          row: { min: 141, max: 146, insert: 144 },
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
          data: materials[3].map(function (item) {
            return {
              reuse: item.reuse,
              issue: !!item.issues,
              name: item.name,
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
          merges: [{ begin: 2, end: 5 }],
          row: { min: 147, max: 155, insert: 152 },
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
          data: materials[4].map(function (item) {
            return {
              reuse: item.reuse,
              issue: !!item.issues,
              name: item.name,
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
      row: { min: 76, max: 76, insert: 76 },
      cells: [],
      data: [
        {
          merges: [
            { begin: 2, end: 4 },
            { begin: 7, end: 9 },
            { begin: 9, end: 11 }
          ],
          row: { min: 77, max: 84, insert: 82 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `version` },
            { column: `E`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `H`, property: `URL` },
            { column: `J`, property: `RRID` },
            { column: `L`, property: `suggestedEntity` },
            { column: `M`, property: `suggestedRRID` },
            { column: `N`, property: `suggestedURL` }
          ],
          data: softwares[0].map(function (item) {
            return {
              reuse: item.reuse,
              version: item.version,
              issue: !!item.issues,
              name: item.name,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              URL: item.DOI,
              RRID: item.RRID,
              suggestedEntity: item.suggestedEntity,
              suggestedRRID: item.suggestedRRID,
              suggestedURL: item.suggestedURL
            };
          })
        },
        {
          merges: [
            { begin: 2, end: 4 },
            { begin: 7, end: 9 },
            { begin: 9, end: 11 }
          ],
          row: { min: 85, max: 92, insert: 90 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `version` },
            { column: `E`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `H`, property: `URL` },
            { column: `J`, property: `RRID` },
            { column: `L`, property: `suggestedEntity` },
            { column: `M`, property: `suggestedRRID` },
            { column: `N`, property: `suggestedURL` }
          ],
          data: softwares[1].map(function (item) {
            return {
              reuse: item.reuse,
              version: item.version,
              issue: !!item.issues,
              name: item.name,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              URL: item.DOI,
              RRID: item.RRID,
              suggestedEntity: item.suggestedEntity,
              suggestedRRID: item.suggestedRRID,
              suggestedURL: item.suggestedURL
            };
          })
        },
        {
          merges: [
            { begin: 2, end: 4 },
            { begin: 7, end: 9 },
            { begin: 9, end: 11 }
          ],
          row: { min: 93, max: 100, insert: 98 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `version` },
            { column: `E`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `H`, property: `URL` },
            { column: `J`, property: `RRID` },
            { column: `L`, property: `suggestedEntity` },
            { column: `M`, property: `suggestedRRID` },
            { column: `N`, property: `suggestedURL` }
          ],
          data: softwares[2].map(function (item) {
            return {
              reuse: item.reuse,
              version: item.version,
              issue: !!item.issues,
              name: item.name,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              URL: item.DOI,
              RRID: item.RRID,
              suggestedEntity: item.suggestedEntity,
              suggestedRRID: item.suggestedRRID,
              suggestedURL: item.suggestedURL
            };
          })
        },
        {
          merges: [
            { begin: 2, end: 4 },
            { begin: 7, end: 9 },
            { begin: 9, end: 11 }
          ],
          row: { min: 101, max: 106, insert: 104 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `version` },
            { column: `E`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `H`, property: `URL` },
            { column: `J`, property: `RRID` },
            { column: `L`, property: `suggestedEntity` },
            { column: `M`, property: `suggestedRRID` },
            { column: `N`, property: `suggestedURL` }
          ],
          data: softwares[3].map(function (item) {
            return {
              reuse: item.reuse,
              version: item.version,
              issue: !!item.issues,
              name: item.name,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              URL: item.DOI,
              RRID: item.RRID,
              suggestedEntity: item.suggestedEntity,
              suggestedRRID: item.suggestedRRID,
              suggestedURL: item.suggestedURL
            };
          })
        },
        {
          merges: [
            { begin: 2, end: 4 },
            { begin: 7, end: 9 },
            { begin: 9, end: 11 }
          ],
          row: { min: 107, max: 115, insert: 112 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `version` },
            { column: `E`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `H`, property: `URL` },
            { column: `J`, property: `RRID` },
            { column: `L`, property: `suggestedEntity` },
            { column: `M`, property: `suggestedRRID` },
            { column: `N`, property: `suggestedURL` }
          ],
          data: softwares[4].map(function (item) {
            return {
              reuse: item.reuse,
              version: item.version,
              issue: !!item.issues,
              name: item.name,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              URL: item.DOI,
              RRID: item.RRID,
              suggestedEntity: item.suggestedEntity,
              suggestedRRID: item.suggestedRRID,
              suggestedURL: item.suggestedURL
            };
          })
        }
      ]
    },
    // code
    {
      row: { min: 52, max: 52, insert: 52 },
      cells: [],
      data: [
        {
          merges: [
            { begin: 1, end: 5 },
            { begin: 7, end: 9 },
            { begin: 9, end: 13 }
          ],
          row: { min: 53, max: 60, insert: 58 },
          cells: [
            { column: `B`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `H`, property: `DOI` },
            { column: `J`, property: `URL` },
            { column: `N`, property: `notes` }
          ],
          data: codes[0].map(function (item) {
            return {
              reuse: item.reuse,
              issue: !!item.issues,
              name: item.name,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              DOI: item.DOI,
              URL: item.comments
            };
          })
        },
        {
          merges: [
            { begin: 1, end: 5 },
            { begin: 7, end: 9 },
            { begin: 9, end: 13 }
          ],
          row: { min: 61, max: 68, insert: 66 },
          cells: [
            { column: `B`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `H`, property: `DOI` },
            { column: `J`, property: `URL` },
            { column: `N`, property: `notes` }
          ],
          data: codes[1].map(function (item) {
            return {
              reuse: item.reuse,
              issue: !!item.issues,
              name: item.name,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              DOI: item.DOI,
              URL: item.comments
            };
          })
        },
        {
          merges: [
            { begin: 1, end: 5 },
            { begin: 7, end: 9 },
            { begin: 9, end: 13 }
          ],
          row: { min: 69, max: 75, insert: 72 },
          cells: [
            { column: `B`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `H`, property: `DOI` },
            { column: `J`, property: `URL` },
            { column: `N`, property: `notes` }
          ],
          data: codes[2].map(function (item) {
            return {
              reuse: item.reuse,
              issue: !!item.issues,
              name: item.name,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              DOI: item.DOI,
              URL: item.comments
            };
          })
        }
      ]
    },
    // datasets
    {
      row: { min: 3, max: 3, insert: 3 },
      cells: [],
      data: [
        {
          merges: [
            { begin: 6, end: 9 },
            { begin: 11, end: 13 }
          ],
          row: { min: 5, max: 12, insert: 10 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `qc` },
            { column: `D`, property: `representativeImage` },
            { column: `E`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `J`, property: `repository` },
            { column: `K`, property: `uniqueIdentifier` },
            { column: `L`, property: `datatype` },
            { column: `N`, property: `notes` }
          ],
          data: datasets[0].map(function (item) {
            return {
              reuse: item.reuse,
              qc: item.qc,
              representativeImage: item.representativeImage,
              issue: !!item.issues,
              name: item.name,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              repository: item.DOI,
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
            { begin: 6, end: 9 },
            { begin: 11, end: 13 }
          ],
          row: { min: 13, max: 20, insert: 18 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `qc` },
            { column: `D`, property: `representativeImage` },
            { column: `E`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `J`, property: `repository` },
            { column: `K`, property: `uniqueIdentifier` },
            { column: `L`, property: `datatype` },
            { column: `N`, property: `notes` }
          ],
          data: datasets[1].map(function (item) {
            return {
              reuse: item.reuse,
              qc: item.qc,
              representativeImage: item.representativeImage,
              issue: !!item.issues,
              name: item.name,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              repository: item.DOI,
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
            { begin: 6, end: 9 },
            { begin: 11, end: 13 }
          ],
          row: { min: 21, max: 28, insert: 26 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `qc` },
            { column: `D`, property: `representativeImage` },
            { column: `E`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `J`, property: `repository` },
            { column: `K`, property: `uniqueIdentifier` },
            { column: `L`, property: `datatype` },
            { column: `N`, property: `notes` }
          ],
          data: datasets[2].map(function (item) {
            return {
              reuse: item.reuse,
              qc: item.qc,
              representativeImage: item.representativeImage,
              issue: !!item.issues,
              name: item.name,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              repository: item.DOI,
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
            { begin: 6, end: 9 },
            { begin: 11, end: 13 }
          ],
          row: { min: 29, max: 34, insert: 32 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `qc` },
            { column: `D`, property: `representativeImage` },
            { column: `E`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `J`, property: `repository` },
            { column: `K`, property: `uniqueIdentifier` },
            { column: `L`, property: `datatype` },
            { column: `N`, property: `notes` }
          ],
          data: datasets[3].map(function (item) {
            return {
              reuse: item.reuse,
              qc: item.qc,
              representativeImage: item.representativeImage,
              issue: !!item.issues,
              name: item.name,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              repository: item.DOI,
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
            { begin: 6, end: 9 },
            { begin: 11, end: 13 }
          ],
          row: { min: 35, max: 42, insert: 40 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `qc` },
            { column: `D`, property: `representativeImage` },
            { column: `E`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `J`, property: `repository` },
            { column: `K`, property: `uniqueIdentifier` },
            { column: `L`, property: `datatype` },
            { column: `N`, property: `notes` }
          ],
          data: datasets[4].map(function (item) {
            return {
              reuse: item.reuse,
              qc: item.qc,
              representativeImage: item.representativeImage,
              issue: !!item.issues,
              name: item.name,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              repository: item.DOI,
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
            { begin: 6, end: 9 },
            { begin: 11, end: 13 }
          ],
          row: { min: 43, max: 51, insert: 48 },
          cells: [
            { column: `B`, property: `reuse` },
            { column: `C`, property: `qc` },
            { column: `D`, property: `representativeImage` },
            { column: `E`, property: `issue` },
            { column: `F`, property: `name` },
            { column: `G`, property: `sentences` },
            { column: `J`, property: `repository` },
            { column: `K`, property: `uniqueIdentifier` },
            { column: `L`, property: `datatype` },
            { column: `N`, property: `notes` }
          ],
          data: datasets[5].map(function (item) {
            return {
              reuse: item.reuse,
              qc: item.qc,
              representativeImage: item.representativeImage,
              issue: !!item.issues,
              name: item.name,
              notes: item.comments,
              sentences: item.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `),
              repository: item.DOI,
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
      let actions = [
        // Insert rows
        function (n) {
          let requests = [];
          let noData = true;
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
            // if there is data in this bulk of data
            noData = noData && batch.data[i].data.length === 0;
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
                  14
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
              }, 500);
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
              }, 500);
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
  let authors = _.get(data, `authors`);
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
        data.push(Self.buildRequestUpdateCell(`'Authors and Affiliation'!B${rowIndex}`, [false]));
        data.push(Self.buildRequestUpdateCell(`'Authors and Affiliation'!C${rowIndex}`, [false]));
        data.push(Self.buildRequestUpdateCell(`'Authors and Affiliation'!D${rowIndex}`, [orcidsFromTEI]));
        data.push(
          Self.buildRequestUpdateCell(`'Authors and Affiliation'!E${rowIndex}`, [
            `=SI(C${10 + i},SIERREUR(RECHERCHEV($A${10 + i},Authors!$A$2:$I,9,FALSE), "Not found"), "")`
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
  let dataTypesInfos = _.get(data, `dataTypesInfos`, {});
  let dataTypes = Object.keys(dataTypesInfos.dataTypes);
  let articleTitle = _.get(data, `articleTitle`, {});
  let doi = _.get(data, `doi`, ``);
  let authors = _.get(data, `authors`, []);
  let documentId = _.get(data, `documentId`);
  let token = _.get(data, `token`);
  let dataSeerLink = _.get(data, `dataSeerLink`, {});
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
        Self.buildRequestUpdateCell(`'Summary Sheet'!B4`, [doi]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!B5`, [authorsNames]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!B9`, [
          `=LIEN_HYPERTEXTE("${dataSeerLink.url}";"${dataSeerLink.label}")`
        ]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!B10`, [
          `=DATE(${date.getFullYear()};${date.getMonth() + 1};${date.getDate()})`
        ]),
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
        Self.buildRequestUpdateCell(`'Summary Sheet'!C34`, [protocols.new.shared + protocols.reuse.shared])
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
Self.buildRequestCopyPaste = function (source = {}, destination = {}, pasteType = `PASTE_NORMAL`) {
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
  let _opts = { template: opts.template, folder: opts.folder, data: { name: opts.data.name } };
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
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR undefined)
 * @returns {undefined} undefined
 */
Self._createReportFile = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `folder`) === `undefined`) return cb(Error(`Missing required data: opts.folder`));
  if (typeof _.get(opts, `data.name`) === `undefined`) return cb(Error(`Missing required data: opts.data.name`));
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
