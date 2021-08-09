/*
 * @prettier
 */

'use strict';

const express = require(`express`);
const router = express.Router();

const AccountsManager = require(`../../lib/accounts.js`);
const Params = require(`../../lib/params.js`);
const Url = require(`../../lib/url.js`);
const Hypothesis = require(`../../lib/hypothesis.js`);

const DocumentsController = require(`../../controllers/api/documents.js`);

const conf = require(`../../conf/conf.json`);

/* GET bioRxiv annotations */
router.get(`/bioRxiv`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.authenticated) return res.status(401).send(conf.errors.unauthorized);
  if (!Params.checkString(req.query.url))
    return res.json({
      err: true,
      res: `Missing required data: url`
    });
  let url = Params.convertToString(req.query.url); // e.g. https://www.biorxiv.org/content/10.1101/2021.06.04.447104v1
  return Hypothesis.findAnnotations({ url: url }, function (err, annotation) {
    if (err) {
      console.log(err);
      return res.status(500).send(conf.errors.internalServerError);
    }
    let isError = annotation instanceof Error;
    let result = isError ? annotation.toString() : annotation;
    return res.json({
      err: isError,
      res: result
    });
  });
});

/* PUT bioRxiv annotation */
router.put(`/bioRxiv`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.authenticated) return res.status(401).send(conf.errors.unauthorized);
  if (!Params.checkString(req.body.url))
    return res.json({
      err: true,
      res: `Missing required data: url`
    });
  if (!Params.checkString(req.body.id))
    return res.json({
      err: true,
      res: `Missing required data: id`
    });
  let id = Params.convertToString(req.body.id);
  let opts = {
    data: {
      id: id,
      kind: `html`,
      organization: `bioRxiv`,
      dataTypes: req.app.get(`dataTypes`)
    },
    user: req.user
  };
  return DocumentsController.getReportData(opts, function (err, data) {
    if (err) {
      console.log(err);
      return res.status(500).send(conf.errors.internalServerError);
    }
    let isError = data instanceof Error;
    let result = isError ? data.toString() : data;
    if (isError) return res.status(404).send(conf.errors.notFound);
    let url = Params.convertToString(req.body.url);
    let content = Hypothesis.buildAnnotationContent({
      data: {
        publicURL: `${Url.build(`/documents/${id}`, { token: data.doc.token })}`,
        reportData: data
      }
    });
    if (content instanceof Error) {
      console.log(content);
      return res.status(500).send(conf.errors.internalServerError);
    }
    return Hypothesis.updateOrCreateAnnotation({ url: url, text: content }, function (err, annotation) {
      if (err) {
        console.log(err);
        return res.status(500).send(conf.errors.internalServerError);
      }
      let isError = annotation instanceof Error;
      let result = isError ? annotation.toString() : annotation;
      return res.json({
        err: isError,
        res: result
      });
    });
  });
});

/* GET bioRxiv annotation content BY ID */
router.get(`/bioRxiv/:id`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.authenticated) return res.status(401).send(conf.errors.unauthorized);
  // Init transaction
  let opts = {
    data: { id: req.params.id, kind: `html`, organization: `bioRxiv`, dataTypes: req.app.get(`dataTypes`) },
    user: req.user
  };
  return DocumentsController.getReportData(opts, function (err, data) {
    if (err) {
      console.log(err);
      return res.status(500).send(conf.errors.internalServerError);
    }
    let isError = data instanceof Error;
    let result = isError ? data.toString() : data;
    if (isError) return res.status(404).send(conf.errors.notFound);
    let content = Hypothesis.buildAnnotationContent({
      data: {
        publicURL: `${Url.build(`/documents/${req.params.id}`, { token: data.doc.token })}`,
        reportData: data
      }
    });
    if (content instanceof Error) {
      console.log(content);
      return res.status(500).send(conf.errors.internalServerError);
    }
    return res.send(content);
  });
});

module.exports = router;
