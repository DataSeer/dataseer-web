/*
 * @prettier
 */

const express = require('express'),
  mongoose = require('mongoose'),
  jwt = require('jsonwebtoken'),
  fs = require('fs'),
  router = express.Router(),
  Accounts = require('../../models/accounts.js'),
  AccountsManager = require('../../lib/accountsManager.js'),
  Documents = require('../../models/documents.js');

const gridfs = require('mongoose-gridfs');

// if a apiToken is provided, try to identify user
const checkApiToken = function (req, res, cb) {
  // Authorization: Bearer <token>
  if (!req.header('Authorization')) return cb();
  let token = req.header('Authorization').replace(/^Bearer /, ''),
    privateKey = req.app.get('private.key');
  if (privateKey)
    return jwt.verify(token, privateKey, { 'maxAge': 5259492 }, function (err, decoded) {
      // maxAge of 2 mounth
      // err
      if (err) return res.json({ 'err': true, 'msg': err.name + ': ' + err.message, 'res': null });
      Accounts.find({ 'username': decoded.username })
        .limit(1)
        .exec(function (err, posts) {
          if (err || posts.length !== 1) return res.json({ 'err': true, 'msg': 'Account not found', 'res': null });
          req.user = posts[0];
          return cb();
        });
    });
  else return res.json({ 'err': true, 'msg': 'API unable to validate token', 'res': null });
};

/* GET ALL Documents */
router.get('/', function (req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccountAccessRight(req.user))
    return res.status(401).send('Your current role do not grant access to this part of website');
  let limit = parseInt(req.query.limit),
    doi = req.query.doi,
    pmid = req.query.pmid,
    query = {};
  if (typeof doi !== 'undefined') query['doi'] = doi;
  if (typeof pmid !== 'undefined') query['pmid'] = pmid;
  if (isNaN(limit)) limit = 20;
  Documents.find(query)
    .limit(limit)
    .exec(function (err, post) {
      if (err) return res.json({ 'err': true, 'res': null, 'msg': err });
      return res.json({ 'err': false, 'res': post });
    });
});

/* GET SINGLE Document BY ID */
router.get('/:id', function (req, res, next) {
  return checkApiToken(req, res, function () {
    if (typeof req.user === 'undefined' || !AccountsManager.checkAccountAccessRight(req.user))
      return res.status(401).send('Your current role do not grant access to this part of website');
    Documents.findById(req.params.id, function (err, post) {
      if (err) return res.json({ 'err': true, 'res': null, 'msg': err });
      if (req.query.pdf && typeof post.pdf !== 'undefined') {
        const Pdf = gridfs.createModel({
          modelName: 'Pdf',
          connection: mongoose.connection
        });
        Pdf.findById(post.pdf.id, (err, pdf) => {
          if (err) return res.json({ 'err': true, 'res': null, 'msg': err });
          let arr = [];
          const readstream = pdf.read();
          readstream.on('error', function (err) {
            return res.json({ 'err': true, 'res': null, 'msg': err });
          });
          readstream.on('data', function (data) {
            arr.push(data);
          });
          readstream.on('close', function (data) {
            post.pdf.data = Buffer.concat(arr);
            return res.json({ 'err': false, 'res': post });
          });
        });
      } else return res.json({ 'err': false, 'res': post });
    });
  });
});

/* SAVE Document */
router.post('/', function (req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccountAccessRight(req.user))
    return res.status(401).send('Your current role do not grant access to this part of website');
  Documents.create(req.body, function (err, post) {
    if (err) return res.json({ 'err': true, 'res': null, 'msg': err });
    return res.json({ 'err': false, 'res': post });
  });
});

/* UPDATE Document */
router.put('/:id', function (req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccountAccessRight(req.user))
    return res.status(401).send('Your current role do not grant access to this part of website');
  if (typeof req.body.pdf !== 'undefined' && typeof req.body.pdf.data !== 'undefined') req.body.pdf.data = undefined;
  if (typeof req.body.modifiedBy === 'undefined') req.body.modifiedBy = {};
  if (typeof req.body.modifiedBy[req.user.role.label] === 'undefined') req.body.modifiedBy[req.user.role.label] = {};
  req.body.modifiedBy[req.user.role.label][req.user.id] = req.user.username;
  Documents.findByIdAndUpdate(req.params.id, req.body, function (err, post) {
    if (err) return res.json({ 'err': true, 'res': null, 'msg': err });
    return res.json({ 'err': false, 'res': post });
  });
});

/* DELETE Document */
router.delete('/:id', function (req, res, next) {
  if (
    typeof req.user === 'undefined' ||
    !AccountsManager.checkAccountAccessRight(req.user, AccountsManager.roles.curator)
  )
    return res.status(401).send('Your current role do not grant access to this part of website');
  Documents.findByIdAndRemove(req.params.id, req.body, function (err, post) {
    if (err) return res.json({ 'err': true, 'res': null, 'msg': err });
    return res.json({ 'err': false, 'res': post });
  });
});

module.exports = router;
