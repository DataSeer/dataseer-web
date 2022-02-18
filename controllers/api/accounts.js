/*
 * @prettier
 */

'use strict';

const _ = require(`lodash`);
const async = require(`async`);

const Accounts = require(`../../models/accounts.js`);
const Roles = require(`../../models/roles.js`);
const Organizations = require(`../../models/organizations.js`);
const AccountsLogs = require(`../../models/accounts.logs.js`);
const DocumentsLogs = require(`../../models/documents.logs.js`);

const AccountsLogsController = require(`../../controllers/api/accounts.logs.js`);

const AccountsManager = require(`../../lib/accounts.js`);
const CrudManager = require(`../../lib/crud.js`);
const JWT = require(`../../lib/jwt.js`);
const Params = require(`../../lib/params.js`);
const Url = require(`../../lib/url.js`);
const Mailer = require(`../../lib/mailer.js`);

const conf = require(`../../conf/conf.json`);

let Self = {};

/**
 * Extract token from request
 * @param {object} req - req  express params
 * @returns {string} Token or undefined
 */
Self.getTokenfromHeaderOrQuerystring = function (req) {
  if (typeof req !== `object`) throw new Error(`Missing required data: req (express variable)`);
  if (req.headers.authorization && req.headers.authorization.split(` `)[0] === `Bearer`) {
    return { token: req.headers.authorization.split(` `)[1], key: `tokens.api` };
  } else if (req.cookies && req.cookies.token) {
    return { token: req.cookies.token, key: `tokens.api` };
  } else if (req.query && req.query.token) {
    return { token: req.query.token, key: `tokens.api` };
  }
  return;
};

/**
 * Authenticate account with JWT (token)
 * @param {object} req - req express variable
 * @param {object} res - res express variable
 * @param {function} next - next express variable
 * @returns {undefined} undefined
 */
Self.authenticate = function (req, res, next) {
  // Check all required data
  if (typeof req !== `object`) throw new Error(`Missing required data: req (express variable)`);
  if (typeof res !== `object`) throw new Error(`Missing required data: res (express variable)`);
  if (typeof next !== `function`) throw new Error(`Missing required data: next (express variable)`);
  // Check all optionnal data
  // Start process
  // If user is already authenticated with session, just go next
  if (req.user) return next();
  // Get token
  let tokenInfos = Self.getTokenfromHeaderOrQuerystring(req);
  if (!tokenInfos || !tokenInfos.token || !tokenInfos.key) return next();
  // Just try to authenticate. If it fail, just go next
  else
    return JWT.check(tokenInfos.token, req.app.get(`private.key`), {}, function (err, decoded) {
      if (err) return next();
      return Accounts.findOne({ _id: decoded.accountId, [tokenInfos.key]: tokenInfos.token, disabled: false })
        .populate(`organizations`)
        .populate(`role`)
        .exec(function (err, user) {
          if (!err && user) req.user = user; // Set user
          return next();
        });
    });
};

/**
 * Authenticate account with JWT (token)
 * @param {object} tokenInfos - Infos about the token
 * @param {string} tokenInfos.token - Content of the token
 * @param {string} tokenInfos.key - Key of the token that must be used to find the account in mongodb
 * @param {object} tokenInfos.[opts] - Options sent to jwt.vertify function (default: {})
 * @param {object} opts - Options data
 * @param {string} opts.privateKey - Private key that must be used
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: Account instance OR undefined)
 * @returns {undefined} undefined
 */
Self.authenticateToken = function (tokenInfos = {}, opts = {}, cb) {
  // Check all required data
  if (typeof _.get(tokenInfos, `token`) === `undefined`)
    return cb(new Error(`Missing required data: tokenInfos.token`));
  if (typeof _.get(tokenInfos, `key`) === `undefined`) return cb(new Error(`Missing required data: tokenInfos.key`));
  if (typeof _.get(opts, `privateKey`) === `undefined`) return cb(new Error(`Missing required data: opts.privateKey`));
  // Check all optionnal data
  if (typeof _.get(tokenInfos, `opts`) === `undefined`) tokenInfos.opts = {};
  // Start process
  // Just try to authenticate. If it fail, just go next
  return JWT.check(tokenInfos.token, opts.privateKey, tokenInfos.opts, function (err, decoded) {
    if (err) return cb(err);
    return Accounts.findOne({ _id: decoded.accountId, [tokenInfos.key]: tokenInfos.token }, function (err, account) {
      if (err) return cb(err);
      if (!account) return cb(null, new Error(`Autentication failed`));
      return cb(null, account);
    });
  });
};

