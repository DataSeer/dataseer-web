/*
 * @prettier
 */

'use strict';

const _ = require(`lodash`);
const async = require(`async`);

const Roles = require(`../../models/roles.js`);
const RolesLogsController = require(`../../controllers/api/roles.logs.js`);

const AccountsManager = require(`../../lib/accounts.js`);
const CrudManager = require(`../../lib/crud.js`);
const Params = require(`../../lib/params.js`);

let Self = {};

/**
 * GET roles
 * @param {object} opts - Options available
 * @param {object} opts.data - Data available
 * @param {object} opts.user - Current user
 * @param {string} opts.data.limit - Limit of result
 * @param {string} opts.data.skip - Skip of result
 * @param {string} opts.data.sort - Sort results (available value asc or desc)
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: Array of roles OR undefined)
 * @returns {undefined} undefined
 */
Self.all = function (opts = {}, cb) {
  // Check all required data
  // Check optional data
  if (typeof _.get(opts, `data`) === `undefined`) opts.data = {};
  // Start process
  // Try to convert data sent
  let ids = Params.convertToArray(opts.data.ids, `string`);
  let limit = Params.convertToInteger(opts.data.limit);
  let skip = Params.convertToInteger(opts.data.skip);
  let query = {};
  let sort = Params.convertToString(opts.data.sort);
  // Set default value
  if (typeof ids === `undefined`) ids = [];
  if (typeof limit === `undefined` || limit <= 0) limit = 20;
  if (typeof skip === `undefined` || skip < 0) skip = 0;
  if (typeof sort === `undefined` || sort !== `asc`) sort = `desc`;
  // Set query
  if (ids.length > 0) query._id = { $in: ids };
  let params = { limit, skip, sort };
  // Init transaction
  let transaction = Roles.find(query)
    .skip(skip)
    .limit(limit)
    .sort(sort === `asc` ? { _id: 1 } : { _id: -1 });
  return transaction.exec(function (err, roles) {
    if (err) return cb(err);
    let result = {
      data: roles,
      params: params
    };
    return cb(null, result);
  });
};

/**
 * GET role BY Id
 * @param {object} opts - Options available
 * @param {object} opts.data - Data available
 * @param {string} opts.data.id - id of the role
 * @param {object} opts.user - Current user
 * @param {boolean} opts.[logs] - Specify if action must be logged (default: true)
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: role instance OR undefined)
 * @returns {undefined} undefined
 */
Self.get = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `user._id`) === `undefined`) return cb(new Error(`Missing required data: opts.user._id`));
  if (typeof _.get(opts, `data`) === `undefined`) return cb(new Error(`Missing required data: opts.data`));
  if (typeof _.get(opts, `data.id`) === `undefined`) return cb(new Error(`Missing required data: opts.data.id`));
  // Check all optionnal data
  if (typeof _.get(opts, `logs`) !== true) opts.logs = false;
  // Start process
  let transaction = Roles.findOne({ _id: opts.data.id });
  // Execute transaction
  return transaction.exec(function (err, role) {
    if (err) return cb(err);
    if (!role) return cb(true, new Error(`Role not found`));
    if (!opts.logs) return cb(null, role);
    return RolesLogsController.create(
      {
        target: role._id,
        account: opts.user.id,
        kind: CrudManager.actions.read._id
      },
      function (err) {
        if (err) return cb(err);
        return cb(null, role);
      }
    );
  });
};

/**
 * ADD role
 * @param {object} opts - Option available
 * @param {object} opts.data - Data available
 * @param {string} opts.data.label - Label of the role
 * @param {string} opts.data.weight - Weight of the role
 * @param {string} opts.data.key - Key of the role
 * @param {object} opts.user - Current user
 * @param {boolean} opts.[logs] - Specify if action must be logged (default: true)
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: result process OR undefined)
 * @returns {undefined} undefined
 */
