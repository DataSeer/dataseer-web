/*
 * @prettier
 */

'use strict';

const _ = require(`lodash`);
const async = require(`async`);
const path = require(`path`);

const dbSave = require(`../lib/googleDriveSave.js`);

console.log(`Clear Google Drive storage...`);
dbSave.getListOfFiles(function (err, files) {
  if (err) console.log(err);
  console.log(`deleting ${files.length} file(s)...`);
  return async.mapSeries(
    files,
    function (item, next) {
      console.log(`deleting ${item.name} (${item.id})...`);
      return dbSave._deleteFile({ folder: item.parents[0], data: { fileId: item.id } }, function (err) {
        return next(err);
      });
    },
    function (err) {
      if (err) console.log(err);
      console.log(`Done`);
    }
  );
});
