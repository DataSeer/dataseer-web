/*
 * @prettier
 */

const express = require('express'),
  router = express.Router(),
  fs = require('fs');

const DocumentsFiles = require('../../models/documents.files.js');

const JWT = require('../../lib/jwt.js'),
  AccountsManager = require('../../lib/accounts.js');

const DocumentsFilesController = require('../../controllers/documents.files.js');

const conf = require('../../conf/conf.json');

/* GET file of document */
router.get('/:id', function (req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccessRight(req.user))
    return res.status(401).send('Your current role do not grant access to this part of website');
  // Init transaction
  let transaction = DocumentsFiles.findOne({ _id: req.params.id }).select('+path'); // path is not returned by default;
  // Execute transaction
  return transaction.exec(function (err, file) {
    if (err) return res.json({ 'err': true, 'res': null, 'msg': err });
    else if (!file) return res.json({ 'err': true, 'res': null, 'msg': 'file not found' });
    let stream = fs.createReadStream(file.path),
      stat = fs.statSync(file.path);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Type', file.mimetype);
    return stream.pipe(res);
  });
});

/* GET file of document with data (buffer) */
router.get('/:id/buffer', function (req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccessRight(req.user))
    return res.status(401).send('Your current role do not grant access to this part of website');
  // Init transaction
  let transaction = DocumentsFiles.findOne({ _id: req.params.id }).lean(); // path is not returned by default;
  // Execute transaction
  return transaction.exec(function (err, file) {
    if (err) return res.json({ 'err': true, 'res': null, 'msg': err });
    else if (!file) return res.json({ 'err': true, 'res': null, 'msg': 'file not found' });
    return DocumentsFilesController.readFile(req.params.id, function (err, data) {
      if (err) return res.json({ 'err': true, 'res': null, 'msg': err });
      let result = Object.assign({}, file, { data: Buffer.from(data, file.encoding) });
      return res.json({ 'err': false, 'res': result });
    });
  });
});

/* GET file of document with data (string) */
router.get('/:id/string', function (req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccessRight(req.user))
    return res.status(401).send('Your current role do not grant access to this part of website');
  // Init transaction
  let transaction = DocumentsFiles.findOne({ _id: req.params.id }).lean(); // path is not returned by default;
  // Execute transaction
  return transaction.exec(function (err, file) {
    if (err) return res.json({ 'err': true, 'res': null, 'msg': err });
    else if (!file) return res.json({ 'err': true, 'res': null, 'msg': 'file not found' });
    return DocumentsFilesController.readFile(req.params.id, function (err, data) {
      if (err) return res.json({ 'err': true, 'res': null, 'msg': err });
      let result = Object.assign({}, file, { data: data.toString('utf8') });
      return res.json({ 'err': false, 'res': result });
    });
  });
});

module.exports = router;
