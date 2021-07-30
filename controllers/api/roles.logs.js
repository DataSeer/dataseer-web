/*
 * @prettier
 */

'use strict';

const RolesLogs = require(`../../models/roles.logs.js`);

let Self = {};

/**
 * Create role logs
 * @param {object} opts - Options available
 * @param {string} opts.target - Id of role who receive the action
 * @param {string} opts.account - Id of account who made the action
 * @param {string} opts.kind - Id of action (create, delete, update, read)
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: rolesLogs instance OR undefined)
 * @returns {undefined} undefined
 */
Self.create = function (params = {}, cb) {
  return RolesLogs.findOne({ target: params.target, account: params.account, kind: params.kind }, function (err, log) {
    if (err) return cb(err);
    //if no log we need to create a new logs for this action
    if (!log)
      return RolesLogs.create(
        {
          target: params.target,
          account: params.account,
          kind: params.kind,
          dates: new Date()
        },
        function (err, res) {
          if (err) return cb(err);
          return cb(null, res);
        }
      );
    //else if log already existe, just push date of current action in date[], no need to create new object
    else
      return RolesLogs.findOneAndUpdate(
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
 * Delete role logs
 * @param {object} opts - Options available
 * @param {string} opts.target - Id of role who receive the action
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: rolesLogs instance OR undefined)
 * @returns {undefined} undefined
 */
Self.delete = function (params = {}, cb) {
  return RolesLogs.deleteOne({ target: params.target }, function (err) {
    if (err) return cb(err);
    return cb(null, true);
  });
};

module.exports = Self;
