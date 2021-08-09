/*
 * @prettier
 */

'use strict';

const mongoose = require(`mongoose`);

const Schema = new mongoose.Schema(
  {
    target: { type: mongoose.Schema.Types.ObjectId, ref: `Roles`, required: true }, // refers to accounts collection
    account: { type: mongoose.Schema.Types.ObjectId, ref: `Accounts`, required: true }, // refers to accounts collection
    kind: { type: mongoose.Schema.Types.ObjectId, ref: `Crud`, required: true }, // refers to CRUD collection
    key: { type: String, default: `` }, // A given key
    dates: [{ type: Date }] // date of action
  },
  { minimize: false }
);

module.exports = mongoose.model(`RolesLogs`, Schema, `roles.logs`);
