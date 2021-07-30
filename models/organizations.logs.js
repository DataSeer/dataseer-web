/*
 * @prettier
 */

'use strict';

const mongoose = require(`mongoose`);

let Schema = new mongoose.Schema(
  {
    target: { type: mongoose.Schema.Types.ObjectId, ref: `Organizations`, required: true }, // refers to documents collection (id of a given document)
    account: { type: mongoose.Schema.Types.ObjectId, ref: `Accounts`, required: true }, // refers to accounts collection
    kind: { type: mongoose.Schema.Types.ObjectId, ref: `Crud`, required: true }, // refers to CRUD collection
    key: { type: String, default: `` }, // A given key
    dates: [{ type: Date }] // date of action
  },
  { minimize: false }
);

module.exports = mongoose.model(`OrganizationsLogs`, Schema, `organizations.logs`);
