/*
 * @prettier
 */

'use strict';

const mongoose = require(`mongoose`);

const uploadSchema = require(`./schemas/upload.js`);

const Schema = new mongoose.Schema(
  {
    // identifiers of file
    identifiers: new mongoose.Schema(
      {
        doi: { type: String, default: `` }, // DOI
        pmid: { type: String, default: `` }, // PMID
        manuscript_id: { type: String, default: `` } // manuscript id
      },
      { minimize: false, _id: false }
    ),
    name: { type: String, default: `` }, // document name
    status: { type: String, default: `` }, // document status
    softcite: { type: mongoose.Schema.Types.ObjectId, ref: `DocumentsFiles`, default: null }, // refers to documents.files collection item (softcite)
    pdf: { type: mongoose.Schema.Types.ObjectId, ref: `DocumentsFiles`, default: null }, // refers to documents.files collection item (pdf)
    tei: { type: mongoose.Schema.Types.ObjectId, ref: `DocumentsFiles`, default: null }, // refers to documents.files collection item (tei)
    datasets: { type: mongoose.Schema.Types.ObjectId, ref: `DocumentsDatasets` }, // refers to documents.datasets collection item
    metadata: { type: mongoose.Schema.Types.ObjectId, ref: `DocumentsMetadata` }, // refers to documents.metadata collection item
    files: [{ type: mongoose.Schema.Types.ObjectId, ref: `DocumentsFiles` }], // refers to documents.files collection items (all kind of files)
    organizations: [{ type: mongoose.Schema.Types.ObjectId, ref: `Organizations` }], // refers to organizations collection item
    owner: { type: mongoose.Schema.Types.ObjectId, ref: `Accounts` }, // refers to documents.datasets collection item
    watchers: [{ type: mongoose.Schema.Types.ObjectId, ref: `Accounts` }], // refers to documents.accounts collection item
    token: { type: String, default: `` }, // refers to documents.datasets collection item
    visible: { type: Boolean, default: true, required: true }, // document visibility
    locked: { type: Boolean, default: false, required: true }, // document lock
    upload: uploadSchema
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

module.exports = mongoose.model(`Documents`, Schema, `documents`);
