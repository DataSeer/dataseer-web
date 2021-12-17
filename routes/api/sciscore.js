/*
 * @prettier
 */

'use strict';

const express = require(`express`);
const router = express.Router();

const DocumentsController = require(`../../controllers/api/documents.js`);
const DocumentsFilesController = require(`../../controllers/api/documents.files.js`);

const AccountsManager = require(`../../lib/accounts.js`);
const Sciscore = require(`../../lib/sciscore.js`);

const conf = require(`../../conf/conf.json`);

router.post(`/processFile/:id`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.isAdministrator) return res.status(401).send(conf.errors.unauthorized);
  return DocumentsController.get({ data: { id: req.params.id }, user: req.user }, function (err, doc) {
    if (err) {
      console.log(err);
      return res.status(500).send(conf.errors.internalServerError);
    }
    if (!doc || doc instanceof Error) return res.status(404).send(conf.errors.notFound);
    let fileId = doc.pdf ? doc.pdf : doc.tei;
    return DocumentsFilesController.getFilePath({ data: { id: fileId.toString() } }, function (err, filePath) {
      if (err) {
        console.log(err);
        return res.status(500).send(conf.errors.internalServerError);
      }
      return Sciscore.processFile({ filePath: filePath }, function (err, body) {
        if (err) return next(err);
        else return res.json(body);
      });
    });
  });
});

module.exports = router;
