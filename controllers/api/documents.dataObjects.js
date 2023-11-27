/*
 * @prettier
 */

'use strict';

const _ = require(`lodash`);
const async = require(`async`);

const DocumentsDataObjects = require(`../../models/documents.dataObjects.js`);
const Documents = require(`../../models/documents.js`);

const DocumentsFilesController = require(`./documents.files.js`);
const DocumentsLogsController = require(`./documents.logs.js`);
const DocumentsDataObjectsLogsController = require(`./documents.dataObjects.logs.js`);

const AccountsManager = require(`../../lib/accounts.js`);
const Params = require(`../../lib/params.js`);
const DataObjects = require(`../../lib/dataObjects.js`);
const XML = require(`../../lib/xml.js`);
const CrudManager = require(`../../lib/crud.js`);

let Self = {};

/**
 * Create dataObject
 * @param {object} opts - JSON containing all data
 * @param {object} opts.user - User
 * @param {boolean} opts.isExtracted - Tag this dataObject as extracted
 * @param {object} opts.dataObject - DataObject
 * @param {object} opts.document - Document
 * @param {function} cb - Callback function(err, res) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.create = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `dataObject`) === `undefined`) return cb(new Error(`Missing required data: opts.dataObject`));
  if (typeof _.get(opts, `document`) === `undefined`) return cb(new Error(`Missing required data: opts.document`));
  // Check Access Rights
  let accessRights = AccountsManager.getAccessRights(opts.user);
  if (!accessRights.isModerator) return cb(null, new Error(`Unauthorized functionnality`));
  // Init process
  if (!Array.isArray(opts.dataObject.sentences))
    return cb(null, new Error(`Missing required data: opts.dataObject.sentences must be an Array`));
  if (opts.dataObject.sentences.length <= 0)
    return cb(null, new Error(`Missing required data: opts.dataObject.sentences must contain at least one sentence`));
  // Process all steps
  return async.reduce(
    [
      function (acc, next) {
        // Create DataObject in MongoDB & set fields in the JSON object
        return DocumentsDataObjects.create({}, function (err, res) {
          if (err) return next(err, acc);
          let dataObject = DataObjects.create(opts.dataObject);
          // Override these values
          dataObject._id = res._id.toString();
          dataObject.document = acc.document._id.toString();
          dataObject.dataInstanceId = `dataInstance-${res._id.toString()}`;
          dataObject.extracted = !!opts.isExtracted;
          dataObject.deleted = false;
          acc.dataObject = dataObject;
          return next(null, acc);
        });
      },
      function (acc, next) {
        // Update TEI file
        return Self.addDataObjectInTEI(
          {
            tei: acc.document.tei._id ? acc.document.tei._id.toString() : acc.document.tei.toString(),
            dataObject: acc.dataObject,
            user: opts.user
          },
          function (err, teiInfo) {
            if (err) return next(err, acc);
            if (teiInfo instanceof Error) return next(teiInfo, acc);
            return next(null, acc);
          }
        );
      },
      function (acc, next) {
        // Update DataObject in MongoDB
        return DocumentsDataObjects.updateOne(
          { _id: acc.dataObject._id.toString() },
          acc.dataObject,
          function (err, res) {
            if (err) return next(err, acc);
            return next(null, acc);
          }
        );
      },
      function (acc, next) {
        // Create Document logs
        return DocumentsLogsController.create(
          {
            target: acc.dataObject._id.toString(),
            account: opts.user._id,
            kind: CrudManager.actions.create._id,
            key: `(${acc.dataObject._id.toString()}) ${acc.dataObject.name}`
          },
          function (err, log) {
            if (err) return next(err, acc);
            return next(null, acc);
          }
        );
      },
      function (acc, next) {
        // Create DataObject logs
        return DocumentsDataObjectsLogsController.create(
          {
            target: acc.dataObject._id.toString(),
            account: opts.user._id,
            kind: CrudManager.actions.create._id,
            state: acc.dataObject
          },
          function (err, log) {
            if (err) return next(err, acc);
            return next(null, acc);
          }
        );
      }
    ],
    { document: opts.document },
    function (acc, action, next) {
      return action(acc, function (err, acc) {
        return next(err, acc);
      });
    },
    function (err, res) {
      if (!err) return cb(null, res.dataObject);
      let dataObjectId = _.get(res.dataObject, `_id`, ``).toString();
      if (!dataObjectId) return cb(null, err);
      return DocumentsDataObjects.deleteOne({ _id: dataObjectId }).exec(function (_err, res) {
        if (_err) return cb(_err);
        return cb(null, err);
      });
    }
  );
};

/**
 * Update dataObject
 * @param {object} opts - JSON containing all data
 * @param {object} opts.user - User
 * @param {object} opts.dataObject - DataObject
 * @param {object} opts.document - Document
 * @param {function} cb - Callback function(err, res) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.update = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `dataObject`) === `undefined`) return cb(new Error(`Missing required data: opts.dataObject`));
  if (typeof _.get(opts, `document`) === `undefined`) return cb(new Error(`Missing required data: opts.document`));
  // Check Access Rights
  let accessRights = AccountsManager.getAccessRights(opts.user);
  if (!accessRights.isModerator) return cb(null, new Error(`Unauthorized functionnality`));
  // Init process
  if (!Array.isArray(opts.dataObject.sentences))
    return cb(null, new Error(`Missing required data: opts.dataObject.sentences must be an Array`));
  if (opts.dataObject.sentences.length <= 0)
    return cb(null, new Error(`Missing required data: opts.dataObject.sentences must contain at least one sentence`)); // Process all steps
  return async.reduce(
    [
      function (acc, next) {
        // Create DataObject in MongoDB & set fields in the JSON object
        return DocumentsDataObjects.findOne({ _id: opts.dataObject._id }).exec(function (err, item) {
          if (err) return next(err, acc);
          if (!item) return next(new Error(`DataObject not found`), acc);
          let save = item.toJSON();
          let dataObject = DataObjects.create(opts.dataObject);
          // Override these values
          dataObject._id = save._id.toString();
          dataObject.dataInstanceId = save.dataInstanceId;
          dataObject.extracted = save.extracted;
          dataObject.deleted = save.deleted;
          dataObject.document = save.document.toString();
          acc.dataObject = dataObject;
          acc.save = save;
          return next(null, acc);
        });
      },
      function (acc, next) {
        // Update TEI file
        return Self.updateDataObjectInTEI(
          {
            tei: acc.document.tei._id ? acc.document.tei._id.toString() : acc.document.tei.toString(),
            dataObject: acc.dataObject,
            user: opts.user
          },
          function (err, teiInfo) {
            if (err) return next(err, acc);
            if (teiInfo instanceof Error) return next(teiInfo, acc);
            return next(null, acc);
          }
        );
      },
      function (acc, next) {
        // Update DataObject in MongoDB
        return DocumentsDataObjects.updateOne(
          { _id: acc.dataObject._id.toString() },
          acc.dataObject,
          function (err, res) {
            if (err) return next(err, acc);
            return next(null, acc);
          }
        );
      },
      function (acc, next) {
        // Create Document logs
        return DocumentsLogsController.create(
          {
            target: acc.dataObject._id.toString(),
            account: opts.user._id,
            kind: CrudManager.actions.update._id,
            key: `(${acc.dataObject._id.toString()}) ${acc.dataObject.name}`
          },
          function (err, log) {
            if (err) return next(err, acc);
            return next(null, acc);
          }
        );
      },
      function (acc, next) {
        // Create DataObject logs
        return DocumentsDataObjectsLogsController.create(
          {
            target: acc.dataObject._id.toString(),
            account: opts.user._id,
            kind: CrudManager.actions.update._id,
            state: acc.save
          },
          function (err, log) {
            if (err) return next(err, acc);
            return next(null, acc);
          }
        );
      }
    ],
    { document: opts.document },
    function (acc, action, next) {
      return action(acc, function (err, acc) {
        return next(err, acc);
      });
    },
    function (err, acc) {
      if (!err) return cb(null, acc.dataObject);
      return cb(null, err);
    }
  );
};

/**
 * Delete dataObject
 * @param {object} opts - JSON containing all data
 * @param {object} opts.user - User
 * @param {string} opts.dataObject - DataObject
 * @param {object} opts.document - Document
 * @returns {undefined} undefined
 */
