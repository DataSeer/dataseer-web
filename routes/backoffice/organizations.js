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
  if (!accessRights.isModerator)
    return res.redirect(Url.build(`/signin`, { unauthorized: true, redirect: req.originalUrl }));
  return res.render(`root/backoffice/organizations/layout.pug`, {
    currentRoute: `/backoffice/organizations`,
    currentUser: req.user,
    conf: conf
  });
});

module.exports = router;
