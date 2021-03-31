/*
 * @prettier
 */

'use strict';

const mongoose = require('mongoose');

let Author = new mongoose.Schema({ name: String, email: String, affiliations: [String] }, { _id: false });

let Schema = new mongoose.Schema(
  {
    document: { type: mongoose.Schema.Types.ObjectId, ref: 'Documents' }, // refers to documents collection (id of a given document)
    article_title: { type: String, default: '' }, // articleTitle
    journal: { type: String, default: '' }, // journal
    publisher: { type: String, default: '' }, // publisher
    date_published: { type: String, default: '' }, // date_published
    manuscript_id: { type: String, default: '' }, // manuscriptId
    submitting_author: { type: String, default: '' }, // submittingAuthor
    submitting_author_email: { type: String, default: '' }, // submittingAuthorEmail
    authors: [Author], // authors. Array(Object) => {"name": String, "affiliations": Array(String) }
    doi: { type: String, default: '' }, // doi
    pmid: { type: String, default: '' } // pmid
  },
  { minimize: false }
);

module.exports = mongoose.model('DocumentsMetadata', Schema, 'documents.metadata');
