/*
 * @prettier
 */

'use strict';

const Documents = require('../models/documents.js'),
  Accounts = require('../models/accounts.js'),
  Organisations = require('../models/organisations.js'),
  DocumentsDatasets = require('../models/documents.datasets.js'),
  DocumentsFiles = require('../models/documents.files.js'),
  DocumentsLogs = require('../models/documents.logs.js'),
  DocumentsMetadata = require('../models/documents.metadata.js');

const AccountsController = require('../controllers/accounts.js'),
  DocumentsFilesController = require('../controllers/documents.files.js');

const DataSeerML = require('../lib/dataseer-ml.js'),
  AccountsManager = require('../lib/accounts.js'),
  JWT = require('../lib/jwt.js'),
  XML = require('../lib/xml.js');

const async = require('async'),
  mongoose = require('mongoose');

const conf = require('../conf/conf.json');

let Self = {};

/**
 * Add watcher if necessary
 * @param {string} token - Given JWT
 * @param {string} privateKey - Private key of JWT
 * @param {object} opts - JWT opts (see https://www.npmjs.com/package/jsonwebtoken#jwtverifytoken-secretorpublickey-options-callback)
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: decoded JWT OR undefined)
 * @returns {undefined} undefined
 */
Self.watch = function (req, res, next) {
  if (!req.user) return next();
  let accountId = req.user._id.toString();
  if (conf.tokens.documents.accountId === accountId) return next(); // case this is a visitor
  let documentId = req.params.id;
  if (!documentId) return next();
  return Documents.findOne({ _id: documentId }, function (err, doc) {
    if (err || !doc) return next();
    if (doc.watchers.indexOf(accountId) === -1) {
      doc.watchers.push(accountId);
      return doc.save(function (err) {
        if (err) return next(err);
        else return next();
      });
    } else return next();
  });
};

/**
 * Authenticate account with JWT (documentToken)
 * @param {object} req - req express variable
 * @param {object} res - res express variable
 * @param {function} next - next express variable
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
        return Documents.findOne({ _id: decoded.documentId }, function (err, doc) {
          if (err || !doc) return next();
          if (doc._id.toString() === decoded.documentId) {
            req.user = user; // Set user
            res.locals = { useDocumentToken: true };
          }
          return next();
        });
      });
    });
};

/**
 * Check params & build params for Self.upload() function
 * @param {object} params - Options available
 * @param {object} params.files - JSON Object of files in req.files (available keys: "file" OR "attached_files")
 * @param {string} params.files[key].name - File name
 * @param {buffer} params.files[key].data - File data
 * @param {number} params.files[key].size - File size
 * @param {string} params.files[key].encoding - File encoding
 * @param {string} params.files[key].mimetype - File mimetype
 * @param {string} params.files[key].md5 - File md5
 * @param {boolean} params.already_assessed - Already assessed
 * @param {boolean} params.isDataseer - Is DataSeer
 * @param {string} params.journal - Journal of document owner
 * @param {string} params.email - Email of owner
 * @param {string} params.fullname - Fullname of owner
 * @param {string} params.uploaded_by - Id of uploader
 * @param {string} params.dataseerML - Process dataseer-ml
 * @param {object} events - Events
 * @param {function} events.onCreatedAccount - Function called if new Account is created
 * @param {function} events.onCreatedJournal - Function called if new Journal is created
 * @returns {object} Options for Self.upload() function or new Error(msg)
 */