Self.delete = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `dataObject`) === `undefined`) return cb(new Error(`Missing required data: opts.dataObject`));
  if (typeof _.get(opts, `document`) === `undefined`) return cb(new Error(`Missing required data: opts.document`));
  // Check Access Rights
  let accessRights = AccountsManager.getAccessRights(opts.user);
  if (!accessRights.isModerator) return cb(null, new Error(`Unauthorized functionnality`));
  return async.reduce(
    [
      function (acc, next) {
        // Create DataObject in MongoDB & set fields in the JSON object
        return DocumentsDataObjects.findOne({ _id: opts.dataObject._id }).exec(function (err, item) {
          if (err) return next(err, acc);
          if (!item) return next(new Error(`DataObject not found`), acc);
          let save = item.toJSON();
          let dataObject = DataObjects.create(opts.dataObject);
          // Override these values
          dataObject._id = save._id.toString();
          dataObject.dataInstanceId = save.dataInstanceId;
          dataObject.extracted = save.extracted;
          dataObject.deleted = true;
          dataObject.document = save.document.toString();
          acc.dataObject = dataObject;
          return next(null, acc);
        });
      },
      function (acc, next) {
        // Update TEI file
        return Self.deleteDataObjectInTEI(
          {
            tei: acc.document.tei._id ? acc.document.tei._id.toString() : acc.document.tei.toString(),
            dataObject: acc.dataObject,
            user: opts.user
          },
          function (err, teiInfo) {
            if (err) return next(err, acc);
            if (teiInfo instanceof Error) return next(teiInfo, acc);
            return next(null, acc);
          }
        );
      },
      function (acc, next) {
        // Update DataObject in MongoDB
        return DocumentsDataObjects.updateOne(
          { _id: acc.dataObject._id.toString() },
          acc.dataObject,
          function (err, res) {
            if (err) return next(err, acc);
            return next(null, acc);
          }
        );
      },
      function (acc, next) {
        // Create Document logs
        return DocumentsLogsController.create(
          {
            target: acc.dataObject._id.toString(),
            account: opts.user._id,
            kind: CrudManager.actions.delete._id,
            key: `(${acc.dataObject._id.toString()}) ${acc.dataObject.name}`
          },
          function (err, log) {
            if (err) return next(err, acc);
            return next(null, acc);
          }
        );
      },
      function (acc, next) {
        // Create DataObject logs
        return DocumentsDataObjectsLogsController.create(
          {
            target: acc.dataObject._id.toString(),
            account: opts.user._id,
            kind: CrudManager.actions.delete._id,
            state: acc.dataObject
          },
          function (err, log) {
            if (err) return next(err, acc);
            return next(null, acc);
          }
        );
      }
    ],
    { document: opts.document },
    function (acc, action, next) {
      return action(acc, function (err, acc) {
        return next(err, acc);
      });
    },
    function (err, acc) {
      if (!err) return cb(null, acc.dataObject);
      return cb(null, err);
    }
  );
};

