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
const analyzerConf = require(`../conf/analyzer.json`);

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
 * Extract data from XML content (from dataseer or bioRxiv)
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
    $(`text > body > div, text > body > figure`).map(function (_index, _element) {
      let div = $(_element);
      let title = div.find(`head`);
      let pElements = div.find(`p`);
      if (pElements.length === 0) {
        let el = title.find(`s`);
        let id = el.attr(`xml:id`);
        let __index = !id ? c : mapping.indexOf(id);
        c = c + 1;
        paragraphs.push({
          index: `${_index}`,
          id: `${_index}`,
          text: title.text().replace(/\n\s*/gm, ``),
          sentences: [
            {
              paragraph: { index: __index, id: __index },
              index: __index,
              id: id,
              text: el.text()
            }
          ]
        });
      } else {
        pElements.map(function (index, element) {
          let el = $(element);
          let paragraph = {
            index: `${_index}:${index}`,
            id: `${_index}:${index}`,
            text: title.text().replace(/\n\s*/gm, ``) + el.text().replace(/\n\s*/gm, ``),
            sentences: []
          };
          let elements = [];
          if (index === 0) elements = elements.concat(title.find(`s`).get());
          elements = elements.concat(el.find(`s`).get());
          let sentences = elements.map(function (sentence, i) {
            let el = $(sentence);
            let id = el.attr(`xml:id`);
            let __index = !id ? c : mapping.indexOf(id);
            c = c + 1;
            return {
              paragraph: { index: __index, id: __index },
              index: __index,
              id: id,
              text: el.text()
            };
          });
          paragraph.sentences = paragraph.sentences.concat(sentences);
          paragraphs.push(paragraph);
        });
      }
    });
    return paragraphs;
  }
  return paragraphs;
};

/**
 * Check & try to find dataObjects in TEI content
 * @param {object} opts - Available options
 * @param {object} opts.tei - XML containing sentences & source & metadata
 * @param {string} opts.tei.name - XML source name
 * @param {string} opts.tei.metadata - XML metadata
 * @param {string} opts.tei.dataObjects - XML dataObjects
 * @param {string} opts.tei.content - XML content
 * @param {array} opts.dataObjects - DataObjects content
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: result process)
 * @returns {undefined} undefined
 */
Self.checkDataObjectsInTEI = function (opts, cb) {
  // Check required data
  if (typeof _.get(opts, `tei`) === `undefined`) return cb(new Error(`Missing required data: opts.xml`));
  if (typeof _.get(opts, `tei.name`) === `undefined`) return cb(new Error(`Missing required data: opts.xml.name`));
  if (typeof _.get(opts, `tei.metadata`) === `undefined`)
    return cb(new Error(`Missing required data: opts.tei.metadata`));
  if (typeof _.get(opts, `tei.content`) === `undefined`)
    return cb(new Error(`Missing required data: opts.xml.content`));
  if (typeof _.get(opts, `tei.metadata.sentences`) === `undefined`)
    return cb(new Error(`Missing required data: opts.tei.metadata.sentences`));
  if (typeof _.get(opts, `tei.metadata.pages`) === `undefined`)
    return cb(new Error(`Missing required data: opts.tei.metadata.pages`));
  if (typeof _.get(opts, `tei.metadata.mapping`) === `undefined`)
    return cb(new Error(`Missing required data: opts.tei.metadata.mapping`));
  if (typeof _.get(opts, `dataObjects`) === `undefined`)
    return cb(new Error(`Missing required data: opts.dataObjects`));
  let paragraphs = Self.extractDataFromXML({
    source: { name: opts.tei.name, content: opts.tei.content, metadata: opts.tei.metadata }
  });
  let sentences = _.flatten(
    opts.dataObjects.map(function (dataset) {
      return dataset.sentences.map(function (sentence) {
        return {
          dataset: dataset,
          sentence: sentence
        };
      });
    })
  );
  if (!Array.isArray(sentences) || sentences.length <= 0) return cb(null, new Error(`dataObjects sentences not found`));
  let mapping = {};
  for (let i = 0; i < sentences.length; i++) {
    let sentence = sentences[i].sentence;
    let dataset = sentences[i].dataset;
    if (typeof mapping[dataset.id] === `undefined`) mapping[dataset.id] = { dataset: dataset, searches: [] };
    for (let j = 0; j < paragraphs.length; j++) {
      let search = Self.search(sentence.text, paragraphs[j]);
      if (search.matches.length > 0)
        mapping[dataset.id].searches.push({
          id: sentence.id,
          text: sentence.text,
          matches: search.matches,
          paragraph: { index: paragraphs[j].index, id: paragraphs[j].id }
        });
    }
  }
  let dataObjects = { mergeable: [], rejected: [] };
  for (let id in mapping) {
    let searches = mapping[id].searches;
    let dataset = Object.assign({}, mapping[id].dataset, { id: null, dataInstanceId: null, sentences: [] });
    if (searches.length > 0) {
      for (let i = 0; i < searches.length; i++) {
        let sentence = searches[i];
        if (sentence.matches.length >= 1) {
          for (let i = 0; i < sentence.matches.length; i++) {
            if (sentence.matches[i].score > Self.minScore) {
              dataset.sentences.push({
                id: sentence.matches[i].id,
                text: sentence.matches[i].text,
                cert: sentence.matches[i].score
              });
            }
          }
        }
      }
      if (dataset.sentences.length > 0) dataObjects.mergeable.push(dataset);
      else dataObjects.rejected.push(mapping[id].dataset);
    } else dataObjects.rejected.push(mapping[id].dataset);
  }
  return cb(null, dataObjects);
};

