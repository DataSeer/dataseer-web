/*
 * @prettier
 */

'use strict';

const mongoose = require(`mongoose`);

const Schema = new mongoose.Schema(
  {
    key: { type: String }
  },
  { minimize: false }
);

module.exports = mongoose.model(`Crud`, Schema, `crud`);