/**
 * Check token validity
 * @param {object} tokenInfos - Infos about the token
 * @param {string} tokenInfos.token - Content of the token
 * @param {string} tokenInfos.key - Key of the token that must be used to find the account in mongodb
 * @param {object} tokenInfos.[opts] - Options sent to jwt.vertify function (default: {})
 * @param {object} opts - Options data
 * @param {string} opts.privateKey - Private key that must be used
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: decoded token OR undefined)
 * @returns {undefined} undefined
 */
Self.checkTokenValidity = function (tokenInfos = {}, opts = {}, cb) {
  // Check all required data
  if (typeof _.get(tokenInfos, `token`) === `undefined`)
    return cb(new Error(`Missing required data: tokenInfos.token`));
  if (typeof _.get(tokenInfos, `key`) === `undefined`) return cb(new Error(`Missing required data: tokenInfos.key`));
  if (typeof _.get(opts, `privateKey`) === `undefined`) return cb(new Error(`Missing required data: opts.privateKey`));
  // Check all optionnal data
  if (typeof _.get(tokenInfos, `opts`) === `undefined`) tokenInfos.opts = {};
  // Start process
  // Just try to authenticate. If it fail, just go next
  return JWT.check(tokenInfos.token, opts.privateKey, tokenInfos.opts, function (err, decoded) {
    let token = { valid: false };
    if (err && err.name !== `TokenExpiredError`) return cb(null, token);
    token.valid = true;
    token.revoked = true;
    if (err && err.name === `TokenExpiredError`) {
      token.expired = true;
      token.expiredAt = new Date(err.expiredAt).getTime() / 1000;
      return cb(null, token);
    } else token.expired = false;
    if (!decoded.accountId) return cb(null, new Error(`Bad token : does not contain enough data`));
    return Accounts.findOne({ _id: decoded.accountId, [tokenInfos.key]: tokenInfos.token }, function (err, account) {
      if (err) return cb(err);
      token.revoked = false;
      token.expiredAt = decoded.exp;
      return cb(null, token);
    });
  });
};

/**
 * Sign up an account
 * @param {object} opts - Options available
 * @param {string} opts.username - Account username
 * @param {string} opts.password - Account password
 * @param {string} opts.[organizations] - Account organizations id
 * @param {string} opts.[fullname] - Account fullname
 * @param {boolean} opts.[visible] - Account visible
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: Account instance OR undefined)
 * @returns {undefined} undefined
 */
Self.signup = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(conf, `mongodb.default.roles.id`) === `undefined`)
    return cb(new Error(`Missing required data: default role id (configuration file)`));
  if (typeof _.get(conf, `mongodb.default.organizations.id`) === `undefined`)
    return cb(new Error(`Missing required data: default organization id (configuration file)`));
  if (typeof _.get(opts, `username`) === `undefined`) return cb(new Error(`Missing required data: opts.username`));
  if (typeof _.get(opts, `password`) === `undefined`) return cb(new Error(`Missing required data: opts.password`));
  // Check all optionnal data
  if (typeof _.get(opts, `organizations`) === `undefined`) opts.organizations = [conf.mongodb.default.organizations.id];
  if (typeof _.get(opts, `fullname`) === `undefined`) opts.fullname = ``;
  if (typeof _.get(opts, `visible`) === `undefined`) opts.visible = true;
  // Start process
  if (!Params.checkPassword(opts.password))
    return cb(null, new Error(`Password incorrect! (at least 6 chars required)`));
  // Get the default role stored in mongoDB
  return Roles.findById(conf.mongodb.default.roles.id).exec(function (err, role) {
    if (err) return cb(err);
    else if (!role) return cb(new Error(`Default role does not exist`));
    return Organizations.find({ _id: { $in: opts.organizations } }).exec(function (err, organizations) {
      if (err) return cb(err);
      else if (!organizations) return cb(null, new Error(`Given organization(s) does not exist`));
      let account = new Accounts({
        username: opts.username,
        fullname: opts.fullname,
        organizations: organizations.map(function (item) {
          return item._id.toString();
        }),
        visible: opts.visible,
        role: role._id,
        disabled: false
      });
      return Accounts.register(account, opts.password, function (err) {
        if (err) {
          if (err.name === `UserExistsError`) return cb(null, new Error(`Given username not correct`));
          else return cb(err);
        }
        return Mailer.sendMail(
          {
            to: account.username,
            bcc: Mailer.default.bcc,
            template: Mailer.templates.accounts.create,
            data: { user: account }
          },
          function (err, info) {
            if (err) return cb(err);
            return cb(null, {
              username: account.username,
              fullname: account.fullname,
              organizations: account.organizations,
              role: account.role,
              _id: account._id
            });
          }
        );
      });
    });
  });
};

