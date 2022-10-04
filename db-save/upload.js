/*
 * @prettier
 */

'use strict';

const _ = require(`lodash`);
const async = require(`async`);
const path = require(`path`);

const dbSave = require(`../lib/googleDriveSave.js`);

const conf = require(`../conf/save/save.json`);

const args = process.argv.slice(2);
const fileName = args[0];
const day = fileName.replace(`.tar`, ``);
const filePath = path.join(__dirname, fileName);
const folder = conf.folder;
const authFilePath = dbSave.getDailyAuthFilePath(day);

console.log(`Sending .tar file ${filePath} to Google Drive folder: ${folder}`);

dbSave.authenticate(authFilePath);

dbSave.createFile({ folder: folder, erase: true, data: { name: fileName, path: filePath } }, function (err, res) {
  if (err) {
    console.log(`An error has occurred:`);
    console.log(err);
  } else {
    console.log(`Archive saved`);
  }
});
