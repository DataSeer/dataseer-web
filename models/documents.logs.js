/*
 * @prettier
 */

'use strict';

const mongoose = require(`mongoose`);

const Schema = new mongoose.Schema(
  {
    target: { type: mongoose.Schema.Types.ObjectId, ref: `Documents`, required: true }, // refers to documents collection (id of a given document)
    account: { type: mongoose.Schema.Types.ObjectId, ref: `Accounts`, required: true }, // refers to accounts collection
    kind: { type: mongoose.Schema.Types.ObjectId, ref: `Crud`, required: true }, // refers to CRUD collection
    key: { type: String, default: `` }, // A given key
    dates: [{ type: Date }] // date of action
  },
  { minimize: false, timestamps: { createdAt: `createdAt`, updatedAt: `updatedAt` } }
);

module.exports = mongoose.model(`DocumentsLogs`, Schema, `documents.logs`);
