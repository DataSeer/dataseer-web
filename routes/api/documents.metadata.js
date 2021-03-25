/*
 * @prettier
 */

'use strict';

const express = require('express'),
  router = express.Router();

const AccountsManager = require('../../lib/accounts.js');

const DocumentsMetadata = require('../../models/documents.metadata.js');

/* PUT on datasets */
router.put('/:id', function (req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccessRight(req.user, AccountsManager.roles.curator))
    return res.status(401).send('Your current role do not grant access to this part of website');
  return DocumentsMetadata.findOne({ _id: req.params.id }, function (err, metadata) {
    if (err) return res.json({ 'err': true, 'res': null, 'msg': err instanceof Error ? err.toString() : err });
    else if (!metadata) return res.json({ 'err': true, 'res': null, 'msg': 'metadata not found' });
    if (req.body.article_title) metadata.article_title = req.body.article_title;
    if (req.body.journal) metadata.journal = req.body.journal;
    if (req.body.publisher) metadata.publisher = req.body.publisher;
    if (req.body.date_published) metadata.date_published = req.body.date_published;
    if (req.body.manuscript_id) metadata.manuscript_id = req.body.manuscript_id;
    if (req.body.submitting_author) metadata.submitting_author = req.body.submitting_author;
    if (req.body.submitting_author_email) metadata.submitting_author_email = req.body.submitting_author_email;
    if (req.body.authors) metadata.authors = req.body.authors;
    if (req.body.doi) metadata.doi = req.body.doi;
    if (req.body.pmid) metadata.pmid = req.body.pmid;
    return metadata.save(function (err) {
      if (err) return res.json({ 'err': true, 'res': null, 'msg': err instanceof Error ? err.toString() : err });
      else return res.json({ 'err': false, 'res': true });
    });
  });
});

module.exports = router;
