const cheerio = require('cheerio'),
  dataTypes = require('../public/json/dataTypes.json');

let object = {};

// Type of source file
object.types = { 'TEI': 'TEI' };

// Selectors of each data (datasets & metadata)
object.selectors = {
  'TEI': {
    'datasets': function($) {
      let result = {};
      $('div[subtype=dataseer] s[id]').map(function(i, el) {
        // this === el
        let id = $(el).attr('id'),
          type = $(el).attr('type'),
          confidence = $(el).attr('confidence') ? $(el).attr('confidence') : '0',
          dataType = (typeof dataTypes[type] === 'undefined') ? dataType = { 'dataType': '', 'descritpion': '', 'bestDataFormatForSharing': '', 'mostSuitableRepositories': '' } : dataTypes[type];
        return result[id] = {
          'id': id,
          'confidence': confidence,
          'dataType': dataType.dataType,
          'descritpion': dataType.descritpion,
          'bestDataFormatForSharing': dataType.bestDataFormatForSharing,
          'mostSuitableRepositories': dataType.mostSuitableRepositories,
          'DOI': '',
          'name': '',
          'comments': '',
          'text': $(el).text(),
          'status': 'warning'
        };
      }).get();
      return result;
    }, // text, confidence
    'metadata': {
      'articleTitle': function($) {
        return $('TEI > teiHeader > fileDesc > titleStmt > title').text()
      },
      'journal': function($) {
        return $('TEI > teiHeader > fileDesc > publicationStmt > publisher').text()
      },
      'manuscriptId': function($) {
        return $('TEI > teiHeader > fileDesc > sourceDesc > biblStruct > analytic > idno[type=publisher-id]').text()
      },
      'submittingAuthor': function($) {
        return ''
      },
      'submittingAuthoremail': function($) {
        return ''
      },
      'authors': function($) {
        return $('TEI > teiHeader > fileDesc > sourceDesc > biblStruct > analytic > author > persName').map(function(i, el) {
          return $(el).find('surname').text() + ' ' + $(el).find('forename').text();
        }).get();
      },
      'funders': function($) {
        return 'No special funders'
      },
      'institutions': function($) {
        return $('TEI > teiHeader > fileDesc > sourceDesc > biblStruct > analytic > author affiliation address addrLine').map(function(i, el) {
          return $(el).text();
        }).get();
      },
    }
  }
};

/**
 * Build a Document Object with extrated data of file
 * @param {Object} file  Object representation of file
 * @param {String} type Type of document (use object.selectors to spécify what kind of document will be processed)
 * @return {Object} Objet JSON Object of Document or null
 */
object.getNewDocumentFromFile = function(file, type) {
  let xmlStr = file.data.toString('utf8'),
    $ = object.load(xmlStr.replace(/\n\s*/gm, '')),
    metadata = object.extractMetadata($, type),
    datasets = object.extractDatasets($, type),
    result = {};
  result = {
    '_id': file.md5,
    'metadata': metadata,
    'datasets': datasets,
    'status': 'metadata',
    'source': $.xml()
  };
  return result;
};

/**
 * Parse XML content
 * @param {String} xmlStr String representation of xml document
 * @return {Object} Objet JSON Object of XML document or null
 */
object.load = function(xmlStr) {
  const result = cheerio.load(xmlStr, {
    xmlMode: true
  });
  return (Object.keys(result).length > 0) ? result : null;
};

object.extractMetadata = function($, type) {
  let result = {},
    err = object.selectors[type];
  if (!err) return result;
  for (let key in object.selectors[type].metadata) {
    result[key] = object.selectors[type].metadata[key]($);
  }
  return result;
};

object.extractDatasets = function($, type) {
  return object.selectors[type].datasets($);
};

module.exports = object;