/*
 * @prettier
 */

'use strict';

const express = require(`express`);
const router = express.Router();

const passport = require(`passport`);
const AccountsController = require(`../controllers/api/accounts.js`);

const AccountsManager = require(`../lib/accounts.js`);
const Url = require(`../lib/url.js`);

const conf = require(`../conf/conf.json`);
const recaptcha = require(`../conf/recaptcha.json`);

router.get(`/`, function (req, res) {
  return res.redirect(Url.build(`#/documents/`, Object.assign({}, req.query), conf.gui.root));
});

router.get(`/signout`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user, AccountsManager.match.all);
  if (!accessRights.authenticated) return res.redirect(Url.build(`/signin`));
  return AccountsController.signout({ user: req.user }, function (err, data) {
    if (err) {
      console.log(err);
      return res.status(500).send(conf.errors.internalServerError);
    }
    let isError = data instanceof Error,
      result = isError ? data.toString() : data;
  });
});

router.get(`/signin`, function (req, res) {
  let accessRights = AccountsManager.getAccessRights(req.user, AccountsManager.match.all);
  if (accessRights.authenticated && !accessRights.isVisitor) return res.redirect(Url.build(`/`));
  return res.render(`root/signin/layout.pug`, {
    currentRoute: `/signin`,
    currentUser: req.user,
    conf: conf
  });
});

router.get(`/signup`, function (req, res) {
  let accessRights = AccountsManager.getAccessRights(req.user, AccountsManager.match.all);
  if (accessRights.authenticated) return res.redirect(Url.build(`/`));
  return res.render(`root/signup/layout.pug`, {
    currentRoute: `/signup`,
    currentUser: req.user,
    _reCAPTCHA_site_key_: recaptcha._reCAPTCHA_site_key_.public,
    conf: conf
  });
});

router.get(`/forgotPassword`, function (req, res) {
  let accessRights = AccountsManager.getAccessRights(req.user, AccountsManager.match.all);
  if (accessRights.authenticated) return res.redirect(Url.build(`/resetPassword`));
  return res.render(`root/forgotPassword/layout.pug`, {
    currentRoute: `/forgotPassword`,
    currentUser: req.user,
    conf: conf
  });
});

router.get(`/resetPassword`, function (req, res) {
  return res.render(`root/resetPassword/layout.pug`, {
    currentRoute: `/resetPassword`,
    currentUser: req.user,
    conf: conf
  });
});

router.get(`/unauthorized`, function (req, res) {
  return res.render(`root/unauthorized/layout.pug`, {
    currentRoute: `/unauthorized`,
    currentUser: req.user,
    conf: conf
  });
});

router.get(`/privacy`, function (req, res) {
  return res.render(`root/privacy/layout.pug`, {
    currentRoute: `/privacy`,
    currentUser: req.user,
    conf: conf
  });
});

module.exports = router;
