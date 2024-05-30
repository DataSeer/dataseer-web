/*
 * @prettier
 */

'use strict';

const md5 = require(`md5`);
const path = require(`path`);
const _ = require(`lodash`);

const fs = require(`fs`);

const DocumentsFiles = require(`../../models/documents.files.js`);

const Params = require(`../../lib/params.js`);

const conf = require(`../../conf/conf.json`);

let Self = {};

Self.encoding = `binary`;

/**
 * Check if mimetype is PDF
 * @param {string} mimetype - Given mimtype
 * @returns {boolean} True if mimetype matched, else false
 */
Self.isPDF = function (mimetype) {
  if (!mimetype) throw new Error(`Missing required data: mimetype`);
  return mimetype === `application/pdf`;
};

/**
 * Check if mimetype is XML
 * @param {string} mimetype - Given mimtype
 * @returns {boolean} True if mimetype matched, else false
 */
Self.isXML = function (mimetype) {
  if (!mimetype) throw new Error(`Missing required data: mimetype`);
  return mimetype === `text/xml` || mimetype === `application/xml`;
};

/**
 * Check if mimetype is a CSV like
 * @param {string} mimetype - Given mimtype
 * @returns {boolean} True if mimetype matched, else false
 */
Self.hasCSV = function (mimetype) {
  if (!mimetype) throw new Error(`Missing required data: mimetype`);
  return (
    mimetype === `text/csv` ||
    mimetype === `text/tab-separated-values` ||
    mimetype === `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` ||
    mimetype === `application/vnd.ms-excel` ||
    mimetype === `application/vnd.oasis.opendocument.spreadsheet` ||
    mimetype === `application/rtf`
  );
};

/**
 * Check if mimetype is CSV
 * @param {string} mimetype - Given mimtype
 * @returns {boolean} True if mimetype matched, else false
 */
Self.isCSV = function (mimetype) {
  if (!mimetype) throw new Error(`Missing required data: mimetype`);
  return mimetype === `text/csv`;
};

/**
 * Get path (on FileSystem) of given documentId
 * @param {string} documentId - Document id
 * @param {string} filename - Filename
 * @returns {string} Full path of filename
 */
Self.getPath = function (documentId, filename) {
  if (!documentId) throw new Error(`Missing required data: documentId`);
  if (!filename) throw new Error(`Missing required data: documentId`);
  return path.join(Self.getDirectory(documentId), filename);
};

/**
 * Get directory (on FileSystem) of given documentId
 * @param {string} - documentId Document id
 * @returns {string} Full path of directory or undefined
 */
Self.getDirectory = function (documentId) {
  if (!documentId) throw new Error(`Missing required data: documentId`);
  if (documentId.length === 24)
    return path.join(
      __dirname,
      `../`,
      `../`,
      conf.fs.root,
      documentId.substring(0, 4),
      documentId.substring(4, 8),
      documentId.substring(8, 12),
      documentId.substring(12, 16),
      documentId.substring(16, 20),
      documentId.substring(20),
      documentId
    );
};

/**
 * Get file
 * @param {object} opts - Options available
 * @param {object} opts.data - Data available
 * @param {string} opts.data.id - File id
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: file content (buffer) OR undefined)
 * @returns {undefined} undefined
 */
Self.get = function (opts, cb) {
  // Check all required data
  if (typeof _.get(opts, `data`) === `undefined`) return cb(new Error(`Missing required data: opts.data`));
  if (typeof _.get(opts, `data.id`) === `undefined`) return cb(new Error(`Missing required data: opts.data.id`));
  if (!Params.checkString(opts.data.id)) return cb(new Error(`Bad value: opts.data.id`));
  return DocumentsFiles.findById(opts.data.id).exec(function (err, file) {
    if (err) return cb(err);
    return cb(err, file);
  });
};

/**
 * Get file path
 * @param {object} opts - Options available
 * @param {object} opts.data - Data available
 * @param {string} opts.data.id - File id
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: file path (string) OR undefined)
 * @returns {undefined} undefined
 */
Self.getFilePath = function (opts, cb) {
  // Check all required data
  if (typeof _.get(opts, `data`) === `undefined`) return cb(new Error(`Missing required data: opts.data`));
  if (typeof _.get(opts, `data.id`) === `undefined`) return cb(new Error(`Missing required data: opts.data.id`));
  if (!Params.checkString(opts.data.id)) return cb(new Error(`Bad value: opts.data.id`));
  return DocumentsFiles.findById(opts.data.id)
    .select(`+path`) // path is not returned by default
    .exec(function (err, file) {
      if (err) return cb(err);
      if (!file) return cb(err, new Error(`File Not Found`));
      return cb(err, file.path);
    });
};

/**
 * Get file info
 * @param {object} opts - Options available
 * @param {object} opts.data - Data available
 * @param {string} opts.data.id - File id
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: file path (string) OR undefined)
 * @returns {undefined} undefined
 */
