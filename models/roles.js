/*
 * @prettier
 */

'use strict';

const mongoose = require('mongoose');

let Schema = new mongoose.Schema(
  {
    label: { type: String, default: '', index: true }, // label of role
    weight: { type: Number, default: 0 } // weight of role
  },
  { minimize: false }
);

module.exports = mongoose.model('Roles', Schema, 'roles');
