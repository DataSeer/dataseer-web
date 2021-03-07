/*
 * @prettier
 */

const Accounts = require('../models/accounts.js'),
  Roles = require('../models/roles.js'),
  Organisations = require('../models/organisations.js');

const JWT = require('../lib/jwt.js');

let Self = {};

Self.RegExp = {
  password: new RegExp('[\\w^\\w]{6,}'),
  email: new RegExp("[A-Za-z0-9!#$%&'*+-/=?^_`{|}~]+@[A-Za-z0-9-]+(.[A-Za-z0-9-]+)*")
};

/**
 * Authenticate account with JWT (token)
 * @param {Object} req req
 * @param {Object} res res
 * @param {Function} next
 * @returns {undefined} undefined
 */
Self.authenticate = function (req, res, next) {
  // If user is already authenticated with session, just go next
  if (req.user) return next();
  // Get token
  let token = JWT.getTokenfromHeaderOrQuerystring(req);
  if (!token) return next();
  // Just try to authenticate. If it fail, just go next
  else
    return JWT.check(token, req.app.get('private.key'), {}, function (err, decoded) {
      if (err) return next();
      return Accounts.findOne({ username: decoded.username }, function (err, user) {
        if (!err && user) req.user = user; // Set user
        return next();
      });
    });
};

/**
 * Sign up an account
 * @param {Object} opts Options available
 * @param {String} opts.organisation Organisation name
 * @param {String} opts.username Email account
 * @param {Buffer} opts.password Password account
 * @param {String} opts.fullname Fullname account
 * @param {Function} cb Callback function(err, res) (err: error process OR null, res: Account instance OR undefined)
 * @returns {undefined} undefined
 */
Self.signup = function (opts = {}, cb) {
  return Roles.findOne({ label: 'standard_user', weight: 10 }, function (err, role) {
    if (err) return cb(new Error('Given role does not exist'));
    return Organisations.findById(opts.organisation).exec(function (err, res) {
      if (err) return cb(new Error('Given organisation does not exist'));
      let account = new Accounts({
        username: opts.username,
        role: role.id,
        organisation: res.id,
        fullname: opts.fullname
      });
      return Accounts.register(account, opts.password, function (err) {
        if (err) return cb(err);
        return cb(null, account);
      });
    });
  });
};

/**
 * Reset password of an account
 * @param {Object} opts Options available
 * @param {String} opts.username Email account
 * @param {String} opts.token Token account
 * @param {Buffer} opts.password Password account
 * @param {Function} cb Callback function(err, res) (err: error process OR null, res: Account instance OR undefined)
 * @returns {undefined} undefined
 */
Self.resetPassword = function (opts = {}, cb) {
  return Accounts.findOne({ username: opts.username, 'tokens.resetPassword': opts.token }, function (err, user) {
    if (err) return cb(err);
    if (!user) return cb(new Error('Credentials incorrect !'));
    return user.setPassword(opts.password, function (err) {
      if (err) return cb(err);
      user.tokens.resetPassword = '';
      return user.save(function (err) {
        if (err) return cb(err);
        return cb();
      });
    });
  });
};

module.exports = Self;
