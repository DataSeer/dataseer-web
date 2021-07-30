/*
 * @prettier
 */

'use strict';

const cheerio = require(`cheerio`);

let Self = {};

/**
 * Get text of an HTML string
 * @param {string} htmlString - HTML string
 * @returns {string} text
 */
Self.getText = function (htmlString, selector = `p`) {
  let $ = cheerio.load(htmlString);
  return `${$(selector).text()}`;
};

module.exports = Self;
