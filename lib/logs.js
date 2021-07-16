/*
 * @prettier
 */

'use strict';

const _ = require(`lodash`);

const Params = require(`./params.js`);

/**
 * Constructor
 */
const Logs = function (model) {
  if (typeof model === `undefined`) throw new Error(`Missing required data: model`);
  this.model = model;
  return this;
};

/**
 * Create logs
 * @param {object} opts - Options available
 * @param {string} opts.target - Id of object who receive the action
 * @param {string} opts.account - Id of account who made the action
 * @param {string} opts.kind - Id of action (create, delete, update, read)
 * @param {string} opts.[key] - A given key
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: Log instance OR undefined)
 * @returns {undefined} undefined
 */
Logs.prototype.create = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `target`) === `undefined`) return cb(new Error(`Missing required data: opts.target`));
  if (typeof _.get(opts, `account`) === `undefined`) return cb(new Error(`Missing required data: opts.account`));
  if (typeof _.get(opts, `kind`) === `undefined`) return cb(new Error(`Missing required data: opts.kind`));
  // Start process
  // Try to convert data sent
  let target = Params.convertToString(opts.target);
  let account = Params.convertToString(opts.account);
  let kind = Params.convertToString(opts.kind);
  let key = Params.convertToString(opts.key);
  // Check converted values
  if (typeof target === `undefined`) return cb(null, new Error(`Bad opts.target value`));
  if (typeof account === `undefined`) return cb(null, new Error(`Bad opts.account value`));
  if (typeof kind === `undefined`) return cb(null, new Error(`Bad opts.kind value`));
  if (typeof key === `undefined`) key = ``;
  let self = this;
  return this.model.findOne({ target: target, account: account, kind: kind, key: key }, function (err, log) {
    if (err) return cb(err);
    // Create a new logs for this action
    if (!log)
      return self.model.create(
        {
          target: target,
          account: account,
          kind: kind,
          key: key,
          dates: new Date()
        },
        function (err, res) {
          if (err) return cb(err);
          return cb(null, res);
        }
      );
    // Or just push date of current action into date[]
    return self.model.findOneAndUpdate(
      {
        _id: log._id
      },
      { $push: { dates: new Date() } },
      function (err, res) {
        if (err) return cb(err);
        return cb(null, res);
      }
    );
  });
};

/**
 * Delete logs
 * @param {object} opts - Options available
 * @param {string} opts.data.target - Id of object who receive the action
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: rolesLogs instance OR undefined)
 * @returns {undefined} undefined
 */
Logs.prototype.delete = function (opts = {}, cb) {
  if (typeof _.get(opts, `target`) === `undefined`) return cb(new Error(`Missing required data: opts.target`));
  return this.model.deleteOne({ target: opts.target }, function (err) {
    if (err) return cb(err);
    return cb(null, true);
  });
};

module.exports = Logs;
