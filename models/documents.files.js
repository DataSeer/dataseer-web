/*
 * @prettier
 */

const mongoose = require('mongoose');

let Schema = new mongoose.Schema(
  {
    document: { type: mongoose.Schema.Types.ObjectId, ref: 'Documents' }, // refers to documents collection (id of a given document)
    updated_at: { type: Date, default: Date.now }, // date of last update
    uploaded_at: { type: Date, default: Date.now }, // date of upload
    uploaded_by: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' }, // refers to documents.datasets collection item
    metadata: { type: Object, default: {} }, // metadata of file (could be whatever you want, you have to handle it by yourself). Usefull for PDF processed by dataseer-ml
    filename: { type: String, default: '' }, // filename of file
    path: { type: String, default: '', select: false }, // path of file
    encoding: { type: String, default: '' }, // encoding of file
    md5: { type: String, default: '' }, // md5 of file
    mimetype: { type: String, default: '' }, // mimetype of file
    size: { type: Number, default: 0 } // size of file
  },
  { minimize: false }
);

module.exports = mongoose.model('DocumentsFiles', Schema, 'documents.files');
