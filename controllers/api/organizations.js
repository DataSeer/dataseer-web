/*
 * @prettier
 */

'use strict';

const _ = require(`lodash`);
const async = require(`async`);

const Accounts = require(`../../models/accounts.js`);
const Documents = require(`../../models/documents.js`);
const Organizations = require(`../../models/organizations.js`);
const OrganizationsLogsController = require(`../../controllers/api/organizations.logs.js`);

const CrudManager = require(`../../lib/crud.js`);
const AccountsManager = require(`../../lib/accounts.js`);
const Params = require(`../../lib/params.js`);

const conf = require(`../../conf/conf.json`);

let Self = {};

/**
 * GET organizations
 * @param {object} opts - Options available
 * @param {object} opts.data - Data available
 * @param {object} opts.user - Current user
 * @param {string} opts.data.ids - list of ids
 * @param {string} opts.data.limit - Limit of result
 * @param {string} opts.data.skip - Skip of result
 * @param {array} opts.data.visibleStates - Array of all available states of visible property (true or false)
 * @param {array} opts.data.lockedStates - Array of all available states of locked property (true or false)
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: Array of organizations OR undefined)
 * @returns {undefined} undefined
 */
Self.all = function (opts = {}, cb) {
  // Check all required data
  // if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`)); // Organizations are now public
  if (typeof _.get(opts, `data`) === `undefined`) return cb(new Error(`Missing required data: opts.data`));
  // Start process
  // Try to convert data sent
  let limit = Params.convertToInteger(opts.data.limit);
  let skip = Params.convertToInteger(opts.data.skip);
  let ids = Params.convertToArray(opts.data.ids, `string`);
  let visibleStates = Params.convertToArray(opts.data.visibleStates, `boolean`);
  let lockedStates = Params.convertToArray(opts.data.lockedStates, `boolean`);
  let sort = Params.convertToString(opts.data.sort);
  let query = {};
  // Set default value
  if (typeof ids === `undefined`) ids = [];
  if (typeof limit === `undefined` || limit < 0) limit = 0;
  if (typeof skip === `undefined` || skip < 0) skip = 0;
  if (typeof sort === `undefined` || sort !== `asc`) sort = `desc`;
  // Restrict access
  let accessRights = AccountsManager.getAccessRights(opts.user, AccountsManager.match.all);
  // Restrict visibility
  if (!accessRights.authenticated || accessRights.isVisitor) visibleStates = [true];
  // Restrict organizations
  if (accessRights.isStandardUser) {
    ids = opts.user.organizations.map(function (item) {
      return item._id.toString();
    });
  }
  if (accessRights.isModerator) {
    ids = [conf.mongodb.default.organizations.id].concat(
      opts.user.organizations.map(function (item) {
        return item._id.toString();
      })
    );
  }
  // Set query
  if (ids.length > 0) query._id = { $in: ids };
  if (typeof visibleStates !== `undefined`) query.visible = { $in: visibleStates };
  let params = { ids, sort, limit, skip, lockedStates, visibleStates };
  // Init transaction
  let transaction = Organizations.find(query)
    .skip(skip)
    .limit(limit)
    .sort(sort === `asc` ? { _id: 1 } : { _id: -1 });
  return transaction.exec(function (err, organizations) {
    if (err) return cb(err);
    let result = {
      data: organizations,
      params: params
    };
    return cb(null, result);
  });
};