/**
 * Add dataObject in the TEI content
 * @param {object} $ - TEI content parsed by Cherrio
 * @param {object} dataObject - JSON object containing all dataObject info
 * @returns {object} Result of process (Error or DataObject)
 */
Self._addDataObjectInTEI = function ($, dataObject = {}) {
  let d = {
    id: dataObject._id.toString(),
    dataInstanceId: dataObject.dataInstanceId,
    reuse: dataObject.reuse,
    type: dataObject.dataType,
    subtype: dataObject.subType,
    cert: dataObject.cert,
    sentences: dataObject.sentences
  };
  let addDataObject = XML.addDataObject($, { dataObject: d });
  if (addDataObject.err) return addDataObject.err;
  let linkDataObject = XML.linkDataObject($, { dataObject: d });
  if (linkDataObject.err) return linkDataObject.err;
  return dataObject;
};

/**
 * Delete dataObject in the TEI content
 * @param {object} $ - TEI content parsed by Cherrio
 * @param {object} dataObject - JSON object containing all dataObject info
 * @returns {object} Result of process (Error or DataObject)
 */
Self._deleteDataObjectInTEI = function ($, dataObject = {}) {
  let d = {
    id: dataObject._id.toString(),
    dataInstanceId: dataObject.dataInstanceId,
    reuse: dataObject.reuse,
    type: dataObject.dataType,
    subtype: dataObject.subType,
    cert: dataObject.cert,
    sentences: dataObject.sentences
  };
  let unlinkDataObject = XML.unlinkDataObject($, { dataObject: d });
  if (unlinkDataObject.err) return unlinkDataObject.err;
  let deleteDataObject = XML.deleteDataObject($, { dataObject: d });
  if (deleteDataObject.err) return deleteDataObject.err;
  return dataObject;
};

