/*
 * @prettier
 */

let object = {
  roles: {
    standard_user: {
      label: 'standard_user',
      weight: 10
    },
    annotator: {
      label: 'annotator',
      weight: 100
    },
    curator: {
      label: 'curator',
      weight: 1000
    }
  },
  match: {
    role: 'role', // will check only role
    weight: 'weight', // will check only weight
    all: 'all' // will check role & weight
  }
};

// check AccessRight of given user
object.checkAccountAccessRight = function (account, role = object.roles.standard_user, match = object.match.weight) {
  if (typeof account !== 'undefined' && typeof role === 'object') {
    if (typeof object.match[match] !== 'undefined') {
      if (object.match[match] === object.match.weight) return account.role.weight >= role.weight;
      else if (object.match[match] === object.match.all)
        return account.role.weight >= role.weight && account.role.label === role.label;
      else if (object.match[match] === object.match.role) return account.role.label === role.label;
    }
  }
  return false;
};

// Build "modifiedBy" condition
object.getModifiedByQuery = function (account) {
  if (typeof account !== 'undefined') {
    let query = { modifiedBy: { $in: [] } };
    for (let role in object.roles) {
      let condition = {};
      condition[object.roles[role].label] = {};
      condition[object.roles[role].label][account.id] = account.username;
      query.modifiedBy['$in'].push(condition);
    }
    return query;
  }
  return undefined;
};

module.exports = object;
