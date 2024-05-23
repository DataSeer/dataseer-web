/*
 * @prettier
 */

'use strict';

const stringSimilarity = require(`string-similarity`);
const accents = require(`remove-accents`);
const natural = require(`natural`);

const GoogleSheets = require(`./googleSheets.js`);

const conf = require(`../conf/software.custom.json`);

const jsonCustomSoftwareList = require(`../resources/jsonCustomSoftwareList.json`);

const tokenizer = new natural.WordTokenizer();
const stopWords = natural.stopwords;

// Regular expression to match all punctuation characters
const punctuationRegex = /[.,!;:\?]/g;

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

// function to remove punctuation
function removePunctuation(str) {
  // Replace all punctuation characters with an empty string
  return str.replace(punctuationRegex, ``);
}

/**
 * Return the current software list
 * @returns {array} List of software
 */
Self.getCustomSoftware = function () {
  return Self.customList.data;
};

/**
 * Return the given software
 * @param {integer} index - Author index
 * @returns {object} Given software or undefined
 */
Self.getCustomSoftwareByIndex = function (index) {
  if (index < 0 || index > Self.customList.data.length - 1) return undefined;
  return Self.customList.data[index];
};

/**
 * Build the software list
 * @returns {array} List of software
 */
Self.buildCustomList = function (data) {
  Self.customList = {
    data: [],
    names: { raw: [] },
    mappings: { name: {} }
  };
  for (let i = 0; i < data.length; i++) {
    let software = data[i];
    let sanitizedName = accents.remove(software.name);
    Self.customList.data.push(software);
    Self.customList.names.raw.push(software.name);
    Self.customList.mappings.name[sanitizedName] = i;
  }
  return Self.customList.data;
};

/**
 * Refresh the software list using the Googel Spreadsheet file
 * @returns {array} List of software
 */
Self.refreshCustomList = function (cb) {
  if (typeof process.env.LOCAL_CUSTOM_SOFTWARE_LIST !== `undefined`)
    return cb(null, Self.buildCustomList(jsonCustomSoftwareList));
  return GoogleSheets.getCustomSoftware(function (err, data) {
    if (err) return cb(err);
    return cb(err, Self.buildCustomList(data));
  });
};

/**
 * Try to find the given software in the software list
 * @param {string} name - Software name
 * @returns {array} List of software found
 */
Self.findSoftwareFromCustomList = function (name) {
  const notFoundError = new Error(`Not found`);
  if (!name) return notFoundError;
  let sanitizedName = accents.remove(name.replace(/\s+/gim, ` `));
  let matches = stringSimilarity.findBestMatch(sanitizedName, Self.customList.names.raw);
  if (matches.bestMatch.rating <= conf.settings.findSoftwareFromCustomList.minRating) return notFoundError;
  return [].concat(
    matches.ratings
      .map((item, i) => {
        return item.rating >= conf.settings.findSoftwareFromCustomList.minRating
          ? { index: i, target: item.item, rating: item.rating }
          : undefined;
      })
      .filter((item) => {
        return typeof item !== `undefined`;
      })
      .map((item) => {
        return Object.assign({}, Self.getCustomSoftwareByIndex(item.index), { rating: item.rating });
      })
  );
};

/**
 * Try to find all software in the given text
 * @param {Object} sentence - Sentence
 * @returns {array} List of software found
 */
Self.extractSoftwareFromSentence = function (sentence) {
  let text = sentence && sentence.text ? sentence.text : undefined;
  let id = sentence && sentence.id ? sentence.id : undefined;
  if (!id) return new Error(`Missing required data: sentence.id`);
  if (!text) return new Error(`Missing required data: sentence.text`);
  let results = Self.extractSoftwareFromText(text);
  return { id, text, matches: results };
};

/**
 * Try to find all software in the given text
 * @param {string} text - Text
 * @returns {array} List of software found
 */
Self.extractSoftwareFromText = function (text) {
  if (!text) return new Error(`Missing required data: text`);
  const chunks = splitTextOnStopWords(text); // Split text into words
  let matches = [];
  for (let i = 0; i < chunks.length; i++) {
    let words = chunks[i];
    let match = {};
    for (let j = 0; j < words.length; j++) {
      for (let k = j + 1; k <= words.length; k++) {
        const chunk = words.slice(j, k).join(` `);
        Self.customList.names.raw.map((softwareName, index) => {
          // const distance = natural.JaroWinklerDistance(chunk, softwareName);
          const nbTokenSoftware = softwareName.split(/\s+/gim).length;
          const nbTokenChunk = k - j;
          const distance = stringSimilarity.compareTwoStrings(chunk, softwareName);
          const score = distance;
          if (score >= conf.settings.extractSoftwareFromText.minScore) {
            if (typeof match[index] === `undefined`) {
              match[index] = {
                matches: [{ chunk: chunk, score: score, distance: distance, nbToken: nbTokenChunk }],
                software: Self.getCustomSoftwareByIndex(index),
                maxScore: score
              };
            } else {
              match[index].matches.push({ chunk: chunk, score: score, distance: distance, nbToken: nbTokenChunk });
              if (match[index].maxScore < score) match[index].maxScore = score;
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