Self.getUploadParams = function (params = {}, user) {
  // If file is not set
  if (!params.files || !params.files['file']) return new Error('You must select a file !');
  let alreadyAssessed = !!params.already_assessed,
    file = params.files['file'],
    attachedFiles = Array.isArray(params.files['attached_files']) ? params.files['attached_files'] : [],
    opts = {
      alreadyAssessed,
      file,
      attachedFiles
    };
  // If there is no user
  if (!user) {
    opts.journal = params.journal;
    opts.email = params.email;
    opts.fullname = params.fullname;
    opts.dataseerML = true; // always proceed dataseer-ml
    return opts;
  }
  // Else get data from user
  opts.uploaded_by = user._id;
  if (!AccountsManager.checkAccessRight(user, AccountsManager.roles.curator, AccountsManager.match.role)) {
    // Case of standard_user OR annotator
    opts.journal = user.organisation.name;
    opts.email = user.username;
    opts.fullname = user.fullname;
    opts.dataseerML = true; // always proceed dataseer-ml
  } else {
    // Case of curator
    // If journal AND existing_journal are not set
    if (!params.journal && !params.existing_journal)
      return new Error('You must select an existing "Journal" (or fill in "Journal" field) !');
    opts.journal = !params.journal ? params.existing_journal : params.journal;
    // If there is no account AND email is invalid
    if (!params.account && (typeof params.email !== 'string' || !AccountsController.RegExp.email.test(params.email)))
      return new Error('Invalid Email !');
    // If user data are not set
    if (!(params.account || (params.email && params.fullname)))
      return new Error('You must select an existing "Email" (or fill in "Full Name" and "Email" fields) !');
    if (params.account) {
      // If there is an existing account, data will be: email;fullname
      let tmp = params.account.split(';');
      opts.email = tmp[0];
      opts.fullname = tmp[1];
    } else {
      // If there is an new account
      opts.email = params.email;
      opts.fullname = params.fullname;
    }
    // dataseer-ml processing
    opts.dataseerML = !!params.dataseerML;
  }
  return opts;
};

/**
 * Write file on FileSystem and store attached data in MongoDB
 * @param {object} opts - Options available
 * @param {object} opts.dataTypes - DataTypes JSON (stored in app.get('dataTypes'))
 * @param {object} opts.file - File representation
 * @param {string} opts.file.name - File name
 * @param {buffer} opts.file.data - File data
 * @param {number} opts.file.size - File size
 * @param {string} opts.file.encoding - File encoding
 * @param {string} opts.file.mimetype - File mimetype
 * @param {string} opts.file.md5 - File md5
 * @param {Array} opts.attachedFiles - Array of attached files (same structure as opts.file)
 * @param {boolean} opts.already_assessed - Already assessed
 * @param {boolean} opts.isDataseer - Is DataSeer
 * @param {string} opts.journal - Journal of document owner
 * @param {string} opts.email - Email of owner
 * @param {string} opts.fullname - Fullname of owner
 * @param {string} opts.uploaded_by - Id of uploader
 * @param {string} opts.dataseerML - Process dataseer-ml
 * @param {string} opts.privateKey - PrivateKey to create JWT token (stored in app.get('private.key'))
 * @param {object} events - Events
 * @param {function} events.onCreatedAccount - Function called if new Account is created
 * @param {function} events.onCreatedJournal - Function called if new Journal is created
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: Document instance OR undefined)
 * @returns {undefined} undefined
 */
