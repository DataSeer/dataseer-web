/*
 * @prettier
 */

'use strict';

const mongoose = require('mongoose');

/*
 * A dataset contains the following data:
 */
let Sentence = new mongoose.Schema(
    {
      id: { type: String, default: '' }, // id
      text: { type: String, default: '' } // text
    },
    { _id: false }
  ),
  Dataset = new mongoose.Schema(
    {
      id: { type: String, default: '' }, // id
      dataInstanceId: { type: String, default: '' }, // dataInstanceId id
      sentences: [Sentence], // sentences
      reuse: { type: Boolean, default: false }, // reuse property
      notification: { type: String, default: '' }, // notification property
      highlight: { type: Boolean, default: false }, // notification property
      cert: { type: String, default: '' }, // cert value (between 0 and 1)
      dataType: { type: String, default: '' }, // dataType
      subType: { type: String, default: '' }, //  subType
      description: { type: String, default: '' }, // description
      bestDataFormatForSharing: { type: String, default: '' }, // best data format for sharing
      bestPracticeForIndicatingReUseOfExistingData: { type: String, default: '' }, // best practice for indicating re-use of existing data
      mostSuitableRepositories: { type: String, default: '' }, // most suitable repositories
      DOI: { type: String, default: '' }, // DOI
      name: { type: String, default: '' }, // name
      comments: { type: String, default: '' }, // comments
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
