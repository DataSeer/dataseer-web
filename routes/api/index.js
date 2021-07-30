/*
 * @prettier
 */

'use strict';

const express = require(`express`);
const router = express.Router();
const passport = require(`passport`);
const cookie = require(`cookie`);

const AccountsController = require(`../../controllers/api/accounts.js`);

const AccountsManager = require(`../../lib/accounts.js`);
const JWT = require(`../../lib/jwt.js`);
const Mailer = require(`../../lib/mailer.js`);
const Params = require(`../../lib/params.js`);
const Captcha = require(`../../lib/captcha.js`);

const conf = require(`../../conf/conf.json`);
const crisp = require(`../../conf/crisp.json`);
const userflow = require(`../../conf/userflow.json`);

/* POST signup page. */
router.post(`/signup`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (accessRights.authenticated) return res.status(401).send(conf.errors.unauthorized);
  if (!Params.checkString(req.body.username)) return res.json({ err: true, res: `Username is required!` });
  if (!Params.checkEmail(req.body.username))
    return res.json({
      err: true,
      res: `Error: Username incorrect!`
    });
  if (!Params.checkString(req.body.fullname)) return res.json({ err: true, res: `Fullname is required!` });
  if (!Params.checkPassword(req.body.password))
    return res.json({
      err: true,
      res: `Error: Password incorrect! (at least 6 chars required)`
    });
  if (req.body.password !== req.body.confirm_password)
    return res.json({
      err: true,
      res: `Error: Passwords must be the same!`
    });
  let opts = {
    username: Params.convertToString(req.body.username),
    fullname: Params.convertToString(req.body.fullname),
    password: Params.convertToString(req.body.password),
    visible: Params.convertToBoolean(req.body.visible),
    organizations: Params.convertToArray(req.body.organizations, `string`)
  };
  return Captcha.check(req, function (err, data) {
    if (err) {
      console.log(err);
      return res.status(500).send(conf.errors.internalServerError);
    }
    let isError = data instanceof Error;
    let result = isError ? data.toString() : data;
    if (isError) return res.json({ err: isError, res: result });
    // If captcha not checked
    return AccountsController.signup(opts, function (err, data) {
      if (err) {
        console.log(err);
        return res.status(500).send(conf.errors.internalServerError);
      }
      let isError = data instanceof Error;
      let result = isError ? data.toString() : data;
      return res.json({ err: isError, res: result });
    });
  });
});

/* POST signin page. */
router.post(
  `/signin`,
  function (req, res, next) {
    let accessRights = AccountsManager.getAccessRights(req.user);
    if (accessRights.authenticated) return res.status(401).send(conf.errors.unauthorized);
    if (!Params.checkEmail(req.body.username)) return res.json({ err: true, res: `Username is required!` });
    if (!Params.checkPassword(req.body.password)) return res.json({ err: true, res: `Password is required!` });
    return passport.authenticate(`local`, function (err, user, info) {
      if (err) {
        console.log(err);
        return res.status(500).send(conf.errors.internalServerError);
      }
      if (!user) return res.json({ err: true, res: `Incorrect credentials` });
      let accessRights = AccountsManager.getAccessRights(user);
      if (!accessRights.authenticated) return res.status(401).send(conf.errors.unauthorized);
      return req.logIn(user, function (err) {
        if (err) {
          console.log(err);
          return res.status(500).send(conf.errors.internalServerError);
        }
        return next();
      });
    })(req, res, next);
  },
  function (req, res, next) {
    let accessRights = AccountsManager.getAccessRights(req.user);
    if (!accessRights.authenticated) return res.status(401).send(conf.errors.unauthorized);
    let privateKey = req.app.get(`private.key`);
    let username = Params.convertToString(req.body.username);
    let newToken = Params.checkBoolean(req.body.newToken); // params used to create a new token & revoke the older one
    return AccountsController.signin({ privateKey, username, newToken }, function (err, data) {
      if (err) {
        console.log(err);
        return res.status(500).send(conf.errors.internalServerError);
      }
      let isError = data instanceof Error;
      let result = isError ? data.toString() : data;
      // Set cookie (useful for navigator)
      if (!isError) res.setHeader(`Set-Cookie`, cookie.serialize(`token`, result.token, { httpOnly: true, path: `/` }));
      return res.json({ err: isError, res: result });
    });
  }
);

