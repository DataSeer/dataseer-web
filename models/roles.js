/*
 * @prettier
 */

'use strict';

const mongoose = require(`mongoose`);

const Schema = new mongoose.Schema(
  {
    label: { type: String, default: ``, index: true }, // label of role
    key: { type: String, required: true }, // Key of role
    color: { type: String, default: `` }, // Color of role
    weight: { type: Number, default: 0 } // weight of role
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

module.exports = mongoose.model(`Roles`, Schema, `roles`);
