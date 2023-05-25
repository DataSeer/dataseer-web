/*
 * @prettier
 */

'use strict';

const express = require(`express`);
const router = express.Router();

const AccountsManager = require(`../../lib/accounts.js`);
const Params = require(`../../lib/params.js`);

const DocumentsController = require(`../../controllers/api/documents.js`);

const conf = require(`../../conf/conf.json`);

/* POST dataset of datasets */
router.post(`/:id/dataset`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.authenticated || !accessRights.isStandardUser)
    return res.status(401).send(conf.errors.unauthorized);
  // Init transaction
  let opts = {
    datasetsId: req.params.id,
    dataset: req.body.dataset,
    sentence: req.body.sentence,
    user: req.user,
    logs: true
  };
  return DocumentsController.newDataset(opts, function (err, data) {
    if (err) {
      console.log(err);
      return res.status(500).send(conf.errors.internalServerError);
    }
    let isError = data instanceof Error;
    let result = isError ? data.toString() : data;
    return res.json({
      err: isError,
      res: result
    });
  });
});

/* PUT dataset of datasets */
router.put(`/:id/dataset`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.authenticated || !accessRights.isStandardUser)
    return res.status(401).send(conf.errors.unauthorized);
  // Init transaction
  let opts = {
    datasetsId: req.params.id,
    dataset: req.body.dataset,
    fromAPI: true,
    user: req.user,
    logs: true
  };
  return DocumentsController.updateDataset(opts, function (err, data) {
    if (err) {
      console.log(err);
      return res.status(500).send(conf.errors.internalServerError);
    }
    let isError = data instanceof Error;
    let result = isError ? data.toString() : data;
    return res.json({
      err: isError,
      res: result
    });
  });
});

/* DELETE dataset of datasets */
router.delete(`/:id/dataset`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.authenticated || !accessRights.isStandardUser)
    return res.status(401).send(conf.errors.unauthorized);
  // Init transaction
  let opts = {
    datasetsId: req.params.id,
    dataset: req.body.dataset,
    user: req.user,
    logs: true
  };
  return DocumentsController.deleteDataset(opts, function (err, data) {
    if (err) {
      console.log(err);
      return res.status(500).send(conf.errors.internalServerError);
    }
    let isError = data instanceof Error;
    let result = isError ? data.toString() : data;
    return res.json({
      err: isError,
      res: result
    });
  });
});

/* POST link of datasets */
router.post(`/:id/link`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.authenticated || !accessRights.isStandardUser)
    return res.status(401).send(conf.errors.unauthorized);
  // Init transaction
  let opts = {
    datasetsId: req.params.id,
    link: req.body.link,
    user: req.user,
    logs: true
  };
  return DocumentsController.linkSentence(opts, function (err, data) {
    if (err) {
      console.log(err);
      return res.status(500).send(conf.errors.internalServerError);
    }
    let isError = data instanceof Error;
    let result = isError ? data.toString() : data;
    return res.json({
      err: isError,
      res: result
    });
  });
});

/* DELETE link of datasets */
router.delete(`/:id/unlink`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.authenticated || !accessRights.isStandardUser)
    return res.status(401).send(conf.errors.unauthorized);
  // Init transaction
  let opts = { user: req.user, datasetsId: req.params.id, link: req.body.link, logs: true };
  return DocumentsController.unlinkSentence(opts, function (err, data) {
    if (err) {
      console.log(err);
      return res.status(500).send(conf.errors.internalServerError);
    }
    let isError = data instanceof Error;
    let result = isError ? data.toString() : data;
    return res.json({
      err: isError,
      res: result
    });
  });
});

module.exports = router;