/**
 * Sign in an account (Use this function after checking the account authentication)
 * @param {object} opts - Options available
 * @param {object} opts.username - Account email
 * @param {string} opts.privateKey - Private key that must be used
 * @param {boolean} opts.[newToken] - Create a new token & revoke the older one (default: false)
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: Account instance OR undefined)
 * @returns {undefined} undefined
 */
Self.signin = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `username`) === `undefined`) return cb(new Error(`Missing required data: opts.username`));
  if (typeof _.get(opts, `privateKey`) === `undefined`) return cb(new Error(`Missing required data: opts.privateKey`));
  if (typeof _.get(conf, `tokens.api.expiresIn`) === `undefined`)
    return cb(new Error(`Missing required data: conf.tokens.api.expiresIn`));
  // Check all optionnal data
  if (typeof _.get(opts, `newToken`) === `undefined`) opts.newToken = false;
  // Start process
  return Accounts.findOne({ username: opts.username }).exec(function (err, account) {
    if (err) return cb(err);
    if (!account) return cb(null, new Error(`Account not found`));
    if (account.disabled) return cb(null, new Error(`This account has been disabled!`));
    let accessRights = AccountsManager.getAccessRights(account, AccountsManager.match.all);
    if (accessRights.isVisitor) return cb(null, new Error(`Unauthorized functionnality`));
    // delete reset password token
    account.tokens.resetPassword = ``;
    return JWT.check(account.tokens.api, opts.privateKey, {}, function (err, decoded) {
      if (!(err instanceof Error) && !opts.newToken && account.tokens.api !== ``) {
        return account.save(function (err) {
          if (err) return cb(err);
          // return existing token
          return cb(null, {
            token: account.tokens.api,
            username: account.username,
            fullname: account.fullname,
            organizations: account.organizations,
            role: account.role,
            _id: account._id
          });
        });
      }
      // create new token
      else
        return JWT.create(
          { accountId: account._id.toString() },
          opts.privateKey,
          conf.tokens.api.expiresIn,
          function (err, token) {
            if (err) return cb(err);
            account.tokens.api = token;
            return account.save(function (err) {
              if (err) return cb(err);
              return cb(null, {
                token: account.tokens.api,
                username: account.username,
                fullname: account.fullname,
                organizations: account.organizations,
                role: account.role,
                _id: account._id
              });
            });
          }
        );
    });
  });
};

/**
 * Sign out an account
 * @param {object} opts - Options available
 * @param {object} opts.user - User using this functionality (must be similar to req.user)
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: Account instance OR undefined)
 * @returns {undefined} undefined
 */
Self.signout = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `user.username`) === `undefined`)
    return cb(new Error(`Missing required data: opts.user.username`));
  let accessRights = AccountsManager.getAccessRights(opts.user, AccountsManager.match.all);
  if (accessRights.isVisitor) return cb(null, new Error(`Unauthorized functionnality`));
  // Check all optionnal data
  // Start process
  return Accounts.findOne({ username: opts.user.username }).exec(function (err, account) {
    if (err) return cb(err);
    if (!account) return cb(null, new Error(`Account not found`));
    if (account.disabled) return cb(null, new Error(`This account has been disabled!`));
    // delete api token
    account.tokens.api = ``;
    return account.save(function (err) {
      if (err) return cb(err);
      return cb(null, {
        username: account.username,
        fullname: account.fullname,
        organizations: account.organizations,
        role: account.role,
        _id: account._id
      });
    });
  });
};

/**
 * Reset password of an account
 * @param {object} opts - Options available
 * @param {object} opts.[privateKey] - privateKey
 * @param {object} opts.[resetPasswordToken] - Account resetPassword token
 * @param {object} opts.[username] - Account email
 * @param {string} opts.[current_password] - Account current password
 * @param {string} opts.[new_password] - Account new password
 * @param {boolean} opts.[mute] - Boolean that specifiy if mail will be muted (default: false)
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: Account instance OR undefined)
 * @returns {undefined} undefined
 */