/* GET signout page. */
router.get(`/signout`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.authenticated) return res.status(401).send(conf.errors.unauthorized);
  return AccountsController.signout({ user: req.user }, function (err, data) {
    if (err) {
      console.log(err);
      return res.status(500).send(conf.errors.internalServerError);
    }
    let isError = data instanceof Error;
    let result = isError ? data.toString() : data;
    // Unset cookie (useful for navigator)
    if (!isError)
      res.setHeader(`Set-Cookie`, cookie.serialize(`token`, ``, { httpOnly: true, path: `/`, expires: Date.now() }));
    return res.json({ err: null, res: true });
  });
});

/* GET USER BY TOKEN */
router.get(`/currentUser`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.authenticated) return res.status(401).send(conf.errors.unauthorized);
  return res.json({ err: false, res: req.user });
});

/* GET USER BY TOKEN */
router.get(`/getCrispId`, function (req, res, next) {
  return res.json({ err: false, res: crisp });
});

/* GET USER BY TOKEN */
router.get(`/getUserflowToken`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.authenticated) return res.status(401).send(conf.errors.unauthorized);
  return res.json({ err: false, res: userflow });
});

/* FORGOT PASSWORD */
router.post(`/forgotPassword`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (accessRights.authenticated) return res.status(401).send(conf.errors.unauthorized);
  if (!Params.checkString(req.body.username)) return res.json({ err: true, res: `Username is required!` });
  let privateKey = req.app.get(`private.key`);
  if (!Params.checkString(privateKey)) return next(new Error(`Missing private key`));
  let opts = {
    username: Params.convertToString(req.body.username),
    privateKey: privateKey
  };
  return AccountsController.forgotPassword(opts, function (err, user) {
    //MongoDB error has occured
    if (err) {
      console.log(err);
      return res.status(500).send(conf.errors.internalServerError);
    }
    // Username not in mongo base
    return res.json({ err: null, res: `If this email address is registered, an email will be sent!` });
  });
});

/* RESET PASSWORD */
router.post(`/resetPassword`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (accessRights.authenticated) {
    if (!Params.checkPassword(req.body.new_password))
      return res.json({ err: true, res: `Incorrect password! (6 chars)` });
    if (req.body.new_password !== req.body.confirm_new_password) {
      return res.json({ err: true, res: `Passwords must be the same!` });
    }
    return AccountsController.resetPassword(
      {
        username: req.user.username,
        current_password: req.body.current_password,
        new_password: req.body.new_password
      },
      function (err, data) {
        if (err) {
          console.log(err);
          return res.status(500).send(conf.errors.internalServerError);
        }
        let isError = data instanceof Error;
        let result = isError ? data.toString() : data;
        return res.json({ err: isError, res: result });
      }
    );
  } else {
    let privateKey = req.app.get(`private.key`);
    if (!Params.checkString(privateKey)) return next(new Error(`Missing private key`));
    if (!Params.checkString(req.body.resetPasswordToken)) return res.json({ err: true, res: `Incorrect token!` });
    if (!Params.checkPassword(req.body.new_password))
      return res.json({ err: true, res: `Incorrect password! (6 chars)` });
    if (req.body.new_password !== req.body.confirm_new_password)
      return res.json({ err: true, res: `Passwords must be the same!` });
    return AccountsController.resetPassword(
      {
        privateKey: privateKey,
        resetPasswordToken: req.body.resetPasswordToken,
        new_password: req.body.new_password
      },
      function (err, data) {
        if (err) {
          console.log(err);
          return res.status(500).send(conf.errors.internalServerError);
        }
        let isError = data instanceof Error;
        let result = isError ? data.toString() : data;
        return res.json({ err: isError, res: result });
      }
    );
  }
});

module.exports = router;
