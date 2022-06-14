/*
 * @prettier
 */

'use strict';

const fetch = require(`node-fetch`);

const fs = require(`fs`);
const path = require(`path`);
const child_process = require(`child_process`);

const conf = require(`../conf/dataseer-ml.watcher.json`);

const Watcher = function () {
  this.conf = conf;
  this._interval = undefined; // store interval
  this._restart = false; // true when service is restarting, else false
  Watcher.log(`watcher initialized`);
  return this;
};

Watcher.log = function (data) {
  let date = new Date();
  if (typeof data === `object` || typeof data === `function` || (typeof data === `string` && data.indexOf(`\n`) > -1)) {
    console.log(`${date.toLocaleDateString()} ${date.toLocaleTimeString()} - [DataseerML] | print logs`);
    console.log(`---`);
    console.log(data);
    console.log(`---`);
  } else console.log(`${date.toLocaleDateString()} ${date.toLocaleTimeString()} - [DataseerML] | ${data}`);
};

Watcher.prototype.start = function () {
  let that = this;
  Watcher.log(`start watcher`);
  this.watch();
  this._interval = setInterval(this.watch.bind(that), this.conf.timeout);
};

Watcher.prototype.stop = function () {
  Watcher.log(`stop watcher`);
  if (typeof this._interval !== `undefined`) clearInterval(this._interval);
  this._interval = undefined;
};

Watcher.prototype.restart = function (err) {
  let that = this;
  this.stop(); // stop watcher
  Watcher.log(`restart service`);
  Watcher.log(err);
  this._restart = true;
  return child_process.exec(this.conf.cmd, function (error, stdout, stderr) {
    if (error) Watcher.log(`exec error: ${error}`);
    if (stdout) Watcher.log(`stdout: ${stdout}`);
    if (stderr) Watcher.log(`stderr: ${stderr}`);
    that.start(); // start watcher
    that._restart = false;
  });
};

Watcher.prototype.watch = function () {
  let that = this;
  if (!this._restart)
    return fetch(that.conf.url)
      .then(function (res) {
        // res.status >= 200 && res.status < 300
        if (!res.ok) return that.restart(new Error(`HTTP status ${res.status}`));
      })
      .catch(function (err) {
        return that.restart(err);
      });
};

module.exports = Watcher;
