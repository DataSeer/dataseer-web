/*
 * @prettier
 */

'use strict';

// API Interface Object
const DataSeerAPI = {};

/**
 * Build params URL
 * @param {object} params - JSON object containing all data
 * @returns {string} Params URL
 */
DataSeerAPI.buildParams = function (params) {
  let keys = Object.keys(params);
  if (keys.length <= 0) return '';
  else {
    let result = '?';
    for (let i = 0; i < keys.length; i++) {
      result += keys[i] + '=' + params[keys[i]] + '&';
    }
    return encodeURI(result.slice(0, -1));
  }
};

/**
 * Build URL (add token if necessary)
 * @returns {string} Retrun token or empty string
 */
DataSeerAPI.buildURL = function (url, params = {}) {
  let currentURL = new URL(window.location.href),
    documentToken = currentURL.searchParams.get('documentToken'),
    token = currentURL.searchParams.get('token');
  if (token) params.token = token;
  else if (documentToken) params.documentToken = documentToken;
  return url + DataSeerAPI.buildParams(params);
};

/**
 * Get root URL of DataSeer Web app
 * @param {string} documentId Id of document
 * @returns {string} Retrun root URL of DataSeer Web app
 */
DataSeerAPI.rootURL = function () {
  return jQuery(document.getElementById('rootURL')).attr('value');
};

/**
 * Delete a given dataset
 * @param {object} opts JSON object containing all data
 * @param {string} opts.datasetsId Id of datasets
 * @param {string} opts.dataset.datasetId Id of dataset
 * @param {function} done Callback function(err, res) (err: error process OR null, res: infos/data OR undefined)
 * @returns {undefined} undefined
 */
DataSeerAPI.deleteDataset = function (opts = {}, done) {
  return jQuery.ajax({
    type: 'DELETE',
    contentType: 'application/json; charset=utf-8',
    headers: {
      'X-HTTP-Method-Override': 'DELETE'
    },
    url: DataSeerAPI.buildURL(DataSeerAPI.rootURL() + 'api/datasets/' + opts.datasetsId + '/dataset'),
    data: JSON.stringify({ dataset: opts.dataset }),
    success: function (data) {
      return done(false, data);
    },
    error: function () {
      return done(true);
    },
    dataType: 'json'
  });
};

/**
 * Create new dataset to datasets
 * @param {object} opts JSON object containing all data
 * @param {string} opts.datasetsId Id of document datasets
 * @param {object} opts.dataset Dataset options
 * @param {string} opts.dataset.status Dataset status
 * @param {string} opts.dataset.id Dataset id
 * @param {string} opts.dataset.datainstanceId Dataset datainstanceId
 * @param {string} opts.dataset.cert Dataset cert
 * @param {string} opts.dataset.dataType Dataset dataType
 * @param {string} opts.dataset.subType Dataset subType
 * @param {string} opts.dataset.description Dataset description
 * @param {string} opts.dataset.bestDataFormatForSharing Dataset bestDataFormatForSharing
 * @param {string} opts.dataset.mostSuitableRepositories Dataset mostSuitableRepositories
 * @param {string} opts.dataset.name Dataset name
 * @param {string} opts.dataset.DOI Dataset DOI
 * @param {string} opts.dataset.comments Dataset comments
 * @param {string} opts.dataset.status Dataset comments
 * @param {function} done Callback function(err, res) (err: error process OR null, res: infos/data OR undefined)
 * @returns {undefined} undefined
 */
DataSeerAPI.createDataset = function (opts = {}, done) {
  return jQuery.ajax({
    type: 'POST',
    contentType: 'application/json; charset=utf-8',
    headers: {
      'X-HTTP-Method-Override': 'POST'
    },
    url: DataSeerAPI.buildURL(DataSeerAPI.rootURL() + 'api/datasets/' + opts.datasetsId + '/dataset'),
    data: JSON.stringify({ dataset: opts.dataset }),
    success: function (data) {
      return done(false, data);
    },
    error: function () {
      return done(true);
    },
    dataType: 'json'
  });
};

