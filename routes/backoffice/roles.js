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
  let accessRights = AccountsManager.getAccessRights(req.user, AccountsManager.match.all);
  if (!accessRights.isAdministrator) return res.redirect(`/unauthorized`);
  return res.render(`root/backoffice/roles/layout.pug`, {
    currentRoute: `/backoffice/roles`,
    currentUser: req.user,
    conf: conf
  });
});

module.exports = router;
