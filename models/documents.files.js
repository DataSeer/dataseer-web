/*
 * @prettier
 */

'use strict';

const mongoose = require(`mongoose`);

const uploadSchema = require(`./schemas/upload.js`);

const Schema = new mongoose.Schema(
  {
    document: { type: mongoose.Schema.Types.ObjectId, ref: `Documents` }, // refers to documents collection (id of a given document)
    metadata: { type: Object, default: {} }, // metadata of file (could be whatever you want, you have to handle it by yourself). Usefull for PDF processed by dataseer-ml
    filename: { type: String, default: `` }, // filename (on the FileSystem)
    name: { type: String, default: `` },
    path: { type: String, default: ``, select: false }, // path of file (on the FileSystem)
    encoding: { type: String, default: `` }, // encoding of file
    md5: { type: String, default: `` }, // md5 of file
    mimetype: { type: String, default: `` }, // mimetype of file
    size: { type: Number, default: 0 }, // size of file
    upload: uploadSchema
  },
  { minimize: false, timestamps: { createdAt: `createdAt`, updatedAt: `updatedAt` } }
);

Schema.pre(/^find/, function (next) {
  this.populate(`organizations`);
  this.populate(`upload.organization`);
  return next();
});

const versionHook = function () {
  const update = this.getUpdate();
  if (update.__v != null) {
    delete update.__v;
  }
  const keys = [`$set`, `$setOnInsert`];
  for (const key of keys) {
    if (update[key] != null && update[key].__v != null) {
      delete update[key].__v;
      if (Object.keys(update[key]).length === 0) {
        delete update[key];
      }
    }
  }
  update.$inc = update.$inc || {};
  update.$inc.__v = 1;
};

Schema.pre(`save`, function (next) {
  this.increment();
  return next();
});

Schema.pre(`findOneAndUpdate`, versionHook);
Schema.pre(`update`, versionHook);

module.exports = mongoose.model(`DocumentsFiles`, Schema, `documents.files`);