Self.upload = function (opts = {}, events, cb) {
  let fromVisitor = !opts.uploaded_by; // If there is no uploaded_by property, that means request comes from visitor
  return Documents.create(
    {
      isDataseer: opts.isDataseer,
      already_assessed: opts.already_assessed,
      watchers: []
    },
    function (err, doc) {
      if (err) return cb(err);
      let actions = [
        // Get organisation
        // Set organisation & upload_journal properties
        function (acc, callback) {
          return Organisations.findOne({ name: opts.journal }).exec(function (err, organisation) {
            if (err) return callback(err);
            // If organisation does not exist already
            if (!organisation) {
              if (fromVisitor) {
                // Set default organisation id
                acc.organisation = conf.upload.default.journal;
                acc.upload_journal = conf.upload.default.journal;
                return callback(null, acc);
              } else {
                // Or create it if user is logged
                return Organisations.create({ name: opts.journal }, function (err, res) {
                  if (err) return callback(err, acc);
                  else {
                    if (typeof events.onCreatedJournal === 'function') events.onCreatedJournal(res);
                    // Set organisation id
                    acc.organisation = res._id;
                    acc.upload_journal = res._id;
                    return callback(null, acc);
                  }
                });
              }
            } else {
              // Set organisation id
              acc.organisation = organisation._id;
              acc.upload_journal = organisation._id;
              return callback(null, acc);
            }
          });
        },
        // Get account
        // Set owner property
        function (acc, callback) {
          return Accounts.findOne({ username: opts.email }).exec(function (err, account) {
            if (err) return callback(err);
            // If account does not exist already, create it
            if (!account)
              return AccountsController.signup(
                {
                  username: opts.email,
                  fullname: opts.fullname,
                  organisation: acc.organisation,
                  password: Math.random().toString(36).substring(2)
                },
                function (err, res) {
                  if (err) return callback(err, acc);
                  else {
                    if (typeof events.onCreatedAccount === 'function') events.onCreatedAccount(res);
                    // Set owner id
                    acc.owner = res._id;
                    return callback(null, acc);
                  }
                }
              );
            else {
              // Set owner id
              acc.owner = account._id;
              return callback(null, acc);
            }
          });
        },
        // Set watchers & uploaded_by properties
        function (acc, callback) {
          // Set opts.uploaded_by if uploader is not set (that means request comes from outside DataSeer app)
          if (fromVisitor) opts.uploaded_by = acc.owner;
          acc.uploaded_by = opts.uploaded_by;
          // Set watchers if necessary
          if (acc.watchers.indexOf(acc.owner) === -1) acc.watchers.push(acc.owner);
          if (acc.watchers.indexOf(acc.uploaded_by) === -1) acc.watchers.push(acc.uploaded_by);
          return callback(null, acc);
        },
        // Upload file (and process dataseer-ml if necessary)
        function (acc, callback) {
          if (
            !DocumentsFilesController.isPDF(opts.file.mimetype) &&
            !DocumentsFilesController.isXML(opts.file.mimetype)
          )
            return callback(new Error('Bad content type'), acc);
          return DocumentsFilesController.upload(
            { accountId: opts.uploaded_by, documentId: acc._id, file: opts.file },
            function (err, res) {
              if (err) return callback(err, acc);
              if (!Array.isArray(acc.files)) acc.files = [];
              // Add file to files
              acc.files.push(res._id);
              if (DocumentsFilesController.isPDF(res.mimetype)) {
                // Set PDF
                acc.pdf = res._id;
              } else if (DocumentsFilesController.isXML(res.mimetype)) {
                // Set TEI
                acc.tei = res._id;
              }
              if (opts.dataseerML)
                return DataSeerML.processFile(opts.file, function (err, res) {
                  // If error while processing dataseer-ml
                  if (err) return callback(err, acc);
                  else
                    return DocumentsFilesController.upload(
                      {
                        accountId: opts.uploaded_by,
                        documentId: acc._id,
                        file: {
                          name: opts.file.name + '.xml.tei',
                          data: XML.addSentencesId(res), // Add sentences id in TEI
                          mimetype: 'text/xml'
                        }
                      },
                      function (err, res) {
                        // If error while uploading new file (result of dataseer-ml processing)
                        if (err) return callback(err, acc);
                        acc.tei = res._id;
                        acc.files.push(res._id);
                        return callback(null, acc);
                      }
                    );
                });
              else return callback(null, acc);
            }
          );
        },
        // Upload attachedFiles
        function (acc, callback) {
          if (!opts.attachedFiles || !opts.attachedFiles.length) return callback(null, acc);
          return async.each(
            opts.attachedFiles,
            function (file, next) {
              return DocumentsFilesController.upload(
                { accountId: opts.uploaded_by, documentId: acc._id, file: file },
                function (err, res) {
                  // If error while uploading attachedFile
                  if (err) return next(err);
                  else {
                    acc.files.push(res._id);
                    return next();
                  }
                }
              );
            },
            function (err) {
              if (err) console.log(err);
              return callback(err, acc);
            }
          );
        },
        // Get PDF metadata
        function (acc, callback) {
          if (acc.pdf && acc.tei)
            // extract PDF metadata
            return Self.extractPDFMetadata(acc, function (err) {
              if (err) return callback(err, acc);
              else return callback(null, acc);
            });
          else return callback(null, acc);
        },
        // Get metadata in TEI file
        function (acc, callback) {
          if (acc.tei)
            // Extract metadata of document
            return Self.extractMetadata(acc, function (err) {
              if (err) return callback(err, acc);
              else return callback(null, acc);
            });
          return callback(null, acc);
        },
        // Get datasets in TEI file
        function (acc, callback) {
          if (acc.tei)
            // Extract datasets of document
            return Self.extractDatasets(acc, opts.dataTypes, function (err) {
              if (err) return callback(err, acc);
              else return callback(null, acc);
            });
          return callback(null, acc);
        }
      ];
      // Execute all actions & create document
      return async.reduce(
        actions,
        doc, // document
        function (acc, action, next) {
          return action(acc, function (err) {
            return next(err, acc);
          });
        },
        function (err, result) {
          if (err) return cb(err);
          // Create logs
          return DocumentsLogs.create(
            {
              document: result._id,
              user: opts.uploaded_by,
              action: 'UPLOAD'
            },
            function (err, log) {
              if (err) return cb(err);
              else if (!log) return cb(new Error('Log not found'));
              result.logs.push(log._id);
              result.status = 'metadata';
              return JWT.create(
                {
                  documentId: result._id,
                  accountId: conf.tokens.documents.accountId
                },
                opts.privateKey,
                conf.tokens.documents.expiresIn,
                function (err, token) {
                  if (err) return cb(err);
                  result.token = token;
                  return result.save(function (err) {
                    if (err) return cb(err);
                    return cb(null, result);
                  });
                }
              );
            }
          );
        }
      );
    }
  );
};