/**
 * Delete a given dataset link
 * @param {object} opts JSON object containing all data
 * @param {string} opts.datasetsId Id of datasets
 * @param {string} opts.dataset.datasetId Id of dataset
 * @param {string} opts.sentence Sentence
 * @param {function} done Callback function(err, res) (err: error process OR null, res: infos/data OR undefined)
 * @returns {undefined} undefined
 */
DataSeerAPI.unlinkSentence = function (opts = {}, done) {
  return jQuery.ajax({
    type: 'DELETE',
    contentType: 'application/json; charset=utf-8',
    headers: {
      'X-HTTP-Method-Override': 'DELETE'
    },
    url: DataSeerAPI.buildURL(DataSeerAPI.rootURL() + 'api/datasets/' + opts.datasetsId + '/unlink'),
    data: JSON.stringify({ dataset: opts.dataset, sentence: opts.sentence }),
    success: function (data) {
      return done(false, data);
    },
    error: function () {
      return done(true);
    },
    dataType: 'json'
  });
};

/**
 * Create new link to datasets
 * @param {object} opts JSON object containing all data
 * @param {string} opts.datasetsId Id of datasets
 * @param {string} opts.dataset.datasetId Id of dataset
 * @param {string} opts.sentence Sentence
 * @param {function} done Callback function(err, res) (err: error process OR null, res: infos/data OR undefined)
 * @returns {undefined} undefined
 */
DataSeerAPI.linkSentence = function (opts = {}, done) {
  return jQuery.ajax({
    type: 'POST',
    contentType: 'application/json; charset=utf-8',
    headers: {
      'X-HTTP-Method-Override': 'POST'
    },
    url: DataSeerAPI.buildURL(DataSeerAPI.rootURL() + 'api/datasets/' + opts.datasetsId + '/link'),
    data: JSON.stringify({ dataset: opts.dataset, sentence: opts.sentence }),
    success: function (data) {
      return done(false, data);
    },
    error: function () {
      return done(true);
    },
    dataType: 'json'
  });
};

/**
 * Save a given dataset
 * @param {object} opts JSON object containing all data
 * @param {string} opts.datasetsId Id of document datasets
 * @param {object} opts.dataset Dataset options
 * @param {string} opts.dataset.status Dataset status
 * @param {string} opts.dataset.id Dataset id
 * @param {string} opts.dataset.cert Dataset cert
 * @param {string} opts.dataset.dataType Dataset dataType
 * @param {string} opts.dataset.subType Dataset subType
 * @param {string} opts.dataset.description Dataset description
 * @param {string} opts.dataset.bestDataFormatForSharing Dataset bestDataFormatForSharing
 * @param {string} opts.dataset.mostSuitableRepositories Dataset mostSuitableRepositories
 * @param {string} opts.dataset.name Dataset name
 * @param {string} opts.dataset.DOI Dataset DOI
 * @param {string} opts.dataset.comments Dataset comments
 * @param {string} opts.dataset.status Dataset comments
 * @param {function} done Callback function(err, res) (err: error process OR null, res: infos/data OR undefined)
 * @returns {undefined} undefined
 */
DataSeerAPI.updateDataset = function (opts = {}, done) {
  return jQuery.ajax({
    type: 'PUT',
    contentType: 'application/json; charset=utf-8',
    headers: {
      'X-HTTP-Method-Override': 'PUT'
    },
    url: DataSeerAPI.buildURL(DataSeerAPI.rootURL() + 'api/datasets/' + opts.datasetsId + '/dataset'),
    data: JSON.stringify({ dataset: opts.dataset }),
    success: function (data) {
      return done(false, data);
    },
    error: function () {
      return done(true);
    },
    dataType: 'json'
  });
};

/**
 * Extract PDF metadata for a given dataset
 * @param {string} documentId Id of document
 * @param {function} done Callback function(err, res) (err: error process OR null, res: infos/data OR undefined)
 * @returns {undefined} undefined
 */
