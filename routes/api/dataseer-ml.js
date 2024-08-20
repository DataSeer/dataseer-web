/*
 * @prettier
 */

'use strict';

const express = require(`express`);
const router = express.Router();

const AccountsManager = require(`../../lib/accounts.js`);
const Wiki = require(`../../lib/wiki.js`);
const DataSeerML = require(`../../lib/dataseer-ml.js`);
const DataObjects = require(`../../lib/dataObjects.js`);

const conf = require(`../../conf/conf.json`);

router.post(`/processDataseerSentence`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.authenticated) return res.status(401).send(conf.errors.unauthorized);
  return DataSeerML.processDataseerSentence(req.body.text, function (err, body) {
    if (err) return next(err);
    else return res.json(body);
  });
});

router.post(`/processDataseerSentences`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.isAdministrator) return res.status(401).send(conf.errors.unauthorized);
  return DataSeerML.processDataseerSentences(req.body.sentences, function (err, results) {
    if (err) return next(err);
    else return res.json(results);
  });
});

router.get(`/jsonDataTypes`, function (req, res, next) {
  return res.json(req.app.get(`dataTypes`));
});

router.post(`/resyncJsonDataTypes`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.isModerator) return res.status(401).send(conf.errors.unauthorized);
  return Wiki.getDataTypes({}, function (err, dataTypes) {
    if (err) return next(err);
    else {
      req.app.set(`dataTypes`, dataTypes);
      DataObjects.refreshDataTypes(dataTypes);
      return res.json(req.app.get(`dataTypes`));
    }
  });
});

module.exports = router;
