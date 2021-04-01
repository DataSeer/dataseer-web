/*
 * @prettier
 */

'use strict';

const mongoose = require('mongoose');

let Schema = new mongoose.Schema(
  {
    logs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'DocumentsLogs' }], // refers to documents.logs collection items
    pdf: { type: mongoose.Schema.Types.ObjectId, ref: 'DocumentsFiles' }, // refers to documents.files collection item (pdf)
    tei: { type: mongoose.Schema.Types.ObjectId, ref: 'DocumentsFiles' }, // refers to documents.files collection item (tei)
    files: [{ type: mongoose.Schema.Types.ObjectId, ref: 'DocumentsFiles' }], // refers to documents.files collection items (all kind of files)
    metadata: { type: mongoose.Schema.Types.ObjectId, ref: 'DocumentsMetadata' }, // refers to documents.metadata collection item
    organisation: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisations' }, // refers to organisations collection item
    datasets: { type: mongoose.Schema.Types.ObjectId, ref: 'DocumentsDatasets' }, // refers to documents.datasets collection item
    status: { type: String, default: '' }, // status of given document
    isDataSeer: { type: Boolean, default: false }, // specify if it's a dataseer document
    updated_at: { type: Date, default: Date.now }, // date of last update
    uploaded_at: { type: Date, default: Date.now }, // date of upload
    uploaded_by: { type: mongoose.Schema.Types.ObjectId, ref: 'Accounts' }, // refers to documents.datasets collection item
    upload_journal: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisations' }, // Which journal will be sent to
    already_assessed: { type: Boolean, default: false }, // This is a new version of an article DataSeer has already assessed
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'Accounts' }, // refers to documents.datasets collection item
    watchers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Accounts' }], // refers to documents.accounts collection item
    token: { type: String, default: '' } // refers to documents.datasets collection item
  },
  { minimize: false }
);

Schema.pre('save', function (next) {
  this.set({ updated_at: new Date().toISOString() });
  return next();
});

module.exports = mongoose.model('Documents', Schema, 'documents');
