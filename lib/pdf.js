/*
 * @prettier
 */

'use strict';

// Representation of a chunk in PDF
const Chunk = function (data) {
  this.x = Math.floor(parseFloat(data.x));
  this.y = Math.floor(parseFloat(data.y));
  this.w = Math.ceil(parseFloat(data.w));
  this.h = Math.ceil(parseFloat(data.h));
  this.p = parseInt(data.p, 10);
  return this;
};

// Representation of a line in PDF
const Line = function (first) {
  this.chunks = [];
  this.h = 0;
  this.w = 0;
  this.yMid = { sum: 0, coeff: 0, avg: 0 };
  this.min = { x: Infinity, y: Infinity };
  this.max = { x: -Infinity, y: -Infinity };
  this.p = undefined;
  if (typeof first !== 'undefined') this.addChunk(first);
  return this;
};

// Get all chunks of this Line
Line.prototype.chunks = function () {
  return this.chunks;
};

// Add chunk to this line
Line.prototype.addChunk = function (input) {
  let chunk = input instanceof Chunk ? input : new Chunk(input),
    xMin = chunk.x,
    xMax = chunk.x + chunk.w,
    yMin = chunk.y,
    yMax = chunk.y + chunk.h;
  if (this.min.x > xMin) this.min.x = xMin;
  if (this.max.x < xMax) this.max.x = xMax;
  if (this.min.y > yMin) this.min.y = yMin;
  if (this.max.y < yMax) this.max.y = yMax;
  this.yMid.sum += (chunk.y + chunk.h / 2) * chunk.w;
  this.yMid.coeff += chunk.w;
  this.yMid.avg = this.yMid.sum / this.yMid.coeff;
  this.w = this.max.x - this.min.x;
  this.h = this.max.y - this.min.y;
  if (typeof this.p === 'undefined') this.p = chunk.p;
  this.chunks.push(chunk);
};

// Check if a chunk is in this line
Line.prototype.isIn = function (chunk) {
  if (this.chunks.length <= 0) return true; // If there is no chunk, it will be "in" by default
  let xMin = chunk.x,
    xMax = chunk.x + chunk.w,
    yMin = chunk.y,
    yMax = chunk.y + chunk.h,
    yMiddle = chunk.y + chunk.h / 2,
    samePage = this.p === chunk.p,
    outY = yMiddle > this.max.y || yMiddle < this.min.y,
    outX = xMax < this.min.x;
  return samePage && !outY && !outX;
};

// Representation of multipes lines in PDF (atteched to a given sentence)
const Lines = function (chunks) {
  this.collection = [new Line()];
  if (Array.isArray(chunks)) this.addChunks(chunks);
  return this;
};

// Get of all lines
Lines.prototype.all = function () {
  return this.collection;
};

// Get last line
Lines.prototype.getLast = function () {
  return this.collection[this.collection.length - 1];
};

// Create a new line
Lines.prototype.newLine = function (chunk) {
  return this.collection.push(new Line(chunk));
};

// Add chunk to this group of lines
Lines.prototype.addChunks = function (chunks = []) {
  for (let i = 0; i < chunks.length; i++) {
    let line = this.getLast(),
      item = chunks[i],
      chunk = new Chunk(item);
    if (line.isIn(chunk)) line.addChunk(chunk);
    else this.newLine(chunk);
  }
};

// Represent an Area
const Area = function (opts, first) {
  this.lines = [];
  this.sentence = { id: opts.sentence.id };
  this.h = 0;
  this.w = 0;
  this.min = { x: Infinity, y: Infinity };
  this.max = { x: -Infinity, y: -Infinity };
  this.p = undefined;
  if (typeof first !== 'undefined') this.addLine(first);
  return this;
};

// Get All lines of this Area
Area.prototype.getLines = function () {
  return this.lines;
};

// Add line to this Area
Area.prototype.addLine = function (line) {
  let xMin = line.min.x,
    xMax = line.min.x + line.w,
    yMin = line.min.y,
    yMax = line.min.y + line.h;
  if (this.min.x > xMin) this.min.x = xMin;
  if (this.max.x < xMax) this.max.x = xMax;
  if (this.min.y > yMin) this.min.y = yMin;
  if (this.max.y < yMax) this.max.y = yMax;
  this.w = this.max.x - this.min.x;
  this.h = this.max.y - this.min.y;
  if (typeof this.p === 'undefined') this.p = line.p;
  this.lines.push(line);
};

// Check if line is next to this Area
Area.prototype.isNext = function (line, margin) {
  if (this.lines.length === 0) return true; // If there is no lines, it will be "next" by default
  let middle = line.min.y + line.h / 2,
    delta = typeof margin !== 'undefined' ? margin : line.h,
    samePage = this.p === line.p,
    isTooUnder = middle - delta > this.max.y,
    isTooUpper = middle + delta < this.min.y;
  return samePage && !isTooUpper && !isTooUnder;
};

// Represent a group of Areas
const Areas = function (paragraph, interlines) {
  this.collection = [];
  this.sentence = { id: paragraph.sentence.id };
  this.interlines = interlines;
  this.newArea();
  if (Array.isArray(paragraph.lines)) this.addLines(paragraph.lines);
  return this;
};

// Create a new Area
Areas.prototype.newArea = function (line) {
  return this.collection.push(new Area({ sentence: { id: this.sentence.id } }, line));
};

// Get Last Area
Areas.prototype.getLast = function () {
  return this.collection[this.collection.length - 1];
};

// Get all Areas
Areas.prototype.all = function () {
  return this.collection;
};