Self.add = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `user._id`) === `undefined`) return cb(new Error(`Missing required data: opts.user._id`));
  if (typeof _.get(opts, `data`) === `undefined`) return cb(new Error(`Missing required data: opts.data`));
  if (typeof _.get(opts, `data.label`) === `undefined`) return cb(new Error(`Missing required data: opts.data.label`));
  if (typeof _.get(opts, `data.key`) === `undefined`) return cb(new Error(`Missing required data: opts.data.key`));
  if (typeof _.get(opts, `data.weight`) === `undefined`)
    return cb(new Error(`Missing required data: opts.data.weight`));
  let accessRights = AccountsManager.getAccessRights(opts.user);
  if (!accessRights.isAdministrator) return cb(null, new Error(`Unauthorized functionnality`));
  // Check all optionnal data
  if (typeof _.get(opts, `logs`) === `undefined`) opts.logs = true;
  let label = Params.convertToString(opts.data.label);
  if (typeof label === `undefined`) return cb(null, new Error(`Bad value: label`));
  let key = Params.convertToString(opts.data.key);
  if (typeof key === `undefined`) return cb(null, new Error(`Bad value: key`));
  let weight = Params.convertToInteger(opts.data.weight);
  if (typeof weight === `undefined`) return cb(null, new Error(`Bad value: weight`));
  return Roles.findOne({ $or: [{ label: label }, { key: key }] }, function (err, query) {
    if (err) return cb(err);
    if (query) {
      if (query.key === opts.data.key) return cb(null, new Error(`This key already exist!`));
      if (query.label === opts.data.label) return cb(null, new Error(`This label already exist!`));
    }
    let role = new Roles({
      label: label,
      key: key,
      weight: weight
    });
    return Roles.create(role, function (err, query) {
      if (err) return cb(err);
      if (!opts.logs) return cb(null, query);
      return RolesLogsController.create(
        {
          target: query._id,
          account: opts.user._id,
          kind: CrudManager.actions.create._id
        },
        function (err) {
          if (err) return cb(err);
          return AccountsManager.addRoles([role], function (err) {
            if (err) return cb(err);
            return cb(null, query);
          });
        }
      );
    });
  });
};

/**
 * UPDATE role BY ID
 * @param {object} opts - option available
 * @param {object} opts.data - Data available
 * @param {string} opts.data.label - label of the role
 * @param {string} opts.data.weight - weight of the role
 * @param {string} opts.data.id - id of the role
 * @param {object} opts.user - Current user
 * @param {boolean} opts.[logs] - Specify if action must be logged (default: true)
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: roles instance process OR undefined)
 * @returns {undefined} undefined
 */
Self.update = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `user._id`) === `undefined`) return cb(new Error(`Missing required data: opts.user._id`));
  if (typeof _.get(opts, `data`) === `undefined`) return cb(new Error(`Missing required data: opts.data`));
  if (typeof _.get(opts, `data.id`) === `undefined`) return cb(new Error(`Missing required data: opts.data.id`));
  let accessRights = AccountsManager.getAccessRights(opts.user);
  if (!accessRights.isAdministrator) return cb(null, new Error(`Unauthorized functionnality`));
  // Check all optionnal data
  if (typeof _.get(opts, `logs`) === `undefined`) opts.logs = true;
  let label = Params.convertToString(opts.data.label);
  let weight = Params.convertToInteger(opts.data.weight);
  return Self.get({ data: { id: opts.data.id }, user: opts.user }, function (err, role) {
    if (err) return cb(err);
    if (!role) return cb(null, new Error(`Role not found`));
    if (role instanceof Error) return cb(null, role);
    if (typeof label !== `undefined`) role.label = label;
    if (typeof weight !== `undefined`) role.weight = weight;
    return role.save(function (err, role) {
      if (err) return cb(err);
      if (!opts.logs) return cb(null, role);
      return RolesLogsController.create(
        { target: role._id, account: opts.user._id, kind: CrudManager.actions.update._id },
        function (err) {
          if (err) return cb(err);
          return AccountsManager.updateRoles([role], function (err) {
            if (err) return cb(err);
            return cb(null, role);
          });
        }
      );
    });
  });
};