Self.resetPassword = function (opts = {}, cb) {
  let actions = [
    // case user is logged
    function (acc, next) {
      if (
        Params.checkEmail(opts.username) &&
        Params.checkPassword(opts.current_password) &&
        Params.checkPassword(opts.new_password)
      )
        return Accounts.findOne({ username: opts.username }, function (err, account) {
          if (err) return next(err);
          if (!account) return next(new Error(`Account not found!`));
          let accessRights = AccountsManager.getAccessRights(account, AccountsManager.match.all);
          if (accessRights.isVisitor) return cb(null, new Error(`Unauthorized functionnality`));
          return account.changePassword(opts.current_password, opts.new_password, function (err) {
            if (err) return next(err);
            acc = account;
            return next(null, acc);
          });
        });
      return next(null, acc);
    },
    // case user is not logged
    function (acc, next) {
      if (
        Params.checkString(opts.resetPasswordToken) &&
        Params.checkString(opts.privateKey) &&
        Params.checkPassword(opts.new_password)
      )
        return Self.authenticateToken(
          {
            token: opts.resetPasswordToken,
            key: `tokens.resetPassword`
          },
          { privateKey: opts.privateKey },
          function (err, account) {
            if (err) return next(err);
            if (account instanceof Error) return next(account);
            if (!account) return next(new Error(`Account not found!`));
            let accessRights = AccountsManager.getAccessRights(account, AccountsManager.match.all);
            if (accessRights.isVisitor) return cb(null, new Error(`Unauthorized functionnality`));
            return account.setPassword(opts.new_password, function (err) {
              if (err) return next(err);
              acc = account;
              return next(null, acc);
            });
          }
        );
      return next(null, acc);
    },
    // Save Account
    function (acc, next) {
      // Here, acc need to be an account
      if (typeof acc !== `object` || typeof acc.save !== `function`) return next(new Error(`Account not found!`));
      // Reset the account token
      acc.tokens.resetPassword = ``;
      return acc.save(function (err) {
        if (err) return next(err);
        return next(null, acc);
      });
    },
    // Send mail
    function (acc, next) {
      if (opts.mute)
        return next(null, {
          username: acc.username,
          fullname: acc.fullname,
          organizations: acc.organizations,
          role: acc.role,
          _id: acc._id
        });
      return Mailer.sendMail(
        {
          to: acc.username,
          template: Mailer.templates.accounts.resetPassword,
          data: { user: acc }
        },
        function (err, info) {
          if (err) return next(err);
          return next(null, {
            username: acc.username,
            fullname: acc.fullname,
            organizations: acc.organizations,
            role: acc.role,
            _id: acc._id
          });
        }
      );
    }
  ];
  // Execute all actions
  return async.reduce(
    actions, // [Function, function, ... ]
    {}, // Will contain useful data
    function (acc, action, next) {
      return action(acc, next);
    },
    function (err, result) {
      if (err) return cb(err);
      return cb(null, result);
    }
  );
};

/**
 * Forgot password of an account
 * @param {object} opts - Options available
 * @param {object} opts.username - Account email
 * @param {string} opts.password - Account password
 * @param {string} opts.current_password - Account password
 * @param {string} opts.new_password - Account new password
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: Account instance OR undefined)
 * @returns {undefined} undefined
 */
Self.forgotPassword = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `username`) === `undefined`) return cb(new Error(`Missing required data: opts.username`));
  if (typeof _.get(opts, `privateKey`) === `undefined`) return cb(new Error(`Missing required data: opts.privateKey`));
  if (typeof _.get(conf, `tokens.resetPassword.expiresIn`) === `undefined`)
    return cb(new Error(`Missing required data: conf.tokens.resetPassword.expiresIn`));
  // Start process
  return Accounts.findOne({ username: opts.username }, function (err, account) {
    if (err) return cb(err);
    if (!account) return cb(null, new Error(`Account not found!`));
    let accessRights = AccountsManager.getAccessRights(account, AccountsManager.match.all);
    if (accessRights.isVisitor) return cb(null, new Error(`Unauthorized functionnality`));
    return JWT.create(
      { accountId: account._id },
      opts.privateKey,
      conf.tokens.resetPassword.expiresIn,
      function (err, token) {
        if (err) return cb(err);
        if (token) account.tokens.resetPassword = token;
        return account.save(function (err) {
          if (err) return cb(err);
          let url = Url.build(`resetPassword`, { resetPasswordToken: token, username: account.username });
          return Mailer.sendMail(
            {
              to: account.username,
              template: Mailer.templates.accounts.forgotPassword,
              data: { user: account, url: url }
            },
            function (err, info) {
              if (err) return cb(err);
              return cb(null, account);
            }
          );
        });
      }
    );
  });
};

/**
 * Get all accounts
 * @param {object} opts - Options available
 * @param {object} opts.data - Data available
 * @param {string} opts.data.[ids] - list of ids
 * @param {string} opts.data.[limit] - Limit parameter
 * @param {string} opts.data.[skip] - Skip parameter
 * @param {string} opts.data.[roles] - Roles parameter
 * @param {string} opts.data.[organizations] - Organizations parameter
 * @param {string} opts.data.[visibleStates] - VisibleStates parameter
 * @param {string} opts.data.[sort] - Sort results (available value asc or desc)
 * @param {object} opts.user - User using this functionality (must be similar to req.user)
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: result of process OR undefined)
 * @returns {undefined} undefined
 */