// Add Lines to Areas
Areas.prototype.addLines = function (lines = []) {
  for (let i = 0; i < lines.length; i++) {
    let area = this.getLast(),
      line = lines[i];
    if (area.isNext(line, this.interlines[lines[i].p])) area.addLine(line);
    else this.newArea(line);
  }
};

// Build columns
const buildColumns = function (boxes = [], numPage) {
    let result = [],
      columns = {},
      stats = {
        min: { x: Infinity },
        max: { x: -Infinity },
        avg: { h: 0, w: 0 },
        sum: { h: [], w: [] },
        median: { h: 0, w: 0 }
      };
    // Calculate global stats
    boxes.map(function (box) {
      stats.min.x = box.min.x < stats.min.x ? box.min.x : stats.min.x;
      stats.min.y = box.min.y < stats.min.y ? box.min.y : stats.min.y;
      stats.sum.h.push(box.h);
      stats.sum.w.push(box.w);
    });
    stats.avg.h = stats.sum.h.reduce((a, b) => a + b, 0) / boxes.length;
    stats.avg.w = stats.sum.w.reduce((a, b) => a + b, 0) / boxes.length;
    stats.median.h = median(stats.sum.h);
    stats.median.w = median(stats.sum.w);
    // Calculate column stats
    boxes.map(function (box) {
      let id = Math.floor((box.min.x - stats.min.x) / stats.median.w);
      if (typeof columns[id] === 'undefined')
        columns[id] = {
          min: { x: Infinity, y: Infinity },
          max: { x: -Infinity, y: -Infinity },
          w: 0,
          h: 0,
          p: numPage,
          sentences: {}
        };
      columns[id].min.x = box.min.x < columns[id].min.x ? box.min.x : columns[id].min.x;
      columns[id].min.y = box.min.y < columns[id].min.y ? box.min.y : columns[id].min.y;
      columns[id].max.x = box.max.x > columns[id].max.x ? box.max.x : columns[id].max.x;
      columns[id].max.y = box.max.y > columns[id].max.y ? box.max.y : columns[id].max.y;
      columns[id].w = columns[id].max.x - columns[id].min.x;
      columns[id].h = columns[id].max.y - columns[id].min.y;
    });
    // Add sentences in column
    for (let i = 0; i < boxes.length; i++) {
      let box = boxes[i];
      for (let id in columns) {
        let column = columns[id];
        if (contains(column, box)) {
          column.sentences[box.sentence.id] = true;
          break;
        }
      }
    }
    for (let key in columns) {
      result.push(columns[key]);
    }
    return result;
  },
  // Check if rectangle a contains rectangle b
  contains = function (a, b) {
    return !(b.min.x < a.min.x || b.min.y < a.min.y || b.max.x > a.max.x || b.max.y > a.max.y);
  },
  // Build Areas
  buildAreas = function (sentences = {}) {
    let paragraphs = [],
      result = [];
    for (let sentenceId in sentences) {
      let sentenceChunks = sentences[sentenceId].chunks,
        lines = {
          'lines': new Lines(sentenceChunks).all(),
          'sentence': { id: sentenceId }
        };
      paragraphs.push(lines);
    }
    let interlines = getInterlinesLength(paragraphs);
    for (let i = 0; i < paragraphs.length; i++) {
      result.push(new Areas(paragraphs[i], interlines));
    }
    return result;
  },
  median = function (values) {
    if (values.length === 0) return undefined;
    values.sort(function (a, b) {
      return a - b;
    });
    let half = Math.floor(values.length / 2);
    if (values.length % 2) return values[half];
    return (values[half - 1] + values[half]) / 2.0;
  },
  getInterlinesLength = function (paragraphs) {
    let stats = {};
    for (let i = 0; i < paragraphs.length; i++) {
      if (paragraphs[i].lines.length > 1)
        for (let j = 0; j < paragraphs[i].lines.length - 1; j++) {
          let previous = paragraphs[i].lines[j],
            next = paragraphs[i].lines[j + 1],
            interline = Math.abs(previous.min.y + previous.h / 2 - (next.min.y + next.h / 2));
          if (typeof stats[previous.p] === 'undefined') stats[previous.p] = [interline];
          else stats[previous.p].push(interline);
        }
    }
    let result = {};
    for (let key in stats) {
      result[key] = median(stats[key]);
    }
    return result;
  },
  // Get order of appearance of sentences
  getSentencesMapping = function (metadata) {
    let sentencesMapping = {},
      tmp = {},
      sentences = {};
    // Get useful infos about sentences
    for (let page in metadata.pages) {
      for (let sentenceId in metadata.pages[page].sentences) {
        sentences[sentenceId] = {
          id: sentenceId,
          page: page,
          minY: metadata.sentences[sentenceId].pages[page].min.y,
          column:
            metadata.sentences[sentenceId].pages[page].columns[
              metadata.sentences[sentenceId].pages[page].columns.length - 1
            ]
        };
      }
    }
    // Sort sentences & store result
    Object.values(sentences)
      .sort(function (a, b) {
        if (a.page !== b.page) return a.page - b.page;
        else if (a.column !== b.column) return a.column - b.column;
        else if (a.minY !== b.minY) return a.minY - b.minY;
        else return 0;
      })
      .map(function (sentence, index) {
        tmp[sentence.id] = index;
      });
    sentencesMapping.object = tmp;
    sentencesMapping.array = new Array(Object.keys(tmp).length);
    for (var key in tmp) {
      sentencesMapping.array[parseInt(tmp[key])] = key;
    }
    return sentencesMapping;
  };

module.exports = { Areas, Area, Lines, Line, Chunk, buildAreas, buildColumns, getSentencesMapping };
