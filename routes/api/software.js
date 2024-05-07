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
const Software = require(`../../lib/software.js`);

const conf = require(`../../conf/conf.json`);

router.get(`/customList`, function (req, res) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.isAdministrator) return res.status(401).send(conf.errors.unauthorized);
  let software = req.app.get(`Software.customList`);
  if (!Array.isArray(software)) return res.json([]);
  return res.json(software);
});

router.post(`/customList/find`, function (req, res) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.authenticated) return res.status(401).send(conf.errors.unauthorized);
  let name = Params.convertToString(req.body.name);
  let data = Software.findSoftwareFromCustomList(name);
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
  return Software.refreshCustomList(function (err, data) {
    if (err) {
      console.log(err);
      return res.status(500).send(conf.errors.internalServerError);
    }
    req.app.set(`Software.customList`, data);
    return res.json(req.app.get(`Software.customList`));
  });
});

module.exports = router;
