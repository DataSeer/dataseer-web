/*
 * @prettier
 */

'use strict';

const _ = require(`lodash`);
const levenshtein = require(`fast-levenshtein`);
const minhash = require(`minhash`);
const tokenizer = require(`sbd`);

const XML = require(`../lib/xml.js`);

const conf = require(`../conf/conf.json`);

let Self = {};

Self.minScore = 0.5;

/**
 * Check & try to correct sentences bounding boxes
 * @param {object} opts - Available options
 * @param {object} opts.metadata - PDF metadata
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: result process)
 * @returns {undefined} undefined
 */
Self.checkSentencesBoundingBoxes = function (opts, cb) {
  // Check required data
  if (typeof _.get(opts, `metadata.sentences`) === `undefined`)
    return cb(new Error(`Missing required data: opts.metadata.sentences`));
  if (typeof _.get(opts, `metadata.pages`) === `undefined`)
    return cb(new Error(`Missing required data: opts.metadata.pages`));
  if (typeof _.get(opts, `metadata.mapping`) === `undefined`)
    return cb(new Error(`Missing required data: opts.metadata.mapping`));
  let pages = {};
  for (let i = 0; i < opts.metadata.mapping.array.length; i++) {
    let id = opts.metadata.mapping.array[i];
    let sentence = opts.metadata.sentences[id];
    let chunks = sentence.chunks;
    for (let j = 0; j < chunks.length; j++) {
      let chunk = chunks[j];
      let yValue = chunk.y + chunk.h / 2;
      if (typeof pages[chunk.p] === `undefined`)
        pages[chunk.p] = {
          yValues: [yValue],
          interline: sentence.areas[0].interlines[chunk.p]
        };
      else if (pages[chunk.p].yValues.indexOf(yValue) === -1) pages[chunk.p].yValues.push(yValue);
    }
  }
  for (let key in pages) {
    let page = pages[key];
    page.yValues = page.yValues.sort(function (a, b) {
      return a - b;
    });
    let yDiffs = [];
    for (let i = 0; i < page.yValues.length - 1; i++) {
      yDiffs.push(page.yValues[i + 1] - page.yValues[i]);
    }
    page.yDiffs = yDiffs;
  }
  return cb(null, pages);
};

/**
 * Check & try to correct sentences content
 * @param {object} opts - Available options
 * @param {object} opts.source - XML containing sentences & metadata & source name
 * @param {string} opts.source.name - XML source (available values: bioRxiv, dataseer)
 * @param {string} opts.source.metadata - XML metadata
 * @param {string} opts.source.content - XML content
 * @returns {array|error} error process or result process
 */
Self.extractDataFromXML = function (opts) {
  if (typeof _.get(opts, `source.name`) === `undefined`) return new Error(`Missing required data: opts.source.name`);
  if (typeof _.get(opts, `source.content`) === `undefined`)
    return new Error(`Missing required data: opts.source.content`);
  let mapping = _.get(opts, `source.metadata.mapping.array`, []);
  let paragraphs = [];
  let $ = XML.load(opts.source.content);
  if (typeof $ === `undefined`) return new Error(`Unable to parse source XML`);
  if (opts.source.name === `bioRxiv`) {
    $(`p[hwp\\:id]`).map(function (index, element) {
      let el = $(element);
      let id = el.attr(`hwp:id`);
      paragraphs.push({
        index: index,
        id: id,
        text: el.text().replace(/\n\s*/gm, ``),
        sentences: tokenizer.sentences(el.text().replace(/\n\s*/gm, ``)).map(function (item, i) {
          return {
            paragraph: { index: index, id: id },
            index: i,
            text: item.lastIndexOf(`.`) !== item.length - 1 ? item + `.` : item
          };
        })
      });
    });
    return paragraphs;
  }
  if (opts.source.name === `dataseer`) {
    let c = 0;
    $(`p`).map(function (index, element) {
      let el = $(element);
      paragraphs.push({
        index: index,
        id: index,
        text: el.text().replace(/\n\s*/gm, ``),
        sentences: el
          .find(`s`)
          .map(function (i, sentence) {
            let el = $(sentence);
            let id = el.attr(`xml:id`);
            let index = !id ? c : mapping.indexOf(id);
            c = c + 1;
            return {
              paragraph: { index: index, id: index },
              index: index,
              id: id,
              text: el.text()
            };
          })
          .get()
      });
    });
    return paragraphs;
  }
  return paragraphs;
};

/**
 * Check & try to correct sentences content
 * @param {object} opts - Available options
 * @param {object} opts.source - XML containing sentences & source & metadata
 * @param {string} opts.source.name - XML source name
 * @param {string} opts.source.metadata - XML metadata
 * @param {string} opts.source.datasets - XML datasets
 * @param {string} opts.source.content - XML content
 * @param {object} opts.target - XML containing sentences & source & metadata
 * @param {string} opts.target.name - XML source name
 * @param {string} opts.source.metadata - XML metadata
 * @param {string} opts.source.datasets - XML datasets
 * @param {string} opts.target.content - XML content
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: result process)
 * @returns {undefined} undefined
 */
