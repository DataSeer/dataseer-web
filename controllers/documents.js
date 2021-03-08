/*
 * @prettier
 */

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

const async = require('async');

const conf = require('../conf/conf.json');

let Self = {};

/**
 * Add watcher if necessary
 * @param {String} token Given JWT
 * @param {String} privateKey Private key of JWT
 * @param {Object} opts JWT opts (see https://www.npmjs.com/package/jsonwebtoken#jwtverifytoken-secretorpublickey-options-callback)
 * @param {Function} cb Callback function(err, res) (err: error process OR null, res: decoded JWT OR undefined)
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
 * @param {Object} params Options available
 * @param {Object} params.files JSON Object of files in req.files (available keys: "file" OR "attached_files")
 * @param {String} params.files[key].name
 * @param {Buffer} params.files[key].data
 * @param {Number} params.files[key].size
 * @param {String} params.files[key].encoding
 * @param {String} params.files[key].tempFilePath
 * @param {String} params.files[key].mimetype
 * @param {String} params.files[key].md5
 * @param {Boolean} params.already_assessed Already assessed
 * @param {Boolean} params.isDataseer Is DataSeer
 * @param {String} params.journal Journal of document owner
 * @param {String} params.email Email of owner
 * @param {String} params.fullname fullname of owner
 * @param {String} params.uploaded_by Id of uploader
 * @param {String} params.dataseerML process dataseer-ml
 * @param {Object} events Events
 * @param {Function} events.onCreatedAccount Function called if new Account is created
 * @param {Function} events.onCreatedJournal Function called if new Journal is created
 * @returns {Object} Options for Self.upload() function or new Error(msg)
 */
