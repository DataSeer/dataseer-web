/*
 * @prettier
 */

'use strict';

const express = require('express'),
  router = express.Router();

const Accounts = require('../../models/accounts.js');

const AccountsManager = require('../../lib/accounts.js');

const conf = require('../../conf/conf.json');

/* GET ALL Accounts */
router.get('/', function (req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccessRight(req.user, AccountsManager.roles.curator))
    return res.status(401).send('Your current role do not grant access to this part of website');
  let limit = parseInt(req.query.limit),
    skip = parseInt(req.query.skip),
    role = req.query.role,
    organisation = req.query.organisation,
    query = {};
  if (isNaN(limit)) limit = 20;
  if (isNaN(skip) || skip < 0) skip = 0;
  if (role) query.role = role;
  if (organisation) query.organisation = organisation;
  // Init transaction
  let transaction = Accounts.find(query).skip(skip).limit(limit).populate('role').populate('organisation');
  return transaction.exec(function (err, accounts) {
    if (err) return res.json({ 'err': true, 'res': null, 'msg': err instanceof Error ? err.toString() : err });
    else if (!accounts) return res.json({ 'err': true, 'res': null, 'msg': 'accounts(s) not found' });
    return res.json({ 'err': false, 'res': accounts });
  });
});

/* GET SINGLE Account BY ID */
router.get('/:id', function (req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccessRight(req.user, AccountsManager.roles.curator))
    return res.status(401).send('Your current role do not grant access to this part of website');
  // Init transaction
  let transaction = Accounts.findOne({ _id: req.params.id }).populate('role').populate('organisation');
  // Execute transaction
  return transaction.exec(function (err, doc) {
    if (err) return res.json({ 'err': true, 'res': null, 'msg': err instanceof Error ? err.toString() : err });
    else if (!doc) return res.json({ 'err': true, 'res': null, 'msg': 'account not found' });
    else return res.json({ 'err': false, 'res': doc });
  });
});

module.exports = router;