/**
 * Add dataObject in TEI file & rewrite file
 * @param {object} opts - JSON object containing all data
 * @param {object} opts.user - User
 * @param {string} opts.tei - MongoDB ID of the TEI file
 * @param {object} opts.dataObject - JSON object containing all dataObject info
 * @param {function} cb - Callback function(err) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.addDataObjectInTEI = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `dataObject`) === `undefined`) return cb(new Error(`Missing required data: opts.dataObject`));
  if (typeof _.get(opts, `tei`) === `undefined`) return cb(new Error(`Missing required data: opts.tei`));
  // Check Access Rights
  let accessRights = AccountsManager.getAccessRights(opts.user);
  if (!accessRights.isModerator) return cb(null, new Error(`Unauthorized functionnality`));
  // Init process
  if (!Array.isArray(opts.dataObject.sentences))
    return cb(null, new Error(`Missing required data: opts.dataObject.sentences must be an Array`));
  if (opts.dataObject.sentences.length <= 0)
    return cb(null, new Error(`Missing required data: opts.dataObject.sentences must contain at least one sentence`));
  return DocumentsFilesController.readFile({ data: { id: opts.tei } }, function (err, file) {
    if (err) return cb(err);
    let $ = XML.load(file.data.toString(DocumentsFilesController.encoding));
    let add = Self._addDataObjectInTEI($, opts.dataObject);
    if (add instanceof Error) return cb(null, add);
    return DocumentsFilesController.rewriteFile(opts.tei, $.xml(), function (err) {
      if (err) return cb(err);
      else return cb(null, opts.dataObject);
    });
  });
};

/**
 * Update dataObject in TEI file & rewrite file
 * @param {object} opts - JSON object containing all data
 * @param {object} opts.user - User
 * @param {string} opts.tei - MongoDB ID of the TEI file
 * @param {object} opts.dataObject - JSON object containing all dataObject info
 * @param {function} cb - Callback function(err) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.updateDataObjectInTEI = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `dataObject`) === `undefined`) return cb(new Error(`Missing required data: opts.dataObject`));
  if (typeof _.get(opts, `tei`) === `undefined`) return cb(new Error(`Missing required data: opts.tei`));
  // Check Access Rights
  let accessRights = AccountsManager.getAccessRights(opts.user);
  if (!accessRights.isModerator) return cb(null, new Error(`Unauthorized functionnality`));
  // Init process
  if (!Array.isArray(opts.dataObject.sentences))
    return cb(null, new Error(`Missing required data: opts.dataObject.sentences must be an Array`));
  if (opts.dataObject.sentences.length <= 0)
    return cb(null, new Error(`Missing required data: opts.dataObject.sentences must contain at least one sentence`));
  return DocumentsFilesController.readFile({ data: { id: opts.tei } }, function (err, file) {
    if (err) return cb(err);
    // An "update" is a "delete then add" process to ne sure everything is updated
    let $ = XML.load(file.data.toString(DocumentsFilesController.encoding));
    let del = Self._deleteDataObjectInTEI($, opts.dataObject);
    if (del instanceof Error) return cb(null, del);
    let add = Self._addDataObjectInTEI($, opts.dataObject);
    if (add instanceof Error) return cb(null, add);
    return DocumentsFilesController.rewriteFile(opts.tei, $.xml(), function (err) {
      if (err) return cb(err);
      else return cb(null, opts.dataObject);
    });
  });
};

/**
 * Delete dataObject in TEI file & rewrite file
 * @param {object} opts - JSON object containing all data
 * @param {object} opts.user - User
 * @param {string} opts.tei - MongoDB ID of the TEI file
 * @param {object} opts.dataObject - JSON object containing all dataObject info
 * @param {function} cb - Callback function(err) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.deleteDataObjectInTEI = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `dataObject`) === `undefined`) return cb(new Error(`Missing required data: opts.dataObject`));
  if (typeof _.get(opts, `tei`) === `undefined`) return cb(new Error(`Missing required data: opts.tei`));
  // Check Access Rights
  let accessRights = AccountsManager.getAccessRights(opts.user);
  if (!accessRights.isModerator) return cb(null, new Error(`Unauthorized functionnality`));
  // Init process
  if (!Array.isArray(opts.dataObject.sentences))
    return cb(null, new Error(`Missing required data: opts.dataObject.sentences must be an Array`));
  if (opts.dataObject.sentences.length <= 0)
    return cb(null, new Error(`Missing required data: opts.dataObject.sentences must contain at least one sentence`));
  return DocumentsFilesController.readFile({ data: { id: opts.tei } }, function (err, file) {
    let $ = XML.load(file.data.toString(DocumentsFilesController.encoding));
    let del = Self._deleteDataObjectInTEI($, opts.dataObject);
    if (del instanceof Error) return cb(null, del);
    return DocumentsFilesController.rewriteFile(opts.tei, $.xml(), function (err) {
      if (err) return cb(err);
      else return cb(null, opts.dataObject);
    });
  });
};

/**
 * Get logs of a given dataObject
 * @param {object} opts - JSON object containing all data
 * @param {object} opts.user - User
 * @param {object} opts.data - JSON object containing all data
 * @param {string} opts.data.target - Id of object who receive the action
 * @param {string} opts.data.accounts - Id of accounts who made the action
 * @param {string} opts.data.kind - Id of action (create, delete, update, read)
 * @param {integer} opts.data.limit - Limit
 * @param {integer} opts.data.skip - Skip
 * @param {function} cb - Callback function(err) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.getLogs = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  // Check Access Rights
  let accessRights = AccountsManager.getAccessRights(opts.user);
  if (!accessRights.isModerator) return cb(null, new Error(`Unauthorized functionnality`));
  return DocumentsDataObjectsLogsController.all(opts.data, function (err, res) {
    if (err) return cb(err);
    else return cb(null, res);
  });
};

/**
 * Get all dataObjects
 * @param {object} opts - Options available (You must call getUploadParams)
 * @param {object} opts.user - Current user
 * @param {object} opts.data - Data available
 * @param {boolean} opts.data.[count] - Count results (default: false)
 * @param {string} opts.data.[ids] - list of dataObjects ids
 * @param {limit} opts.data.[limit] - Limit of the results
 * @param {limit} opts.data.[skip] - Skip of the results
 * @param {array} opts.data.[documents] - Array of documents ids
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: array of documents instance OR undefined)
 * @returns {undefined} undefined
 */