Self.getUploadParams = function (params = {}, user) {
  // If file is not set
  if (!params.files || !params.files['file']) return new Error('You must select a file !');
  let alreadyAssessed = !!params.already_assessed,
    file = params.files['file'],
    attachedFiles = Array.isArray(params.files['attached_files']) ? params.files['attached_files'] : [],
    uploaded_by = user._id,
    opts = {
      alreadyAssessed,
      file,
      attachedFiles,
      uploaded_by
    };
  if (AccountsManager.checkAccessRight(user, AccountsManager.roles.standard_user, AccountsManager.match.role)) {
    // Case of standard_user
    opts.journal = user.organisation.name;
    opts.email = user.username;
    opts.fullname = user.fullname;
    opts.dataseerML = true; // always proceed dataseer-ml
  } else {
    // Case of annotator OR curator
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
 * @param {Object} opts Options available
 * @param {Object} opts.dataTypes DataTypes JSON (stored in app.get('dataTypes'))
 * @param {Object} opts.file File representation
 * @param {String} opts.file.name
 * @param {Buffer} opts.file.data
 * @param {Number} opts.file.size
 * @param {String} opts.file.encoding
 * @param {String} opts.file.tempFilePath
 * @param {String} opts.file.mimetype
 * @param {String} opts.file.md5
 * @param {Array} opts.attachedFiles Array of attached files (same structure as opts.file)
 * @param {Boolean} opts.already_assessed Already assessed
 * @param {Boolean} opts.isDataseer Is DataSeer
 * @param {String} opts.journal Journal of document owner
 * @param {String} opts.email Email of owner
 * @param {String} opts.fullname fullname of owner
 * @param {String} opts.uploaded_by Id of uploader
 * @param {String} opts.dataseerML process dataseer-ml
 * @param {String} opts.privateKey PrivateKey to create JWT token (stored in app.get('private.key'))
 * @param {Object} events Events
 * @param {Function} events.onCreatedAccount Function called if new Account is created
 * @param {Function} events.onCreatedJournal Function called if new Journal is created
 * @param {Function} cb Callback function(err, res) (err: error process OR null, res: Document instance OR undefined)
 * @returns {undefined} undefined
 */
Self.upload = function (opts = {}, events, cb) {
  return Documents.create(
    {
      uploaded_by: opts.uploaded_by,
      isDataseer: opts.isDataseer,
      already_assessed: opts.already_assessed,
      watchers: [opts.uploaded_by]
    },
    function (err, doc) {
      if (err) return cb(err);
      return Organisations.findOne({ name: opts.journal }).exec(function (err, organisation) {
        if (err) return cb(err);
        return Accounts.findOne({ username: opts.email }).exec(function (err, account) {
          if (err) return cb(err);
          let actions = [
            // Get organisation
            function (acc, callback) {
              // If organisation does not exist already, create it
              if (!organisation)
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
              else {
                // Set organisation id
                acc.organisation = organisation._id;
                acc.upload_journal = organisation._id;
                return callback(null, acc);
              }
            },
            // Get account
            function (acc, callback) {
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
                // Set watcher if necessary
                if (acc.watchers.indexOf(account._id) === -1) acc.watchers.push(account._id);
                return callback(null, acc);
              }
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
        });
      });
    }
  );
};

/**
 * Extract metadata of PDF file (stored in TEI file) of given document and update it
 * @param {Object} doc Options available
 * @param {mongoose.Schema.Types.ObjectId} doc.pdf pdf file id
 * @param {mongoose.Schema.Types.ObjectId} doc.tei tei file id
 * @param {Function} cb Callback function(err) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.extractPDFMetadata = function (doc, cb) {
  if (doc.pdf && doc.tei)
    // Read TEI file (containing PDF metadata)
    return DocumentsFilesController.readFile(doc.tei, function (err, data) {
      if (err) cb(err);
      else
        return DocumentsFiles.findById(doc.pdf).exec(function (err, file) {
          if (err) cb(err);
          // Add metadata in file
          file.metadata = { sentences: XML.extractPDFSentencesMetadata(XML.load(data.toString())) };
          return file.save(function (err) {
            if (err) cb(err);
            else return cb(null);
          });
        });
    });
  else return cb(new Error('There is no PDF and TEI file in this document'));
};

/**
 * Extract metadata stored TEI file of given document and create MongoDB item
 * @param {Object} doc Options available
 * @param {mongoose.Schema.Types.ObjectId} doc.tei tei file id
 * @param {Function} cb Callback function(err) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.extractMetadata = function (doc, cb) {
  if (doc.tei)
    // Read TEI file (containing PDF metadata)
    return DocumentsFilesController.readFile(doc.tei, function (err, data) {
      if (err) cb(err);
      else {
        // Add metadata in MongoDB
        let metadata = XML.extractMetadata(XML.load(data.toString()));
        metadata.document = doc._id; // Link it to the document
        return DocumentsMetadata.create(metadata, function (err, metadata) {
          doc.metadata = metadata._id; // Link it to the metadata
          return doc.save(function (err) {
            if (err) cb(err);
            else return cb(null);
          });
        });
      }
    });
  else return cb(new Error('There is no TEI file in this document'));
};

/**
 * Update metadata stored TEI file of given document and create MongoDB item
 * @param {Object} doc Options available
 * @param {mongoose.Schema.Types.ObjectId} doc.tei tei file id
 * @param {Object} user Options available
 * @param {mongoose.Schema.Types.ObjectId} user._id User
 * @param {Function} cb Callback function(err) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.updateMetadata = function (doc, user, cb) {
  if (doc.tei)
    // Read TEI file (containing PDF metadata)
    return DocumentsFilesController.readFile(doc.tei, function (err, data) {
      if (err) cb(err);
      else {
        // Get metadata
        let metadata = XML.extractMetadata(XML.load(data.toString()));
        // Update them
        return DocumentsMetadata.findOneAndUpdate({ _id: doc.metadata }, metadata).exec(function (err, metadata) {
          if (err) cb(err);
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
 * @param {Object} doc Options available
 * @param {mongoose.Schema.Types.ObjectId} doc.tei tei file id
 * @param {Object} dataTypes DataTypes JSON (stored in app.get('dataTypes'))
 * @param {Function} cb Callback function(err) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.extractDatasets = function (doc, dataTypes, cb) {
  if (doc.tei)
    // Read TEI file (containing PDF metadata)
    return DocumentsFilesController.readFile(doc.tei, function (err, data) {
      if (err) cb(err);
      else
        return DocumentsFiles.findById(doc.pdf).exec(function (err, file) {
          if (err) cb(err);
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
              if (err) cb(err);
              else return cb(null);
            });
          });
        });
    });
  else return cb(new Error('There is no TEI file in this document'));
};

/**
 * Add dataset in TEI file
 * @param {Object} opts JSON object containing all data
 * @param {String} opts.documentId
 * @param {Object} opts.dataset
 * @param {String} opts.dataset.sentenceId
 * @param {String} opts.dataset.id
 * @param {String} opts.dataset.type
 * @param {String} opts.dataset.cert
 * @param {Function} cb Callback function(err) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.addDatasetInTEI = function (opts = {}, cb) {
  return Documents.findById(opts.documentId).exec(function (err, doc) {
    if (err) return cb(err);
    else
      return DocumentsFilesController.readFile(doc.tei, function (err, data) {
        if (err) cb(err);
        let newXml = XML.addDataset(XML.load(data.toString()), opts.dataset);
        if (!newXml) return cb(new Error('Add dataset failed'));
        else
          return DocumentsFilesController.rewriteFile(doc.tei, newXml, function (err) {
            if (err) cb(err);
            else return cb(null);
          });
      });
  });
};

/**
 * Delete dataset in TEI file
 * @param {Object} opts JSON object containing all data
 * @param {String} opts.documentId
 * @param {Object} opts.dataset
 * @param {String} opts.dataset.sentenceId
 * @param {Function} cb Callback function(err) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.deleteDatasetInTEI = function (opts = {}, cb) {
  return Documents.findById(opts.documentId).exec(function (err, doc) {
    if (err) return cb(err);
    else
      return DocumentsFilesController.readFile(doc.tei, function (err, data) {
        if (err) cb(err);
        let newXml = XML.deleteDataset(XML.load(data.toString()), opts.dataset);
        if (!newXml) return cb(new Error('Delete dataset failed'));
        else
          return DocumentsFilesController.rewriteFile(doc.tei, newXml, function (err) {
            if (err) cb(err);
            else return cb(null);
          });
      });
  });
};

/**
 * Add corresp in TEI file
 * @param {Object} opts JSON object containing all data
 * @param {String} opts.documentId
 * @param {Object} opts.dataset
 * @param {String} opts.dataset.sentenceId
 * @param {String} opts.dataset.id
 * @param {Function} cb Callback function(err) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.addCorrespInTEI = function (opts = {}, cb) {
  return Documents.findById(opts.documentId).exec(function (err, doc) {
    if (err) return cb(err);
    else
      return DocumentsFilesController.readFile(doc.tei, function (err, data) {
        if (err) cb(err);
        let newXml = XML.addCorresp(XML.load(data.toString()), opts.dataset);
        if (!newXml) return cb(new Error('Add corresp failed'));
        else
          return DocumentsFilesController.rewriteFile(doc.tei, newXml, function (err) {
            if (err) cb(err);
            else return cb(null);
          });
      });
  });
};

/**
 * Delete corresp in TEI file
 * @param {Object} opts JSON object containing all data
 * @param {String} opts.documentId
 * @param {Object} opts.dataset
 * @param {String} opts.dataset.sentenceId
 * @param {String} opts.dataset.id
 * @param {Function} cb Callback function(err) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.deleteCorrespInTEI = function (opts = {}, cb) {
  return Documents.findById(opts.documentId).exec(function (err, doc) {
    if (err) return cb(err);
    else
      return DocumentsFilesController.readFile(doc.tei, function (err, data) {
        if (err) cb(err);
        let newXml = XML.deleteCorresp(XML.load(data.toString()), opts.dataset);
        if (!newXml) return cb(new Error('Delete corresp failed'));
        else
          return DocumentsFilesController.rewriteFile(doc.tei, newXml, function (err) {
            if (err) cb(err);
            else return cb(null);
          });
      });
  });
};

module.exports = Self;
