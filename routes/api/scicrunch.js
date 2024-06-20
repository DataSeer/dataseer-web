/*
 * @prettier
 */

'use strict';

const fs = require(`fs`);
const path = require(`path`);
const _ = require(`lodash`);

const express = require(`express`);
const router = express.Router();

const AccountsManager = require(`../../lib/accounts.js`);
const Scicrunch = require(`../../lib/scicrunch.js`);

const conf = require(`../../conf/conf.json`);

router.post(`/searchEntity`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.authenticated) return res.status(401).send(conf.errors.unauthorized);
  if (typeof _.get(req.body, `entity`) === `undefined`)
    return res.json({ err: true, res: `Missing required parameter: entity` });
  return Scicrunch.searchEntity({ entity: req.body.entity, kind: req.body.kind }, function (err, result) {
    if (err) return res.status(500).send(conf.errors.internalServerError);
    if (result instanceof Error) return res.json({ err: true, res: result });
    else return res.json({ err: false, res: result });
  });
});

router.post(`/processEntity`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.authenticated) return res.status(401).send(conf.errors.unauthorized);
  if (typeof _.get(req.body, `entity`) === `undefined`)
    return res.json({ err: true, res: `Missing required parameter: entity` });
  return Scicrunch.getRRID({ entity: req.body.entity }, function (err, result) {
    if (err) return res.status(500).send(conf.errors.internalServerError);
    if (result instanceof Error) return res.json({ err: true, res: result });
    else return res.json({ err: false, res: result });
  });
});

router.post(`/processRRID`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.authenticated) return res.status(401).send(conf.errors.unauthorized);
  if (typeof _.get(req.body, `RRID`) === `undefined`)
    return res.json({ err: true, res: `Missing required parameter: RRID` });
  return Scicrunch.getEntity({ RRID: req.body.RRID }, function (err, result) {
    if (err) return res.status(500).send(conf.errors.internalServerError);
    if (result instanceof Error) return res.json({ err: true, res: result });
    else return res.json({ err: false, res: result });
  });
});

module.exports = router;
