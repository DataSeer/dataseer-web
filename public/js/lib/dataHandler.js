/*
 * @prettier
 */

'use strict';

const DATAHANDLER = {
  object: {
    getPropertyRecursive: function (obj) {
      return _.reduce(
        obj,
        function (result, value, key) {
          if (_.isObjectLike(value)) {
            return result.concat(DATAHANDLER.object.getPropertyRecursive(value));
          } else {
            result.push(value);
          }
          return result;
        },
        []
      );
    },
    getRaw: function (obj) {
      return DATAHANDLER.object.getPropertyRecursive(obj).join(`;`);
    }
  },
  array: {
    sortOrganizations: function (a, b) {
      if (CONF.default.organizations.indexOf(a._id.toString()) > -1) return -1;
      if (CONF.default.organizations.indexOf(b._id.toString()) > -1) return 1;
      return a.name.localeCompare(b.name);
    },
    sortRoles: function (a, b) {
      if (a.weight === b.weight) return a.label.localeCompare(b.label);
      return b.weight - a.weight;
    },
    sortAccounts: function (a, b) {
      if (CONF.default.account === a._id) return -1;
      if (CONF.default.account === b._id) return 1;
      return a.username.localeCompare(b.username);
    }
  }
};
