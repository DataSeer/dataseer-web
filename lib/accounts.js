/*
 * @prettier
 */

'use strict';

const roles = require('../conf/roles.json');

let Self = {
  roles: roles.reduce(function (acc, item) {
    acc[item.label] = { label: item.label, weight: item.weight };
    return acc;
  }, {}),
  match: {
    role: 'role', // will check only role
    weight: 'weight', // will check only weight
    all: 'all' // will check role & weight
  }
};

/**
 * Check access right of given account
 * @param {object} account - Req express vairable
 * @param {object} role - Role required
 * @param {object} match - Kind of match: by role, by weigth, or all of them
 * @returns {boolean} True if account authorized, else False
 */
Self.checkAccessRight = function (account, role = Self.roles.standard_user, match = Self.match.weight) {
  if (typeof account !== 'undefined' && typeof role === 'object') {
    if (typeof Self.match[match] !== 'undefined') {
      if (Self.match[match] === Self.match.weight) return account.role.weight >= role.weight;
      else if (Self.match[match] === Self.match.all)
        return account.role.weight >= role.weight && account.role.label === role.label;
      else if (Self.match[match] === Self.match.role) return account.role.label === role.label;
    }
  }
  return false;
};

/**
 * Add token in URL
 * @param {object} query - req.query express variable
 * @returns {string} True if account authorized, else False
 */
Self.addTokenInURL = function (query) {
  if (query.token) return `?token=${query.token}`;
  else if (query.documentToken) return `?documentToken=${query.documentToken}`;
  else return '';
};

module.exports = Self;
