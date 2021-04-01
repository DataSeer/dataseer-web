/*
 * @prettier
 */

'use strict';

const md5 = require('md5'),
  path = require('path'),
  fs = require('fs');

const DocumentsFiles = require('../models/documents.files.js');

const conf = require('../conf/conf.json');

let Self = {};

/**
 * Check if mimetype is PDF
 * @param {string} mimetype - Given mimtype
 * @returns {boolean} True if mimetype matched, else false
 */
Self.isPDF = function (mimetype) {
  return mimetype === 'application/pdf';
};

/**
 * Check if mimetype is XML
 * @param {string} mimetype - Given mimtype
 * @returns {boolean} True if mimetype matched, else false
 */
Self.isXML = function (mimetype) {
  return mimetype === 'text/xml' || mimetype === 'application/xml';
};

/**
 * Get path (on FileSystem) of given documentId
 * @param {string} documentId - Document id
 * @param {string} filename - Filename
 * @returns {string} Full path of filename
 */
Self.getPath = function (documentId, filename) {
  return path.join(Self.getDirectory(documentId), filename);
};

/**
 * Get directory (on FileSystem) of given documentId
 * @param {string} - documentId Document id
 * @returns {string} Full path of directory or undefined
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
 * @param {mongoose.Schema.Types.ObjectId} id - File id
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: file content (string) OR undefined)
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
 * Delete file
 * @param {mongoose.Schema.Types.ObjectId} id - File id
 * @param {function} cb - Callback function(err, res) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.deleteFile = function (id, cb) {
  return DocumentsFiles.findById(id)
    .select('+path') // path is not returned by default
    .exec(function (err, file) {
      if (err) return cb(err);
      else
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
 * @param {mongoose.Schema.Types.ObjectId} id - File id
 * @param {string} data - File data
 * @param {function} cb - Callback function(err, res) (err: error process OR undefined)
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
 * @param {object} opts - Options available
 * @param {object} opts.file - File representation
 * @param {string} opts.file.name - File name
 * @param {buffer} opts.file.data - File content
 * @param {string} opts.file.mimetype - File mimetype
 * @param {string} opts.accountId - Account id
 * @param {string} opts.documentId - Document id
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: DocumentsFiles instance OR undefined)
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
      if (err) return cb(err);
      return fs.mkdir(Self.getDirectory(opts.documentId.toString()), { recursive: true }, (err) => {
        if (err) return cb(err);
        return fs.writeFile(file.path, data, 'binary', function (err, res) {
          if (err) return cb(err);
          return cb(null, file);
        });
      });
    }
  );
};

module.exports = Self;