Self.all = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(conf, `mongodb.default.organizations.id`) === `undefined`)
    return cb(new Error(`Missing required data: const.mongodb.default.organizations.id`));
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `user.organizations`) === `undefined`)
    return cb(new Error(`Missing required data: opts.user.organizations`));
  if (typeof _.get(opts, `data`) === `undefined`) return cb(new Error(`Missing required data: opts.data`));
  // Start process
  // Try to convert data sent
  let accessRights = AccountsManager.getAccessRights(opts.user, AccountsManager.match.all);
  let limit = Params.convertToInteger(opts.data.limit);
  let skip = Params.convertToInteger(opts.data.skip);
  let ids = Params.convertToArray(opts.data.ids, `string`);
  let roles = Params.convertToArray(opts.data.roles, `string`);
  let organizations = Params.convertToArray(opts.data.organizations, `string`);
  let visibleStates = Params.convertToArray(opts.data.visibleStates, `boolean`);
  let disabledStates = Params.convertToArray(opts.data.disabledStates, `boolean`);
  let sort = Params.convertToString(opts.data.sort);
  let query = {};
  // Set default value
  if (typeof limit === `undefined` || limit < 0) limit = 0;
  if (typeof skip === `undefined` || skip < 0) skip = 0;
  if (typeof sort === `undefined` || sort !== `asc`) sort = `desc`;
  if (typeof organizations === `undefined` && !accessRights.isAdministrator)
    organizations = opts.user.organizations.map(function (item) {
      return item._id.toString();
    });
  // Restrict access
  // If user is not an administrator, restrict organizations
  if (!accessRights.isAdministrator) organizations = AccountsManager.getOwnOrganizations(organizations, opts.user);
  // If user is a standard user or visitor, restrict visibleStates, organizations & ids
  if (accessRights.isVisitor || accessRights.isStandardUser) {
    organizations = opts.user.organizations.map(function (item) {
      return item._id.toString();
    });
    ids = [opts.user._id.toString()];
    disabledStates = [false];
  }
  // Set filters
  if (typeof ids !== `undefined`) query._id = { $in: ids };
  if (typeof roles !== `undefined`) query.role = { $in: roles };
  if (typeof organizations !== `undefined`) query.organizations = { $in: organizations };
  if (typeof visibleStates !== `undefined`) query.visible = { $in: visibleStates };
  if (typeof disabledStates !== `undefined`) query.disabled = { $in: disabledStates };
  let params = { limit, skip, roles, ids, organizations, visibleStates, disabledStates, sort };
  let transaction = Accounts.find(query)
    .sort(sort === `asc` ? { _id: 1 } : { _id: -1 })
    .populate(`role`)
    .populate(`organizations`)
    .select(`-salt`)
    .select(`-hash`)
    .select(`-tokens.resetPassword`) // Ensure tokens.resetPassword is not visible for all users
    .skip(skip)
    .limit(limit);
  if (!accessRights.isAdministrator) transaction.select(`-tokens.api`);
  return transaction.exec(function (err, accounts) {
    if (err) return cb(err);
    let result = {
      data: accounts,
      params: params
    };
    return cb(null, result);
  });
};

/**
 * Reset password of an account
 * @param {object} opts - Options available
 * @param {object} opts.data - Data available
 * @param {string} opts.data.id - Account id
 * @param {object} opts.user - User using this functionality (must be similar to req.user)
 * @param {boolean} opts.[logs] - Specify if action must be logged (default: false)
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: Account instance OR undefined)
 * @returns {undefined} undefined
 */
Self.get = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `user._id`) === `undefined`) return cb(new Error(`Missing required data: opts.user._id`));
  if (typeof _.get(opts, `user.organizations`) === `undefined`)
    return cb(new Error(`Missing required data: opts.user.organizations`));
  if (typeof _.get(opts, `data`) === `undefined`) return cb(new Error(`Missing required data: opts.data`));
  if (typeof _.get(opts, `data.id`) === `undefined`) return cb(new Error(`Missing required data: opts.data.id`));
  // Check all optionnal data
  if (typeof _.get(opts, `logs`) !== true) opts.logs = false;
  // Start process
  let accessRights = AccountsManager.getAccessRights(opts.user, AccountsManager.match.all);
  if (accessRights.isVisitor) return cb(null, new Error(`Data access restricted`));
  // A standard user must not access to a different account from his
  if (accessRights.isStandardUser && opts.data.id !== opts.user._id.toString())
    return cb(null, new Error(`Data access restricted`));
  let query = { _id: opts.data.id };
  // Restrict access to non administrator user
  if (accessRights.isModerator)
    query.organizations = {
      $in: opts.user.organizations.map(function (item) {
        return item._id.toString();
      })
    };
  let transaction = Accounts.findOne(query)
    .populate(`role`)
    .populate(`organizations`)
    .select(`-salt`)
    .select(`-hash`)
    .select(`-tokens.resetPassword`); // Ensure tokens.resetPassword is not visible for all users;
  if (!accessRights.isAdministrator && opts.data.id.toString() !== opts.user._id.toString())
    transaction.select(`-tokens.api`);
  return transaction.exec(function (err, account) {
    if (err) return cb(err);
    if (!account) return cb(null, new Error(`Account not found`));
    if (!opts.logs) return cb(null, account);
    return AccountsLogsController.create(
      {
        target: account._id,
        account: opts.user._id,
        kind: CrudManager.actions.read._id
      },
      function (err) {
        if (err) return cb(err);
        return cb(null, account);
      }
    );
  });
};

