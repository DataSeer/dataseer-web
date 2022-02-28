/*
 * @prettier
 */

'use strict';

const express = require(`express`);
const router = express.Router();

const _ = require(`lodash`);
const async = require(`async`);

const AccountsManager = require(`../../lib/accounts.js`);
const Params = require(`../../lib/params.js`);
const Url = require(`../../lib/url.js`);
const ORCID = require(`../../lib/orcid.js`);

const DocumentsController = require(`../../controllers/api/documents.js`);
const DocumentsFilesController = require(`../../controllers/api/documents.files.js`);

const conf = require(`../../conf/conf.json`);

/* [DEPRECATED] Search for the ORCID of the given Document authors */
router.get(`/:id/authors`, function (req, res) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.isAdministrator) return res.status(401).send(conf.errors.unauthorized);
  let opts = {
    data: {
      id: req.params.id
    },
    user: req.user
  };
  return DocumentsController.get(opts, function (err, doc) {
    if (err) {
      console.log(err);
      return res.status(500).send(conf.errors.internalServerError);
    }
    if (!doc) return res.json({ err: true, res: null, msg: `document not found` });
    if (!doc.tei) return res.json({ err: true, res: null, msg: `TEI file content not found` });
    return DocumentsFilesController.readFileContent(
      { data: { id: doc.tei ? doc.tei.toString() : undefined } },
      function (err, file) {
        if (err) return res.json({ 'err': true, 'res': null, 'msg': err instanceof Error ? err.toString() : err });
        if (!file) return res.json({ 'err': true, 'res': null, 'msg': `file not found` });
        let xmlString = file.data;
        let authors = ORCID.extractAuthorsFromTEI(xmlString);
        if (authors.length <= 0) return res.json({ err: false, res: [] });
        return async.mapSeries(
          authors,
          function (item, next) {
            return ORCID.findAuthor(item, function (err, data) {
              if (err) return next(err);
              return next(null, data);
            });
          },
          function (err, result) {
            if (err) {
              console.log(err);
              return res.status(500).send(conf.errors.internalServerError);
            }
            return res.json(result);
          }
        );
      }
    );
  });
});

module.exports = router;
