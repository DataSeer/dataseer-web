/*
 * @prettier
 */

'use strict';

let Self = {
  actions: {}
};

Self.addActions = function (actions, cb) {
  actions.map(function (item) {
    Self.actions[item.key] = item;
  });
  return cb(null, actions);
};

module.exports = Self;
