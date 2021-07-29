/*
 * @prettier
 */

'use strict';

const express = require(`express`);
const router = express.Router();

const AccountsManager = require(`../../lib/accounts.js`);
const Softcite = require(`../../lib/softcite.js`);

router.post(`/processSoftwareText`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.authenticated) return res.status(401).send(conf.errors.unauthorized);
  return Softcite.processSoftwareText(
    { disambiguate: req.body.disambiguate, text: req.body.text },
    function (err, body) {
      if (err) return next(err);
      else return res.json(body);
    }
  );
});

module.exports = router;
