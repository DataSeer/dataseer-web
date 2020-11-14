/*
 * @prettier
 */
const mongoose = require('mongoose'),
  Schema = mongoose.Schema;

const OrganisationsSchema = new Schema({
  name: String
});

module.exports = mongoose.model('Organisations', OrganisationsSchema);
