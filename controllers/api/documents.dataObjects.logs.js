/*
 * @prettier
 */

'use strict';

const _ = require(`lodash`);

const Params = require(`../../lib/params.js`);

const DocumentsDataObjectsLogs = require(`../../models/documents.dataObjects.logs.js`);

let Self = {};

/**
 * Get all logs
 * @param {object} opts - Options available
 * @param {string} opts.target - Id of object who receive the action
 * @param {string} opts.accounts - Id of accounts who made the action
 * @param {string} opts.kind - Id of action (create, delete, update, read)
 * @param {integer} opts.limit - Limit
 * @param {integer} opts.skip - Skip
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: Log instance OR undefined)
 * @returns {undefined} undefined
 */
Self.all = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `target`) === `undefined`) return cb(new Error(`Missing required data: opts.target`));
  // Try to convert data sent
  let target = Params.convertToString(opts.target);
  let accounts = Params.convertToArray(opts.accounts, `string`);
  let kind = Params.convertToString(opts.kind);
  let limit = Params.convertToInteger(opts.limit);
  let skip = Params.convertToInteger(opts.skip);
  let updatedBefore = Params.convertToDate(opts.updatedBefore);
  let updatedAfter = Params.convertToDate(opts.updatedAfter);
  // Check converted values
  let filters = {};
  // Update between date & date
  if (Params.checkDate(updatedBefore)) {
    if (typeof filters.date === `undefined`) filters.date = {};
    filters.date.$lte = new Date(updatedBefore);
  }
  if (Params.checkDate(updatedAfter)) {
    if (typeof filters.date === `undefined`) filters.date = {};
    filters.date.$gte = new Date(updatedAfter);
  }
  if (typeof target !== `undefined`) filters[`target`] = target;
  if (Array.isArray(accounts) && accounts.length > 0) filters[`account`] = { $in: accounts };
  if (typeof kind !== `undefined`) filters[`kind`] = kind;
  if (isNaN(limit)) limit = 20;
  if (isNaN(skip)) skip = 0;
  let transaction = DocumentsDataObjectsLogs.find(filters).skip(skip).limit(limit);
  // Populate dependings on the parameters
  transaction.populate(`account`, `-tokens -hash -salt`);
  transaction.populate(`kind`);
  transaction.sort({ _id: -1 });
  return transaction.exec(function (err, res) {
    if (err) return cb(err);
    return cb(null, res);
  });
};

/**
 * Create logs
 * @param {object} opts - Options available
 * @param {string} opts.target - Id of object who receive the action
 * @param {string} opts.account - Id of account who made the action
 * @param {string} opts.kind - Id of action (create, delete, update, read)
 * @param {string} opts.state - DataObject state
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: Log instance OR undefined)
 * @returns {undefined} undefined
 */
Self.create = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `target`) === `undefined`) return cb(new Error(`Missing required data: opts.target`));
  if (typeof _.get(opts, `account`) === `undefined`) return cb(new Error(`Missing required data: opts.account`));
  if (typeof _.get(opts, `kind`) === `undefined`) return cb(new Error(`Missing required data: opts.kind`));
  if (typeof _.get(opts, `state`) === `undefined`) return cb(new Error(`Missing required data: opts.state`));
  // Try to convert data sent
  let target = Params.convertToString(opts.target);
  let account = Params.convertToString(opts.account);
  let kind = Params.convertToString(opts.kind);
  // Check converted values
  if (typeof target === `undefined`) return cb(null, new Error(`Bad opts.target value`));
  if (typeof account === `undefined`) return cb(null, new Error(`Bad opts.account value`));
  if (typeof kind === `undefined`) return cb(null, new Error(`Bad opts.kind value`));
  return DocumentsDataObjectsLogs.create(
    {
      target: target,
      account: account,
      kind: kind,
      state: opts.state,
      date: new Date()
    },
    function (err, res) {
      if (err) return cb(err);
      return cb(null, res);
    }
  );
};

/**
 * Delete logs
 * @param {object} opts - Options available
 * @param {string} opts.target - Id of object who receive the action
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: rolesLogs instance OR undefined)
 * @returns {undefined} undefined
 */
Self.delete = function (opts = {}, cb) {
  if (typeof _.get(opts, `target`) === `undefined`) return cb(new Error(`Missing required data: opts.target`));
  return DocumentsDataObjectsLogs.deleteOne({ target: opts.target }, function (err) {
    if (err) return cb(err);
    return cb(null, true);
  });
};

module.exports = Self;
