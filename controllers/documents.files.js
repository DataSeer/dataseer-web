/*
 * @prettier
 */

const md5 = require('md5'),
  path = require('path'),
  fs = require('fs');

const DocumentsFiles = require('../models/documents.files.js'),
  Accounts = require('../models/accounts.js');

const JWT = require('../lib/jwt.js');

const conf = require('../conf/conf.json');

let Self = {};

/**
 * Authenticate account with JWT (documentToken)
 * @param {Object} req req
 * @param {Object} res res
 * @param {Function} next
 * @returns {undefined} undefined
 */
Self.authenticate = function (req, res, next) {
  // If user is already authenticated with session, just go next
  if (req.user) return next();
  // Get token
  let token = req.query.documentToken;
  if (!token) return next();
  // Just try to authenticate. If it fail, just go next
  else
    return JWT.check(token, req.app.get('private.key'), {}, function (err, decoded) {
      if (err || !decoded) return next();
      return Accounts.findOne({ _id: decoded.accountId }, function (err, user) {
        if (err || !user) return next();
        return DocumentsFiles.findOne({ document: decoded.documentId }, function (err, file) {
          if (err || !file) return next();
          if (file.document.toString() === decoded.documentId) {
            req.user = user; // Set user
            res.locals = { useDocumentToken: true };
          }
          return next();
        });
      });
    });
};

/**
 * Check if mimetype is PDF
 * @param {String} mimetype Given mimtype
 * @returns {Boolean} True if mimetype matched, else false
 */
Self.isPDF = function (mimetype) {
  return mimetype === 'application/pdf';
};

/**
 * Check if mimetype is XML
 * @param {String} mimetype Given mimtype
 * @returns {Boolean} True if mimetype matched, else false
 */
Self.isXML = function (mimetype) {
  return mimetype === 'text/xml' || mimetype === 'application/xml';
};

/**
 * Get path (on FileSystem) of given documentId
 * @param {String} documentId Document id
 * @param {String} filename Filename
 * @returns {String} Full path of filename
 */
Self.getPath = function (documentId, filename) {
  return path.join(Self.getDirectory(documentId), filename);
};

/**
 * Get directory (on FileSystem) of given documentId
 * @param {String} documentId Document id
 * @returns {String} Full path of directory or undefined
 */
Self.getDirectory = function (documentId) {
  if (documentId.length === 24)
    return path.join(
      __dirname,
      '../',
      conf.FileSystemRoot,
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
 * Read file
 * @param {mongoose.Schema.Types.ObjectId} id File id
 * @param {Function} cb Callback function(err, res) (err: error process OR null, res: file content (string) OR undefined)
 * @returns {undefined} undefined
 */
Self.readFile = function (id, cb) {
  return DocumentsFiles.findById(id)
    .select('+path') // path is not returned by default
    .exec(function (err, file) {
      if (err) return cb(err);
      else
        return fs.readFile(file.path, file.encoding, function (err, res) {
          return cb(err, res);
        });
    });
};

/**
 * Re-Write file
 * @param {mongoose.Schema.Types.ObjectId} id File id
 * @param {String} data File data
 * @param {Function} cb Callback function(err, res) (err: error process OR undefined)
 * @returns {undefined} undefined
 */
Self.rewriteFile = function (id, data, cb) {
  return DocumentsFiles.findById(id)
    .select('+path') // path is not returned by default
    .exec(function (err, file) {
      if (err) return cb(err);
      else {
        let str = data.toString(file.encoding); // re-encode data
        return fs.writeFile(file.path, str, file.encoding, function (err) {
          if (err) return cb(err);
          else {
            file.md5 = md5(str);
            file.size = str.length;
            return file.save(function (err) {
              if (err) return cb(err);
              return cb();
            });
          }
        });
      }
    });
};

/**
 * Write file on FileSystem and store attached data in MongoDB
 * @param {Object} opts Options available
 * @param {Object} opts.file File representation
 * @param {String} opts.file.name
 * @param {Buffer} opts.file.data
 * @param {String} opts.file.mimetype
 * @param {String} opts.accountId Account id
 * @param {String} opts.documentId Document id
 * @param {Function} cb Callback function(err, res) (err: error process OR null, res: DocumentsFiles instance OR undefined)
 * @returns {undefined} undefined
 */
Self.upload = function (opts, cb) {
  let data = opts.file.data.toString('binary');
  return DocumentsFiles.create(
    {
      uploaded_by: opts.accountId,
      document: opts.documentId,
      filename: opts.file.name,
      encoding: 'binary',
      md5: md5(data),
      mimetype: opts.file.mimetype,
      size: data.length,
      path: Self.getPath(opts.documentId.toString(), opts.file.name),
      metadata: !opts.metadata ? {} : opts.metadata
    },
    function (err, file) {
      if (err) cb(err);
      return fs.mkdir(Self.getDirectory(opts.documentId.toString()), { recursive: true }, (err) => {
        if (err) cb(err);
        return fs.writeFile(file.path, data, 'binary', function (err, res) {
          if (err) cb(err);
          return cb(null, file);
        });
      });
    }
  );
};

module.exports = Self;
