/*
 * @prettier
 */

'use strict';

const mongoose = require('mongoose');

/*
 * A dataset contains the following data:
 */

let Dataset = new mongoose.Schema(
  {
    id: { type: String, default: '' }, // id
    sentenceId: { type: String, default: '' }, // sentence id
    reuse: { type: Boolean, default: false }, // resuse property
    notification: { type: String, default: '' }, // notification property
    cert: { type: String, default: '' }, // cert value (between 0 and 1)
    dataType: { type: String, default: '' }, // dataType
    subType: { type: String, default: '' }, //  subType
    description: { type: String, default: '' }, // description
    bestDataFormatForSharing: { type: String, default: '' }, // best data format for sharing
    mostSuitableRepositories: { type: String, default: '' }, // most suitable repositories
    DOI: { type: String, default: '' }, // DOI
    name: { type: String, default: '' }, // name
    comments: { type: String, default: '' }, // comments
    text: { type: String, default: '' }, // text of sentence
    status: { type: String, default: 'saved' } // text of sentence
  },
  { _id: false }
);

let Schema = new mongoose.Schema(
  {
    document: { type: mongoose.Schema.Types.ObjectId, ref: 'Documents' }, // refers to documents collection (id of a given document)
    deleted: [Dataset], // deleted datasets (Array of datasets)
    extracted: [Dataset], // extracted datasets (Array of datasets)
    current: [Dataset] // current datasets (Array of datasets)
  },
  { minimize: false }
);

module.exports = mongoose.model('DocumentsDatasets', Schema, 'documents.datasets');
