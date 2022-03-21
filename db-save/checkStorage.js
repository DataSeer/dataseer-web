/*
 * @prettier
 */

'use strict';

const _ = require(`lodash`);
const async = require(`async`);
const path = require(`path`);
const { google } = require(`googleapis`);

const googleAPICredentials = require(`../conf/services/googleAPICredentials.json`);
const conf = require(`../conf/reports.json`);

const auth = new google.auth.GoogleAuth({
  keyFile: path.join(__dirname, `../conf/services/googleAPICredentials.json`),
  scopes: [
    `https://www.googleapis.com/auth/cloud-platform`,
    `https://www.googleapis.com/auth/drive`,
    `https://www.googleapis.com/auth/drive.file`,
    `https://www.googleapis.com/auth/spreadsheets`
  ]
});

const drive = google.drive({
  version: `v3`,
  auth: auth
});

const gSheets = google.sheets({ version: `v4`, auth });

drive.about.get({ fields: `storageQuota` }, function (err, res) {
  console.log(err, res.data);
});

let pageToken = null;
return async.doWhilst(
  function (callback) {
    return drive.files.list(
      {
        q: "mimeType='application/x-tar'",
        fields: `nextPageToken,files(id, mimeType, name, parents, size)`,
        spaces: `drive`,
        pageToken: pageToken
      },
      function (err, res) {
        // Handle error
        if (err) return callback(err);
        if (Array.isArray(res.data.files) && res.data.files.length > 0) {
          console.log(res.data.files);
        }
        pageToken = res.data.nextPageToken;
        return callback();
      }
    );
  },
  function (callback) {
    return callback(null, !!pageToken);
  },
  function (err) {
    // Handle error
    console.log(err);
  }
);