/**
 * Add new account
 * @param {object} opts - Options available
 * @param {object} opts.data - Data available
 * @param {string} opts.data.username - Account email
 * @param {string} opts.data.fullname - Account fullname
 * @param {string} opts.data.role - Account role id
 * @param {string} opts.data.organizations - Account organisaitons ids
 * @param {string} opts.data.password - Account password
 * @param {boolean} opts.[logs] - Specify if action must be logged (default: true)
 * @param {object} opts.user - User using this functionality (must be similar to req.user)
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: Account instance OR undefined)
 * @returns {undefined} undefined
 */
Self.add = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `user._id`) === `undefined`) return cb(new Error(`Missing required data: opts.user._id`));
  if (typeof _.get(opts, `data`) === `undefined`) return cb(new Error(`Missing required data: opts.data`));
  // Check all optionnal data
  if (typeof _.get(opts, `logs`) === `undefined`) opts.logs = true;
  // Start process
  return Roles.findById(Params.convertToString(opts.data.role), function (err, role) {
    if (err) return cb(err);
    else if (!role) return cb(null, new Error(`Given role does not exist`));
    let account = new Accounts({
      username: Params.convertToString(opts.data.username),
      fullname: Params.convertToString(opts.data.fullname),
      role: role._id,
      organizations: Params.convertToArray(opts.data.organizations, `string`),
      visible: Params.convertToBoolean(opts.data.visible),
      disabled: Params.convertToBoolean(opts.data.disabled)
    });
    return Accounts.register(account, Params.convertToString(opts.data.password), function (err, account) {
      if (err) {
        if (err.name === `UserExistsError`) return cb(null, new Error(`User already exist`));
        else return cb(err);
      }
      if (!opts.logs) return cb(null, account);
      return AccountsLogsController.create(
        {
          target: account._id,
          account: opts.user._id,
          kind: CrudManager.actions.create._id
        },
        function (err) {
          if (err) return cb(err);
          return cb(null, account);
        }
      );
    });
  });
};

/**
 * Update a given account
 * @param {object} opts - Options available
 * @param {object} opts.data - Data available
 * @param {string} opts.data.id - Account id
 * @param {string} opts.data.username - Account email
 * @param {string} opts.data.fullname - Account fullname
 * @param {string} opts.data.role - Account role
 * @param {array} opts.data.organizations - Array of organizations ids
 * @param {string} opts.data.visible - Visibility of the account
 * @param {object} opts.user - User using this functionality (must be similar to req.user)
 * @param {boolean} opts.[logs] - Specify if action must be logged (default: true)
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: Account instance OR undefined)
 * @returns {undefined} undefined
 */
