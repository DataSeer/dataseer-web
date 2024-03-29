/*
 * @prettier
 */

'use strict';

const _ = require(`lodash`);

const express = require(`express`);
const router = express.Router();

const AccountsController = require(`../../controllers/api/accounts.js`);

const AccountsManager = require(`../../lib/accounts.js`);
const Params = require(`../../lib/params.js`);
const Url = require(`../../lib/url.js`);
const Charts = require(`../../lib/charts.js`);

const conf = require(`../../conf/conf.json`);

/* Document charts for ASAP */
router.get(`/asap`, function (req, res) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  // if (!accessRights.authenticated) return res.status(401).send(conf.errors.unauthorized);
  let render = Params.convertToString(req.query.render);
  let width = Params.convertToInteger(req.query.width);
  let height = Params.convertToInteger(req.query.height);
  let quality = Params.convertToInteger(req.query.quality);
  let token = _.get(req, `user.tokens.api`, ``);
  if (!render)
    return Charts.buildASAPPie({ data: { urls: {} } }, function (err, data) {
      if (err) {
        console.log(err);
        return res.status(500).send(conf.errors.internalServerError);
      }
      return res.send(data);
    });
  return Charts.buildRenderedASAPPie(
    {
      url: `${Url.build(
        `api/charts/asap`,
        Object.assign({ token: token }, req.query, { render: `` }) // disable render & add token if not in the URL
      )}`,
      render: { type: render, width: width, height: height, quality: quality }
    },
    function (err, data) {
      if (err) {
        console.log(err);
        return res.status(500).send(conf.errors.internalServerError);
      }
      return res.send(data);
    }
  );
});

/* Document charts for ASAP */
router.get(`/generic`, function (req, res) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  // if (!accessRights.authenticated) return res.status(401).send(conf.errors.unauthorized);
  let render = Params.convertToString(req.query.render);
  let width = Params.convertToInteger(req.query.width);
  let height = Params.convertToInteger(req.query.height);
  let quality = Params.convertToInteger(req.query.quality);
  let token = _.get(req, `user.tokens.api`, ``);
  if (!render)
    return Charts.buildGenericPie({ data: { urls: {} } }, function (err, data) {
      if (err) {
        console.log(err);
        return res.status(500).send(conf.errors.internalServerError);
      }
      return res.send(data);
    });
  return Charts.buildRenderedGenericPie(
    {
      url: `${Url.build(
        `api/charts/generic`,
        Object.assign({ token: token }, req.query, { render: `` }) // disable render & add token if not in the URL
      )}`,
      render: { type: render, width: width, height: height, quality: quality }
    },
    function (err, data) {
      if (err) {
        console.log(err);
        return res.status(500).send(conf.errors.internalServerError);
      }
      let isError = data instanceof Error;
      return isError ? res.json({ err: isError, res: data.toString() }) : res.send(data);
    }
  );
});

module.exports = router;
