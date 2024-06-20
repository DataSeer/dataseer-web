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

const urlRegex = /(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/gm;
const versionRegex = /v\d[0-9a-z]{0,}([\.\-\_]{1}[0-9a-z]{0,}){0,}/gim;

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
 * Return the URL extracted from an input string
 * @param {string} inputString - Input string
 * @param {string} name - Software name
 * @returns {string|null} URL extracted or null
 */
Self.extractURL = function (inputString, name) {
  if (typeof inputString !== `string`) return null;
  if (typeof name !== `string`) name = ``;
  let split = name.length > 0 ? inputString.split(name) : [inputString];
  // Only process the right part of the split if there is a match, else take the complete split
  let str = split.length > 1 ? `${name}${split.slice(1).join(name)}` : split[0];
  // Find the first match of the URL in the string
  const matches = str.match(urlRegex);
  // Return the first match if any are found, otherwise return null
  return matches ? matches[0] : null;
};

/**
 * Return the version extracted from an input string
 * @param {string} inputString - Input string
 * @param {string} name - Software name
 * @returns {string|null} Version extracted or null
 */
Self.extractVersion = function (inputString, name) {
  if (typeof inputString !== `string`) return null;
  if (typeof name !== `string`) name = ``;
  let split = name.length > 0 ? inputString.split(name) : [inputString];
  // Only process the right part of the split if there is a match, else take the complete split
  let str = split.length > 1 ? `${name}${split.slice(1).join(name)}` : split[0];
  // Find the first match of the URL in the string
  const matches = str.match(versionRegex);
  // Return the first match if any are found, otherwise return null
  return matches ? matches[0].replace(/^v/gim, ``) : null;
};

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
    software.index = i;
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
        const tokens = words.slice(j, k);
        const tokensText = tokens.join(` `);
        const minTextLength = Math.round(
          tokensText.length - tokensText.length * conf.settings.extractSoftwareFromText.textLengthCoeff
        );
        const maxTextLength = Math.round(
          tokensText.length + tokensText.length * conf.settings.extractSoftwareFromText.textLengthCoeff
        );
        const minTokensLength = tokens.length - conf.settings.extractSoftwareFromText.tokensLengthDelta;
        const maxTokensLength = tokens.length + conf.settings.extractSoftwareFromText.tokensLengthDelta;
        Self.customList.data
          .filter((software) => {
            return (
              (software.name.length <= maxTextLength && software.name.length >= minTextLength) ||
              (software.tokens.length <= maxTokensLength && software.tokens.length >= minTokensLength)
            );
          })
          .map((software) => {
            // const distance = natural.JaroWinklerDistance(chunk, softwareName);
            const nbTokenSoftware = software.name.split(/\s+/gim).length;
            const cert = stringSimilarity.compareTwoStrings(tokensText, software.name);
            const score = cert;
            if (score >= conf.settings.extractSoftwareFromText.minScore) {
              console.log(tokensText, software.name, cert);
              if (typeof match[software.index] === `undefined`) {
                match[software.index] = {
                  matches: [{ tokens: tokens, score: score, cert: cert }],
                  software: Self.getCustomSoftwareByIndex(software.index),
                  maxScore: score
                };
              } else {
                console.log(tokensText, software.name, cert);
                match[software.index].matches.push({ tokens: tokens, score: score, cert: cert });
                if (match[software.index].maxScore < score) match[software.index].maxScore = score;
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
