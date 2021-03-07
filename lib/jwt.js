/*
 * @prettier
 */

const jwt = require('jsonwebtoken');

let Self = {};

/**
 * Extract token from request
 * @param {Object} req Express req params
 * @returns {String} Token or undefined
 */
Self.getTokenfromHeaderOrQuerystring = function (req) {
  if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
    return req.headers.authorization.split(' ')[1];
  } else if (req.query && req.query.token) {
    return req.query.token;
  }
  return;
};

/**
 * Check given JWT
 * @param {String} token Given JWT
 * @param {String} privateKey Private key of JWT
 * @param {Object} opts JWT opts (see https://www.npmjs.com/package/jsonwebtoken#jwtverifytoken-secretorpublickey-options-callback)
 * @param {Function} cb Callback function(err, res) (err: error process OR null, res: decoded JWT OR undefined)
 * @returns {undefined} undefined
 */
Self.check = function (token, privateKey, opts = {}, cb) {
  if (privateKey)
    return jwt.verify(token, privateKey, opts, function (err, decoded) {
      if (err) return cb(err);
      return cb(null, decoded);
    });
  return cb(new Error('No private key provided'));
};

/**
 * Create new JWT
 * @param {Object} data Data stored in JWT
 * @param {String} privateKey Private key of JWT
 * @param {Integer} expiresIn JWT lifetime in second
 * @param {Function} cb Callback function(err, res) (err: error process OR null, res: JWT OR undefined)
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
