/*
 * @prettier
 */

'use strict';

const _ = require(`lodash`);
const async = require(`async`);
const path = require(`path`);
const { google } = require(`googleapis`);

const Url = require(`./url.js`);

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
    if (kind !== `ASAP` && kind !== `AmNat`)
      return cb(Error(`Invalid required data: opts.kind must be 'ASAP or 'AmNat'`));
    if (typeof _.get(conf, `folders.${kind}`) === `undefined`)
      return cb(Error(`Missing required data: conf.folders.${kind}`));
    folder = _.get(conf, `folders.${kind}`);
  }
  let pageToken = null;
  let ids = [];
  return async.doWhilst(
    function (callback) {
      let query = strict ? `name='${name}'` : `name contains '${name}'`;
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
  let kind = _.get(opts, `kind`);
  if (typeof kind === `undefined`) return cb(Error(`Missing required data: opts.kind`));
  if (kind !== `ASAP` && kind !== `AmNat`)
    return cb(Error(`Invalid required data: opts.kind must be 'ASAP or 'AmNat'`));
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
  let datasets = _.get(data, `datasets`, {});
  let summary = _.get(data, `summary`, {});
  let dataTypesInfos = _.get(data, `dataTypesInfos`, {});
  return Self.getSheets({ spreadsheetId: spreadsheetId }, function (err, sheets) {
    let complianceReportId = Self.getSheetId(sheets, `Compliance Report`);
    let actions = [
      // fill 'Compliance Report'
      function (next) {
        if (complianceReportId instanceof Error) return next(complianceReportId);
        return Self.fillComplianceReportAmNatSheet(
          {
            spreadsheetId: spreadsheetId,
            sheetId: complianceReportId,
            data: {
              dataTypesInfos: dataTypesInfos,
              articleTitle: metadata.articleTitle,
              doi: metadata.doi,
              authors: metadata.authors,
              dataSeerLink: metadata.dataSeerLink,
              summary: summary,
              metadata: metadata,
              datasets: datasets,
              codeAndSoftware: codes
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
  let articleTitle = _.get(data, `articleTitle`, {});
  let doi = _.get(data, `doi`, ``);
  let authors = _.get(data, `authors`, ``);
  let dataSeerLink = _.get(data, `dataSeerLink`, {});
  let summary = _.get(data, `summary`, {});
  let dataTypesInfos = _.get(data, `dataTypesInfos`, {});
  let dataTypes = Object.keys(dataTypesInfos.dataTypes);
  let codeAndSoftware = _.get(data, `codeAndSoftware`, []);
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
    codeAndSoftware: codeAndSoftware.map(function (item) {
      return {
        reuse: item.reuse,
        isValid: item.isValid,
        name: item.name,
        sentences: item.sentences
          .map(function (s) {
            return s.text;
          })
          .join(` `),
        repository: item.DOI,
        datatype: item.type.url ? `=LIEN_HYPERTEXTE("${item.type.url}";"${item.type.label}")` : item.type.label,
        comments: item.comments,
        notes: item.notes
      };
    })
  };
  let actions = [
    // Insert rows
    function (next) {
      let requests = [
        // Code & Software
        Self.buildRequestInsertRows(sheetId, 17, 18 + codeAndSoftware.length - 1, true),
        Self.buildRequestUpdateBorders(sheetId, 17, 18 + codeAndSoftware.length - 1, 0, 6)
      ];
      // Datasets
      let keys = Object.keys(sortedDatasets);
      for (let i = 0; i < keys.length; i++) {
        let key = keys[i];
        let infos = sortedDatasets[key];
        requests.push(Self.buildRequestInsertRows(sheetId, 13, 14, false));
        requests.push(Self.buildRequestInsertRows(sheetId, 13, 14, false));
        requests.push(Self.buildRequestInsertRows(sheetId, 13, 14, false));
        requests.push(Self.buildRequestInsertRows(sheetId, 13, 14, false));
        requests.push(Self.buildRequestInsertRows(sheetId, 13, 14, false));
        requests.push(
          Self.buildRequestCopyPaste(
            { sheetId: sheetId, startRowIndex: 9, endRowIndex: 13, startColumnIndex: 0, endColumnIndex: 6 },
            { sheetId: sheetId, startRowIndex: 14, endRowIndex: 18, startColumnIndex: 0, endColumnIndex: 6 }
          )
        );
        for (let j = 0; j < infos.list.length; j++) {
          requests.push(Self.buildRequestInsertRows(sheetId, 17, 18, true));
        }
        requests.push(Self.buildRequestUpdateBorders(sheetId, 17, 18 + infos.list.length - 1, 0, 6));
      }
      // Delete template rows for Datasets
      requests.push(Self.buildRequestDeleteRows(sheetId, 9, 14));
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
      let date = new Date();
      let data = [
        Self.buildRequestUpdateCell(`'Compliance Report'!D3`, [articleTitle]),
        Self.buildRequestUpdateCell(`'Compliance Report'!D4`, [dataSeerLink.label]),
        Self.buildRequestUpdateCell(`'Compliance Report'!D5`, [authors]),
        Self.buildRequestUpdateCell(`'Compliance Report'!D6`, [
          `=LIEN_HYPERTEXTE("${dataSeerLink.url}";"${dataSeerLink.label}")`
        ]),
        Self.buildRequestUpdateCell(`'Compliance Report'!D7`, [
          `=DATE(${date.getFullYear()};${date.getMonth() + 1};${date.getDate()})`
        ])
      ];
      let rowOffset = 12;
      // Datasets
      let keys = Object.keys(sortedDatasets);
      for (let i = keys.length - 1; i >= 0; i--) {
        let key = keys[i];
        let infos = sortedDatasets[key];
        data.push(Self.buildRequestUpdateCell(`'Compliance Report'!C${rowOffset - 2}`, [`Datasets - ${infos.name}`]));
        let begin = rowOffset + 0;
        for (let j = 0; j < infos.list.length; j++) {
          let dataset = infos.list[j];
          let rowIndex = rowOffset + j;
          data.push(Self.buildRequestUpdateCell(`'Compliance Report'!A${rowIndex}`, [j + 1]));
          data.push(Self.buildRequestUpdateCell(`'Compliance Report'!B${rowIndex}`, [dataset.reuse]));
          data.push(Self.buildRequestUpdateCell(`'Compliance Report'!C${rowIndex}`, [dataset.name]));
          data.push(
            Self.buildRequestUpdateCell(`'Compliance Report'!D${rowIndex}`, [
              dataset.sentences
                .map(function (s) {
                  return s.text;
                })
                .join(` `)
            ])
          );
          data.push(Self.buildRequestUpdateCell(`'Compliance Report'!E${rowIndex}`, [dataset.DOI]));
          data.push(Self.buildRequestUpdateCell(`'Compliance Report'!F${rowIndex}`, [dataset.notes]));
        }
        let end = rowOffset + infos.list.length;
        rowOffset = end + 5;
        // data.push(
        //   Self.buildRequestUpdateCell(`'Compliance Report'!A${rowOffset - 4}`, [`=NB.SI(A${begin}:A${end};">0")`])
        // );
      }
      // Code & Software
      for (let i = 0; i < batches.codeAndSoftware.length; i++) {
        let item = batches.codeAndSoftware[i];
        let rowIndex = rowOffset + i;
        data.push(Self.buildRequestUpdateCell(`'Compliance Report'!A${rowIndex}`, [i + 1]));
        data.push(Self.buildRequestUpdateCell(`'Compliance Report'!B${rowIndex}`, [item.reuse]));
        data.push(Self.buildRequestUpdateCell(`'Compliance Report'!C${rowIndex}`, [item.name]));
        data.push(Self.buildRequestUpdateCell(`'Compliance Report'!D${rowIndex}`, [item.sentences]));
        data.push(Self.buildRequestUpdateCell(`'Compliance Report'!E${rowIndex}`, [item.datatype]));
        data.push(Self.buildRequestUpdateCell(`'Compliance Report'!F${rowIndex}`, [item.notes]));
      }
      // data.push(
      //   Self.buildRequestUpdateCell(`'Compliance Report'!A${rowOffset + batches.codeAndSoftware.length + 1}`, [
      //     `=NB.SI(A${rowOffset}:A${rowOffset + batches.codeAndSoftware.length};">0")`
      //   ])
      // );
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
  let reagents = _.get(data, `reagents`, {});
  let datasets = _.get(data, `datasets`, {});
  let summary = _.get(data, `summary`, {});
  let dataTypesInfos = _.get(data, `dataTypesInfos`, {});
  let sortedDatasets = {
    protocols: {
      new: protocols.filter(function (item) {
        return !item.reuse;
      }),
      reuse: protocols.filter(function (item) {
        return item.reuse;
      })
    },
    datasets: {
      new: datasets.filter(function (item) {
        return !item.reuse;
      }),
      reuse: datasets.filter(function (item) {
        return item.reuse;
      })
    },
    codes: {
      new: codes.filter(function (item) {
        return !item.reuse;
      }),
      reuse: codes.filter(function (item) {
        return item.reuse;
      })
    },
    materials: {
      new: reagents.filter(function (item) {
        return !item.reuse;
      }),
      reuse: reagents.filter(function (item) {
        return item.reuse;
      })
    }
  };
  return Self.getSheets({ spreadsheetId: spreadsheetId }, function (err, sheets) {
    let summarySheetId = Self.getSheetId(sheets, `Summary Sheet`);
    let complianceReportId = Self.getSheetId(sheets, `Compliance Report`);
    let chartsId = Self.getSheetId(sheets, `Compliance Report`);
    let actions = [
      // fill 'Summary Sheet'
      function (next) {
        if (summarySheetId instanceof Error) return next(summarySheetId);
        return Self.fillSummaryASAPSheet(
          {
            spreadsheetId: spreadsheetId,
            sheetId: summarySheetId,
            data: {
              dataTypesInfos: dataTypesInfos,
              articleTitle: metadata.articleTitle,
              doi: metadata.doi,
              authors: metadata.authors,
              dataSeerLink: metadata.dataSeerLink,
              protocols: {
                new: sortedDatasets.protocols.new.length,
                reuse: sortedDatasets.protocols.reuse.length
              },
              codeAndSoftware: {
                new: sortedDatasets.codes.new.length,
                reuse: sortedDatasets.codes.reuse.length
              },
              materialsResources: {
                new: sortedDatasets.materials.new.length,
                reuse: sortedDatasets.materials.reuse.length
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
        return Self.fillComplianceReportASAPSheet(
          {
            spreadsheetId: spreadsheetId,
            sheetId: complianceReportId,
            data: {
              dataTypesInfos: dataTypesInfos,
              summary: summary,
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
      },
      // fill 'Charts'
      function (next) {
        if (chartsId instanceof Error) return next(chartsId);
        return Self.fillChartsASAPSheet(
          {
            spreadsheetId: spreadsheetId,
            sheetId: chartsId,
            data: {
              documentId: doc.id,
              token: doc.token,
              sortedDatasets: sortedDatasets
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
  let sortedDatasets = _.get(data, `sortedDatasets`);
  let ASAPPieImage = Url.build(`/api/documents/${documentId}/charts/asap`, {
    render: `jpeg`,
    token: token
  });
  let _data = [
    Self.buildRequestUpdateCell(`'Charts'!O4`, [`${ASAPPieImage}`]),
    Self.buildRequestUpdateCell(`'Charts'!C4`, [
      sortedDatasets.protocols.new.filter(function (item) {
        return item.isValid;
      }).length
    ]),
    Self.buildRequestUpdateCell(`'Charts'!D4`, [
      sortedDatasets.datasets.new.filter(function (item) {
        return item.isValid;
      }).length
    ]),
    Self.buildRequestUpdateCell(`'Charts'!E4`, [
      sortedDatasets.codes.new.filter(function (item) {
        return item.isValid;
      }).length
    ]),
    Self.buildRequestUpdateCell(`'Charts'!F4`, [
      sortedDatasets.materials.new.filter(function (item) {
        return item.isValid;
      }).length
    ]),
    Self.buildRequestUpdateCell(`'Charts'!C9`, [sortedDatasets.protocols.new.length]),
    Self.buildRequestUpdateCell(`'Charts'!D9`, [sortedDatasets.datasets.new.length]),
    Self.buildRequestUpdateCell(`'Charts'!E9`, [sortedDatasets.codes.new.length]),
    Self.buildRequestUpdateCell(`'Charts'!F9`, [sortedDatasets.materials.new.length]),
    Self.buildRequestUpdateCell(`'Charts'!C5`, [
      sortedDatasets.protocols.reuse.filter(function (item) {
        return item.isValid;
      }).length
    ]),
    Self.buildRequestUpdateCell(`'Charts'!D5`, [
      sortedDatasets.datasets.reuse.filter(function (item) {
        return item.isValid;
      }).length
    ]),
    Self.buildRequestUpdateCell(`'Charts'!E5`, [
      sortedDatasets.codes.reuse.filter(function (item) {
        return item.isValid;
      }).length
    ]),
    Self.buildRequestUpdateCell(`'Charts'!F5`, [
      sortedDatasets.materials.reuse.filter(function (item) {
        return item.isValid;
      }).length
    ]),
    Self.buildRequestUpdateCell(`'Charts'!C10`, [sortedDatasets.protocols.reuse.length]),
    Self.buildRequestUpdateCell(`'Charts'!D10`, [sortedDatasets.datasets.reuse.length]),
    Self.buildRequestUpdateCell(`'Charts'!E10`, [sortedDatasets.codes.reuse.length]),
    Self.buildRequestUpdateCell(`'Charts'!F10`, [sortedDatasets.materials.reuse.length])
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
  let authors = _.get(data, `authors`, ``);
  let dataSeerLink = _.get(data, `dataSeerLink`, {});
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
        Self.buildRequestInsertRows(sheetId, 28, 29 + reUseDatasets.length - 1, true),
        Self.buildRequestInsertRows(sheetId, 25, 26 + newDatasets.length - 1, true)
      ];
      for (let i = 0; i < batches.reUseDatasets.length; i++) {
        let dataset = batches.reUseDatasets[i];
        let index = 28 + batches.newDatasets.length + i;
        requests.push(Self.buildRequestUpdateBorders(sheetId, index, index + 1, 0, 3));
      }
      for (let i = 0; i < batches.newDatasets.length; i++) {
        let dataset = batches.newDatasets[i];
        let index = 25 + i;
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
        Self.buildRequestUpdateCell(`'Summary Sheet'!B2`, [articleTitle]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!B3`, [doi]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!B4`, [authors]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!B6`, [
          `=LIEN_HYPERTEXTE("${dataSeerLink.url}";"${dataSeerLink.label}")`
        ]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!B7`, [
          `=DATE(${date.getFullYear()};${date.getMonth() + 1};${date.getDate()})`
        ]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!B21`, [protocols.new]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!B22`, [protocols.reuse]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!B${31 + offset}`, [codeAndSoftware.new]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!B${32 + offset}`, [codeAndSoftware.reuse]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!B${35 + offset}`, [materialsResources.new]),
        Self.buildRequestUpdateCell(`'Summary Sheet'!B${36 + offset}`, [materialsResources.reuse])
      ];
      for (let i = 0; i < batches.reUseDatasets.length; i++) {
        let dataset = batches.reUseDatasets[i];
        let index = 28 + batches.newDatasets.length + i;
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
        let index = 25 + i;
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
 * This function will fill Compliance Report sheet with given data and return the file ID (google file ID)
 * @param {object} opts - Options available
 * @param {string} opts.spreadsheetId - spreadsheetId
 * @param {object} opts.sheetId - sheetId
 * @param {object} opts.data - Data available
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR undefined)
 * @returns {undefined} undefined
 */
Self.fillComplianceReportASAPSheet = function (opts = {}, cb) {
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
        isValid: item.isValid,
        sentences: item.sentences
          .map(function (s) {
            return s.text;
          })
          .join(` `),
        repository: item.DOI,
        comments: item.comments,
        notes: item.notes
      };
    }),
    codeAndSoftware: codeAndSoftware.map(function (item) {
      return {
        reuse: item.reuse,
        isValid: item.isValid,
        name: item.name,
        sentences: item.sentences
          .map(function (s) {
            return s.text;
          })
          .join(` `),
        repository: item.DOI,
        datatype: item.type.url ? `=LIEN_HYPERTEXTE("${item.type.url}";"${item.type.label}")` : item.type.label,
        comments: item.comments,
        notes: item.notes
      };
    }),
    labMaterials: labMaterials.map(function (item) {
      return {
        reuse: item.reuse,
        isValid: item.isValid,
        name: item.name,
        sentences: item.sentences
          .map(function (s) {
            return s.text;
          })
          .join(` `),
        repository: item.DOI,
        datatype: item.type.label,
        comments: item.comments,
        notes: item.notes
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
      requests.push(Self.buildRequestDeleteRows(sheetId, 13, 18));
      // Protocols
      requests.push(Self.buildRequestInsertRows(sheetId, 11, 12 + protocols.length - 1, true));
      requests.push(Self.buildRequestMergeCells(sheetId, 11, 12 + protocols.length - 1, 6, 8));
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
        data.push(Self.buildRequestUpdateCell(`'Compliance Report'!C${rowIndex}`, [protocol.isValid ? `No` : `Yes`]));
        data.push(Self.buildRequestUpdateCell(`'Compliance Report'!E${rowIndex}`, [protocol.sentences]));
        data.push(
          Self.buildRequestUpdateCell(`'Compliance Report'!F${rowIndex}`, [
            protocol.repository ? protocol.repository : protocol.comments
          ])
        );
        data.push(Self.buildRequestUpdateCell(`'Compliance Report'!G${rowIndex}`, [protocol.notes]));
      }
      // data.push(
      //   Self.buildRequestUpdateCell(`'Compliance Report'!A${rowOffset + batches.protocols.length + 1}`, [
      //     `=NB.SI(A${rowOffset}:A${rowOffset + batches.protocols.length};">0")`
      //   ])
      // );
      data.push(
        Self.buildRequestUpdateCell(`'Compliance Report'!B${rowOffset + batches.protocols.length + 1}`, [
          `=NB.SI(B${rowOffset}:B${rowOffset + batches.protocols.length};VRAI)`
        ])
      );
      rowOffset = rowOffset + batches.protocols.length + 5;
      // Datasets
      let keys = Object.keys(sortedDatasets);
      for (let i = keys.length - 1; i >= 0; i--) {
        let key = keys[i];
        let infos = sortedDatasets[key];
        data.push(Self.buildRequestUpdateCell(`'Compliance Report'!C${rowOffset - 2}`, [`Datasets - ${infos.name}`]));
        let begin = rowOffset + 0;
        for (let j = 0; j < infos.list.length; j++) {
          let dataset = infos.list[j];
          let rowIndex = rowOffset + j;
          data.push(Self.buildRequestUpdateCell(`'Compliance Report'!A${rowIndex}`, [j + 1]));
          data.push(Self.buildRequestUpdateCell(`'Compliance Report'!B${rowIndex}`, [dataset.reuse]));
          data.push(Self.buildRequestUpdateCell(`'Compliance Report'!C${rowIndex}`, [dataset.isValid ? `No` : `Yes`]));
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
            Self.buildRequestUpdateCell(`'Compliance Report'!G${rowIndex}`, [
              dataset.type.url ? `=LIEN_HYPERTEXTE("${dataset.type.url}";"${dataset.type.label}")` : dataset.type.label
            ])
          );
          data.push(
            Self.buildRequestUpdateCell(`'Compliance Report'!H${rowIndex}`, [
              dataset.DOI ? dataset.DOI : dataset.comments
            ])
          );
          data.push(Self.buildRequestUpdateCell(`'Compliance Report'!I${rowIndex}`, [dataset.notes]));
        }
        let end = rowOffset + infos.list.length;
        rowOffset = end + 5;
        // data.push(
        //   Self.buildRequestUpdateCell(`'Compliance Report'!A${rowOffset - 4}`, [`=NB.SI(A${begin}:A${end};">0")`])
        // );
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
        data.push(Self.buildRequestUpdateCell(`'Compliance Report'!C${rowIndex}`, [item.isValid ? `No` : `Yes`]));
        data.push(Self.buildRequestUpdateCell(`'Compliance Report'!E${rowIndex}`, [item.name]));
        data.push(Self.buildRequestUpdateCell(`'Compliance Report'!F${rowIndex}`, [item.sentences]));
        data.push(Self.buildRequestUpdateCell(`'Compliance Report'!G${rowIndex}`, [item.datatype]));
        data.push(
          Self.buildRequestUpdateCell(`'Compliance Report'!H${rowIndex}`, [
            item.repository ? item.repository : item.comments
          ])
        );
        data.push(Self.buildRequestUpdateCell(`'Compliance Report'!I${rowIndex}`, [item.notes]));
      }
      // data.push(
      //   Self.buildRequestUpdateCell(`'Compliance Report'!A${rowOffset + batches.codeAndSoftware.length + 1}`, [
      //     `=NB.SI(A${rowOffset}:A${rowOffset + batches.codeAndSoftware.length};">0")`
      //   ])
      // );
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
        data.push(Self.buildRequestUpdateCell(`'Compliance Report'!C${rowIndex}`, [item.isValid ? `No` : `Yes`]));
        data.push(Self.buildRequestUpdateCell(`'Compliance Report'!E${rowIndex}`, [item.name]));
        data.push(Self.buildRequestUpdateCell(`'Compliance Report'!F${rowIndex}`, [item.sentences]));
        data.push(Self.buildRequestUpdateCell(`'Compliance Report'!G${rowIndex}`, [item.datatype]));
        data.push(
          Self.buildRequestUpdateCell(`'Compliance Report'!H${rowIndex}`, [
            item.repository ? item.repository : item.comments
          ])
        );
        data.push(Self.buildRequestUpdateCell(`'Compliance Report'!I${rowIndex}`, [item.notes]));
      }
      // data.push(
      //   Self.buildRequestUpdateCell(`'Compliance Report'!A${rowOffset + batches.labMaterials.length + 1}`, [
      //     `=NB.SI(A${rowOffset}:A${rowOffset + batches.labMaterials.length};">0")`
      //   ])
      // );
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
            'role': `writer`
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