Self.checkSentencesContent = function (opts, cb) {
  // Check required data
  if (typeof _.get(opts, `source`) === `undefined`) return cb(new Error(`Missing required data: opts.xml`));
  if (typeof _.get(opts, `source.name`) === `undefined`) return cb(new Error(`Missing required data: opts.xml.name`));
  if (typeof _.get(opts, `source.metadata`) === `undefined`)
    return cb(new Error(`Missing required data: opts.source.metadata`));
  if (typeof _.get(opts, `source.content`) === `undefined`)
    return cb(new Error(`Missing required data: opts.xml.content`));
  if (typeof _.get(opts, `source.metadata.sentences`) === `undefined`)
    return cb(new Error(`Missing required data: opts.source.metadata.sentences`));
  if (typeof _.get(opts, `source.metadata.pages`) === `undefined`)
    return cb(new Error(`Missing required data: opts.source.metadata.pages`));
  if (typeof _.get(opts, `source.metadata.mapping`) === `undefined`)
    return cb(new Error(`Missing required data: opts.source.metadata.mapping`));
  if (typeof _.get(opts, `target.name`) === `undefined`)
    return cb(new Error(`Missing required data: opts.target.name`));
  if (typeof _.get(opts, `target.content`) === `undefined`)
    return cb(new Error(`Missing required data: opts.target.content`));
  let paragraphs = Self.extractDataFromXML({
    source: { name: opts.target.name, content: opts.target.content, metadata: opts.source.metadata }
  });
  let sentences = _.flatten(
    Self.extractDataFromXML({
      source: { name: opts.source.name, content: opts.source.content, metadata: opts.source.metadata }
    }).map(function (item) {
      return item.sentences;
    })
  ).sort(function (a, b) {
    return a.index - b.index;
  });
  /* */
  let target = _.flatten(
    paragraphs.map(function (item) {
      return item.sentences;
    })
  ).sort(function (a, b) {
    return a.index - b.index;
  });
  let source = sentences;
  /* */
  if (!Array.isArray(sentences) || sentences.length <= 0) return cb(null, new Error(`DataSeer sentences not found`));
  let result = {};
  for (let i = 0; i < sentences.length; i++) {
    let key = sentences[i].id;
    let text = sentences[i].text;
    result[key] = [];
    for (let j = 0; j < paragraphs.length; j++) {
      let search = Self.search(text, paragraphs[j]);
      if (search.matches.length > 0)
        result[key].push({
          text: text,
          id: sentences[i].id,
          index: sentences[i].index,
          matches: search.matches,
          paragraph: { index: paragraphs[j].index, id: paragraphs[j].id }
        });
    }
  }
  return cb(null, { result, target, source });
};

/**
 * Check & try to correct sentences content
 * @param {object} opts - Available options
 * @param {object} opts.source - XML containing sentences & source & metadata
 * @param {string} opts.source.name - XML source name
 * @param {string} opts.source.metadata - XML metadata
 * @param {string} opts.source.datasets - XML datasets
 * @param {string} opts.source.content - XML content
 * @param {object} opts.target - XML containing sentences & source & metadata
 * @param {string} opts.target.name - XML source name
 * @param {string} opts.source.metadata - XML metadata
 * @param {string} opts.source.datasets - XML datasets
 * @param {string} opts.target.content - XML content
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: result process)
 * @returns {undefined} undefined
 */
Self.checkSentencesContent = function (opts, cb) {
  // Check required data
  if (typeof _.get(opts, `source`) === `undefined`) return cb(new Error(`Missing required data: opts.xml`));
  if (typeof _.get(opts, `source.name`) === `undefined`) return cb(new Error(`Missing required data: opts.xml.name`));
  if (typeof _.get(opts, `source.metadata`) === `undefined`)
    return cb(new Error(`Missing required data: opts.source.metadata`));
  if (typeof _.get(opts, `source.content`) === `undefined`)
    return cb(new Error(`Missing required data: opts.xml.content`));
  if (typeof _.get(opts, `source.metadata.sentences`) === `undefined`)
    return cb(new Error(`Missing required data: opts.source.metadata.sentences`));
  if (typeof _.get(opts, `source.metadata.pages`) === `undefined`)
    return cb(new Error(`Missing required data: opts.source.metadata.pages`));
  if (typeof _.get(opts, `source.metadata.mapping`) === `undefined`)
    return cb(new Error(`Missing required data: opts.source.metadata.mapping`));
  if (typeof _.get(opts, `target.name`) === `undefined`)
    return cb(new Error(`Missing required data: opts.target.name`));
  if (typeof _.get(opts, `target.content`) === `undefined`)
    return cb(new Error(`Missing required data: opts.target.content`));
  let paragraphs = Self.extractDataFromXML({
    source: { name: opts.target.name, content: opts.target.content, metadata: opts.source.metadata }
  });
  let sentences = _.flatten(
    Self.extractDataFromXML({
      source: { name: opts.source.name, content: opts.source.content, metadata: opts.source.metadata }
    }).map(function (item) {
      return item.sentences;
    })
  ).sort(function (a, b) {
    return a.index - b.index;
  });
  /* */
  let target = _.flatten(
    paragraphs.map(function (item) {
      return item.sentences;
    })
  ).sort(function (a, b) {
    return a.index - b.index;
  });
  let source = sentences;
  /* */
  if (!Array.isArray(sentences) || sentences.length <= 0) return cb(null, new Error(`DataSeer sentences not found`));
  let result = {};
  for (let i = 0; i < sentences.length; i++) {
    let key = sentences[i].id;
    let text = sentences[i].text;
    result[key] = [];
    for (let j = 0; j < paragraphs.length; j++) {
      let search = Self.search(text, paragraphs[j]);
      if (search.matches.length > 0)
        result[key].push({
          text: text,
          id: sentences[i].id,
          index: sentences[i].index,
          matches: search.matches,
          paragraph: { index: paragraphs[j].index, id: paragraphs[j].id }
        });
    }
  }
  return cb(null, { result, target, source });
};

