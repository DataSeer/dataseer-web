/*
 * @prettier
 */

'use strict';

const mongoose = require('mongoose');

const Schema = new mongoose.Schema(
  {
    name: { type: String, default: 'None', index: true } // name of organisation
  },
  { minimize: false }
);

module.exports = mongoose.model('Organisations', Schema, 'organisations');
