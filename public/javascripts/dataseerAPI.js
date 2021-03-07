/*
 * @prettier
 */

// API Interface Object
const DataSeerAPI = {};

/**
 * Build params URL
 * @param {Object} params JSON object containing all data
 * @returns {String} Params URL
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
 * @returns {String} Retrun token or empty string
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
 * @param {String} documentId Id of document
 * @returns {String} Retrun root URL of DataSeer Web app
 */
DataSeerAPI.rootURL = function () {
  return jQuery(document.getElementById('rootURL')).attr('value');
};

/**
 * Delete a given dataset
 * @param {Object} opts JSON object containing all data
 * @param {String} opts.datasetsId Id of dataset
 * @param {String} opts.sentenceId Id of sentence
 * @param {Function} done Callback function(err, res) (err: error process OR null, res: infos/data OR undefined)
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
 * @param {Object} opts JSON object containing all data
 * @param {String} opts.datasetsId Id of document datasets
 * @param {Object} opts.dataset Dataset options
 * @param {String} opts.dataset.status Dataset status
 * @param {String} opts.dataset.id Dataset id
 * @param {String} opts.dataset.cert Dataset cert
 * @param {String} opts.dataset.dataType Dataset dataType
 * @param {String} opts.dataset.subType Dataset subType
 * @param {String} opts.dataset.description Dataset description
 * @param {String} opts.dataset.bestDataFormatForSharing Dataset bestDataFormatForSharing
 * @param {String} opts.dataset.mostSuitableRepositories Dataset mostSuitableRepositories
 * @param {String} opts.dataset.name Dataset name
 * @param {String} opts.dataset.DOI Dataset DOI
 * @param {String} opts.dataset.comments Dataset comments
 * @param {String} opts.dataset.status Dataset comments
 * @param {Function} done Callback function(err, res) (err: error process OR null, res: infos/data OR undefined)
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
 * Delete a given corresp
 * @param {Object} opts JSON object containing all data
 * @param {String} opts.datasetsId Id of datasets
 * @param {String} opts.datasetId Id of dataset
 * @param {String} opts.sentenceId Id of sentence
 * @param {Function} done Callback function(err, res) (err: error process OR null, res: infos/data OR undefined)
 * @returns {undefined} undefined
 */
