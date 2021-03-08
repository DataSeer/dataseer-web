/*
 * @prettier
 */

'use strict';

const mongoose = require('mongoose'),
  passportLocalMongoose = require('passport-local-mongoose');

const Schema = new mongoose.Schema(
  {
    fullname: { type: String, default: '', required: true },
    role: { type: mongoose.Schema.Types.ObjectId, ref: 'Roles', required: true }, // refers to roles collection item
    organisation: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisations', required: true }, // refers to organisations collection item
    tokens: { api: { type: String, default: '' }, resetPassword: { type: String, default: '' } } // tokens of user
  },
  { minimize: false }
);

Schema.plugin(passportLocalMongoose);

// Populate Accounts data to ensure AccountsManager process
Schema.pre(/^find/, function (next) {
  this.populate('role');
  this.populate('organisation');
  return next();
});

module.exports = mongoose.model('Accounts', Schema, 'accounts');
