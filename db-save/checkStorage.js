/*
 * @prettier
 */

'use strict';

const _ = require(`lodash`);
const async = require(`async`);
const path = require(`path`);

const dbSave = require(`../lib/googleDriveSave.js`);

const args = process.argv.slice(2);
const day = args[0];
const authFilePath = dbSave.getDailyAuthFilePath(day);

dbSave.authenticate(authFilePath);

dbSave.getStorageQuota(function (err, res) {
  if (err) console.log(err);
  console.log(`storageQuota`);
  console.log(res);
});

dbSave.getListOfSaves(function (err, res) {
  if (err) console.log(err);
  console.log(`List of all saves (in the Google Drive folder)`);
  console.log(res);
});

dbSave.getListOfFiles(function (err, res) {
  if (err) console.log(err);
  console.log(`List of all files uploaded by the 'db-save' process`);
  console.log(res);
});
