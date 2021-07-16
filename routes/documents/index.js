/*
 * @prettier
 */

'use strict';

const express = require(`express`);
const router = express.Router();

const DocumentsController = require(`../../controllers/api/documents.js`);

const AccountsManager = require(`../../lib/accounts.js`);
const Url = require(`../../lib/url.js`);

const conf = require(`../../conf/conf.json`);

/* My documents view */
router.get(`/`, function (req, res) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.isStandardUser)
    return res.redirect(Url.build(`/signin`, { unauthorized: true, redirect: `/documents` }));
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
    return res.redirect(Url.build(`/signin`, { unauthorized: true, redirect: `/documents/${req.params.id}` }));
  return DocumentsController.get({ data: { id: req.params.id }, user: req.user }, function (err, doc) {
    if (err) {
      console.log(err);
      return res.status(500).send(conf.errors.internalServerError);
    }
    if (!doc) return res.status(404).send(conf.errors.notFound);
    return res.redirect(Url.build(`documents/${req.params.id}/${doc.status}`, { token: req.query.token }));
  });
});

/* Document process metadata */
router.get(`/:id/metadata`, function (req, res) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.authenticated)
    return res.redirect(
      Url.build(`/signin`, {
        unauthorized: true,
        redirect: `/backoffice/documents/${req.params.id}/metadata`
      })
    );
  return DocumentsController.get({ data: { id: req.params.id }, user: req.user }, function (err, doc) {
    if (err) {
      console.log(err);
      return res.status(500).send(conf.errors.internalServerError);
    }
    if (!doc) return res.status(404).send(conf.errors.notFound);
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
    return res.redirect(
      Url.build(`/signin`, {
        unauthorized: true,
        redirect: `/backoffice/documents/${req.params.id}/datasets`
      })
    );
  return DocumentsController.get({ data: { id: req.params.id }, user: req.user }, function (err, doc) {
    if (err) {
      console.log(err);
      return res.status(500).send(conf.errors.internalServerError);
    }
    if (!doc) return res.status(404).send(conf.errors.notFound);
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
    return res.redirect(
      Url.build(`/signin`, { unauthorized: true, redirect: `/backoffice/documents/${req.params.id}/finish` })
    );
  return DocumentsController.get({ data: { id: req.params.id }, user: req.user }, function (err, doc) {
    if (err) {
      console.log(err);
      return res.status(500).send(conf.errors.internalServerError);
    }
    if (!doc) return res.status(404).send(conf.errors.notFound);
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

module.exports = router;