DataSeerAPI.extractPDFMetadata = function (documentId, done) {
  return jQuery.ajax({
    type: 'POST',
    contentType: 'application/json; charset=utf-8',
    headers: {
      'X-HTTP-Method-Override': 'POST'
    },
    url: DataSeerAPI.buildURL(DataSeerAPI.rootURL() + 'api/documents/' + documentId + '/extractPDFMetadata'),
    data: JSON.stringify({}),
    success: function (data) {
      return done(false, {
        url: DataSeerAPI.buildURL(DataSeerAPI.rootURL() + 'api/documents/' + documentId + '/pdf/content'),
        data: data
      });
    },
    error: function () {
      return done(true);
    },
    dataType: 'json'
  });
};

/**
 * Update XML of the TEI file for a given dataset
 * @param {string} documentId Id of document
 * @param {function} done Callback function(err, res) (err: error process OR null, res: infos/data OR undefined)
 * @returns {undefined} undefined
 */
DataSeerAPI.updateTEI = function (documentId, done) {
  return jQuery.ajax({
    type: 'POST',
    contentType: 'application/json; charset=utf-8',
    headers: {
      'X-HTTP-Method-Override': 'POST'
    },
    url: DataSeerAPI.buildURL(DataSeerAPI.rootURL() + 'api/documents/' + documentId + '/updateTEI'),
    data: JSON.stringify({}),
    success: function (data) {
      return done(false, {
        url: DataSeerAPI.buildURL(DataSeerAPI.rootURL() + 'api/documents/' + documentId + '/pdf/content'),
        data: data
      });
    },
    error: function () {
      return done(true);
    },
    dataType: 'json'
  });
};

/**
 * Reopen document (back to "Metadata" process)
 * @param {string} documentId Id of document
 * @param {function} done Callback function(err, res) (err: error process OR null, res: infos/data OR undefined)
 * @returns {undefined} undefined
 */
DataSeerAPI.reopenDocument = function (documentId, done) {
  return jQuery.ajax({
    type: 'POST',
    contentType: 'application/json; charset=utf-8',
    headers: {
      'X-HTTP-Method-Override': 'POST'
    },
    url: DataSeerAPI.buildURL(DataSeerAPI.rootURL() + 'api/documents/' + documentId + '/finish/reopen'),
    data: JSON.stringify({}),
    success: function (data) {
      return done(false, data);
    },
    error: function () {
      return done(true);
    },
    dataType: 'json'
  });
};

/**
 * Refresh datasets informations
 * @param {string} documentId Id of document
 * @param {function} done Callback function(err, res) (err: error process OR null, res: infos/data OR undefined)
 * @returns {undefined} undefined
 */
DataSeerAPI.refreshDatasets = function (documentId, done) {
  return jQuery.ajax({
    type: 'POST',
    contentType: 'application/json; charset=utf-8',
    headers: {
      'X-HTTP-Method-Override': 'POST'
    },
    url: DataSeerAPI.buildURL(DataSeerAPI.rootURL() + 'api/documents/' + documentId + '/finish/refreshDatasets'),
    data: JSON.stringify({}),
    success: function (data) {
      return done(false, data);
    },
    error: function () {
      return done(true);
    },
    dataType: 'json'
  });
};

/**
 * Back to "Metadata" process from "datasets" step
 * @param {string} documentId Id of document
 * @param {function} done Callback function(err, res) (err: error process OR null, res: infos/data OR undefined)
 * @returns {undefined} undefined
 */
DataSeerAPI.backToMetadata = function (documentId, done) {
  return jQuery.ajax({
    type: 'POST',
    contentType: 'application/json; charset=utf-8',
    headers: {
      'X-HTTP-Method-Override': 'POST'
    },
    url: DataSeerAPI.buildURL(DataSeerAPI.rootURL() + 'api/documents/' + documentId + '/datasets/backToMetadata'),
    data: JSON.stringify({}),
    success: function (data) {
      return done(false, data);
    },
    error: function () {
      return done(true);
    },
    dataType: 'json'
  });
};

