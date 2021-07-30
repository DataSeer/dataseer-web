/*
 * @prettier
 */

'use strict';

const express = require(`express`);
const router = express.Router();

const AccountsManager = require(`../../lib/accounts.js`);
const Params = require(`../../lib/params.js`);

const DocumentsFilesController = require(`../../controllers/api/documents.files.js`);

const conf = require(`../../conf/conf.json`);

/* GET file by ID */
router.get(`/:id`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.authenticated) return res.status(401).send(conf.errors.unauthorized);
  let opts = {
    data: {
      id: req.params.id
    },
    user: req.user
  };
  return DocumentsFilesController.readFile(opts, function (err, file) {
    if (err) return res.json({ 'err': true, 'res': null, 'msg': err instanceof Error ? err.toString() : err });
    if (!file) return res.json({ 'err': true, 'res': null, 'msg': `file not found` });
    res.setHeader(`Content-Type`, file.mimetype);
    return res.send(file.data);
  });
});

/* Update file BY ID */
router.put(`/:id`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.isStandardUser) return res.status(401).send(conf.errors.unauthorized);
  let opts = {
    data: {
      _id: req.params.id,
      name: Params.convertToString(req.body.name)
    },
    user: req.user
  };
  return DocumentsFilesController.update(opts, function (err, file) {
    if (err) {
      console.log(err);
      return res.status(500).send(conf.errors.internalServerError);
    }
    let isError = file instanceof Error;
    let result = isError ? file.toString() : file;
    return res.json({
      err: isError,
      res: result
    });
  });
});

/* Add file */
router.post(`/`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.isStandardUser) return res.status(401).send(conf.errors.unauthorized);
  if (!Params.checkString(req.body.account))
    return res.json({
      err: true,
      res: `You must select an account`
    });
  if (!Params.checkString(req.body.organization))
    return res.json({
      err: true,
      res: `You must select an organization`
    });
  if (!Params.checkString(req.body.document))
    return res.json({
      err: true,
      res: `You must select an document`
    });
  if (!Params.checkObject(req.files) || !Params.checkObject(req.files.file))
    return res.json({
      err: true,
      res: `You must select a file`
    });
  let opts = {
    data: {
      accountId: Params.convertToString(req.body.account),
      organizationId: Params.convertToString(req.body.organization),
      documentId: Params.convertToString(req.body.document),
      file: req.files.file
    },
    user: req.user
  };
  return DocumentsFilesController.upload(opts, function (err, file) {
    if (err) {
      console.log(err);
      return res.status(500).send(conf.errors.internalServerError);
    }
    let isError = file instanceof Error;
    let result = isError ? file.toString() : file;
    return res.json({
      err: isError,
      res: result
    });
  });
});

/* Delete file */
router.delete(`/:id`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.isStandardUser) return res.status(401).send(conf.errors.unauthorized);
  let opts = {
    data: {
      id: req.params.id
    },
    user: req.user
  };
  return DocumentsFilesController.delete(opts, function (err, file) {
    if (err) {
      console.log(err);
      return res.status(500).send(conf.errors.internalServerError);
    }
    let isError = file instanceof Error;
    let result = isError ? file.toString() : file;
    return res.json({
      err: isError,
      res: result
    });
  });
});

module.exports = router;
