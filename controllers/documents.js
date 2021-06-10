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
  DocumentsDatasetsController = require('../controllers/documents.datasets.js'),
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
        return Documents.findOne({ _id: decoded.documentId, token: token }, function (err, doc) {
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
  if (typeof params.journal === 'string') params.journal = params.journal.replace(/\s+/gm, ' ');
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
        // Get TEI metadata
        function (acc, callback) {
          if (acc.pdf && acc.tei)
            // extract TEI metadata
            return Self.extractTEIMetadata(acc, function (err) {
              if (err) return callback(err, acc);
              else return callback(null, acc);
            });
          else return callback(null, acc);
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
          if (err)
            return Self.delete(result._id.toString(), function (_err) {
              return cb(err);
            });
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
    if (err) return cb(err);
    let actions = [
      // Delete DocumentsLogs
      function (callback) {
        return DocumentsLogs.deleteMany({ document: doc._id.toString() }, function (err) {
          return callback(err);
        });
      },
      // Delete DocumentsFiles
      function (callback) {
        return DocumentsFiles.find({ document: doc._id.toString() }, function (err, files) {
          if (err) return callback(err);
          if (Array.isArray(files) && files.length)
            return async.each(
              files,
              function (file, next) {
                // Delete files on FileSystem & in mongoDB
                return DocumentsFilesController.deleteFile(file._id.toString(), function (err) {
                  return next(err);
                });
              },
              function (err) {
                return callback(err);
              }
            );
          else return callback();
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
          file.metadata = XML.extractPDFSentencesMetadata(XML.load(data.toString()));
          return file.save(function (err) {
            if (err) return cb(err);
            else return cb(null, file.metadata);
          });
        });
    });
  else return cb(new Error('There is no PDF and TEI file in this document'));
};

/**
 * Extract metadata of PDF file (stored in TEI file) of given document and update it
 * @param {object} doc - Options available
 * @param {mongoose.Schema.Types.ObjectId} doc.tei - TEI file id
 * @param {function} cb - Callback function(err) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.extractTEIMetadata = function (doc, cb) {
  if (doc.tei)
    // Read TEI file (containing TEI metadata)
    return DocumentsFilesController.readFile(doc.tei, function (err, data) {
      if (err) return cb(err);
      else
        return DocumentsFiles.findById(doc.tei).exec(function (err, file) {
          if (err) return cb(err);
          // Add metadata in file
          file.metadata = XML.extractTEISentencesMetadata(XML.load(data.toString()));
          return file.save(function (err) {
            if (err) return cb(err);
            else return cb(null, file.metadata);
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
          if (err) return cb(err);
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
 * Update PDF file
 * @param {object} doc - Options available
 * @param {mongoose.Schema.Types.ObjectId} doc.tei - TEI file id
 * @param {object} user - Options available
 * @param {mongoose.Schema.Types.ObjectId} user._id - User id
 * @param {function} cb - Callback function(err) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.updatePDF = function (doc, user, cb) {
  return Self.extractPDFMetadata(doc, function (err, res) {
    if (err) return cb(err);
    return cb(null, true);
  });
};

/**
 * Update TEI file
 * @param {object} doc - Options available
 * @param {mongoose.Schema.Types.ObjectId} doc.tei - TEI file id
 * @param {object} user - Options available
 * @param {mongoose.Schema.Types.ObjectId} user._id - User id
 * @param {function} cb - Callback function(err) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.updateTEI = function (doc, user, cb) {
  if (doc.tei)
    // Read TEI file (containing PDF metadata)
    return DocumentsFiles.findOne({ _id: doc.tei }, function (err, file) {
      if (err) return cb(err);
      if (!file) return cb(null, new Error('DocumentsFile not found'));
      return DocumentsFilesController.readFile(doc.tei, function (err, data) {
        if (err) return cb(err);
        else {
          // Get metadata
          let version = !file.metadata || !file.metadata.version ? 1 : file.metadata.version;
          let newXML = XML.convertOldFormat(XML.load(data.toString()), version);
          let metadata = XML.extractTEISentencesMetadata(XML.load(newXML));
          file.metadata = metadata;
          // Update them
          return DocumentsFilesController.rewriteFile(doc.tei._id, newXML, function (err, data) {
            if (err) return cb(err);
            // Create logs
            return DocumentsLogs.create(
              {
                document: doc._id,
                user: user._id,
                action: 'UPDATE TEI'
              },
              function (err, log) {
                if (err) return cb(err);
                doc.logs.push(log._id);
                return doc.save(function (err) {
                  if (err) return cb(err);
                  return file.save(function (err) {
                    if (err) return cb(err);
                    return cb(null, true);
                  });
                });
              }
            );
          });
        }
      });
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
              if (err) return cb(err);
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
            if (err) return cb(err);
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
 * Update datasets informations in MongoDB (based on the stored TEI file of given document)
 * @param {object} user - User
 * @param {object} doc - Document
 * @param {mongoose.Schema.Types.ObjectId} doc.tei - TEI file id
 * @param {object} doc.datasets - Datasets of the document
 * @param {object} dataTypes - DataTypes JSON (stored in app.get('dataTypes'))
 * @param {function} cb - Callback function(err) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.refreshDatasets = function (user, doc, dataTypes, cb) {
  if (doc.tei)
    // Read TEI file (containing PDF metadata)
    return DocumentsFilesController.readFile(doc.tei, function (err, data) {
      if (err) return cb(err);
      else
        return DocumentsFiles.findById(doc.pdf).exec(function (err, file) {
          if (err) return cb(err);
          // Add metadata in MongoDB
          let datasetsMapping = {},
            datasets = XML.extractDatasets(XML.load(data.toString()), dataTypes);
          return async.mapSeries(
            datasets,
            function (dataset, callback) {
              return Self.updateDataset(
                { user: user, datasetsId: doc.datasets._id, dataset: dataset },
                function (err, res) {
                  return callback(err);
                }
              );
            },
            function (err) {
              return cb(err);
            }
          );
        });
    });
  else return cb(new Error('There is no TEI file in this document'));
};

/**
 * Create new dataset
 * @param {object} opts - JSON containing all data
 * @param {string} opts.user - User
 * @param {string} opts.datasetsId - Datasets id
 * @param {string} opts.sentence - Sentence
 * @param {string} opts.sentence.id - Sentence id
 * @param {string} opts.dataset - Dataset
 * @param {boolean} opts.dataset.reuse - Dataset reuse property
 * @param {string} opts.dataset.cert - Dataset cert value (between 0 and 1)
 * @param {string} opts.dataset.dataType - Dataset dataType
 * @param {string} opts.dataset.subType - Dataset subType
 * @param {string} opts.dataset.description - Dataset description
 * @param {string} opts.dataset.bestDataFormatForSharing - Dataset best data format for sharing
 * @param {string} opts.dataset.mostSuitableRepositories - Dataset most suitable repositories
 * @param {string} opts.dataset.DOI - Dataset DOI
 * @param {string} opts.dataset.name - Dataset name
 * @param {string} opts.dataset.comments - Dataset comments
 * @param {function} cb - Callback function(err, res) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.newDataset = function (opts = {}, cb) {
  // If there is not enough data
  if (!opts.datasetsId) return cb(new Error('datasetsId missing'));
  if (!opts.dataset) return cb(new Error('dataset properties missing'));
  if (!opts.sentence || !opts.sentence.id) return cb(new Error('sentence properties missing'));
  // Init transaction
  let transaction = DocumentsDatasets.findOne({ _id: opts.datasetsId });
  // Execute transaction
  return transaction.exec(function (err, datasets) {
    if (err) return cb(err);
    else if (!datasets) return cb(new Error('datasets not found'));
    return Self.addDatasetInTEI(
      {
        documentId: datasets.document,
        sentence: { id: opts.sentence.id },
        dataset: {
          reuse: opts.dataset.reuse ? !!opts.dataset.reuse : false,
          type: opts.dataset.dataType,
          subtype: opts.dataset.subType,
          cert: opts.dataset.cert
        }
      },
      function (err, teiInfos) {
        if (err) return cb(err);
        let error = false;
        // Check dataset with opts.id already exist
        for (let i = 0; i < datasets.current.length; i++) {
          if (datasets.current[i].id === teiInfos.dataset.id) error = true;
        }
        if (error) return cb(new Error('dataset not created in mongodb'));
        // add new dataset
        opts.dataset.id = teiInfos.dataset.id;
        opts.dataset.dataInstanceId = teiInfos.dataset.dataInstanceId;
        opts.dataset.sentences = [teiInfos.links[0].sentence];
        let dataset = DocumentsDatasetsController.createDataset(opts.dataset);
        datasets.current.push(dataset);
        let mongoInfos = dataset;
        return datasets.save(function (err, res) {
          if (err) return cb(err);
          // Get Document
          return Documents.findOne({ _id: datasets.document }).exec(function (err, doc) {
            if (err) return cb(err);
            // Create logs
            return DocumentsLogs.create(
              {
                document: doc._id,
                user: opts.user._id,
                action: 'NEW DATASET ' + dataset.id
              },
              function (err, log) {
                if (err) return cb(err);
                else if (!log) return cb(new Error('log not found'));
                doc.logs.push(log._id);
                if (err) return cb(err);
                return doc.save(function (err) {
                  if (err) return cb(err);
                  return cb(null, { mongo: mongoInfos, tei: teiInfos });
                });
              }
            );
          });
        });
      }
    );
  });
};

/**
 * Update dataset
 * @param {object} opts - JSON containing all data
 * @param {string} opts.user - User
 * @param {string} opts.fromAPI - update dataset without sentences & dataInstanceId properties
 * @param {string} opts.datasetsId - Datasets id
 * @param {string} opts.dataset.id - Dataset id
 * @param {string} opts.dataset.dataInstanceId - Dataset dataInstanceId
 * @param {string} opts.dataset.sentences - Dataset sentences
 * @param {boolean} opts.dataset.reuse - Dataset reuse property
 * @param {string} opts.dataset.cert - Dataset cert value (between 0 and 1)
 * @param {string} opts.dataset.dataType - Dataset dataType
 * @param {string} opts.dataset.subType - Dataset subType
 * @param {string} opts.dataset.description - Dataset description
 * @param {string} opts.dataset.bestDataFormatForSharing - Dataset best data format for sharing
 * @param {string} opts.dataset.mostSuitableRepositories - Dataset most suitable repositories
 * @param {string} opts.dataset.DOI - Dataset DOI
 * @param {string} opts.dataset.name - Dataset name
 * @param {string} opts.dataset.comments - Dataset comments
 * @param {function} cb - Callback function(err, res) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.updateDataset = function (opts = {}, cb) {
  // If there is not enough data
  if (!opts.datasetsId) return cb(new Error('datasetsId missing'));
  if (!opts.dataset || !opts.dataset.id) return cb(new Error('dataset properties missing'));
  // Init transaction
  let transaction = DocumentsDatasets.findOne({ _id: opts.datasetsId });
  // Execute transaction
  return transaction.exec(function (err, datasets) {
    if (err) return cb(err);
    else if (!datasets) return cb(new Error('datasets not found'));
    return Self.updateDatasetInTEI(
      {
        documentId: datasets.document,
        dataset: {
          id: opts.dataset.id,
          reuse: opts.dataset.reuse ? !!opts.dataset.reuse : false,
          type: opts.dataset.dataType,
          subtype: opts.dataset.subType,
          cert: opts.dataset.cert
        }
      },
      function (err, teiInfos) {
        if (err) return cb(err);
        // Check dataset with opts.id already exist
        let updated = false,
          dataset;
        for (let i = 0; i < datasets.current.length; i++) {
          // update dataset
          if (datasets.current[i].id === opts.dataset.id) {
            updated = true;
            if (opts.fromAPI) {
              opts.dataset.dataInstanceId = datasets.current[i].dataInstanceId;
              opts.dataset.sentences = datasets.current[i].sentences;
            }
            datasets.current[i] = DocumentsDatasetsController.createDataset(opts.dataset);
            dataset = datasets.current[i];
          }
        }
        if (!updated) return cb(new Error('dataset not updated in mongodb'));
        let mongoInfos = dataset;
        return datasets.save(function (err, res) {
          if (err) return cb(err);
          // Get Document
          else
            return Documents.findOne({ _id: datasets.document }).exec(function (err, doc) {
              if (err) return cb(err);
              return DocumentsLogs.findOne(
                {
                  document: doc._id,
                  user: opts.user._id,
                  action: 'UPDATE DATASET ' + dataset.id
                },
                function (err, log) {
                  if (err) return cb(err);
                  if (log) {
                    log.date = Date.now();
                    return log.save(function (err) {
                      if (err) return cb(err);
                      return cb(null, { mongo: mongoInfos, tei: teiInfos });
                    });
                  }
                  // Create logs
                  return DocumentsLogs.create(
                    {
                      document: doc._id,
                      user: opts.user._id,
                      action: 'UPDATE DATASET ' + dataset.id
                    },
                    function (err, log) {
                      if (err) return cb(err);
                      else if (!log) return cb(new Error('log not found'));
                      doc.logs.push(log._id);
                      if (err) return cb(err);
                      return doc.save(function (err) {
                        if (err) return cb(err);
                        return cb(null, { mongo: mongoInfos, tei: teiInfos });
                      });
                    }
                  );
                }
              );
            });
        });
      }
    );
  });
};

/**
 * Delete dataset
 * @param {object} opts - JSON containing all data
 * @param {string} opts.user - User
 * @param {string} opts.datasetsId - Datasets id
 * @param {string} opts.dataset.id - Dataset id
 * @returns {undefined} undefined
 */
Self.deleteDataset = function (opts = {}, cb) {
  // If there is not enough data
  if (!opts.datasetsId) return cb(new Error('datasetsId missing'));
  if (!opts.dataset || !opts.dataset.id) return cb(new Error('dataset properties missing'));
  // Init transaction
  let transaction = DocumentsDatasets.findOne({ _id: opts.datasetsId });
  // Execute transaction
  return transaction.exec(function (err, datasets) {
    if (err) return cb(err);
    else if (!datasets) return cb(new Error('datasets not found'));
    return Self.deleteDatasetInTEI(
      {
        documentId: datasets.document,
        dataset: { id: opts.dataset.id }
      },
      function (err, teiInfos) {
        if (err) return cb(err);
        // Check dataset with opts.id already exist
        let deleted = false,
          dataset;
        for (let i = 0; i < datasets.current.length; i++) {
          // update dataset
          if (datasets.current[i].id === opts.dataset.id) {
            datasets.current[i].sentences = [];
            datasets.current[i].dataInstanceId = null;
            dataset = datasets.current.splice(i, 1)[0];
            datasets.deleted.push(dataset);
            deleted = true;
          }
        }
        if (!deleted) return cb(new Error('dataset not deleted in mongodb'));
        let mongoInfos = dataset;
        return datasets.save(function (err, res) {
          if (err) return cb(err);
          // Get Document
          return Documents.findOne({ _id: datasets.document }).exec(function (err, doc) {
            if (err) return cb(err);
            // Create logs
            return DocumentsLogs.create(
              {
                document: doc._id,
                user: opts.user._id,
                action: 'DELETE DATASET ' + opts.dataset.id
              },
              function (err, log) {
                if (err) return cb(err);
                else if (!log) return cb(new Error('log not found'));
                doc.logs.push(log._id);
                if (err) return cb(err);
                return doc.save(function (err) {
                  if (err) return cb(err);
                  return cb(null, { mongo: mongoInfos, tei: teiInfos });
                });
              }
            );
          });
        });
      }
    );
  });
};

/**
 * Create new link
 * @param {object} opts - JSON containing all data
 * @param {string} opts.user - Account
 * @param {string} opts.datasetsId - Datasets id
 * @param {string} opts.link - Link
 * @param {string} opts.link.dataset - Dataset
 * @param {string} opts.link.dataset.id - Dataset id
 * @param {string} opts.link.sentence - Linked sentence
 * @param {string} opts.link.sentence.id - Linked sentence id
 * @param {function} cb - Callback function(err, res) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.linkSentence = function (opts = {}, cb) {
  // If there is not enough data
  if (!opts.datasetsId) return cb(new Error('datasetsId missing'));
  if (!opts.link) return cb(new Error('link properties missing'));
  if (!opts.link.dataset || !opts.link.dataset.id) return cb(new Error('dataset properties missing'));
  if (!opts.link.sentence || !opts.link.sentence.id) return cb(new Error('sentence properties missing'));
  // Init transaction
  let transaction = DocumentsDatasets.findOne({ _id: opts.datasetsId });
  // Execute transaction
  return transaction.exec(function (err, datasets) {
    if (err) return cb(err);
    else if (!datasets) return cb(new Error('Datasets not found'));
    return Self.linkSentenceInTEI(
      {
        documentId: datasets.document,
        sentence: { id: opts.link.sentence.id },
        dataset: { id: opts.link.dataset.id }
      },
      function (err, teiInfos) {
        if (err) return cb(err);
        // Check dataset with opts.id exist
        let updated = false,
          dataset;
        for (let i = 0; i < datasets.current.length; i++) {
          // update dataset
          if (datasets.current[i].id === opts.link.dataset.id) {
            updated = true;
            dataset = datasets.current[i];
            dataset.sentences.push(teiInfos.sentence);
          }
        }
        if (!updated) return cb(new Error('dataset not linked in mongodb'));
        let mongoInfos = dataset;
        return datasets.save(function (err, res) {
          if (err) return cb(err);
          return Documents.findOne({ _id: datasets.document }).exec(function (err, doc) {
            if (err) return cb(err);
            if (updated)
              return DocumentsLogs.create(
                {
                  document: doc._id,
                  user: opts.user._id,
                  action: 'ADD DATASET LINK ' + opts.link.dataset.id
                },
                function (err, log) {
                  if (err) return cb(err);
                  else if (!log) return cb(new Error('log not found'));
                  doc.logs.push(log._id);
                  if (err) return cb(err);
                  return doc.save(function (err) {
                    if (err) return cb(err);
                    return cb(null, { mongo: mongoInfos, tei: teiInfos });
                  });
                }
              );
          });
        });
      }
    );
  });
};

/**
 * Delete link
 * @param {object} opts - JSON containing all data
 * @param {string} opts.user - Account
 * @param {string} opts.datasetsId - Datasets id
 * @param {string} opts.link - Link
 * @param {string} opts.link.dataset - Dataset
 * @param {string} opts.link.dataset.id - Dataset id
 * @param {string} opts.link.sentence - Linked sentence
 * @param {string} opts.link.sentence.id - Linked sentence id
 * @param {function} cb - Callback function(err, res) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.unlinkSentence = function (opts = {}, cb) {
  // If there is not enough data
  if (!opts.datasetsId) return cb(new Error('datasetsId missing'));
  if (!opts.link) return cb(new Error('link properties missing'));
  if (!opts.link.dataset || !opts.link.dataset.id) return cb(new Error('dataset properties missing'));
  if (!opts.link.sentence || !opts.link.sentence.id) return cb(new Error('sentence properties missing'));
  // Init transaction
  let transaction = DocumentsDatasets.findOne({ _id: opts.datasetsId });
  // Execute transaction
  return transaction.exec(function (err, datasets) {
    if (err) return cb(err);
    else if (!datasets) return cb(new Error('datasets not found'));
    return Self.unlinkSentenceInTEI(
      {
        documentId: datasets.document,
        sentence: { id: opts.link.sentence.id },
        dataset: { id: opts.link.dataset.id }
      },
      function (err, teiInfos) {
        if (err) return cb(err);
        // Check dataset with opts.id exist
        let updated = false,
          dataset;
        for (let i = 0; i < datasets.current.length; i++) {
          // update dataset
          if (datasets.current[i].id === teiInfos.dataset.id) {
            dataset = datasets.current[i];
            let sentenceIndex = dataset.sentences.reduce(function (acc, sentence, index) {
              if (sentence.id === teiInfos.sentence.id) acc = index;
              return acc;
            }, -1);
            if (sentenceIndex > -1) {
              updated = true;
              dataset.sentences.splice(sentenceIndex, 1);
            }
          }
        }
        if (!updated) return cb(new Error('dataset not unlinked in mongodb'));
        let mongoInfos = dataset;
        return datasets.save(function (err, res) {
          if (err) return cb(err);
          return Documents.findOne({ _id: datasets.document }).exec(function (err, doc) {
            if (err) return cb(err);
            if (updated)
              return DocumentsLogs.create(
                {
                  document: doc._id,
                  user: opts.user._id,
                  action: 'DELETE DATASET LINK ' + opts.link.dataset.id
                },
                function (err, log) {
                  if (err) return cb(err);
                  else if (!log) return cb(new Error('log not found'));
                  doc.logs.push(log._id);
                  if (err) return cb(err);
                  return doc.save(function (err) {
                    if (err) return cb(err);
                    return cb(null, { mongo: mongoInfos, tei: teiInfos });
                  });
                }
              );
          });
        });
      }
    );
  });
};

/**
 * Add dataset in TEI file
 * @param {object} opts - JSON object containing all data
 * @param {string} opts.documentId - Document id
 * @param {string} opts.sentence - Linked sentence
 * @param {string} opts.sentence.id - Linked sentence id
 * @param {object} opts.dataset - JSON object containing all dataset infos
 * @param {string} opts.dataset.dataInstanceId - Dataset dataInstanceId
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
        let teiInfos = XML.addDataset(XML.load(data.toString()), opts);
        if (teiInfos.err) return cb(new Error('dataset not created in TEI'));
        else
          return DocumentsFilesController.rewriteFile(doc.tei, teiInfos.res.xml, function (err) {
            if (err) return cb(err);
            else return cb(null, teiInfos.res.data);
          });
      });
  });
};

/**
 * Update dataset in TEI file
 * @param {object} opts - JSON object containing all data
 * @param {string} opts.documentId - Document id
 * @param {object} opts.dataset - JSON object containing all dataset infos
 * @param {string} opts.dataset.dataInstanceId - Dataset dataInstanceId
 * @param {string} opts.dataset.id - Dataset id
 * @param {string} opts.dataset.type - Dataset type
 * @param {string} opts.dataset.cert - Dataset cert
 * @param {function} cb - Callback function(err) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.updateDatasetInTEI = function (opts = {}, cb) {
  return Documents.findById(opts.documentId).exec(function (err, doc) {
    if (err) return cb(err);
    else
      return DocumentsFilesController.readFile(doc.tei, function (err, data) {
        if (err) return cb(err);
        let teiInfos = XML.updateDataset(XML.load(data.toString()), opts);
        if (teiInfos.err) return cb(new Error('dataset not updated in TEI'));
        else
          return DocumentsFilesController.rewriteFile(doc.tei, teiInfos.res.xml, function (err) {
            if (err) return cb(err);
            else return cb(null, teiInfos.res.data);
          });
      });
  });
};

/**
 * Delete dataset in TEI file
 * @param {object} opts JSON object containing all data
 * @param {string} opts.documentId - Document id
 * @param {object} opts.dataset - JSON object containing all dataset infos
 * @param {string} opts.dataset.id - Dataset id
 * @param {function} cb - Callback function(err) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.deleteDatasetInTEI = function (opts = {}, cb) {
  return Documents.findById(opts.documentId).exec(function (err, doc) {
    if (err) return cb(err);
    else
      return DocumentsFilesController.readFile(doc.tei, function (err, data) {
        if (err) return cb(err);
        let teiInfos = XML.deleteDataset(XML.load(data.toString()), opts);
        if (teiInfos.err) return cb(new Error('dataset not deleted in TEI'));
        else
          return DocumentsFilesController.rewriteFile(doc.tei, teiInfos.res.xml, function (err) {
            if (err) return cb(err);
            else return cb(null, teiInfos.res.data);
          });
      });
  });
};

/**
 * Add link in TEI file
 * @param {object} opts JSON object containing all data
 * @param {string} opts.documentId - Document id
 * @param {string} opts.sentence - Linked sentence
 * @param {string} opts.sentence.id - Linked sentence id
 * @param {object} opts.dataset - JSON object containing all dataset infos
 * @param {string} opts.dataset.id - Dataset id
 * @param {function} cb - Callback function(err) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.linkSentenceInTEI = function (opts = {}, cb) {
  return Documents.findById(opts.documentId).exec(function (err, doc) {
    if (err) return cb(err);
    else
      return DocumentsFilesController.readFile(doc.tei, function (err, data) {
        if (err) return cb(err);
        let teiInfos = XML.linkSentence(XML.load(data.toString()), opts);
        if (teiInfos.err) return cb(new Error('dataset not linked in TEI'));
        else
          return DocumentsFilesController.rewriteFile(doc.tei, teiInfos.res.xml, function (err) {
            if (err) return cb(err);
            else return cb(null, teiInfos.res.data);
          });
      });
  });
};

/**
 * Delete link in TEI file
 * @param {object} opts JSON object containing all data
 * @param {string} opts.documentId - Document id
 * @param {string} opts.sentence - Linked sentence
 * @param {string} opts.sentence.id - Linked sentence id
 * @param {object} opts.dataset - JSON object containing all dataset infos
 * @param {string} opts.dataset.id - Dataset id
 * @param {function} cb - Callback function(err) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.unlinkSentenceInTEI = function (opts = {}, cb) {
  return Documents.findById(opts.documentId).exec(function (err, doc) {
    if (err) return cb(err);
    else
      return DocumentsFilesController.readFile(doc.tei, function (err, data) {
        if (err) return cb(err);
        let teiInfos = XML.unlinkSentence(XML.load(data.toString()), opts);
        if (teiInfos.err) return cb(new Error('dataset not unlinked in TEI'));
        else
          return DocumentsFilesController.rewriteFile(doc.tei, teiInfos.res.xml, function (err) {
            if (err) return cb(err);
            else return cb(null, teiInfos.res.data);
          });
      });
  });
};

module.exports = Self;