/**
 * GET organization BY ID
 * @param {object} opts - Options available
 * @param {object} opts.data - Data available
 * @param {string} opts.data.id - id of the organization
 * @param {object} opts.user - Current user
 * @param {boolean} opts.[logs] - Specify if action must be logged (default: false)
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: organization instance OR undefined)
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
  let transaction = Organizations.findOne({ _id: opts.data.id });
  // Execute transaction
  return transaction.exec(function (err, organization) {
    if (err) return cb(err);
    if (!organization) return cb(true, new Error(`Organization not found`));
    if (!opts.logs) return cb(null, organization);
    return OrganizationsLogsController.create(
      {
        target: organization._id,
        account: opts.user.id,
        kind: CrudManager.actions.read._id
      },
      function (err) {
        if (err) return cb(err);
        return cb(null, organization);
      }
    );
  });
};

/**
 * ADD organization
 * @param {object} opts - Option available
 * @param {object} opts.data - Data available
 * @param {string} opts.data.name - name of the organization
 * @param {boolean} opts.data.visible - visiblity of the organization
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
  if (typeof _.get(opts, `data.name`) === `undefined`) return cb(new Error(`Missing required data: opts.data.name`));
  if (typeof _.get(opts, `data.visible`) === `undefined`)
    return cb(new Error(`Missing required data: opts.data.visible`));
  // Check all optionnal data
  if (typeof _.get(opts, `logs`) === `undefined`) opts.logs = true;
  let name = Params.convertToString(opts.data.name);
  if (typeof name === `undefined`) return cb(null, new Error(`Bad value: name`));
  let visible = Params.convertToBoolean(opts.data.visible);
  if (typeof visible === `undefined`) return cb(null, new Error(`Bad value: visible`));
  // Check all optionnal data
  let color = Params.convertToString(opts.data.color);
  let accessRights = AccountsManager.getAccessRights(opts.user);
  if (!accessRights.isAdministrator) return cb(null, new Error(`Unauthorized functionnality`));
  return Organizations.findOne({ name: name }, function (err, query) {
    if (err) return cb(err);
    if (query) return cb(null, new Error(`This organization already exist!`));
    let organization = new Organizations({
      name: name,
      color: color,
      visible: visible
    });
    return Organizations.create(organization, function (err, query) {
      if (err) return cb(err);
      if (!opts.logs) return cb(null, query);
      return OrganizationsLogsController.create(
        {
          target: query._id,
          account: opts.user._id,
          kind: CrudManager.actions.create._id
        },
        function (err) {
          if (err) return cb(err);
          return cb(null, query);
        }
      );
    });
  });
};

/**
 * UPDATE organization BY ID
 * @param {object} opts - option available
 * @param {object} opts.data - Data available
 * @param {string} opts.data.name - name of the organization
 * @param {boolean} opts.data.visible - Visiblity of the organization
 * @param {string} opts.data.color - Color of the organization
 * @param {object} opts.user - Current user
 * @param {boolean} opts.[logs] - Specify if action must be logged (default: true)
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: organizations instance process OR undefined)
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
  let name = Params.convertToString(opts.data.name);
  let visible = Params.convertToBoolean(opts.data.visible);
  let color = Params.convertToString(opts.data.color);
  return Self.get({ data: { id: opts.data.id }, user: opts.user }, function (err, organization) {
    if (err) return cb(err);
    if (organization instanceof Error) return cb(null, organization);
    if (typeof name !== `undefined`) organization.name = name;
    if (typeof visible !== `undefined`) organization.visible = visible;
    if (typeof color !== `undefined`) organization.color = color;
    return organization.save(function (err, organization) {
      if (err) return cb(err);
      if (!opts.logs) return cb(null, organization);
      return OrganizationsLogsController.create(
        { target: organization._id, account: opts.user._id, kind: CrudManager.actions.update._id },
        function (err) {
          if (err) return cb(err);
          return cb(null, organization);
        }
      );
    });
  });
};

/**
 * Update organizations
 * @param {object} opts - Option available
 * @param {object} opts.data - Data available
 * @param {array} opts.data.ids - Array of organizations id
 * @param {boolean} opts.data.visible - Visible of the organization
 * @param {string} opts.data.color - Color of the organization
 * @param {boolean} opts.[logs] - Specify if action must be logged (default: true)
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: organizations instance process OR undefined)
 * @returns {undefined} undefined
 */
