/*
 * @prettier
 */
const mongoose = require('mongoose'),
  Schema = mongoose.Schema,
  passportLocalMongoose = require('passport-local-mongoose');

const Accounts = new Schema({
  'role': Object,
  'organisation': String,
  'token': String
});

Accounts.plugin(passportLocalMongoose);

module.exports = mongoose.model('Accounts', Accounts);
