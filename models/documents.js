/*
 * @prettier
 */
const mongoose = require('mongoose');

let DocumentsSchema = new mongoose.Schema({
  '_id': String,
  'modifiedBy': Object,
  'metadata': Object,
  'datasets': Object,
  'source': String,
  'status': String,
  'isDataSeer': Boolean,
  'updated_at': { 'type': Date, 'default': Date.now }
});

module.exports = mongoose.model('Documents', DocumentsSchema);
