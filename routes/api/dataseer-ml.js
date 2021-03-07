/*
 * @prettier
 */

const express = require('express'),
  router = express.Router(),
  AccountsManager = require('../../lib/accounts.js'),
  DataSeerML = require('../../lib/dataseer-ml.js');

/* SAVE Document */
router.post('/processDataseerSentence', function (req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccessRight(req.user))
    return res.status(401).send('Your current role do not grant access to this part of website');
  return DataSeerML.processSentence(req.body.text, function (err, body) {
    if (err) return next(err);
    else return res.json(body);
  });
});

router.get('/jsonDataTypes', function (req, res, next) {
  return res.json(req.app.get('dataTypes'));
});

router.get('/resyncJsonDataTypes', function (req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccessRight(req.user, AccountsManager.roles.annotator))
    return res.status(401).send('Your current role do not grant access to this part of website');
  return DataSeerML.resyncJsonDataTypes(function (err, body) {
    if (err) return next(err);
    else {
      req.app.set('dataTypes', DataSeerML.buildDataTypes(JSON.parse(body)));
      return res.json(req.app.get('dataTypes'));
    }
  });
});

module.exports = router;
