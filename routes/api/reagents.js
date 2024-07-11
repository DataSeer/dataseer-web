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
const Reagents = require(`../../lib/reagents.js`);
const Url = require(`../../lib/url.js`);

const conf = require(`../../conf/conf.json`);
const customListConf = require(`../../conf/reagents.custom.json`);

router.post(`/processText`, function (req, res) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.authenticated) return res.status(401).send(conf.errors.unauthorized);
  let text = Params.convertToString(req.body.text);
  let data = Reagents.extractFromText(text);
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
  let data = Reagents.extractFromSentence(sentence);
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
  let reagents = req.app.get(`Reagents.customList`);
  if (!Array.isArray(reagents)) return res.json([]);
  return res.json(reagents);
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
  let data = Reagents.findFromCustomList(name);
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
  return Reagents.refreshCustomList(function (err, data) {
    if (err) {
      console.log(err);
      return res.status(500).send(conf.errors.internalServerError);
    }
    req.app.set(`Reagents.customList`, data);
    return res.json(req.app.get(`Reagents.customList`));
  });
});

module.exports = router;
