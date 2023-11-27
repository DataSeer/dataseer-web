/*
 * @prettier
 */

'use strict';

const mongoose = require(`mongoose`);

const Action = new mongoose.Schema({ enabled: { type: Boolean }, isDefault: { type: Boolean } }, { _id: false });

const Settings = new mongoose.Schema(
  {
    reports: {
      templates: [
        {
          label: { type: String },
          enabled: { type: Boolean },
          isDefault: { type: Boolean },
          actions: {
            'open': { type: Action },
            'generate': { type: Action }
          }
        }
      ]
    },
    upload: {
      alreadyProcessed: { type: Boolean, default: false },
      removeResponseToViewerSection: { type: Boolean, default: false },
      dataseerML: { type: Boolean, default: true },
      softcite: { type: Boolean, default: false },
      importDataFromSoftcite: { type: Boolean, default: false },
      ignoreSoftCiteCommandLines: { type: Boolean, default: false },
      ignoreSoftCiteSoftware: { type: Boolean, default: false },
      bioNLP: { type: Boolean, default: false },
      importDataFromBioNLP: { type: Boolean, default: false },
      mute: { type: Boolean, default: false },
      mergePDFs: { type: Boolean, default: true }
    }
  },
  { _id: false }
);

const Schema = new mongoose.Schema(
  {
    name: { type: String, default: `None`, required: true, unique: true }, // name of organization
    color: { type: String, default: `` }, // Color of organization
    visible: { type: Boolean, default: true, require: true },
    settings: { type: Settings }
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

module.exports = mongoose.model(`Organizations`, Schema, `organizations`);
