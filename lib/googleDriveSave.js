/*
 * @prettier
 */

'use strict';

const _ = require(`lodash`);
const async = require(`async`);
const path = require(`path`);
const fs = require(`fs`);
const { google } = require(`googleapis`);

const conf = require(`../conf/save/save.json`);

let Self = {};

/**
 * This function create a Google Authentication
 * @param {string} filePath - Path of the json file (Google credentials)
 * @returns {undefined} undefined
 */
Self.createAuth = function (filePath = path.join(__dirname, `../`, conf.files.default)) {
  return new google.auth.GoogleAuth({
    keyFile: filePath,
    scopes: [
      `https://www.googleapis.com/auth/cloud-platform`,
      `https://www.googleapis.com/auth/drive`,
      `https://www.googleapis.com/auth/drive.file`
    ]
  });
};

/**
 * This function get a daily auth file path
 * @param {string} day - Day of the credentials (available values : 1 to 7)
 * @returns {undefined} undefined
 */
Self.getDailyAuthFilePath = function (day = ``) {
  let confFilePath = typeof conf.files[day] === `string` ? conf.files[day] : conf.files.default;
  return path.join(__dirname, `../`, confFilePath);
};

/**
 * This function refresh Google Authentication
 * @param {string} filePath - Path of the json file (Google credentials)
 * @returns {undefined} undefined
 */
Self.authenticate = function (filePath = ``) {
  Self.drive = google.drive({
    version: `v3`,
    auth: Self.createAuth(filePath)
  });
};

/**
 * This function return the files ID (google file ID)
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR Error)
 * @returns {undefined} undefined
 */
Self.getStorageQuota = function (cb) {
  return Self.drive.about.get({ fields: `storageQuota` }, function (err, res) {
    if (err) return cb(err);
    return cb(null, res.data);
  });
};

/**
 * This function return the files ID of all saves (google file ID)
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR Error)
 * @returns {undefined} undefined
 */