Self.update = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `user._id`) === `undefined`) return cb(new Error(`Missing required data: opts.user._id`));
  if (typeof _.get(opts, `user.organizations`) === `undefined`)
    return cb(new Error(`Missing required data: opts.user.organizations`));
  if (typeof _.get(opts, `data`) === `undefined`) return cb(new Error(`Missing required data: opts.data`));
  if (typeof _.get(opts, `data.id`) === `undefined`) return cb(new Error(`Missing required data: opts.data.id`));
  // Check all optionnal data
  if (typeof _.get(opts, `logs`) === `undefined`) opts.logs = true;
  // Start process
  let accessRights = AccountsManager.getAccessRights(opts.user, AccountsManager.match.all);
  if (accessRights.isVisitor || (accessRights.isStandardUser && opts.data.id !== opts.user._id.toString()))
    return cb(null, new Error(`Unauthorized functionnality`));
  return Self.get({ data: { id: opts.data.id }, user: opts.user }, function (err, account) {
    if (err) return cb(err);
    if (account instanceof Error) return cb(null, account);
    let fullname = Params.convertToString(opts.data.fullname);
    let role = Params.convertToString(opts.data.role);
    let visible = Params.convertToBoolean(opts.data.visible);
    let organizations = Params.convertToArray(opts.data.organizations, `string`);
    let disabled = Params.convertToBoolean(opts.data.disabled);
    return async.reduce(
      [
        function (acc, next) {
          if (!role) return next(null, acc);
          return Roles.findOne({ _id: role }, function (err, res) {
            if (err) return next(err);
            if (!res) return next(new Error(`This role doesn't exist`));
            acc.role = res._id.toString();
            return next(null, acc);
          });
        },
        function (acc, next) {
          if (!organizations) return next(null, acc);
          return Organizations.find({ _id: { $in: organizations } }, function (err, res) {
            if (err) return next(err);
            if (!res) return next(new Error(`You must select at least one organization`));
            acc.organizations = res.map(function (item) {
              return item._id.toString();
            });
            return next(null, acc);
          });
        }
      ],
      { role: undefined, organizations: [] },
      function (acc, action, next) {
        return action(acc, function (err) {
          return next(err, acc);
        });
      },
      function (err, result) {
        let hasRightOnGivenRole = !result.role ? true : AccountsManager.hasRightOnRole(result.role, opts.user);
        let hasRightOnCurrentRole = AccountsManager.hasRightOnRole(account.role._id.toString(), opts.user);
        if (hasRightOnGivenRole instanceof Error) return cb(null, hasRightOnGivenRole);
        if (hasRightOnCurrentRole instanceof Error) return cb(null, hasRightOnCurrentRole);
        // Case current role do not allow user to modify data, or given role is not allowed
        if (!hasRightOnCurrentRole || !hasRightOnGivenRole) return cb(null, new Error(`Unauthorized functionnality`));
        // Case current role allow user to modify data
        if (result.role) account.role = result.role;
        if (Params.checkString(fullname)) account.fullname = fullname;
        if (typeof visible !== `undefined`) account.visible = visible;
        if (typeof disabled !== `undefined`) account.disabled = disabled;
        // Set organizations depending of the role of the user
        if (result.organizations.length > 0) {
          account.organizations = accessRights.isAdministrator
            ? result.organizations
            : accessRights.isModerator
              ? AccountsManager.getOwnOrganizations(result.organizations, opts.user)
              : account.organizations;
        }
        return account.save(function (err, res) {
          if (err) return cb(err);
          if (!opts.logs) return cb(null, res);
          return AccountsLogsController.create(
            { target: res._id, account: opts.user._id, kind: CrudManager.actions.update._id },
            function (err) {
              if (err) return cb(err);
              return cb(null, res);
            }
          );
        });
      }
    );
  });
};

/**
 * Updates accounts
 * @param {object} opts - Options available
 * @param {array} opts.ids - Array of accounts ID
 * @param {string} opts.fullname - fullname of the account
 * @param {string} opts.role - role of the account
 * @param {array} opts.organizations - Array of organizations ids
 * @param {boolean} opts.visible - visibility of the account
 * @param {boolean} opts.[logs] - Specify if action must be logged (default: true)
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: {ok: 1, n: nb rows modified} OR undefined)
 * @returns {undefined} undefined
 */
Self.updateMany = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `data`) === `undefined`) return cb(new Error(`Missing required data: opts.data`));
  if (typeof _.get(opts, `data.ids`) === `undefined`) return cb(new Error(`Missing required data: opts.data.ids`));
  // Check all optionnal data
  if (typeof _.get(opts, `logs`) === `undefined`) opts.logs = true;
  let ids = Params.convertToArray(opts.data.ids, `string`);
  if (!Params.checkArray(ids)) return cb(null, new Error(`You must select at least one account!`));
  let fullname = Params.convertToString(opts.data.fullname);
  let role = Params.convertToString(opts.data.role);
  let organizations = Params.convertToArray(opts.data.organizations, `string`);
  let visible = Params.convertToBoolean(opts.data.visible);
  let disabled = Params.convertToBoolean(opts.data.disabled);
  return async.reduce(
    ids,
    [],
    function (acc, item, next) {
      return Self.update(
        {
          user: opts.user,
          data: {
            id: item,
            fullname: fullname,
            role: role,
            organizations: organizations,
            visible: visible,
            disabled: disabled
          },
          logs: opts.logs
        },
        function (err, res) {
          acc.push({ err, res: res instanceof Error ? res.toString() : res });
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
 * delete an account
 * Has visitor : unavailable
 * Has standard user : unavailable
 * Has moderator : available
 * Has administrator : available
 * @param {object} opts - Options available
 * @param {object} opts.data - Data available
 * @param {string} opts.data.id - Account id
 * @param {object} opts.user - User using this functionality (must be similar to req.user)
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: {ok: 1, n: nb rows deleted} OR undefined)
 * @returns {undefined} undefined
 */
Self.delete = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `data`) === `undefined`) return cb(new Error(`Missing required data: opts.data`));
  if (typeof _.get(opts, `data.id`) === `undefined`) return cb(new Error(`Missing required data: opts.data.id`));
  // Check all optionnal data
  if (typeof _.get(opts, `logs`) === `undefined`) opts.logs = true;
  let accessRights = AccountsManager.getAccessRights(opts.user, AccountsManager.match.all);
  if (accessRights.isVisitor || (accessRights.isStandardUser && opts.data.id !== opts.user._id.toString()))
    return cb(null, new Error(`Unauthorized functionnality`));
  return Self.get({ data: { id: opts.data.id }, user: opts.user }, function (err, account) {
    if (err) return cb(err);
    if (account instanceof Error) return cb(null, account);
    if (accessRights.isModerator && !AccountsManager.hasRightOnRole(account.role._id.toString(), opts.user))
      return cb(null, new Error(`Unauthorized functionnality`));
    if (accessRights.isAdministrator || opts.user._id.toString() === account._id.toString())
      AccountsManager.disable(account);
    return account.save(function (err) {
      if (err) return cb(err);
      if (!opts.logs) return cb(null, account);
      return AccountsLogsController.create(
        {
          target: account._id,
          account: opts.user._id,
          kind: CrudManager.actions.delete._id
        },
        function (err) {
          if (err) return cb(err);
          return cb(null, account);
        }
      );
    });
  });
};