/**
 * Strict match
 * @param {string} search - Searched text
 * @param {string} source - Source text
 * @returns {boolean} Result of strict match (true or false)
 */
Self.strictMatch = function (search, source) {
  return source.split(search).length > 1;
};

/**
 * Strict matches
 * @param {string} search - Searched text
 * @param {array} sources - Sources data (item: an object with a 'text' & 'id' property)
 * @returns {number} Result of soft matches (score between 0 - 1)
 */
Self.strictMatches = function (search, sources) {
  let scores = [];
  // Process match
  for (let i = 0; i < sources.length; i++) {
    let source = sources[i];
    let score = source.text.split(search).length > 1;
    scores.push({ index: source.index, id: source.id, text: source.text, score: score ? 1 : 0 });
  }
  return scores;
};

/**
 * Soft match
 * @param {string} search - Searched text
 * @param {string} source - Source text
 * @returns {number} Result of soft match (between 0 - 1)
 */
Self.softMatch = function (search, source) {
  return source.split(search).length > 1;
};

/**
 * Soft matches
 * @param {string} search - Searched text
 * @param {array} sources - Sources data (item: an object with a 'text' & 'id' property)
 * @returns {number} Result of soft matches (score between 0 - 1)
 */
Self.softMatches = function (search, sources) {
  let hashes = {};
  let scores = [];
  // Create a hash for each set of words to compare
  for (let i = 0; i < sources.length; i++) {
    let source = sources[i];
    let hash = new minhash.Minhash();
    source.text.split(` `).map(function (item) {
      hash.update(item);
    });
    hashes[source.index] = { hash: hash, source: source };
  }
  // Create a hash for the searched text
  let searchHash = new minhash.Minhash();
  search.split(` `).map(function (item) {
    searchHash.update(item);
  });
  // Process match
  for (let key in hashes) {
    let score = searchHash.jaccard(hashes[key].hash);
    scores.push({ index: key, text: hashes[key].source.text, id: hashes[key].source.id, score: score });
  }
  return scores;
};

/**
 * Try to search the text into given paragraph
 * @param {string} search - Searched text
 * @param {object} paragraph - Context of searched text
 * @param {string} paragraph.text - Text of paragraph
 * @param {array} paragraph.sentences - Array of sentences
 * @returns {object} Result of search
 */
Self.search = function (search, paragraph) {
  let result = { score: 0, sentences: { strict: [], soft: [] }, matches: [] };
  // Check sentence is in paragraph (strict)
  if (paragraph && Self.strictMatch(search, paragraph.text)) result.score = 1;
  // TODO : find a way to check sentence is in paragraph (soft)
  // Check sentence is in sentences (strict)
  let strictMatches = Self.strictMatches(search, paragraph.sentences);
  for (let i = 0; i < strictMatches.length; i++) {
    let match = strictMatches[i];
    let res = {
      index: match.index,
      id: match.id,
      text: match.text,
      score: match.score
    };
    if (match.score > 0) result.matches.push(res);
    result.sentences.strict.push(res);
  }
  // Sentence found with strictMatch in paragraph or in sentences
  if (result.score > 0 || result.matches.length > 0) return result;
  // Check sentence is in sentences (soft)
  let softMatches = Self.softMatches(search, paragraph.sentences);
  for (let i = 0; i < softMatches.length; i++) {
    let match = softMatches[i];
    let res = {
      index: match.index,
      id: match.id,
      text: match.text,
      score: match.score
    };
    if (match.score >= Self.minScore) result.matches.push(res);
    result.sentences.soft.push(res);
  }
  return result;
};

module.exports = Self;
