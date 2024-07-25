/*
 * @prettier
 */

'use strict';

const mongoose = require(`mongoose`);

const Sentence = new mongoose.Schema(
  {
    id: { type: String, default: `` }, // id
    text: { type: String, default: `` } // text
  },
  { _id: false }
);

const Issues = new mongoose.Schema(
  {
    author: { type: String, default: `` }, // author
    createdAt: { type: Date, default: Date.now } // createdAt
  },
  { _id: false }
);

const Schema = new mongoose.Schema(
  {
    document: { type: mongoose.Schema.Types.ObjectId, ref: `Documents` }, // refers to documents collection (id of a given document)
    extracted: { type: Boolean, default: false }, // extracted
    deleted: { type: Boolean, default: false }, // deleted
    // "Technical" properties
    dataInstanceId: { type: String, default: `` }, // dataInstanceId id
    kind: { type: String, default: `unknow` }, // kind of the data object - available values : 'unknow', 'dataset', code', 'software', 'reagent', 'protocol'
    flagged: { type: Boolean, default: false }, // flagged property
    cert: { type: String, default: `` }, // cert value (between 0 and 1)
    rule: { type: String, default: `` }, // rule used for the status of the data object
    rules: {}, // all rules
    status: { type: String, default: `` }, // status of the data object
    actionRequired: { type: String, default: `` }, // actionRequired of the data object - available values : 'Yes', 'No', Optionnal', "unknow"
    index: { type: Number, default: undefined }, // index - index value to allow custom sorting (default index is the order of appearance of the sentence in the PDF)
    // "Shared" properties
    name: { type: String, default: `` }, // name
    dataType: { type: String, default: `` }, // dataType
    subType: { type: String, default: `` }, //  subType
    reuse: { type: Boolean, default: false }, // reuse property
    DOI: { type: String, default: `` }, // DOI
    comments: { type: String, default: `` }, // comments
    associatedReference: { type: String, default: `` }, // associated reference
    // - "Suggested" properties
    suggestedEntity: { type: String, default: `` },
    suggestedURL: { type: String, default: `` },
    suggestedRRID: { type: String, default: `` },
    // - "Issues" properties
    issues: { type: Issues, default: null }, // issues property
    // - "Sentences" properties
    sentences: [Sentence], // sentences
    // "Datasets", Protocols, "Code" & "Software" properties only
    URL: { type: String, default: `` }, // version
    // "Datasets" properties only
    qc: { type: Boolean, default: false }, // qc property
    representativeImage: { type: Boolean, default: false }, // representativeImage property
    PID: { type: String, default: `` }, // PID
    associatedFigureOrTable: { type: String, default: `` }, // associated figure or table
    // "Code" & "Software" properties only
    version: { type: String, default: `` }, // version
    // "Materials" properties only
    catalogNumber: { type: String, default: `` }, // catalog number
    source: { type: String, default: `` }, // catalog number
    // "Code" & "Software" & "Materials" properties only
    RRID: { type: String, default: `` } // RRID
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

module.exports = mongoose.model(`DocumentsDataObjects`, Schema, `documents.dataObjects`);
