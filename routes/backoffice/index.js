/*
 * @prettier
 */

'use strict';

const express = require(`express`);
const router = express.Router();

const passport = require(`passport`);

const AccountsManager = require(`../../lib/accounts.js`);
const Url = require(`../../lib/url.js`);

const conf = require(`../../conf/conf.json`);

router.get(`/upload`, function (req, res) {
  let accessRights = AccountsManager.getAccessRights(req.user, AccountsManager.match.all);
  if (!accessRights.authenticated)
    return res.redirect(Url.build(`/signin`, { unauthorized: true, redirect: `/backoffice/upload` }));
  return res.render(`root/backoffice/upload/layout.pug`, {
    currentRoute: `/backoffice/upload`,
    currentUser: req.user,
    conf: conf
  });
});

module.exports = router;