DataSeerAPI.deleteCorresp = function (opts = {}, done) {
  return jQuery.ajax({
    type: 'DELETE',
    contentType: 'application/json; charset=utf-8',
    headers: {
      'X-HTTP-Method-Override': 'DELETE'
    },
    url: DataSeerAPI.buildURL(DataSeerAPI.rootURL() + 'api/datasets/' + opts.datasetsId + '/corresp'),
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
 * Create new corresp to datasets
 * @param {Object} opts JSON object containing all data
 * @param {String} opts.datasetsId Id of datasets
 * @param {String} opts.datasetId Id of dataset
 * @param {String} opts.sentenceId Id of sentence
 * @param {Function} done Callback function(err, res) (err: error process OR null, res: infos/data OR undefined)
 * @returns {undefined} undefined
 */
DataSeerAPI.createCorresp = function (opts = {}, done) {
  return jQuery.ajax({
    type: 'POST',
    contentType: 'application/json; charset=utf-8',
    headers: {
      'X-HTTP-Method-Override': 'POST'
    },
    url: DataSeerAPI.buildURL(DataSeerAPI.rootURL() + 'api/datasets/' + opts.datasetsId + '/corresp'),
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
 * Save a given dataset
 * @param {Object} opts JSON object containing all data
 * @param {String} opts.datasetsId Id of document datasets
 * @param {Object} opts.dataset Dataset options
 * @param {String} opts.dataset.status Dataset status
 * @param {String} opts.dataset.id Dataset id
 * @param {String} opts.dataset.cert Dataset cert
 * @param {String} opts.dataset.dataType Dataset dataType
 * @param {String} opts.dataset.subType Dataset subType
 * @param {String} opts.dataset.description Dataset description
 * @param {String} opts.dataset.bestDataFormatForSharing Dataset bestDataFormatForSharing
 * @param {String} opts.dataset.mostSuitableRepositories Dataset mostSuitableRepositories
 * @param {String} opts.dataset.name Dataset name
 * @param {String} opts.dataset.DOI Dataset DOI
 * @param {String} opts.dataset.comments Dataset comments
 * @param {String} opts.dataset.status Dataset comments
 * @param {Function} done Callback function(err, res) (err: error process OR null, res: infos/data OR undefined)
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
 * Reopen document (back to "Metadata" process)
 * @param {String} documentId Id of document
 * @param {Function} done Callback function(err, res) (err: error process OR null, res: infos/data OR undefined)
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
 * Back to "Metadata" process from "datasets" step
 * @param {String} documentId Id of document
 * @param {Function} done Callback function(err, res) (err: error process OR null, res: infos/data OR undefined)
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
 * @param {String} documentId Id of document
 * @param {Function} done Callback function(err, res) (err: error process OR null, res: infos/data OR undefined)
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
 * @param {String} datasetsId Id of datasets
 * @param {Function} done Callback function(err, res) (err: error process OR null, res: infos/data OR undefined)
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
 * @param {String} documentId Id of document
 * @param {Function} done Callback function(err, res) (err: error process OR null, res: infos/data OR undefined)
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
 * Get document by id
 * @param {String} documentId Id of document
 * @param {Object} opts JSON object containing all data
 * @param {Boolean} options.datasets Populate datasets if true, else not
 * @param {Boolean} options.metadata Populate metadata if true, else not
 * @param {Function} done Callback function(err, res) (err: error process OR null, res: infos/data OR undefined)
 * @returns {undefined} undefined
 */
DataSeerAPI.getDocument = function (documentId, opts = {}, done) {
  jQuery.get(DataSeerAPI.buildURL(DataSeerAPI.rootURL() + 'api/documents/' + documentId, opts), function (data) {
    return done(data.err, data.res);
  });
};

/**
 * Get file by id
 * @param {String} fileId Id of file
 * @param {Function} done Callback function(err, res) (err: error process OR null, res: infos/data OR undefined)
 * @returns {undefined} undefined
 */
DataSeerAPI.getPDF = function (fileId, done) {
  jQuery.get(DataSeerAPI.buildURL(DataSeerAPI.rootURL() + 'api/files/' + fileId + '/buffer'), function (data) {
    return done(data.err, data.res);
  });
};

/**
 * Get file by id
 * @param {String} fileId Id of file
 * @param {Function} done Callback function(err, res) (err: error process OR null, res: infos/data OR undefined)
 * @returns {undefined} undefined
 */
DataSeerAPI.getTEI = function (fileId, done) {
  jQuery.get(DataSeerAPI.buildURL(DataSeerAPI.rootURL() + 'api/files/' + fileId + '/string'), function (data) {
    return done(data.err, data.res);
  });
};

/**
 * Get document by id
 * @param {String} documentId Id of document
 * @param {Object} opts JSON object containing all data
 * @param {Boolean} options.datasets Populate datasets if true, else not
 * @param {Boolean} options.metadata Populate metadata if true, else not
 * @param {Function} done Callback function(err, res) (err: error process OR null, res: infos/data OR undefined)
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
 * @param {Object} data JSON object containing all data
 * @returns {Object} JSON object containing all DataTypes
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
 * @param {Object} sentence Sentence HTML element
 * @param {Function} done Callback function(err, res) (err: error process OR null, res: infos/data OR undefined)
 * @returns {undefined} undefined
 */
DataSeerAPI.getdataType = function (sentence, done) {
  return $.ajax({
    cache: false,
    type: 'POST',
    url: DataSeerAPI.buildURL(DataSeerAPI.rootURL() + 'api/dataseer-ml/processDataseerSentence'),
    data: 'text=' + encodeURIComponent(sentence.text()),
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
 * @param {Function} done Callback function(err, res) (err: error process OR null, res: infos/data OR undefined)
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