/**
 * Write file on FileSystem and store attached data in MongoDB
 * @param {string} documentId - Document Id
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: Document instance OR undefined)
 * @returns {undefined} undefined
 */
Self.delete = function (documentId, cb) {
  return Documents.findById(documentId).exec(function (err, doc) {
    if (err) return cb(err);
    if (!doc) return cb(new Error('Document not found'));
    // Delete files on FileSystem
    return async.each(
      doc.files,
      function (item, callback) {
        return DocumentsFilesController.deleteFile(item.toString(), function (err) {
          return callback(err);
        });
      },
      function (err) {
        if (err) return cb(err);
        let actions = [
          // Delete DocumentsLogs
          function (callback) {
            return DocumentsLogs.deleteOne({ document: doc._id.toString() }, function (err) {
              return callback(err);
            });
          },
          // Delete DocumentsFiles
          function (callback) {
            return DocumentsFiles.deleteOne({ document: doc._id.toString() }, function (err) {
              return callback(err);
            });
          },
          // Delete DocumentsMetadata
          function (callback) {
            return DocumentsMetadata.deleteOne({ document: doc._id.toString() }, function (err) {
              return callback(err);
            });
          },
          // Delete DocumentsDatasets
          function (callback) {
            return DocumentsDatasets.deleteOne({ document: doc._id.toString() }, function (err) {
              return callback(err);
            });
          }
        ];
        // Execute all delete actions
        return async.each(
          actions,
          function (action, callback) {
            return action(callback);
          },
          function (err) {
            if (err) return cb(err);
            return Documents.deleteOne({ _id: doc._id.toString() }, function (err) {
              return cb(err);
            });
          }
        );
      }
    );
  });
};

