/*
 * @prettier
 */

'use strict';

const mongoose = require(`mongoose`),
  passportLocalMongoose = require(`passport-local-mongoose`);

const Schema = new mongoose.Schema(
  {
    key: { type: String }
  },
  { minimize: false }
);

module.exports = mongoose.model(`Crud`, Schema, `crud`);