Self.getFileInfo = function (opts, cb) {
  // Check all required data
  if (typeof _.get(opts, `data`) === `undefined`) return cb(new Error(`Missing required data: opts.data`));
  if (typeof _.get(opts, `data.id`) === `undefined`) return cb(new Error(`Missing required data: opts.data.id`));
  if (!Params.checkString(opts.data.id)) return cb(new Error(`Bad value: opts.data.id`));
  return DocumentsFiles.findById(opts.data.id)
    .select(`+path`) // path is not returned by default
    .exec(function (err, file) {
      if (err) return cb(err);
      if (!file) return cb(err, new Error(`File Not Found`));
      return cb(err, file);
    });
};

/**
 * Read file
 * @param {object} opts - Options available
 * @param {object} opts.data - Data available
 * @param {string} opts.data.id - File id
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: file content (buffer) OR undefined)
 * @returns {undefined} undefined
 */
Self.readFile = function (opts, cb) {
  // Check all required data
  if (typeof _.get(opts, `data`) === `undefined`) return cb(new Error(`Missing required data: opts.data`));
  if (typeof _.get(opts, `data.id`) === `undefined`) return cb(new Error(`Missing required data: opts.data.id`));
  if (!Params.checkString(opts.data.id)) return cb(new Error(`Bad value: opts.data.id`));
  return DocumentsFiles.findById(opts.data.id)
    .select(`+path`) // path is not returned by default
    .exec(function (err, file) {
      if (err) return cb(err);
      if (!file) return cb(err, new Error(`File Not Found`));
      return fs.readFile(file.path, file.encoding, function (err, res) {
        return cb(err, { name: file.name, mimetype: file.mimetype, data: Buffer.from(res, file.encoding) });
      });
    });
};

/**
 * Read file content
 * @param {object} opts - Options available
 * @param {object} opts.data - Data available
 * @param {string} opts.data.id - File id
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: file content (string) OR undefined)
 * @returns {undefined} undefined
 */
Self.readFileContent = function (opts, cb) {
  // Check all required data
  if (typeof _.get(opts, `data`) === `undefined`) return cb(new Error(`Missing required data: opts.data`));
  if (typeof _.get(opts, `data.id`) === `undefined`) return cb(new Error(`Missing required data: opts.data.id`));
  if (!Params.checkString(opts.data.id)) return cb(new Error(`Bad value: opts.data.id`));
  return DocumentsFiles.findById(opts.data.id)
    .select(`+path`) // path is not returned by default
    .exec(function (err, file) {
      if (err) return cb(err);
      if (!file) return cb(err, new Error(`File Not Found`));
      return fs.readFile(file.path, file.encoding, function (err, res) {
        return cb(err, { name: file.name, mimetype: file.mimetype, data: res, path: file.path });
      });
    });
};

/**
 * @param {object} opts - Options available
 * @param {object} opts.data - Data available
 * @param {string} opts.data.id - File id
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: file infos (object) OR undefined)
 * @returns {undefined} undefined
 */
Self.readFileStream = function (opts, cb) {
  // Check all required data
  if (typeof _.get(opts, `data`) === `undefined`) return cb(new Error(`Missing required data: opts.data`));
  if (typeof _.get(opts, `data.id`) === `undefined`) return cb(new Error(`Missing required data: opts.data.id`));
  if (!Params.checkString(opts.data.id)) return cb(new Error(`Bad value: opts.data.id`));
  return DocumentsFiles.findById(opts.data.id)
    .select(`+path`) // path is not returned by default
    .exec(function (err, file) {
      if (err) return cb(err);
      if (!file) return cb(err, new Error(`File Not Found`));
      return fs.stat(file.path, function (err, stats) {
        if (err) return cb(err);
        return cb(null, {
          name: file.name,
          stream: fs.createReadStream(file.path, { encoding: file.encoding }),
          stats: stats,
          mimetype: file.mimetype
        });
      });
    });
};

/**
 * Delete file
 * @param {string} id - File id
 * @param {function} cb - Callback function(err, res) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.deleteFile = function (id, cb) {
  if (!Params.checkString(id)) return cb(new Error(`Bad value: id`));
  return DocumentsFiles.findById(id)
    .select(`+path`) // path is not returned by default
    .exec(function (err, file) {
      if (err) return cb(err);
      if (!file) return cb(err, new Error(`File Not Found`));
      return fs.unlink(file.path, function (err) {
        if (err) return cb(err);
        return DocumentsFiles.deleteOne({ _id: file._id }, function (err) {
          return cb(err);
        });
      });
    });
};

/**
 * Re-Write file
 * @param {string} id - File id
 * @param {string} data - File data
 * @param {function} cb - Callback function(err, res) (err: error process OR undefined)
 * @returns {undefined} undefined
 */
Self.rewriteFile = function (id, data, cb) {
  if (!Params.checkString(id)) return cb(new Error(`Missing required data: id`));
  if (!Params.checkString(data)) return cb(new Error(`Missing required data: data`));
  return DocumentsFiles.findById(id)
    .select(`+path`) // path is not returned by default
    .exec(function (err, file) {
      if (err) return cb(err);
      if (!file) return cb(err, new Error(`File Not Found`));
      let str = data.toString(file.encoding); // re-encode data
      return fs.writeFile(file.path, str, file.encoding, function (err) {
        if (err) return cb(err);
        let hash = ``;
        try {
          hash = md5(str);
        } catch (error) {
          console.error(error);
        }
        file.md5 = hash;
        file.size = str.length;
        return file.save(function (err) {
          if (err) return cb(err);
          return cb(null, true);
        });
      });
    });
};