Self.getListOfSaves = function (cb) {
  let files = [];
  let pageToken = null;
  return async.doWhilst(
    function (callback) {
      return Self.drive.files.list(
        {
          q: `mimeType='application/x-tar' and '${conf.folder}' in parents`,
          fields: `nextPageToken,files(id, mimeType, name, parents, size)`,
          spaces: `drive`,
          pageToken: pageToken
        },
        function (err, res) {
          // Handle error
          if (err) return callback(err);
          if (Array.isArray(res.data.files) && res.data.files.length > 0) {
            files = files.concat(res.data.files);
          }
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
      return cb(err, files);
    }
  );
};

/**
 * This function return the files ID of all saves (google file ID)
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR Error)
 * @returns {undefined} undefined
 */
Self.getListOfFiles = function (cb) {
  let files = [];
  let pageToken = null;
  return async.doWhilst(
    function (callback) {
      return Self.drive.files.list(
        {
          q: `mimeType='application/x-tar'`,
          fields: `nextPageToken,files(id, mimeType, name, parents, size)`,
          spaces: `drive`,
          pageToken: pageToken
        },
        function (err, res) {
          // Handle error
          if (err) return callback(err);
          if (Array.isArray(res.data.files) && res.data.files.length > 0) {
            files = files.concat(res.data.files);
          }
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
      return cb(err, files);
    }
  );
};

/**
 * This function return the file ID (google file ID)
 * @param {object} opts - Options available
 * @param {string} opts.folder - Parent folder of the document
 * @param {boolean} opts.strict - Strict mode (default : true)
 * @param {object} opts.data - Data available
 * @param {string} opts.data.name - Name of the document
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR Error)
 * @returns {undefined} undefined
 */
Self.getFileId = function (opts = {}, cb) {
  // Check all required data
  let strict = _.get(opts, `strict`, true);
  let folder = _.get(opts, `folder`);
  let name = _.get(opts, `data.name`);
  let pageToken = null;
  let ids = [];
  return async.doWhilst(
    function (callback) {
      let query = strict ? `name='${name}'` : `name contains '${name}'`;
      if (folder) query = `${query} and '${folder}' in parents`;
      return Self.drive.files.list(
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
      if (ids.length <= 0) return cb(null, new Error(` file not found`));
      // There is one existing document : return the google file id
      if (ids.length === 1) return cb(null, ids[0]);
      // There is more than one existing document : not handled
      return cb(new Error(`Unhandled case: More than one report exist for this document`));
    }
  );
};

/**
 * This function will create the file and return the file ID (google file ID)
 * @param {object} opts - Options available
 * @param {object} opts.data - Data available
 * @param {string} opts.data.name - Name of the document
 * @param {string} opts.data.path - Path of the document
 * @param {string} opts.folder - Folder id (google file ID)
 * @param {boolean} opts.[erase] - Erase existing file (default: false)
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR undefined)
 * @returns {undefined} undefined
 */
Self.createFile = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `data.path`) === `undefined`) return cb(Error(`Missing required data: opts.data.path`));
  if (typeof _.get(opts, `data.name`) === `undefined`) return cb(Error(`Missing required data: opts.data.name`));
  let erase = _.get(opts, `erase`, false);
  let _opts = { folder: opts.folder, data: { path: opts.data.path, name: opts.data.name } };
  return Self.getFileId(_opts, function (err, res) {
    if (err) return cb(err);
    // Case report does not exist yet
    if (res instanceof Error)
      return Self._createFile(_opts, function (err, res) {
        if (err) return cb(err);
        return cb(err, res);
      });
    // If it should not be erased, return google file ID
    if (!erase) return cb(null, res);
    // Erase file & re-create it
    return Self._deleteFile({ folder: opts.folder, data: { fileId: res } }, function (err, res) {
      if (err) return cb(err);
      return Self._createFile(_opts, function (err, res) {
        if (err) return cb(err);
        return cb(err, res);
      });
    });
  });
};

/**
 * This function will create the file and return the file ID (google file ID)
 * @param {object} opts - Options available
 * @param {string} opts.folder - Parent folder
 * @param {object} opts.data - Data available
 * @param {string} opts.data.name - Name of the document
 * @param {string} opts.data.path - Path of the document
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: google file ID OR undefined)
 * @returns {undefined} undefined
 */
Self._createFile = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `folder`) === `undefined`) return cb(Error(`Missing required data: opts.folder`));
  if (typeof _.get(opts, `data.name`) === `undefined`) return cb(Error(`Missing required data: opts.data.name`));
  if (typeof _.get(opts, `data.path`) === `undefined`) return cb(Error(`Missing required data: opts.data.path`));
  let fileMetadata = {
    'parents': [opts.folder],
    'name': opts.data.name
  };
  let media = {
    mimeType: `application/x-tar`,
    body: fs.createReadStream(opts.data.path)
  };
  // There is no existing document : create it
  return Self.drive.files.create(
    {
      resource: fileMetadata,
      media: media,
      fields: `id`
    },
    function (err, res) {
      if (err) return cb(err);
      let id = res.data.id;
      return cb(null, id);
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
Self.deleteFile = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `folder`) === `undefined`) return cb(Error(`Missing required data: opts.folder`));
  if (typeof _.get(opts, `data.name`) === `undefined`) return cb(Error(`Missing required data: opts.data.name`));
  let ignore = _.get(opts, `ignore`, false);
  return Self.getFileId({ folder: opts.folder, data: { name: opts.data.name } }, function (err, res) {
    if (err) return cb(err);
    // Case report does not exist
    if (res instanceof Error) {
      if (ignore) return cb(err, true);
      return cb(null, res);
    }
    // Erase file
    return Self._deleteFile({ folder: opts.folder, data: { fileId: res } }, function (err, res) {
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
Self._deleteFile = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `folder`) === `undefined`) return cb(Error(`Missing required data: opts.folder`));
  if (typeof _.get(opts, `data.fileId`) === `undefined`) return cb(Error(`Missing required data: opts.data.fileId`));
  // Check all optionnal data
  return Self.drive.files.delete(
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
