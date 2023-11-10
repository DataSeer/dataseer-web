/*
 * @prettier
 */

'use strict';

const express = require(`express`);
const router = express.Router();

const AccountsManager = require(`../../lib/accounts.js`);
const Params = require(`../../lib/params.js`);
const Wiki = require(`../../lib/wiki.js`);
const DataObjects = require(`../../lib/dataObjects.js`);

const DocumentsDataObjectsController = require(`../../controllers/api/documents.dataObjects.js`);

const conf = require(`../../conf/conf.json`);

/* GET Get logs of a dataObject */
router.get(`/:id/logs`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.isModerator) return res.status(401).send(conf.errors.unauthorized);
  // Init transaction
  let opts = {
    data: {
      target: Params.convertToString(req.params.id),
      accounts: Params.convertToArray(req.query.accounts, `string`),
      limit: Params.convertToInteger(req.query.limit),
      skip: Params.convertToInteger(req.query.skip)
    },
    user: req.user
  };
  return DocumentsDataObjectsController.getLogs(opts, function (err, data) {
    if (err) {
      console.log(err);
      return res.status(500).send(conf.errors.internalServerError);
    }
    let isError = data instanceof Error;
    let result = isError ? data.toString() : data;
    return res.json({ err: isError, res: result });
  });
});

router.post(`/resyncJsonDataTypes`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.isModerator) return res.status(401).send(conf.errors.unauthorized);
  return Wiki.getDataTypes(function (err, dataTypes) {
    if (err) return next(err);
    else {
      req.app.set(`dataTypes`, dataTypes);
      DataObjects.refreshDataTypes(dataTypes);
      return res.json(req.app.get(`dataTypes`));
    }
  });
});

module.exports = router;
