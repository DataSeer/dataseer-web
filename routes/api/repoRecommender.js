/*
 * @prettier
 */

'use strict';

const express = require(`express`);
const router = express.Router();

const AccountsManager = require(`../../lib/accounts.js`);
const RepoRecommender = require(`../../lib/repoRecommender.js`);

const conf = require(`../../conf/conf.json`);

router.post(`/findRepo`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.authenticated) return res.status(401).send(conf.errors.unauthorized);
  return RepoRecommender.findRepo({ dataType: req.body.dataType, subType: req.body.subType }, function (err, body) {
    if (err) return res.json(err);
    else return res.json(body);
  });
});

module.exports = router;
