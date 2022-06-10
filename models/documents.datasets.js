/*
 * @prettier
 */

'use strict';

const mongoose = require(`mongoose`);

/*
 * A dataset contains the following data:
 */
const Sentence = new mongoose.Schema(
    {
      id: { type: String, default: `` }, // id
      text: { type: String, default: `` } // text
    },
    { _id: false }
  ),
  Issues = new mongoose.Schema(
    {
      author: { type: String, default: `` }, // author
      createdAt: { type: Date, default: Date.now }, // createdAt
      active: { type: [String], default: `` }, // active issues
      comment: { type: String, default: `` } // comment
    },
    { _id: false }
  ),
  Dataset = new mongoose.Schema(
    {
      id: { type: String, default: `` }, // id
      dataInstanceId: { type: String, default: `` }, // dataInstanceId id
      sentences: [Sentence], // sentences
      reuse: { type: Boolean, default: false }, // reuse property
      qc: { type: Boolean, default: false }, // qc property
      representativeImage: { type: Boolean, default: false }, // representativeImage property
      issue: { type: String, default: `` }, // issue property (deprecated)
      issues: { type: Issues, default: null }, // issues property
      notification: { type: String, default: `` }, // notification property
      highlight: { type: Boolean, default: false }, // highlight property
      flagged: { type: Boolean, default: false }, // flagged property
      cert: { type: String, default: `` }, // cert value (between 0 and 1)
      dataType: { type: String, default: `` }, // dataType
      subType: { type: String, default: `` }, //  subType
      description: { type: String, default: `` }, // description
      bestDataFormatForSharing: { type: String, default: `` }, // best data format for sharing
      bestPracticeForIndicatingReUseOfExistingData: { type: String, default: `` }, // best practice for indicating re-use of existing data
      mostSuitableRepositories: { type: String, default: `` }, // most suitable repositories
      protocolSource: { type: String, default: `` }, // protocolSource
      labSource: { type: String, default: `` }, // labSource
      version: { type: String, default: `` }, // version
      PID: { type: String, default: `` }, // PID
      DOI: { type: String, default: `` }, // DOI
      RRID: { type: String, default: `` }, // RRID
      catalog: { type: String, default: `` }, // catalog number
      entity: { type: String, default: `` }, // entity name
      citation: { type: String, default: `` }, // suggested citation
      name: { type: String, default: `` }, // name
      comments: { type: String, default: `` }, // comments
      status: { type: String, default: `saved` } // text of sentence
    },
    { _id: false }
  );

const Schema = new mongoose.Schema(
  {
    document: { type: mongoose.Schema.Types.ObjectId, ref: `Documents` }, // refers to documents collection (id of a given document)
    deleted: [Dataset], // deleted datasets (Array of datasets)
    extracted: [Dataset], // extracted datasets (Array of datasets)
    current: [Dataset] // current datasets (Array of datasets)
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

module.exports = mongoose.model(`DocumentsDatasets`, Schema, `documents.datasets`);
