/*
 * @prettier
 */

'use strict';

const mongoose = require(`mongoose`);
const passportLocalMongoose = require(`passport-local-mongoose`);

const Schema = new mongoose.Schema(
  {
    fullname: { type: String, default: `` },
    role: { type: mongoose.Schema.Types.ObjectId, ref: `Roles`, required: true }, // refers to roles collection item
    organizations: [{ type: mongoose.Schema.Types.ObjectId, ref: `Organizations`, required: true }], // refers to organizations collection item
    tokens: { api: { type: String, default: `` }, resetPassword: { type: String, default: `` } }, // tokens of user
    visible: { type: Boolean, default: true, required: true },
    disabled: { type: Boolean, default: false }
  },
  { minimize: false, timestamps: { createdAt: `createdAt`, updatedAt: `updatedAt` } }
);

Schema.plugin(passportLocalMongoose);

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

module.exports = mongoose.model(`Accounts`, Schema, `accounts`);
