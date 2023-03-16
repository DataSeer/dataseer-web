/*
 * @prettier
 */

'use strict';

const mongoose = require(`mongoose`);

const Author = new mongoose.Schema(
  {
    isLeadSubmitting: { type: Boolean, default: false },
    name: String,
    email: String,
    'family-name': String,
    'given-names': String,
    'other-name': String,
    affiliations: [String],
    orcid: {
      ASAPAffiliationInUpload: { type: Boolean, default: false },
      partOfASAPNetwork: { type: Boolean, default: false },
      suggestedValues: [String],
      currentValue: { type: String, default: `` },
      fromTEI: [String],
      fromAPI: [Object]
    }
  },
  { _id: false }
);

const Schema = new mongoose.Schema(
  {
    // README included
    readmeIncluded: {
      value: { type: Boolean, default: false },
      notes: { type: String, default: `` }
    },
    describesFiles: {
      value: { type: Boolean, default: false },
      notes: { type: String, default: `` }
    },
    describesVariables: {
      value: { type: Boolean, default: false },
      notes: { type: String, default: `` }
    },
    document: { type: mongoose.Schema.Types.ObjectId, ref: `Documents` }, // refers to documents collection (id of a given document)
    article_title: { type: String, default: `` }, // articleTitle
    journal: { type: String, default: `` }, // journal
    license: { type: String, default: `` }, // license
    acknowledgement: { type: String, default: `` }, // acknowledgement
    affiliation: { type: String, default: `` }, // affiliation
    publisher: { type: String, default: `` }, // publisher
    date_published: { type: String, default: `` }, // date_published
    manuscript_id: { type: String, default: `` }, // manuscriptId
    submitting_author: { type: String, default: `` }, // submittingAuthor
    submitting_author_email: { type: String, default: `` }, // submittingAuthorEmail
    authors: [Author], // authors. Array(Object) => {"name": String, "affiliations": Array(String) }
    doi: { type: String, default: `` }, // doi
    pmid: { type: String, default: `` }, // pmid
    isbn: { type: String, default: `` } // isbn
  },
  { minimize: false, timestamps: { createdAt: `createdAt`, updatedAt: `updatedAt` } }
);

const versionHook = function () {
  const update = this.getUpdate();
  if (update.__v != null) {
    delete update.__v;
  }
  const keys = [`$set`, `$setOnInsert`];
  for (const key of keys) {
    if (update[key] != null && update[key].__v != null) {
      delete update[key].__v;
      if (Object.keys(update[key]).length === 0) {
        delete update[key];
      }
    }
  }
  update.$inc = update.$inc || {};
  update.$inc.__v = 1;
};

Schema.pre(`save`, function (next) {
  this.increment();
  return next();
});

Schema.pre(`findOneAndUpdate`, versionHook);
Schema.pre(`update`, versionHook);

module.exports = mongoose.model(`DocumentsMetadata`, Schema, `documents.metadata`);