Self.updateMany = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `data`) === `undefined`) return cb(new Error(`Missing required data: opts.data`));
  if (typeof _.get(opts, `data.ids`) === `undefined`) return cb(new Error(`Missing required data: opts.data.ids`));
  let accessRights = AccountsManager.getAccessRights(opts.user);
  if (!accessRights.isAdministrator) return cb(null, new Error(`Unauthorized functionnality`));
  // Check all optionnal data
  if (typeof _.get(opts, `logs`) === `undefined`) opts.logs = true;
  let ids = Params.convertToArray(opts.data.ids, `string`);
  if (!Params.checkArray(ids)) return cb(null, new Error(`You must select at least one organization`));
  let name = Params.convertToString(opts.data.name);
  let visible = Params.convertToBoolean(opts.data.visible);
  let color = Params.convertToString(opts.data.color);
  return async.reduce(
    ids,
    [],
    function (acc, item, next) {
      return Self.update(
        {
          user: opts.user,
          data: { id: item, name: name, visible: visible, color: color },
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
 * Delete organization
 * @param {object} opts - Option available
 * @param {object} opts.data - Data available
 * @param {array} opts.data.id - Array of organizations id
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: Array of process logs OR undefined)
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
  let result = [];
  return Self.get({ data: { id: opts.data.id }, user: opts.user }, function (err, organization) {
    if (err) return cb(err);
    if (!organization) return cb(null, new Error(`Organization not found`));
    if (organization instanceof Error) return cb(null, organization);
    return Organizations.deleteOne({ _id: organization._id.toString() }, function (err, res) {
      if (err) return cb(err);
      if (!res) return cb(null, new Error(`Organization has not been deleted`));
      result.push({ err: false, res: organization });
      return OrganizationsLogsController.delete({ target: organization._id }, function (err) {
        if (err) return cb(err);
        return Self.move(
          {
            data: { newOrganization: conf.mongodb.default.organizations.id, oldOrganization: opts.data.id },
            user: opts.user
          },
          function (err, res) {
            if (err) return cb(err);
            result = result.concat(res);
            return cb(null, result);
          }
        );
      });
    });
  });
};

/**
 * Delete multiples organizations (c.f delete function get more informations)
 * @param {object} opts - Options available
 * @param {object} opts.data - Data available
 * @param {array} opts.data.ids - Array of accounts id
 * @param {object} opts.user - User using this functionality (must be similar to req.user)
 * @param {boolean} opts.[logs] - Specify if action must be logged (default: true)
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: Array of process logs OR undefined)
 * @returns {undefined} undefined
 */
Self.deleteMany = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `data`) === `undefined`) return cb(new Error(`Missing required data: opts.data`));
  if (typeof _.get(opts, `data.ids`) === `undefined`) return cb(new Error(`Missing required data: opts.data.ids`));
  // Check all optionnal data
  if (typeof _.get(opts, `logs`) === `undefined`) opts.logs = true;
  let accessRights = AccountsManager.getAccessRights(opts.user, AccountsManager.match.all);
  let ids = Params.convertToArray(opts.data.ids, `string`);
  if (!Params.checkArray(ids)) return cb(null, new Error(`You must select at least one organization`));
  return async.reduce(
    ids,
    [],
    function (acc, item, next) {
      return Self.delete({ user: opts.user, data: { id: item }, logs: opts.logs }, function (err, res) {
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

/**
 * Move Accounts & Documents organizations
 * @param {object} opts - Options available
 * @param {object} opts.data - Data available
 * @param {array} opts.data.newOrganization - Id of the new organization
 * @param {array} opts.data.oldOrganization - Id of the old organization
 * @param {object} opts.user - User using this functionality (must be similar to req.user)
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: Array of process logs OR undefined)
 * @returns {undefined} undefined
 */
Self.move = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `data`) === `undefined`) return cb(new Error(`Missing required data: opts.data`));
  if (typeof _.get(opts, `data.newOrganization`) === `undefined`)
    return cb(new Error(`Missing required data: opts.data.newOrganization`));
  if (typeof _.get(opts, `data.oldOrganization`) === `undefined`)
    return cb(new Error(`Missing required data: opts.data.oldOrganization`));
  let accessRights = AccountsManager.getAccessRights(opts.user, AccountsManager.match.all);
  if (!accessRights.isAdministrator) return cb(null, new Error(`Unauthorized functionnality`));
  return async.reduce(
    [
      function (acc, next) {
        return Accounts.find({ organizations: { $in: [opts.data.oldOrganization] } }, function (err, accounts) {
          if (err) return next(err);
          if (!accounts) return next();
          return async.mapSeries(
            accounts,
            function (item, next) {
              // If current account only have the removed organization, put him in default organization
              if (item.organizations.length === 1) {
                item.organizations = opts.data.newOrganization;
                return item.save(function (err) {
                  acc.push({ err, res: item });
                  return next();
                });
              }
              // If current account have more than one organization, just remove the delete organization
              else {
                let organizationIndex = item.organizations.reduce(function (subAcc, item, index) {
                  if (opts.data.oldOrganization === item.toString()) subAcc = index;
                  return subAcc;
                }, -1);
                if (organizationIndex === -1) {
                  acc.push({
                    err: true,
                    res: `Account ${item.username} does not have this organization`
                  });
                  return next();
                }
                item.organizations.splice(organizationIndex, 1);
                return item.save(function (err) {
                  if (err)
                    acc.push({
                      err: true,
                      res: `Account ${item.username} has not been updated`
                    });
                  acc.push({ err, res: item });
                  return next();
                });
              }
            },
            function (err) {
              return next(err, acc);
            }
          );
        });
      },
      function (acc, next) {
        // Find documents owned by organization
        return Documents.find({ organizations: { $in: [opts.data.oldOrganization] } }, function (err, documents) {
          if (err) return next(err);
          if (!documents) return next();
          return async.mapSeries(
            documents,
            function (item, next) {
              // Case document is owned by a single organization (the removed organization)
              if (item.organizations.length === 1) item.organizations = opts.data.newOrganization;
              // Case document has been uploaded by only one organization (the removed organization)
              if (item.upload.organizations.length === 1) item.upload.organizations = opts.data.newOrganization;
              // Case document is owned by 1-n organizations
              if (item.organizations.length > 1) {
                let organizationIndex = item.organizations.reduce(function (subAcc, item, index) {
                  if (opts.data.oldOrganization === item.toString()) subAcc = index;
                  return subAcc;
                }, -1);
                if (organizationIndex === -1) {
                  acc.push({
                    err: true,
                    res: `Document ${item.name} does not have this organization (organizations)`
                  });
                }
                item.organizations.splice(organizationIndex, 1);
              }
              // Case document has been uploaded by 1-n organizations
              if (item.upload.organizations.length > 1) {
                let organizationIndex = item.upload.organizations.reduce(function (subAcc, item, index) {
                  if (opts.data.oldOrganization === item.toString()) subAcc = index;
                  return subAcc;
                }, -1);
                if (organizationIndex === -1) {
                  acc.push({
                    err: true,
                    res: `Document ${item.name} does not have this organization (upload.organizations)`
                  });
                }
                item.upload.organizations.splice(organizationIndex, 1);
              }
              return item.save(function (err) {
                if (err)
                  acc.push({
                    err: true,
                    res: `Document ${item.name} has not been updated`
                  });
                else acc.push({ err, res: item });
                return next();
              });
            },
            function (err) {
              return next(err, acc);
            }
          );
        });
      }
    ],
    [],
    function (acc, action, next) {
      return action(acc, next);
    },
    function (err, result) {
      if (err) return cb(err);
      return cb(null, result);
    }
  );
};

module.exports = Self;