/**
 * Check & try to correct sentences content
 * @param {object} opts - Available options
 * @param {object} opts.source - XML containing sentences & source & metadata
 * @param {string} opts.source.name - XML source name
 * @param {string} opts.source.metadata - XML metadata
 * @param {string} opts.source.dataObjects - XML dataObjects
 * @param {string} opts.source.content - XML content
 * @param {object} opts.target - XML containing sentences & source & metadata
 * @param {string} opts.target.name - XML source name
 * @param {string} opts.source.metadata - XML metadata
 * @param {string} opts.source.dataObjects - XML dataObjects
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
  let tokens = search.split(/\s+/gm);
  // Process match
  for (let i = 0; i < sources.length; i++) {
    let source = sources[i];
    let notTooMuchSizeDiff = source.text.split(/\s+/gm).length <= tokens.length * 2;
    let score = source.text.split(search).length > 1;
    scores.push({ index: source.index, id: source.id, text: source.text, score: score && notTooMuchSizeDiff ? 1 : 0 });
  }
  return scores;
};

/**
 * Soft match
 * @param {string} search - Searched text
 * @param {string} source - Source text
 * @param {number} source - Source text
 * @returns {boolean} Result of soft match (true/false)
 */
Self.softMatch = function (search, source, score = 0.8) {
  let hash = new minhash.Minhash();
  // Create a hash for the source text
  source.split(` `).map(function (item) {
    hash.update(item);
  });
  // Create a hash for the searched text
  let searchHash = new minhash.Minhash();
  search.split(` `).map(function (item) {
    searchHash.update(item);
  });
  return searchHash.jaccard(hash) >= score;
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
  let tokens = search.split(/\s+/gm);
  // Create a hash for each set of words to compare
  for (let i = 0; i < sources.length; i++) {
    let source = sources[i];
    let notTooMuchSizeDiff = source.text.split(/\s+/gm).length <= tokens.length * 2;
    if (notTooMuchSizeDiff) {
      let hash = new minhash.Minhash();
      source.text.split(` `).map(function (item) {
        hash.update(item);
      });
      hashes[source.index] = { hash: hash, source: source };
    }
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

/**
 * Try to search the text into given paragraph
 * @param {integer} numPage - Page number
 * @param {array} sentences - List of sentences
 * @param {object} mapping - Mapping of existing sentences
 * @param {array} paragraph.sentences - Array of sentences
 * @returns {array} list of new sentence
 */
Self.getNewSentencesOfPage = function (numPage, sentences = [], mapping = {}) {
  if (isNaN(numPage)) return new Error(`Bad value : numPage must be an integer`);
  if (!Array.isArray(sentences)) return new Error(`Bad value : sentences must be an array`);
  if (typeof mapping.pages !== `object`) return new Error(`Bad value : mapping must have a "pages" property`);
  if (typeof mapping.sentences !== `object`) return new Error(`Bad value : mapping must have a "sentences" property`);
  if (typeof mapping.pages[numPage] !== `object`) return sentences; // Case there is no available mapping for this page
  let results = [];
  let chunks = [];
  // Build chunks (existing sentences chunks)
  for (let key in mapping.pages[numPage].sentences) {
    chunks = chunks.concat(
      _.flatten(
        _.get(mapping.sentences[key], `chunks`, [])
          .filter(function (chunk) {
            return chunk.p === numPage;
          })
          .map(function (chunk) {
            return { x0: chunk.x, x1: chunk.x + chunk.w, y0: chunk.y, y1: chunk.y + chunk.h };
          })
      )
    );
  }
  // Check sentences do not already exist
  for (let i = 0; i < sentences.length; i++) {
    let isNewSentence = true;
    let sentence = sentences[i];
    for (let j = 0; j < chunks.length; j++) {
      let chunk = chunks[j];
      let overlap = getIntersectingRectangle(sentence.bbox, chunk);
      if (typeof overlap === `object`) {
        const coeff =
          ((overlap.x1 - overlap.x0) * (overlap.y1 - overlap.y0)) /
          ((sentence.bbox.x1 - sentence.bbox.x0) * (sentence.bbox.y1 - sentence.bbox.y0));
        if (coeff > analyzerConf.minimumPercentageOfOverlapArea) {
          isNewSentence = false;
          continue;
        }
      }
    }
    if (isNewSentence) results.push(sentence);
  }
  return results;
};

/**
 * Try to regroup words into paragraphs
 * @param {array} lines - List of lines
 * @returns {array} list of paragraph
 */
Self.buildParagraphs = function (lines = []) {
  let paragraphs = [];
  let _lines = lines
    .map(function (item) {
      let copy = Object.assign(item, {});
      copy.bbox.yAvg = (copy.bbox.y1 - copy.bbox.y0) / 2; // y center
      copy.interWords = { data: [], avg: 0, median: 0 };
      for (let i = 0; i < copy.words.length - 1; i++) {
        copy.interWords.data.push(copy.words[i + 1].bbox.yAvg - copy.words[i].bbox.yAvg);
      }
      copy.avg = average(copy.interWords.data);
      copy.median = median(copy.interWords.data);
      return copy;
    })
    .sort(function (a, b) {
      return a.bbox.yAvg - b.bbox.yAvg;
    });
  let interLines = { data: [], avg: 0 };
  for (let i = 0; i < _lines.length - 1; i++) {
    interLines.data.push(_lines[i + 1].bbox.yAvg - _lines[i].bbox.yAvg);
  }
  interLines.avg = average(interLines.data);
  console.log(interLines, _lines);
};

// https://codereview.stackexchange.com/questions/185323/find-the-intersect-area-of-two-overlapping-rectangles
/**
 * Returns intersecting part of two rectangles
 * @param  {object}  r1 4 coordinates in form of {x0, y0, x1, y1} object
 * @param  {object}  r2 4 coordinates in form of {x0, y0, x1, y1} object
 * @return {boolean}    False if there's no intersecting part
 * @return {object}     4 coordinates in form of {x0, y0, x1, y1} object
 */
const getIntersectingRectangle = (r1, r2) => {
  [r1, r2] = [r1, r2].map((r) => {
    return {
      x: [r.x0, r.x1].sort((a, b) => a - b),
      y: [r.y0, r.y1].sort((a, b) => a - b)
    };
  });
  const noIntersect = r2.x[0] > r1.x[1] || r2.x[1] < r1.x[0] || r2.y[0] > r1.y[1] || r2.y[1] < r1.y[0];
  return noIntersect
    ? false
    : {
      x0: Math.max(r1.x[0], r2.x[0]), // _[0] is the lesser,
      y0: Math.max(r1.y[0], r2.y[0]), // _[1] is the greater
      x1: Math.min(r1.x[1], r2.x[1]),
      y1: Math.min(r1.y[1], r2.y[1])
    };
};

const average = (array = []) => (array.length === 0 ? undefined : array.reduce((a, b) => a + b) / array.length);
const median = function (array = []) {
  if (array.length === 0) return undefined;
  array.sort(function (a, b) {
    return a - b;
  });
  let half = Math.floor(array.length / 2);
  if (array.length % 2) return array[half];
  return (array[half - 1] + array[half]) / 2.0;
};

module.exports = Self;
