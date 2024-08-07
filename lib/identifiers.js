/*
 * @prettier
 */

'use strict';

const stringSimilarity = require(`string-similarity`);
const accents = require(`remove-accents`);
const natural = require(`natural`);

const GoogleSheets = require(`./googleSheets.js`);

const conf = require(`../conf/reagents.custom.json`);

const jsonCustomList = require(`../resources/jsonCustomIdentifiersList.json`);

const tokenizer = new natural.WordTokenizer();
const stopWords = natural.stopwords;

let Self = {};

Self.customList = {
  data: [],
  names: {
    raw: []
  },
  mappings: {
    name: {}
  }
};

// Function to remove stopwords and return trimmed sequences of words
function splitTextOnStopWords(text) {
  const words = tokenizer.tokenize(text);
  const filteredWords = words.map((word) => {
    if (stopWords.includes(word.toLowerCase())) return ``;
    return word;
  });
  return regroupNonEmptyStrings(filteredWords);
}

// Function to regroup all non empty string
function regroupNonEmptyStrings(array) {
  const result = [];
  let currentGroup = [];
  array.forEach((element) => {
    if (element.trim().length > 0) {
      // Check if the element is a non-empty string
      currentGroup.push(element);
    } else if (currentGroup.length > 0) {
      result.push(currentGroup);
      currentGroup = [];
    }
  });
  // Add the last group if it's non-empty
  if (currentGroup.length > 0) {
    result.push(currentGroup);
  }
  return result;
}

/**
 * Return the current items list
 * @returns {array} List of items
 */
Self.getAll = function () {
  return Self.customList.data;
};

/**
 * Return the given item
 * @param {integer} index - Author index
 * @returns {object} Given item or undefined
 */
Self.getItemByIndex = function (index) {
  if (index < 0 || index > Self.customList.data.length - 1) return undefined;
  return Self.customList.data[index];
};

/**
 * Build the items list
 * @returns {array} List of items
 */
Self.buildCustomList = function (data) {
  Self.customList = {
    data: [],
    names: { raw: [] },
    mappings: { name: {} }
  };
  for (let i = 0; i < data.length; i++) {
    let item = data[i];
    let sanitizedName = accents.remove(item.name);
    item.index = i;
    Self.customList.data.push(item);
    Self.customList.names.raw.push(item.name);
    Self.customList.mappings.name[sanitizedName] = i;
  }
  return Self.customList.data;
};

/**
 * Refresh the items list using the Googel Spreadsheet file
 * @returns {array} List of items
 */
Self.refreshCustomList = function (cb) {
  if (typeof process.env.LOCAL_CUSTOM_IDENTIFIERS_LIST !== `undefined`)
    return cb(null, Self.buildCustomList(jsonCustomList));
  return GoogleSheets.getCustomIdentifiers(function (err, data) {
    if (err) return cb(err);
    return cb(err, Self.buildCustomList(data));
  });
};

/**
 * Try to find the given item in the items list
 * @param {string} name - Reagent name
 * @returns {array} List of items found
 */
Self.findFromCustomList = function (name, opts = {}) {
  if (!name) return [];
  const notFoundError = new Error(`Not found`);
  if (typeof opts !== `object`) opts = {};
  let contain = false;
  let minScore = conf.settings.findFromCustomList.minRating;
  if (typeof opts.minScore === `number` && minScore >= 0 && minScore <= 1) minScore = opts.minScore;
  if (typeof opts.contain === `boolean`) contain = opts.contain;
  let sanitizedName = accents.remove(name.replace(/\s+/gim, ` `));
  let matches = stringSimilarity.findBestMatch(sanitizedName, Self.customList.names.raw);
  if (!contain && matches.bestMatch.rating <= minScore) return notFoundError;
  let containMatches = [];
  if (contain)
    for (let key in Self.customList.mappings.name) {
      if (key.indexOf(sanitizedName) > -1 || sanitizedName.indexOf(key) > -1) {
        containMatches.push({
          index: Self.customList.mappings.name[key],
          target: Self.getItemByIndex(Self.customList.mappings.name[key]),
          rating: 1
        });
      }
    }
  return containMatches.concat(
    matches.ratings
      .map((item, i) => {
        return item.rating >= minScore ? { index: i, target: item.item, rating: item.rating } : undefined;
      })
      .filter((item) => {
        return typeof item !== `undefined`;
      })
      .map((item) => {
        return Object.assign({}, Self.getItemByIndex(item.index), { rating: item.rating });
      })
  );
};

/**
 * Try to find all items in the given text
 * @param {Object} sentence - Sentence
 * @returns {array} List of items found
 */
Self.extractFromSentence = function (sentence) {
  let text = sentence && sentence.text ? sentence.text : undefined;
  let id = sentence && sentence.id ? sentence.id : undefined;
  if (!id) return new Error(`Missing required data: sentence.id`);
  if (!text) return new Error(`Missing required data: sentence.text`);
  let results = Self.extractFromText(text);
  return { id, text, matches: results };
};

/**
 * Try to find all items in the given text
 * @param {string} text - Text
 * @returns {array} List of items found
 */
Self.extractFromText = function (text) {
  if (!text) return new Error(`Missing required data: text`);
  const chunks = splitTextOnStopWords(text); // Split text into words
  let matches = [];
  for (let i = 0; i < chunks.length; i++) {
    let words = chunks[i];
    let match = {};
    for (let j = 0; j < words.length; j++) {
      for (let k = j + 1; k <= words.length; k++) {
        const tokens = words.slice(j, k);
        const tokensText = tokens.join(` `);
        const minTextLength = Math.round(
          tokensText.length - tokensText.length * conf.settings.extractFromText.textLengthCoeff
        );
        const maxTextLength = Math.round(
          tokensText.length + tokensText.length * conf.settings.extractFromText.textLengthCoeff
        );
        const minTokensLength = tokens.length - conf.settings.extractFromText.tokensLengthDelta;
        const maxTokensLength = tokens.length + conf.settings.extractFromText.tokensLengthDelta;
        Self.customList.data
          .filter((item) => {
            return (
              (item.name.length <= maxTextLength && item.name.length >= minTextLength) ||
              (item.tokens.length <= maxTokensLength && item.tokens.length >= minTokensLength)
            );
          })
          .map((item) => {
            // const distance = natural.JaroWinklerDistance(chunk, itemName);
            const nbToken = item.name.split(/\s+/gim).length;
            const cert = stringSimilarity.compareTwoStrings(tokensText, item.name);
            const score = cert;
            if (score >= conf.settings.extractFromText.minScore) {
              if (typeof match[item.index] === `undefined`) {
                match[item.index] = {
                  matches: [{ tokens: tokens, score: score, cert: cert }],
                  reagent: Self.getItemByIndex(item.index),
                  maxScore: score
                };
              } else {
                match[item.index].matches.push({ tokens: tokens, score: score, cert: cert });
                if (match[item.index].maxScore < score) match[item.index].maxScore = score;
              }
            }
          });
      }
    }
    matches.push(match);
  }
  let results = [];
  for (let i = 0; i < matches.length; i++) {
    for (let key in matches[i]) {
      let result = matches[i][key];
      results.push(result);
    }
  }
  return { text, chunks, matches: results.sort((a, b) => b.cert - a.cert) };
};

module.exports = Self;
