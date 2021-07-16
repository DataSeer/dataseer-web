/*
 * @prettier
 */

'use strict';

const express = require(`express`);
const router = express.Router();

const AccountsManager = require(`../../lib/accounts.js`);
const Url = require(`../../lib/url.js`);

const conf = require(`../../conf/conf.json`);

router.get(`/`, function (req, res) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.isStandardUser)
    return res.redirect(Url.build(`../../signin`, { unauthorized: true, redirect: `/backoffice/documents` }));
  return res.render(`root/backoffice/documents/layout.pug`, {
    currentRoute: `/backoffice/documents`,
    currentUser: req.user,
    conf: conf
  });
});

router.get(`/:id`, function (req, res) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.authenticated)
    return res.redirect(
      Url.build(`../../../signin`, { unauthorized: true, redirect: `/backoffice/documents/${req.params.id}` })
    );
  // If user is not at least standardUser redirect to document process routes
  if (!accessRights.isStandardUser) return res.redirect(Url.build(`/documents/${req.params.id}`));
  return res.render(`root/backoffice/documents/:id/layout.pug`, {
    currentRoute: `/backoffice/documents/:id`,
    currentUser: req.user,
    conf: conf
  });
});

module.exports = router;