/**
 * deletes multiples accounts (c.f delete function get more informations)
 * @param {object} opts - Options available
 * @param {object} opts.data - Data available
 * @param {array} opts.data.ids - Array of accounts id
 * @param {object} opts.user - User using this functionality (must be similar to req.user)
 * @param {boolean} opts.[logs] - Specify if action must be logged (default: true)
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: account instance OR undefined)
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
  if (!Params.checkArray(ids)) return cb(null, new Error(`You must select at least one account`));
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
 * Get Logs of an account by id
 * @param {object} opts - Options available
 * @param {object} opts.user - Current user
 * @param {object} opts.data - Data available
 * @param {string} opts.data.id - Id of the account
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: logs instance OR undefined)
 * @returns {undefined} undefined
 */
Self.getLogs = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `user._id`) === `undefined`) return cb(new Error(`Missing required data: opts.user._id`));
  if (typeof _.get(opts, `data`) === `undefined`) return cb(new Error(`Missing required data: opts.data`));
  if (typeof _.get(opts, `data.id`) === `undefined`) return cb(new Error(`Missing required data: opts.data.id`));
  let accessRights = AccountsManager.getAccessRights(opts.user, AccountsManager.match.all);
  if (!accessRights.authenticated) return cb(null, new Error(`Unauthorized functionnality`));
  let id = Params.convertToString(opts.data.id);
  let query = { target: id };
  let transaction = AccountsLogs.find(query).populate(`account`, `-tokens -hash -salt`).populate(`kind`);
  return transaction.exec(function (err, logs) {
    if (err) return cb(err);
    if (!logs) return cb(null, new Error(`Logs not found`));
    return cb(null, logs);
  });
};

/**
 * Get activity of an account by id
 * @param {object} opts - Options available
 * @param {object} opts.user - Current user
 * @param {object} opts.data - Data available
 * @param {string} opts.data.id - Id of the account
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: logs instance OR undefined)
 * @returns {undefined} undefined
 */
Self.getActivity = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `user`) === `undefined`) return cb(new Error(`Missing required data: opts.user`));
  if (typeof _.get(opts, `user._id`) === `undefined`) return cb(new Error(`Missing required data: opts.user._id`));
  if (typeof _.get(opts, `data`) === `undefined`) return cb(new Error(`Missing required data: opts.data`));
  if (typeof _.get(opts, `data.id`) === `undefined`) return cb(new Error(`Missing required data: opts.data.id`));
  let accessRights = AccountsManager.getAccessRights(opts.user, AccountsManager.match.all);
  if (!accessRights.authenticated) return cb(null, new Error(`Unauthorized functionnality`));
  let id = Params.convertToString(opts.data.id);
  let limit = Params.convertToInteger(opts.data.limit);
  let skip = Params.convertToInteger(opts.data.skip);
  let sort = Params.convertToString(opts.data.sort);
  // Set default value
  if (typeof limit === `undefined` || limit <= 0) limit = 20;
  if (limit > 100) limit = 100;
  if (typeof skip === `undefined` || skip < 0) skip = 0;
  if (typeof sort === `undefined` || sort !== `asc`) sort = `desc`;
  let query = { account: id };
  let params = { limit, skip, sort };
  let transaction = DocumentsLogs.find(query)
    .sort(sort === `asc` ? { 'updatedAt': 1 } : { 'updatedAt': -1 })
    .limit(limit)
    .skip(skip)
    .populate(`kind`)
    .populate(`target`);

  return transaction.exec(function (err, logs) {
    if (err) return cb(err);
    return cb(null, { params: params, data: logs });
  });
};

module.exports = Self;
