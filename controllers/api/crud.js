/*
 * @prettier
 */

'use strict';

const Crud = require(`../../models/crud.js`);

let Self = {};

/**
 * Return all crud action
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: result process OR undefined)
 * @returns {undefined} undefined
 */
Self.all = function (opts = {}, cb) {
  return Crud.find({}, function (err, actions) {
    if (err) return cb(err);
    return cb(null, actions);
  });
};

module.exports = Self;
