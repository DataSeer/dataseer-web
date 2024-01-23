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
    if (file instanceof Error) return res.json({ 'err': true, 'res': null, 'msg': file.toString() });
    if (!file) return res.json({ 'err': true, 'res': null, 'msg': `file not found` });
    res.setHeader(`Content-Type`, file.mimetype);
    res.setHeader(`Content-Disposition`, `attachment; filename=` + file.name);
    return res.send(file.data);
  });
});

module.exports = router;
