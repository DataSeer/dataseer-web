/*
 * @prettier
 */

'use strict';

const express = require(`express`);
const router = express.Router();

const AccountsManager = require(`../../lib/accounts.js`);
const Url = require(`../../lib/url.js`);

const conf = require(`../../conf/conf.json`);

router.get(`/`, function (req, res, next) {
  // User must be logged to reach this route
  let accessRights = AccountsManager.getAccessRights(req.user, AccountsManager.match.all);
  if (!accessRights.authenticated)
    return res.redirect(Url.build(`/signin`, { unauthorized: true, redirect: `/backoffice/accounts` }));
  // Visitor must not access to this view so display unauthorized message
  if (accessRights.isVisitor) return res.redirect(Url.build(`/`));
  // Standard user is redirect to /:id
  if (accessRights.isStandardUser) return res.redirect(Url.build(`/backoffice/accounts/${req.user._id.toString()}`));
  // Render template
  return res.render(`root/backoffice/accounts/layout.pug`, {
    currentRoute: `/backoffice/accounts`,
    currentUser: req.user,
    conf: conf
  });
});

router.get(`/:id`, function (req, res, next) {
  // User must be logged to reach this route
  let accessRights = AccountsManager.getAccessRights(req.user, AccountsManager.match.all);
  if (!accessRights.authenticated)
    return res.redirect(
      Url.build(`/signin`, { unauthorized: true, redirect: `/backoffice/accounts/${req.params.id}` })
    );
  // Visitor must not access to this view so display unauthorized message
  if (accessRights.isVisitor) return res.redirect(Url.build(`/redirect`));
  // Standard user is redirect to /:id
  if (accessRights.isStandardUser && req.user._id.toString() !== req.params.id)
    return res.redirect(Url.build(`/backoffice/accounts/${req.user._id.toString()}`));
  // Render template
  return res.render(`root/backoffice/accounts/:id/layout.pug`, {
    currentRoute: `/backoffice/accounts/:id`,
    myAccount: req.user._id.toString() === req.params.id,
    currentUser: req.user,
    restrictMode: true,
    conf: conf
  });
});

module.exports = router;