/**
 * Extract metadata of PDF file (stored in TEI file) of given document and update it
 * @param {object} doc - Options available
 * @param {mongoose.Schema.Types.ObjectId} doc.pdf - PDF file id
 * @param {mongoose.Schema.Types.ObjectId} doc.tei - TEI file id
 * @param {function} cb - Callback function(err) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.extractPDFMetadata = function (doc, cb) {
  if (doc.pdf && doc.tei)
    // Read TEI file (containing PDF metadata)
    return DocumentsFilesController.readFile(doc.tei, function (err, data) {
      if (err) return cb(err);
      else
        return DocumentsFiles.findById(doc.pdf).exec(function (err, file) {
          if (err) return cb(err);
          // Add metadata in file
          file.metadata = { sentences: XML.extractPDFSentencesMetadata(XML.load(data.toString())) };
          return file.save(function (err) {
            if (err) return cb(err);
            else return cb(null);
          });
        });
    });
  else return cb(new Error('There is no PDF and TEI file in this document'));
};

/**
 * Extract metadata stored TEI file of given document and create MongoDB item
 * @param {object} doc - Options available
 * @param {mongoose.Schema.Types.ObjectId} doc.tei - TEI file id
 * @param {function} cb - Callback function(err) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.extractMetadata = function (doc, cb) {
  if (doc.tei)
    // Read TEI file (containing PDF metadata)
    return DocumentsFilesController.readFile(doc.tei, function (err, data) {
      if (err) return cb(err);
      else {
        // Add metadata in MongoDB
        let metadata = XML.extractMetadata(XML.load(data.toString()));
        metadata.document = doc._id; // Link it to the document
        return DocumentsMetadata.create(metadata, function (err, metadata) {
          doc.metadata = metadata._id; // Link it to the metadata
          return doc.save(function (err) {
            if (err) return cb(err);
            else return cb(null);
          });
        });
      }
    });
  else return cb(new Error('There is no TEI file in this document'));
};

/**
 * Update metadata stored TEI file of given document and create MongoDB item
 * @param {object} doc - Options available
 * @param {mongoose.Schema.Types.ObjectId} doc.tei - TEI file id
 * @param {object} user - Options available
 * @param {mongoose.Schema.Types.ObjectId} user._id - User id
 * @param {function} cb - Callback function(err) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.updateMetadata = function (doc, user, cb) {
  if (doc.tei)
    // Read TEI file (containing PDF metadata)
    return DocumentsFilesController.readFile(doc.tei, function (err, data) {
      if (err) return cb(err);
      else {
        // Get metadata
        let metadata = XML.extractMetadata(XML.load(data.toString()));
        // Update them
        return DocumentsMetadata.findOneAndUpdate({ _id: doc.metadata }, metadata).exec(function (err, metadata) {
          if (err) return cb(err);
          // Create logs
          return DocumentsLogs.create(
            {
              document: doc._id,
              user: user._id,
              action: 'RELOAD METADATA'
            },
            function (err, log) {
              doc.logs.push(log._id);
              return doc.save(function (err) {
                if (err) return cb(err);
                return cb();
              });
            }
          );
        });
      }
    });
  else return cb(new Error('There is no TEI file in this document'));
};

/**
 * Extract datasets stored TEI file of given document and create MongoDB item
 * @param {object} doc - Options available
 * @param {mongoose.Schema.Types.ObjectId} doc.tei - TEI file id
 * @param {object} dataTypes - DataTypes JSON (stored in app.get('dataTypes'))
 * @param {function} cb - Callback function(err) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.extractDatasets = function (doc, dataTypes, cb) {
  if (doc.tei)
    // Read TEI file (containing PDF metadata)
    return DocumentsFilesController.readFile(doc.tei, function (err, data) {
      if (err) return cb(err);
      else
        return DocumentsFiles.findById(doc.pdf).exec(function (err, file) {
          if (err) return cb(err);
          // Add metadata in MongoDB
          let datasets = XML.extractDatasets(XML.load(data.toString()), dataTypes),
            item = {
              document: doc._id,
              extracted: datasets,
              current: datasets,
              deleted: []
            };
          return DocumentsDatasets.create(item, function (err, datasets) {
            doc.datasets = datasets._id; // Link it to the datasets
            return doc.save(function (err) {
              if (err) return cb(err);
              else return cb(null);
            });
          });
        });
    });
  else return cb(new Error('There is no TEI file in this document'));
};

/**
 * Add dataset in TEI file
 * @param {object} opts - JSON object containing all data
 * @param {string} opts.documentId - Document id
 * @param {object} opts.dataset - JSON object containing all dataset infos
 * @param {string} opts.dataset.sentenceId - Dataset sentenceId
 * @param {string} opts.dataset.id - Dataset id
 * @param {string} opts.dataset.type - Dataset type
 * @param {string} opts.dataset.cert - Dataset cert
 * @param {function} cb - Callback function(err) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.addDatasetInTEI = function (opts = {}, cb) {
  return Documents.findById(opts.documentId).exec(function (err, doc) {
    if (err) return cb(err);
    else
      return DocumentsFilesController.readFile(doc.tei, function (err, data) {
        if (err) return cb(err);
        let newXml = XML.addDataset(XML.load(data.toString()), opts.dataset);
        if (!newXml) return cb(new Error('Add dataset failed'));
        else
          return DocumentsFilesController.rewriteFile(doc.tei, newXml, function (err) {
            if (err) return cb(err);
            else return cb(null);
          });
      });
  });
};

/**
 * Delete dataset in TEI file
 * @param {object} opts JSON object containing all data
 * @param {string} opts.documentId - Document id
 * @param {object} opts.dataset - JSON object containing all dataset infos
 * @param {string} opts.dataset.sentenceId - Dataset sentenceId
 * @param {function} cb - Callback function(err) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.deleteDatasetInTEI = function (opts = {}, cb) {
  return Documents.findById(opts.documentId).exec(function (err, doc) {
    if (err) return cb(err);
    else
      return DocumentsFilesController.readFile(doc.tei, function (err, data) {
        if (err) return cb(err);
        let newXml = XML.deleteDataset(XML.load(data.toString()), opts.dataset);
        if (!newXml) return cb(new Error('Delete dataset failed'));
        else
          return DocumentsFilesController.rewriteFile(doc.tei, newXml, function (err) {
            if (err) return cb(err);
            else return cb(null);
          });
      });
  });
};

/**
 * Add corresp in TEI file
 * @param {object} opts JSON object containing all data
 * @param {string} opts.documentId - Document id
 * @param {object} opts.dataset - JSON object containing all dataset infos
 * @param {string} opts.dataset.sentenceId - Dataset sentenceId
 * @param {string} opts.dataset.id - Dataset id
 * @param {function} cb - Callback function(err) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.addCorrespInTEI = function (opts = {}, cb) {
  return Documents.findById(opts.documentId).exec(function (err, doc) {
    if (err) return cb(err);
    else
      return DocumentsFilesController.readFile(doc.tei, function (err, data) {
        if (err) return cb(err);
        let newXml = XML.addCorresp(XML.load(data.toString()), opts.dataset);
        if (!newXml) return cb(new Error('Add corresp failed'));
        else
          return DocumentsFilesController.rewriteFile(doc.tei, newXml, function (err) {
            if (err) return cb(err);
            else return cb(null);
          });
      });
  });
};

/**
 * Delete corresp in TEI file
 * @param {object} opts JSON object containing all data
 * @param {string} opts.documentId - Document id
 * @param {object} opts.dataset - JSON object containing all dataset infos
 * @param {string} opts.dataset.sentenceId - Dataset sentenceId
 * @param {string} opts.dataset.id - Dataset id
 * @param {function} cb - Callback function(err) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.deleteCorrespInTEI = function (opts = {}, cb) {
  return Documents.findById(opts.documentId).exec(function (err, doc) {
    if (err) return cb(err);
    else
      return DocumentsFilesController.readFile(doc.tei, function (err, data) {
        if (err) return cb(err);
        let newXml = XML.deleteCorresp(XML.load(data.toString()), opts.dataset);
        if (!newXml) return cb(new Error('Delete corresp failed'));
        else
          return DocumentsFilesController.rewriteFile(doc.tei, newXml, function (err) {
            if (err) return cb(err);
            else return cb(null);
          });
      });
  });
};

module.exports = Self;
