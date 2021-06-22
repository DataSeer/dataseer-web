/*
 * @prettier
 */

'use strict';

const Self = {};

Self.format = function (date) {
  let d = date instanceof Date ? date : new Date(date),
    month = '' + (d.getMonth() + 1),
    day = '' + d.getDate(),
    year = d.getFullYear();

  if (month.length < 2) month = '0' + month;
  if (day.length < 2) day = '0' + day;

  return [year, month, day].join('-');
};

module.exports = Self;