Self.all = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `data`) === `undefined`) return cb(new Error(`Missing required data: opts.data`));
  let accessRights = AccountsManager.getAccessRights(opts.user);
  if (!accessRights.authenticated) return cb(null, new Error(`Unauthorized functionnality`));
  // Start process
  // Check if user is visitor
  if (!accessRights.isStandardUser) return cb(null, []);
  // Build query data from opts
  let count = Params.convertToBoolean(opts.data.count);
  let ids = Params.convertToArray(opts.data.ids, `string`);
  let limit = Params.convertToInteger(opts.data.limit);
  let skip = Params.convertToInteger(opts.data.skip);
  let documents = Params.convertToArray(opts.data.documents, `string`);
  let query = {};
  // Set default value
  if (typeof ids === `undefined`) ids = [];
  if (typeof documents === `undefined`) documents = [];
  if (typeof limit === `undefined` || limit <= 0) limit = 20;
  if (typeof skip === `undefined` || skip < 0) skip = 0;
  // Set filters
  if (ids.length > 0) query._id = { $in: ids };
  if (documents.length > 0) query.document = { $in: documents };
  let params = { ids, limit, skip, documents };
  return DocumentsDataObjects.find(query)
    .skip(skip)
    .limit(limit)
    .exec(function (err, dataObjects) {
      if (err) return cb(err);
      if (count)
        return DocumentsDataObjects.find(query).countDocuments(function (err, count) {
          if (err) return cb(err);
          return cb(null, { count: count, data: dataObjects, params: params });
        });
      return cb(null, { data: dataObjects, params: params });
    });
};

module.exports = Self;
