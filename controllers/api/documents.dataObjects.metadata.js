/*
 * @prettier
 */

'use strict';

const _ = require(`lodash`);

const DocumentsDataObjectsMetadata = require(`../../models/documents.dataObjects.metadata.js`);

const DocumentsLogsController = require(`./documents.logs.js`);

const AccountsManager = require(`../../lib/accounts.js`);
const CrudManager = require(`../../lib/crud.js`);

let Self = {};

/**
 * Update DataObject metadata
 * @param {object} opts - JSON containing all data
 * @param {object} opts.user - User
 * @param {object} opts.document - Document
 * @param {object} opts.metadata - Document dataObjects metadata
 * @param {function} cb - Callback function(err, res) (err: error process OR null)
 * @returns {undefined} undefined
 */
Self.update = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `document`) === `undefined`) return cb(new Error(`Missing required data: opts.document`));
  if (typeof _.get(opts, `metadata`) === `undefined`)
    opts.metadata = {
      datasets: { notes: `` },
      codeAndSoftware: { notes: `` },
      materials: { notes: `` },
      protocols: { notes: `` }
    };
  let accessRights = AccountsManager.getAccessRights(opts.user);
  if (!accessRights.isModerator) return cb(null, new Error(`Unauthorized functionnality`));
  return DocumentsDataObjectsMetadata.findOne({ document: opts.document._id.toString() }, function (err, item) {
    if (err) return cb(err);
    if (!item) return cb(null, new Error(`DataObjects Metadata not found`));
    item.datasets = opts.metadata.datasets;
    item.codeAndSoftware = opts.metadata.codeAndSoftware;
    item.materials = opts.metadata.materials;
    item.protocols = opts.metadata.protocols;
    return item.save(function (err) {
      if (err) return cb(err);
      // Create logs
      return DocumentsLogsController.create(
        {
          target: opts.document._id.toString(),
          account: opts.user._id,
          kind: CrudManager.actions.update._id,
          key: `documents.dataObjects.metadata`
        },
        function (err, log) {
          if (err) return cb(err);
          return cb(null, item);
        }
      );
    });
  });
};

module.exports = Self;
