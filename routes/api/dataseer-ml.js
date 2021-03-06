/*
 * @prettier
 */

'use strict';

const express = require('express'),
  router = express.Router();

const AccountsManager = require('../../lib/accounts.js'),
  Wiki = require('../../lib/wiki.js'),
  DataSeerML = require('../../lib/dataseer-ml.js');

/* SAVE Document */
router.post('/processDataseerSentence', function (req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccessRight(req.user))
    return res.status(401).send('Your current role does not grant you access to this part of the website');
  return DataSeerML.processSentence(req.body.text, function (err, body) {
    if (err) return res.json(err);
    else return res.json(body);
  });
});

router.get('/jsonDataTypes', function (req, res, next) {
  return res.json(req.app.get('dataTypes'));
});

router.get('/resyncJsonDataTypes', function (req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccessRight(req.user, AccountsManager.roles.annotator))
    return res.status(401).send('Your current role does not grant you access to this part of the website');
  return Wiki.getDataTypes(function (err, dataTypes) {
    if (err) return next(err);
    else {
      req.app.set('dataTypes', dataTypes);
      return res.json(req.app.get('dataTypes'));
    }
  });
});

module.exports = router;
