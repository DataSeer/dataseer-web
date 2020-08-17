/*
 * @prettier
 */
const mongoose = require('mongoose'),
  Schema = mongoose.Schema,
  passportLocalMongoose = require('passport-local-mongoose');

const OrganisationsSchema = new Schema({
  'name': String
});

OrganisationsSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model('Organisations', OrganisationsSchema);