/**
 * Validate "Metadata" process
 * @param {string} documentId Id of document
 * @param {function} done Callback function(err, res) (err: error process OR null, res: infos/data OR undefined)
 * @returns {undefined} undefined
 */
DataSeerAPI.validateMetadata = function (documentId, done) {
  return jQuery.ajax({
    type: 'POST',
    contentType: 'application/json; charset=utf-8',
    headers: {
      'X-HTTP-Method-Override': 'POST'
    },
    url: DataSeerAPI.buildURL(DataSeerAPI.rootURL() + 'api/documents/' + documentId + '/metadata/validate'),
    data: JSON.stringify({}),
    success: function (data) {
      return done(false, data);
    },
    error: function () {
      return done(true);
    },
    dataType: 'json'
  });
};

/**
 * Check if "Datasets" process can be validated
 * @param {string} datasetsId Id of datasets
 * @param {function} done Callback function(err, res) (err: error process OR null, res: infos/data OR undefined)
 * @returns {undefined} undefined
 */
DataSeerAPI.checkDatasetsValidation = function (datasetsId, done) {
  return jQuery.ajax({
    type: 'POST',
    contentType: 'application/json; charset=utf-8',
    headers: {
      'X-HTTP-Method-Override': 'POST'
    },
    url: DataSeerAPI.buildURL(DataSeerAPI.rootURL() + 'api/datasets/' + datasetsId + '/checkValidation'),
    data: JSON.stringify({}),
    success: function (data) {
      return done(null, data);
    },
    error: function (data) {
      return done(data);
    },
    dataType: 'json'
  });
};

/**
 * Validate "Datasets" process
 * @param {string} documentId Id of document
 * @param {function} done Callback function(err, res) (err: error process OR null, res: infos/data OR undefined)
 * @returns {undefined} undefined
 */
DataSeerAPI.validateDatasets = function (documentId, done) {
  return jQuery.ajax({
    type: 'POST',
    contentType: 'application/json; charset=utf-8',
    headers: {
      'X-HTTP-Method-Override': 'POST'
    },
    url: DataSeerAPI.buildURL(DataSeerAPI.rootURL() + 'api/documents/' + documentId + '/datasets/validate'),
    data: JSON.stringify({}),
    success: function (data) {
      return done(null, data);
    },
    error: function (data) {
      return done(data);
    },
    dataType: 'json'
  });
};

/**
 * Send mail to Authors
 * @param {string} documentId Id of document
 * @param {function} done Callback function(err, res) (err: error process OR null, res: infos/data OR undefined)
 * @returns {undefined} undefined
 */
DataSeerAPI.sendMailToAuthors = function (documentId, done) {
  return jQuery.ajax({
    type: 'POST',
    contentType: 'application/json; charset=utf-8',
    headers: {
      'X-HTTP-Method-Override': 'POST'
    },
    url: DataSeerAPI.buildURL(DataSeerAPI.rootURL() + 'api/documents/' + documentId + '/sendDocumentURLToAuthors'),
    data: JSON.stringify({}),
    success: function (data) {
      return done(null, data);
    },
    error: function (data) {
      return done(data);
    },
    dataType: 'json'
  });
};

/**
 * Get document by id
 * @param {string} documentId Id of document
 * @param {object} opts JSON object containing all data
 * @param {boolean} options.datasets Populate datasets if true, else not
 * @param {boolean} options.metadata Populate metadata if true, else not
 * @param {function} done Callback function(err, res) (err: error process OR null, res: infos/data OR undefined)
 * @returns {undefined} undefined
 */
DataSeerAPI.getDocument = function (documentId, opts = {}, done) {
  jQuery.get(DataSeerAPI.buildURL(DataSeerAPI.rootURL() + 'api/documents/' + documentId, opts), function (data) {
    return done(data.err, data.res);
  });
};

/**
 * Get file by id
 * @param {string} documentId Id of document
 * @param {function} done Callback function(err, res) (err: error process OR null, res: infos/data OR undefined)
 * @returns {undefined} undefined
 */
