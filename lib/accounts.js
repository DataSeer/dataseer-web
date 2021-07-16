/*
 * @prettier
 */

'use strict';

const _ = require(`lodash`);
const md5 = require(`md5`);

const conf = require(`../conf/conf.json`);

let Self = {
  roles: {},
  match: {
    role: `role`, // will check only role
    weight: `weight`, // will check only weight
    all: `all` // will check role & weight
  }
};

/**
 * Check access right of given account
 * @param {object} account - Account
 * @param {object} role - Role required
 * @param {string} match - Kind of match: by role, by weigth, or all of them
 * @returns {boolean} True if account authorized, else False
 */
Self.checkAccessRight = function (account, role, match = Self.match.weight) {
  if (typeof account !== `undefined` && typeof role === `object`) {
    if (typeof Self.match[match] !== `undefined`) {
      if (Self.match[match] === Self.match.weight) return account.role.weight >= role.weight;
      else if (Self.match[match] === Self.match.all)
        return account.role.weight >= role.weight && account.role.key === role.key;
      else if (Self.match[match] === Self.match.role) return account.role.key === role.key;
    }
  }
  return false;
};

/*
 * get access right of given account
 * @param {object} account - Account
 * @param {string} match - Kind of match: by role, by weigth, or all of them
 * @returns {object} a object with access rights = true/false (isAdmin, isModerator, ...)
 */
Self.getAccessRights = function (account, match = Self.match.weight) {
  let result = { authenticated: false };
  if (typeof account !== `undefined`) {
    result.authenticated = true;
    Object.keys(Self.roles).map(function (key) {
      let role = Self.roles[key];
      if (typeof Self.match[match] !== `undefined`) {
        if (Self.match[match] === Self.match.weight)
          result[Self.transformKey(role.key)] = account.role.weight >= role.weight;
        else if (Self.match[match] === Self.match.all)
          result[Self.transformKey(role.key)] = account.role.weight >= role.weight && account.role.key === role.key;
        else if (Self.match[match] === Self.match.role)
          result[Self.transformKey(role.key)] = account.role.key === role.key;
      }
    });
  }
  return result;
};

Self.transformKey = function (key = ``) {
  if (key.length > 0) return `is${key.charAt(0).toUpperCase()}${key.substring(1)}`;
  else return key;
};

/**
 * Alias of init function
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: added roles)
 * @returns {undefined} undefined
 */
Self.addRoles = function (roles, cb) {
  roles.map(function (item) {
    Self.roles[item.key] = item.toObject();
  });
  return cb(null, roles);
};

/**
 * Alias of init function
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: true)
 * @returns {undefined} undefined
 */
Self.deleteRoles = function (roles, cb) {
  roles.map(function (item) {
    for (let key in Self.roles) {
      if (Self.roles[key]._id.toString() === item._id.toString()) delete Self.roles[key];
    }
  });
  return cb(null, true);
};

/**
 * Alias of init function
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: true)
 * @returns {undefined} undefined
 */
Self.updateRoles = function (roles, cb) {
  roles.map(function (item) {
    for (let key in Self.roles) {
      if (Self.roles[key]._id === item._id) {
        for (let k in item) {
          Self.roles[key][k] = item[k];
        }
      }
    }
  });
  return cb(null, true);
};

/**
 * Filter organizations ids for a given user
 * @param {array} organizations - Array of organizations ids that will be filtered depending of user organizations
 * @param {object} user - A given user (must be same as req.user vairable)
 * @param {boolean} [defaultOrg] - Include the defgault organization (default: true)
 * @returns {array} Array of filtered organizations ids
 */
Self.getOwnOrganizations = function (organizations = [], user = {}, defaultOrg = true) {
  // Check all required data
  if (typeof _.get(conf, `mongodb.default.organizations.id`) === `undefined`)
    throw Error(`Missing required data: const.mongodb.default.organizations.id`);
  if (typeof _.get(user, `organizations`) === `undefined`) throw Error(`Missing required data: user.organizations`);
  let authorizedOrganizations = defaultOrg ? { [conf.mongodb.default.organizations.id.toString()]: true } : {};
  // Add user organizations
  if (Array.isArray(user.organizations))
    user.organizations.reduce(function (acc, item) {
      if (typeof item._id !== `undefined`) acc[item._id.toString()] = true;
      return acc;
    }, authorizedOrganizations);
  // Filer organizations
  return organizations.filter(function (item) {
    return !!authorizedOrganizations[item];
  });
};

/**
 * Check if user has right on a given role id
 * @param {string} role - A role id
 * @param {object} user - A given user (must be same as req.user vairable)
 * @param {string} match - Kind of match: by role, by weigth, or all of them
 * @returns {boolean|Error} Return true (or false) if the user has right (or not) on this role (else, it will return an Error)
 */
Self.hasRightOnRole = function (role, user, match = Self.match.weight) {
  let currentRole;
  for (let key in Self.roles) {
    if (Self.roles[key]._id.toString() === role) currentRole = Self.roles[key];
  }
  if (!currentRole) return new Error(`Role not found`);
  if (typeof Self.match[match] === `undefined`) return new Error(`Bad match parameter`);
  if (Self.match[match] === Self.match.weight) return user.role.weight >= currentRole.weight;
  if (Self.match[match] === Self.match.role) return user.role.key === currentRole.key;
  if (Self.match[match] === Self.match.all)
    return user.role.weight >= currentRole.weight && user.role.key === currentRole.key;
};

Self.disable = function (account) {
  let hash = account._id.toString();
  account.salt = ``;
  account.hash = ``;
  account.tokens = {
    api: ``,
    resetPasswordToken: ``
  };
  account.visible = false;
  account.disabled = true;
  account.fullname = hash;
  account.username = hash;
};

module.exports = Self;
