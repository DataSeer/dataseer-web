/*
 * @prettier
 */

'use strict';

const express = require(`express`);
const router = express.Router();

const AccountsManager = require(`../../lib/accounts.js`);
const BioNLP = require(`../../lib/bioNLP.js`);

const conf = require(`../../conf/conf.json`);

router.post(`/`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.isAdministrator) return res.status(401).send(conf.errors.unauthorized);
  return BioNLP.request(`BIONLP`, { sentence: req.body.sentence }, function (err, body) {
    if (err) return res.json({ err: true, msg: err.toString() });
    else return res.json({ err: false, res: body });
  });
});

router.post(`/processSentences`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.isAdministrator) return res.status(401).send(conf.errors.unauthorized);
  return BioNLP.processSentences(req.body.sentences, function (err, results) {
    if (err) return res.json({ err: true, msg: results.toString() });
    else return res.json({ err: false, res: results });
  });
});

router.post(`/GeniaTagger`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.isAdministrator) return res.status(401).send(conf.errors.unauthorized);
  return BioNLP.request(`GeniaTagger`, { sentences: req.body.sentences }, function (err, body) {
    if (err) return res.json({ err: true, msg: err.toString() });
    else return res.json({ err: false, res: body });
  });
});

router.post(`/BERT/CRAFT5000`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.isAdministrator) return res.status(401).send(conf.errors.unauthorized);
  return BioNLP.request(`BERT.CRAFT5000`, { sentence: req.body.sentence }, function (err, body) {
    if (err) return res.json({ err: true, msg: err.toString() });
    else return res.json({ err: false, res: body });
  });
});

router.post(`/BERT/LabMaterials`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.isAdministrator) return res.status(401).send(conf.errors.unauthorized);
  return BioNLP.request(`BERT.LabMaterials`, { sentence: req.body.sentence }, function (err, body) {
    if (err) return res.json({ err: true, msg: err.toString() });
    else return res.json({ err: false, res: body });
  });
});

router.post(`/bioBERT`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.isAdministrator) return res.status(401).send(conf.errors.unauthorized);
  return BioNLP.request(`bioBERT`, { text: req.body.text }, function (err, body) {
    if (err) return res.json({ err: true, msg: err.toString() });
    else return res.json({ err: false, res: body });
  });
});

module.exports = router;
