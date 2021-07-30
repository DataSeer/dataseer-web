/*
 * @prettier
 */

'use strict';

const mongoose = require(`mongoose`);

let Schema = new mongoose.Schema(
  {
    date: { type: Date, default: Date.now }, // date of upload
    account: { type: mongoose.Schema.Types.ObjectId, ref: `Accounts` }, // refers to documents.datasets collection item
    organizations: [{ type: mongoose.Schema.Types.ObjectId, ref: `Organizations` }]
  },
  { minimize: false, _id: false }
);

module.exports = Schema;
