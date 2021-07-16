/*
 * @prettier
 */

'use strict';

const express = require('express'),
  router = express.Router();

const AccountsManager = require('../../lib/accounts.js'),
  RepoRecommender = require('../../lib/repoRecommender.js');

router.post('/findRepo', function (req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccessRight(req.user))
    return res.status(401).send('Your current role does not grant you access to this part of the website');
  return RepoRecommender.findRepo({ dataType: req.body.dataType, subType: req.body.subType }, function (err, body) {
    if (err) return res.json(err);
    else return res.json(body);
  });
});

module.exports = router;
