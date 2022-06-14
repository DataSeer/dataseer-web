/*
 * @prettier
 */

'use strict';

const DataseerML = require(`./dataseer-ml.watcher.js`);

const Watchers = function () {
  this.DataseerML = new DataseerML();
  return this;
};

Watchers.prototype.start = function () {
  let keys = Object.keys(this);
  for (let i = 0; i < keys.length; i++) {
    let key = keys[i];
    if (typeof this[key] === `object` && typeof this[key].start === `function`) this[key].start();
  }
};

module.exports = Watchers;