DataSeerAPI.getPDF = function (documentId, done) {
  jQuery.get(DataSeerAPI.buildURL(DataSeerAPI.rootURL() + 'api/documents/' + documentId + '/pdf'), function (data) {
    return done(data.err, data.res);
  });
};

/**
 * Get file by id
 * @param {string} fileId Id of file
 * @param {function} done Callback function(err, res) (err: error process OR null, res: infos/data OR undefined)
 * @returns {undefined} undefined
 */
DataSeerAPI.getTEI = function (fileId, done) {
  jQuery.get(DataSeerAPI.buildURL(DataSeerAPI.rootURL() + 'api/files/' + fileId + '/string'), function (data) {
    return done(data.err, data.res);
  });
};

/**
 * Get document by id
 * @param {string} documentId Id of document
 * @param {object} opts JSON object containing all data
 * @param {boolean} options.datasets Populate datasets if true, else not
 * @param {boolean} options.metadata Populate metadata if true, else not
 * @param {function} done Callback function(err, res) (err: error process OR null, res: infos/data OR undefined)
 * @returns {undefined} undefined
 */
DataSeerAPI.resyncJsonDataTypes = function (done) {
  return $.ajax({
    cache: false,
    type: 'GET',
    contentType: 'application/json',
    url: DataSeerAPI.buildURL(DataSeerAPI.rootURL() + 'api/dataseer-ml/resyncJsonDataTypes'),
    success: function (data) {
      if (typeof data === 'string') data = JSON.parse(data);
      return done(null, data);
    },
    error: function (data) {
      return done(true, data);
    }
  });
};

/**
 * Extract DataTypes from data (result of DataSeerAPI.jsonDataTypes())
 * @param {object} data JSON object containing all data
 * @returns {object} JSON object containing all DataTypes
 */
DataSeerAPI.extractDatatypeFrom = function (data) {
  let classifications =
      data['classifications'].length > 0 &&
      typeof data['classifications'][0] === 'object' &&
      data['classifications'][0].has_dataset > data['classifications'][0].no_dataset
        ? data['classifications'][0]
        : {},
    result = {};
  delete classifications.text;
  delete classifications.has_dataset;
  delete classifications.no_dataset;
  let keys = Object.keys(classifications);
  if (keys.length > 0) {
    let datatype = keys[0],
      max = classifications[keys[0]];
    for (let i = 1; i < keys.length; i++) {
      if (max < classifications[keys[i]]) {
        max = classifications[keys[i]];
        datatype = keys[i];
      }
    }
    // result.datatype = datatype;
    result.datatype = datatype.toLowerCase(); // lowercase to match with metadata returned by dataseer-ml
    result.cert = max;
  }
  return result;
};

/**
 * Get datatype of given sentence
 * @param {object} sentence Sentence HTML element
 * @param {function} done Callback function(err, res) (err: error process OR null, res: infos/data OR undefined)
 * @returns {undefined} undefined
 */
DataSeerAPI.getdataType = function (sentence, done) {
  return $.ajax({
    cache: false,
    type: 'POST',
    url: DataSeerAPI.buildURL(DataSeerAPI.rootURL() + 'api/dataseer-ml/processDataseerSentence'),
    data: 'text=' + encodeURIComponent(sentence),
    success: function (data) {
      let result = DataSeerAPI.extractDatatypeFrom(JSON.parse(data));
      return done(null, result);
    },
    error: function (data) {
      return done(true, data);
    }
  });
};

/**
 * Get jsonDataTypes
 * @param {function} done Callback function(err, res) (err: error process OR null, res: infos/data OR undefined)
 * @returns {undefined} undefined
 */
DataSeerAPI.jsonDataTypes = function (done) {
  return $.ajax({
    cache: false,
    type: 'GET',
    contentType: 'application/json',
    url: DataSeerAPI.buildURL(DataSeerAPI.rootURL() + 'api/dataseer-ml/jsonDataTypes'),
    success: function (data) {
      if (typeof data === 'string') data = JSON.parse(data);
      return done(null, data);
    },
    error: function (data) {
      return done(true, data);
    }
  });
};
