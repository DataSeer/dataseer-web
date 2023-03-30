/*
 * @prettier
 */

'use strict';

const express = require(`express`);
const router = express.Router();

const DocumentsController = require(`../../controllers/api/documents.js`);

const AccountsManager = require(`../../lib/accounts.js`);
const Url = require(`../../lib/url.js`);
const Params = require(`../../lib/params.js`);

const conf = require(`../../conf/conf.json`);

/* My documents view */
router.get(`/`, function (req, res) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.isStandardUser)
    return res.redirect(Url.build(`/signin`, { unauthorized: true, redirect: req.originalUrl }));
  return res.render(`root/documents/layout.pug`, {
    currentRoute: `/documents`,
    currentUser: req.user,
    conf: conf
  });
});

/* Document process router */
router.get(`/:id`, function (req, res) {
  let accessRights = AccountsManager.getAccessRights(req.user, AccountsManager.match.all);
  if (!accessRights.authenticated)
    return res.redirect(Url.build(`/signin`, { unauthorized: true, redirect: req.originalUrl }));
  return DocumentsController.get({ data: { id: req.params.id }, user: req.user }, function (err, doc) {
    if (err) {
      console.log(err);
      return res.status(500).send(conf.errors.internalServerError);
    }
    if (!doc || doc instanceof Error) return res.status(404).send(conf.errors.notFound);
    let oldGUI = Params.convertToBoolean(req.query.oldGUI);
    let view = Params.convertToString(req.query.view);
    let fromReport = Params.convertToBoolean(req.query.fromReport);
    if (!oldGUI || fromReport) {
      if (view === `datasets`)
        return res.redirect(
          Url.build(`#/documents/${req.params.id}/datasets`, Object.assign({}, req.query), conf.gui.root)
        );
      return res.redirect(
        Url.build(`#/documents/${req.params.id}/report`, Object.assign({}, req.query), conf.gui.root)
      );
    }
    if (doc.status === ``) return res.status(500).send(`This document is no more available`);
    return res.redirect(
      Url.build(`documents/${req.params.id}/${doc.status}`, { token: req.query.token, oldGUI: oldGUI })
    );
  });
});

/* Document process metadata */
router.get(`/:id/metadata`, function (req, res) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.authenticated)
    return res.redirect(Url.build(`/signin`, { unauthorized: true, redirect: req.originalUrl }));
  return DocumentsController.get({ data: { id: req.params.id }, user: req.user }, function (err, doc) {
    if (err) {
      console.log(err);
      return res.status(500).send(conf.errors.internalServerError);
    }
    if (!doc || doc instanceof Error) return res.status(404).send(conf.errors.notFound);
    if ((accessRights.isVisitor || accessRights.isStandardUser) && doc.status !== `metadata`)
      return res.redirect(Url.build(`/documents/${req.params.id}/${doc.status}`, { token: req.query.token }));
    return res.render(`root/documents/:id/metadata/layout.pug`, {
      currentRoute: `/documents/:id/metadata`,
      currentUser: req.user,
      conf: conf,
      document: doc
    });
  });
});

/* Document process datasets */
router.get(`/:id/datasets`, function (req, res) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.authenticated)
    return res.redirect(Url.build(`/signin`, { unauthorized: true, redirect: req.originalUrl }));
  return DocumentsController.get({ data: { id: req.params.id }, user: req.user }, function (err, doc) {
    if (err) {
      console.log(err);
      return res.status(500).send(conf.errors.internalServerError);
    }
    if (!doc || doc instanceof Error) return res.status(404).send(conf.errors.notFound);
    if ((accessRights.isVisitor || accessRights.isStandardUser) && doc.status !== `datasets`)
      return res.redirect(Url.build(`documents/${req.params.id}/${doc.status}`, { token: req.query.token }));
    return res.render(`root/documents/:id/datasets/layout.pug`, {
      currentRoute: `/documents/:id/datasets`,
      currentUser: req.user,
      conf: conf,
      document: doc
    });
  });
});

/* Document process finish */
router.get(`/:id/finish`, function (req, res) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.authenticated)
    return res.redirect(Url.build(`/signin`, { unauthorized: true, redirect: req.originalUrl }));
  return DocumentsController.get({ data: { id: req.params.id }, user: req.user }, function (err, doc) {
    if (err) {
      console.log(err);
      return res.status(500).send(conf.errors.internalServerError);
    }
    if (!doc || doc instanceof Error) return res.status(404).send(conf.errors.notFound);
    if ((accessRights.isVisitor || accessRights.isStandardUser) && doc.status !== `finish`)
      return res.redirect(Url.build(`documents/${req.params.id}/${doc.status}`, { token: req.query.token }));
    return res.render(`root/documents/:id/finish/layout.pug`, {
      currentRoute: `/documents/:id/finish`,
      currentUser: req.user,
      conf: conf,
      document: doc
    });
  });
});

/* Document process finish */
router.get(`/:id/reports/gSpreadsheets/:kind`, function (req, res) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.authenticated)
    return res.redirect(Url.build(`/signin`, { unauthorized: true, redirect: req.originalUrl }));
  return DocumentsController.get({ data: { id: req.params.id }, user: req.user }, function (err, doc) {
    if (err) {
      console.log(err);
      return res.status(500).send(conf.errors.internalServerError);
    }
    if (!doc || doc instanceof Error) return res.status(404).send(conf.errors.notFound);
    let opts = {
      data: {
        id: req.params.id,
        organizations: doc.organizations.map(function (item) {
          return item._id.toString();
        })
      },
      strict: false,
      kind: req.params.kind,
      user: req.user
    };
    return DocumentsController.getGSpreadsheets(opts, function (err, data) {
      if (err) {
        console.log(err);
        return res.status(500).send(conf.errors.internalServerError);
      }
      if (!data || data instanceof Error) return res.status(404).send(conf.errors.notFound);
      return res.redirect(Url.build(`spreadsheets/d/${data}`, {}, `https://docs.google.com/`));
    });
  });
});

module.exports = router;
