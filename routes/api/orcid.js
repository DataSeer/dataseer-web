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
const ORCID = require(`../../lib/orcid.js`);

const conf = require(`../../conf/conf.json`);

router.get(`/ASAP/authors`, function (req, res) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.isAdministrator) return res.status(401).send(conf.errors.unauthorized);
  let authors = req.app.get(`ASAP.authors`);
  if (!Array.isArray(authors)) return res.json([]);
  return res.json(authors);
});

router.post(`/ASAP/findAuthor`, function (req, res) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.isAdministrator) return res.status(401).send(conf.errors.unauthorized);
  let name = Params.convertToString(req.body.name);
  let data = ORCID.findAuthorFromASAPList(name);
  let isError = data instanceof Error;
  let result = isError ? data.toString() : data;
  return res.json({
    err: isError,
    res: result
  });
});

router.post(`/ASAP/refreshAuthors`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.isAdministrator) return res.status(401).send(conf.errors.unauthorized);
  return ORCID.refreshASAPAuthors(function (err, data) {
    if (err) {
      console.log(err);
      return res.status(500).send(conf.errors.internalServerError);
    }
    req.app.set(`ASAP.authors`, data);
    return res.json(req.app.get(`ASAP.authors`));
  });
});

module.exports = router;
