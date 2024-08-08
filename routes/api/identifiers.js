/*
 * @prettier
 */

'use strict';

const express = require(`express`);
const router = express.Router();

const _ = require(`lodash`);
const async = require(`async`);

const AccountsManager = require(`../../lib/accounts.js`);
const Params = require(`../../lib/params.js`);
const Identifiers = require(`../../lib/identifiers.js`);
const Url = require(`../../lib/url.js`);

const conf = require(`../../conf/conf.json`);
const customListConf = require(`../../conf/identifiers.custom.json`);

router.post(`/processText`, function (req, res) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.authenticated) return res.status(401).send(conf.errors.unauthorized);
  let text = Params.convertToString(req.body.text);
  let data = Identifiers.extractFromText(text);
  let isError = data instanceof Error;
  let result = isError ? data.toString() : data;
  return res.json({
    err: isError,
    res: result
  });
});
router.post(`/processSentence`, function (req, res) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.authenticated) return res.status(401).send(conf.errors.unauthorized);
  let sentence = req.body.sentence;
  let data = Identifiers.extractFromSentence(sentence);
  let isError = data instanceof Error;
  let result = isError ? data.toString() : data;
  return res.json({
    err: isError,
    res: result
  });
});

router.get(`/customList`, function (req, res) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.isAdministrator) return res.status(401).send(conf.errors.unauthorized);
  let software = req.app.get(`Identifiers.customList`);
  if (!Array.isArray(software)) return res.json([]);
  return res.json(software);
});

router.get(`/customList/source`, function (req, res) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.isAdministrator) return res.status(401).send(conf.errors.unauthorized);
  return res.redirect(Url.build(`/spreadsheets/d/${customListConf.fileId}`, {}, `https://docs.google.com/`));
});

router.post(`/customList/find`, function (req, res) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.authenticated) return res.status(401).send(conf.errors.unauthorized);
  let name = Params.convertToString(req.body.name);
  let contain = Params.convertToBoolean(req.body.contain);
  let minScore = new Number(req.body.minScore);
  let data = Identifiers.findFromCustomList(name, { minScore, contain });
  let isError = data instanceof Error;
  let result = isError ? data.toString() : data;
  return res.json({
    err: isError,
    res: result
  });
});

router.post(`/customList/isIn`, function (req, res) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.authenticated) return res.status(401).send(conf.errors.unauthorized);
  let name = Params.convertToString(req.body.name);
  let contain = Params.convertToBoolean(req.body.contain);
  let minScore = new Number(req.body.minScore);
  let data = Identifiers.findFromCustomList(name, { contain: contain, minScore: minScore }).length > 0;
  let isError = data instanceof Error;
  let result = isError ? data.toString() : data;
  return res.json({
    err: isError,
    res: result
  });
});

router.post(`/customList/refresh`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.isAdministrator) return res.status(401).send(conf.errors.unauthorized);
  return Identifiers.refreshCustomList(function (err, data) {
    if (err) {
      console.log(err);
      return res.status(500).send(conf.errors.internalServerError);
    }
    req.app.set(`Identifiers.customList`, data);
    return res.json(req.app.get(`Identifiers.customList`));
  });
});

module.exports = router;