/**
 * Update roles
 * @param {object} opts - Option available
 * @param {object} opts.data - Data available
 * @param {array} opts.data.roles - Array of roles id
 * @param {boolean} opts.[logs] - Specify if action must be logged (default: true)
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: roles instance process OR undefined)
 * @returns {undefined} undefined
 */
Self.updateMany = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `data`) === `undefined`) return cb(new Error(`Missing required data: opts.data`));
  if (typeof _.get(opts, `data.roles`) === `undefined`) return cb(new Error(`Missing required data: opts.data.roles`));
  let accessRights = AccountsManager.getAccessRights(opts.user);
  if (!accessRights.isAdministrator) return cb(null, new Error(`Unauthorized functionnality`));
  let roles = Params.convertToArray(opts.data.roles, `string`);
  if (!Params.checkArray(roles)) return cb(null, new Error(`You must select at least one role!`));
  // Check all optionnal data
  let label = Params.convertToString(opts.data.label);
  let weight = Params.convertToInteger(opts.data.weight);
  if (typeof _.get(opts, `logs`) === `undefined`) opts.logs = true;
  return async.reduce(
    roles,
    [],
    function (acc, item, next) {
      return Self.update(
        {
          user: opts.user,
          data: { id: item, label: opts.data.label, weight: opts.data.weight },
          logs: opts.logs
        },
        function (err, res) {
          acc.push({ err, res });
          return next(null, acc);
        }
      );
    },
    function (err, result) {
      if (err) return cb(err);
      return cb(null, result);
    }
  );
};

/**
 * Delete role
 * @param {object} opts - Option available
 * @param {object} opts.data - Data available
 * @param {array} opts.data.id - Array of roles id
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: roles instance process OR undefined)
 * @returns {undefined} undefined
 */
Self.delete = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `data`) === `undefined`) return cb(new Error(`Missing required data: opts.data`));
  if (typeof _.get(opts, `data.id`) === `undefined`) return cb(new Error(`Missing required data: opts.data.id`));
  // Check all optionnal data
  let accessRights = AccountsManager.getAccessRights(opts.user);
  if (!accessRights.isAdministrator) return cb(null, new Error(`Unauthorized functionnality`));
  return Self.get({ data: { id: opts.data.id }, user: opts.user }, function (err, role) {
    if (err) return cb(err);
    if (!role) return cb(null, new Error(`Role not found`));
    if (role instanceof Error) return cb(null, role);
    return Roles.deleteOne({ _id: role._id }, function (err) {
      if (err) return cb(err);
      return AccountsManager.deleteRoles([role], function (err) {
        if (err) return cb(err);
        return RolesLogsController.delete({ target: role._id }, function (err) {
          if (err) return cb(err);
          return cb(null, role);
        });
      });
    });
  });
};

/**
 * deletes multiples roles (c.f delete function get more informations)
 * @param {object} opts - Options available
 * @param {object} opts.data - Data available
 * @param {array} opts.data.roles - Array of accounts id
 * @param {object} opts.user - User using this functionality (must be similar to req.user)
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: account instance OR undefined)
 * @returns {undefined} undefined
 */
Self.deleteMany = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `data`) === `undefined`) return cb(new Error(`Missing required data: opts.data`));
  if (typeof _.get(opts, `data.roles`) === `undefined`) return cb(new Error(`Missing required data: opts.data.roles`));
  let accessRights = AccountsManager.getAccessRights(opts.user, AccountsManager.match.all);
  let roles = Params.convertToArray(opts.data.roles, `string`);
  if (!Params.checkArray(roles)) return cb(null, new Error(`You must select at least one role`));
  return async.reduce(
    roles,
    [],
    function (acc, item, next) {
      return Self.delete({ data: { id: item }, user: opts.user }, function (err, res) {
        acc.push({ err, res });
        return next(null, acc);
      });
    },
    function (err, result) {
      if (err) return cb(err);
      return cb(null, result);
    }
  );
};

module.exports = Self;
