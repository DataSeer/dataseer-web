/*
 * @prettier
 */

'use strict';

const createReport = require('docx-templates').default;
const cheerio = require('cheerio');

const fs = require('fs');
const path = require('path');

const Self = {};

Self.create = function (data, cb) {
  //Load the docx file as a binary
  return fs.readFile(path.resolve(__dirname, '../conf/report.docx'), 'binary', function (err, content) {
    if (err) return cb(err);
    return createReport({
      template: content,
      data: data
    })
      .then(function (arrayBuffer) {
        return cb(null, Buffer.from(arrayBuffer));
      })
      .catch(function (err) {
        return cb(err);
      });
  });
};

Self.html = function (htmlString) {
  let $ = cheerio.load(htmlString);
  return `${$('p').text()}`;
};

module.exports = Self;
