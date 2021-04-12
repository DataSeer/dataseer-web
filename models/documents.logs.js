/*
 * @prettier
 */

'use strict';

const mongoose = require('mongoose');

let Schema = new mongoose.Schema(
  {
    document: { type: mongoose.Schema.Types.ObjectId, ref: 'Documents', required: true }, // refers to documents collection (id of a given document)
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'Accounts', required: true }, // refers to accounts collection
    action: { type: String, required: true }, // description of modification that has been made to the document
    date: { type: Date, default: Date.now } // date of creation
  },
  { minimize: false }
);

// Populate Accounts data to ensure AccountsManager process
Schema.pre(/^find/, function (next) {
  this.populate({ path: 'user', select: '-tokens' });
  return next();
});

module.exports = mongoose.model('DocumentsLogs', Schema, 'documents.logs');
