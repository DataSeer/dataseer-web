const cheerio = require('cheerio');

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
        return result[$(el).attr('id')] = {
          'DOI': '',
          'bestDataForSharing': '',
          'comments': '',
          'dataType': $(el).attr('type'),
          'descritpion': '',
          'mostSuitableRepositories': '',
          'name': '',
          'text': $(el).text(),
          'status': ''
        };
      }).get();
      return result;
    }, // text, confidence
    'metadata': {
      'Article_Title': function($) {
        return $('TEI > teiHeader > fileDesc > titleStmt > title').text()
      },
      'Journal': function($) {
        return $('TEI > teiHeader > fileDesc > publicationStmt > publisher').text()
      },
      'ManuscriptId': function($) {
        return $('TEI > teiHeader > fileDesc > sourceDesc > biblStruct > analytic > idno[type=publisher-id]').text()
      },
      'SubmittingAuthor': function($) {
        return ''
      },
      'SubmittingAuthoremail': function($) {
        return ''
      },
      'Authors': function($) {
        return $('TEI > teiHeader > fileDesc > sourceDesc > biblStruct > analytic > author > persName').map(function(i, el) {
          return $(el).find('surname').text() + ' ' + $(el).find('forename').text();
        }).get();
      },
      'Funders': function($) {
        return 'No special funders'
      },
      'Institutions': function($) {
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