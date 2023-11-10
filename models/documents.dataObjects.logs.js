/*
 * @prettier
 */

'use strict';

const mongoose = require(`mongoose`);

const Schema = new mongoose.Schema(
  {
    target: { type: mongoose.Schema.Types.ObjectId, ref: `DocumentsDataObjects`, required: true }, // refers to accounts collection
    account: { type: mongoose.Schema.Types.ObjectId, ref: `Accounts`, required: true }, // refers to accounts collection
    kind: { type: mongoose.Schema.Types.ObjectId, ref: `Crud`, required: true }, // refers to CRUD collection
    date: { type: Date }, // date of action
    state: {} // saved data
  },
  { minimize: false, timestamps: { createdAt: `createdAt`, updatedAt: `updatedAt` } }
);

module.exports = mongoose.model(`DocumentsDataObjectsLogs`, Schema, `documents.dataObjects.logs`);
