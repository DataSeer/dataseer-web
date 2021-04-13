/*
 * @prettier
 */

'use strict';

const express = require('express'),
  router = express.Router();

const Roles = require('../../models/roles.js');

const AccountsManager = require('../../lib/accounts.js');

const conf = require('../../conf/conf.json');

/* GET ALL Roles */
router.get('/', function (req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccessRight(req.user, AccountsManager.roles.curator))
    return res.status(401).send('Your current role do not grant access to this part of website');
  let limit = parseInt(req.query.limit),
    skip = parseInt(req.query.skip),
    query = {};
  if (isNaN(limit)) limit = 20;
  if (isNaN(skip) || skip < 0) skip = 0;
  // Init transaction
  let transaction = Roles.find(query).skip(skip).limit(limit);
  return transaction.exec(function (err, accounts) {
    if (err) return res.json({ 'err': true, 'res': null, 'msg': err instanceof Error ? err.toString() : err });
    else if (!accounts) return res.json({ 'err': true, 'res': null, 'msg': 'accounts(s) not found' });
    return res.json({ 'err': false, 'res': accounts });
  });
});

/* GET SINGLE Role BY ID */
router.get('/:id', function (req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccessRight(req.user, AccountsManager.roles.curator))
    return res.status(401).send('Your current role do not grant access to this part of website');
  // Init transaction
  let transaction = Roles.findOne({ _id: req.params.id });
  // Execute transaction
  return transaction.exec(function (err, doc) {
    if (err) return res.json({ 'err': true, 'res': null, 'msg': err instanceof Error ? err.toString() : err });
    else if (!doc) return res.json({ 'err': true, 'res': null, 'msg': 'account not found' });
    else return res.json({ 'err': false, 'res': doc });
  });
});

module.exports = router;
