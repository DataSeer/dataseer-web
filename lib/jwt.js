/*
 * @prettier
 */

'use strict';

const jwt = require(`jsonwebtoken`);

let Self = {};

/**
 * Check given JWT
 * @param {string} token - Given JWT
 * @param {string} privateKey - Private key of JWT
 * @param {object} opts - JWT opts (see https://www.npmjs.com/package/jsonwebtoken#jwtverifytoken-secretorpublickey-options-callback)
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: decoded JWT OR undefined)
 * @returns {undefined} undefined
 */
Self.check = function (token, privateKey, opts = {}, cb) {
  if (privateKey)
    return jwt.verify(token, privateKey, opts, function (err, decoded) {
      if (err) return cb(err);
      return cb(null, decoded);
    });
  return cb(new Error(`No private key provided`));
};

/**
 * Create new JWT
 * @param {object} data - Data stored in JWT
 * @param {string} privateKey - Private key of JWT
 * @param {Integer} expiresIn - JWT lifetime in second
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: JWT OR undefined)
 * @returns {undefined} undefined
 */
Self.create = function (data, privateKey, expiresIn, cb) {
  return jwt.sign(
    data,
    privateKey,
    { 'expiresIn': expiresIn }, // expire in 2 mounth
    function (err, token) {
      return cb(err, token);
    }
  );
};

module.exports = Self;
