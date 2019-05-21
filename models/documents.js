var mongoose = require('mongoose');

var DocumentsSchema = new mongoose.Schema({
  _id: String,
  metadata: Object,
  status: String,
  isDataSeer: Boolean,
  xhtml: String,
  datasets: Object,
  updated_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Documents', DocumentsSchema);