/**
 * Write file on FileSystem and store attached data in MongoDB
 * @param {object} opts - Options available
 * @param {object} opts.data - Data available
 * @param {object} opts.data.file - File representation
 * @param {string} opts.data.file.name - File name
 * @param {buffer} opts.data.file.data - File content
 * @param {string} opts.data.file.mimetype - File mimetype
 * @param {string} opts.data.file.encoding - File encoding
 * @param {string} opts.data.file.metadata - File metadata
 * @param {string} opts.data.accountId - Account id
 * @param {string} opts.data.documentId - Document id
 * @param {string} opts.data.organizations - Array of organizations
 * @param {object} opts.user - User using this functionality (must be similar to req.user)
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: DocumentsFiles instance OR undefined)
 * @returns {undefined} undefined
 */
Self.upload = function (opts, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `data`) === `undefined`) return cb(new Error(`Missing required data: opts.data`));
  if (typeof _.get(opts, `data.file`) === `undefined`) return cb(new Error(`Missing required data: opts.data.file`));
  if (typeof _.get(opts, `data.file.name`) === `undefined`)
    return cb(new Error(`Missing required data: opts.data.file.name`));
  if (typeof _.get(opts, `data.file.data`) === `undefined`)
    return cb(new Error(`Missing required data: opts.data.file.data`));
  if (typeof _.get(opts, `data.file.mimetype`) === `undefined`)
    return cb(new Error(`Missing required data: opts.data.file.mimetype`));
  if (typeof _.get(opts, `data.file.encoding`) === `undefined`)
    return cb(new Error(`Missing required data: opts.data.file.encoding`));
  if (typeof _.get(opts, `data.accountId`) === `undefined`)
    return cb(new Error(`Missing required data: opts.data.accountId`));
  if (typeof _.get(opts, `data.documentId`) === `undefined`)
    return cb(new Error(`Missing required data: opts.data.documentId`));
  // Try to convert data sent
  let documentId = Params.convertToString(opts.data.documentId);
  let filename = Params.convertToString(opts.data.file.name);
  let mimetype = Params.convertToString(opts.data.file.mimetype);
  let fileContent = opts.data.file.data.toString(Self.encoding); // Convert buffer to string (do not use Params.convertToString())
  let metadata = typeof opts.data.file.metadata !== `undefined` ? opts.data.file.metadata : {};
  let accountId = Params.convertToString(opts.data.accountId);
  let organizations = Params.convertToArray(opts.data.organizations, `string`);
  // Check converted values
  if (typeof documentId === `undefined`) return cb(new Error(`Bad value: documentId`));
  if (typeof filename === `undefined`) return cb(new Error(`Bad value: filename`));
  if (typeof mimetype === `undefined`) return cb(new Error(`Bad value: mimetype`));
  if (typeof fileContent === `undefined`) return cb(new Error(`Bad value: fileContent`));
  if (typeof accountId === `undefined`) return cb(new Error(`Bad value: accountId`));
  if (typeof organizations === `undefined`) return cb(new Error(`Bad value: organizations`));
  // Build filePath
  let filePath = Self.getPath(documentId, filename);
  let hash = ``;
  try {
    hash = md5(fileContent);
  } catch (error) {
    console.error(error);
  }
  return DocumentsFiles.create(
    {
      document: documentId,
      filename: filename,
      name: filename,
      encoding: Self.encoding,
      md5: hash,
      mimetype: mimetype,
      size: fileContent.length,
      path: filePath,
      metadata: metadata,
      upload: {
        account: accountId,
        organizations: organizations
      }
    },
    function (err, file) {
      if (err) return cb(err);
      return fs.mkdir(Self.getDirectory(documentId), { recursive: true }, function (err) {
        if (err) return cb(err);
        return fs.writeFile(filePath, fileContent, Self.encoding, function (err, res) {
          if (err) return cb(err);
          return cb(null, file);
        });
      });
    }
  );
};

/**
 * Update a file
 * @param {object} opts - Option available
 * @param {object} opts.data - Data available
 * @param {string} opts.data.id - Data available
 * @param {string} opts.data.name - File name
 * @param {object} opts.user - User using this functionality (must be similar to req.user)
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: DocumentsFiles instance OR undefined)
 * @returns {undefined} undefined
 */
Self.update = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `data`) === `undefined`) return cb(new Error(`Missing required data: opts.data`));
  if (typeof _.get(opts, `data.id`) === `undefined`) return cb(new Error(`Missing required data: opts.data.id`));
  if (typeof _.get(opts, `data.name`) === `undefined`) return cb(new Error(`Missing required data: opts.data.name`));
  return DocumentsFiles.findOneAndUpdate(
    { _id: opts.data.id },
    {
      name: opts.data.name
    },
    function (err, query) {
      if (err) return cb(err);
      return cb(null, query);
    }
  );
};

module.exports = Self;
