/*
 * @prettier
 */

'use strict';

const cheerio = require('cheerio');

const DATATYPE_SEPARATOR = ':';

let Self = {};

let selectors = {};

selectors.metadata = {
  article_title: function ($) {
    return $('TEI > teiHeader > fileDesc > titleStmt > title').text();
  },
  journal: function ($) {
    return $('TEI > teiHeader > fileDesc > sourceDesc > biblStruct > monogr > title[level="j"][type="main"]').text();
  },
  publisher: function ($) {
    return $('TEI > teiHeader > fileDesc > publicationStmt > publisher').text();
  },
  date_published: function ($) {
    return $('TEI > teiHeader > fileDesc > sourceDesc > biblStruct > monogr > imprint > date[type="published"]').attr(
      'when'
    );
  },
  manuscript_id: function ($) {
    return $('TEI > teiHeader > fileDesc > sourceDesc > biblStruct > analytic > idno[type=publisher-id]').text();
  },
  submitting_author: function ($) {
    let elem = $('TEI > teiHeader > fileDesc > sourceDesc > biblStruct > analytic > author[role="corresp"]')
      .first()
      .find('persName');
    return [
      elem.find('forename[type="first"]').text(),
      elem.find('forename[type="middle"]').text(),
      elem.find('surname').text()
    ]
      .reduce(function (acc, cur) {
        if (typeof cur !== 'undefined' && !!cur) acc.push(cur);
        return acc;
      }, [])
      .join(' ');
  },
  submitting_author_email: function ($) {
    let elem = $('TEI > teiHeader > fileDesc > sourceDesc > biblStruct > analytic > author[role="corresp"]').first();
    return elem.find('email').text();
  },
  authors: function ($) {
    return $('TEI > teiHeader > fileDesc > sourceDesc > biblStruct > analytic > author')
      .map(function (i, el) {
        let elem = $(el);
        return {
          'name': [
            elem.find('persName > forename[type="first"]').text(),
            elem.find('persName > forename[type="middle"]').text(),
            elem.find('persName > surname').text()
          ]
            .reduce(function (acc, cur) {
              if (typeof cur !== 'undefined' && !!cur) acc.push(cur);
              return acc;
            }, [])
            .join(' '),
          'email': elem.find('email').text(),
          'affiliations': elem
            .find('affiliation')
            .map(function (j, _el) {
              let _elem = $(_el);
              return Self.buildAffiliation(
                $,
                _elem.find('orgName[type="department"]'),
                _elem.find('orgName[type="laboratory"]'),
                _elem.find('orgName[type="institution"]'),
                _elem.find('address > addrLine'),
                _elem.find('address > settlement'),
                _elem.find('address > country')
              );
            })
            .get()
        };
      })
      .get();
  },
  doi: function ($) {
    return $('TEI > teiHeader > fileDesc > sourceDesc > biblStruct > idno[type="DOI"]').text();
  },
  pmid: function ($) {
    return $('TEI > teiHeader > fileDesc > sourceDesc > biblStruct > idno[type="PMID"]').text();
  }
};

/**
 * Build an affiliation
 * @param {object} $ - cheerio instance of XML
 * @param {object} department - All department elements
 * @param {object} laboratory - All laboratory elements
 * @param {object} institution - All institution elements
 * @param {object} addrLine - All addrLine elements
 * @param {object} settlement - All settlement elements
 * @param {object} country - All country elements
 * @returns {string} String of affiliation
 */
Self.buildAffiliation = function ($, department, laboratory, institution, addrLine, settlement, country) {
  return [
    [Self.reduceAndJoin($, department), Self.reduceAndJoin($, laboratory), Self.reduceAndJoin($, institution)]
      .reduce(function (acc, cur) {
        if (typeof cur !== 'undefined' && !!cur) acc.push(cur);
        return acc;
      }, [])
      .join(' '),
    Self.reduceAndJoin($, settlement),
    Self.reduceAndJoin($, addrLine),
    Self.reduceAndJoin($, country)
  ]
    .reduce(function (acc, cur) {
      if (typeof cur !== 'undefined' && !!cur) acc.push(cur);
      return acc;
    }, [])
    .join(', ');
};

/**
 * Reduce and join array (ignore empty elements in array)
 * @param {object} $ - cheerio instance of XML
 * @param {Array} data - Array containing data
 * @returns {object} Objet JSON Object of XML document or null
 */
Self.reduceAndJoin = function ($, data) {
  return data
    .map(function (i, el) {
      return $(el).text();
    })
    .get()
    .reduce(function (acc, cur) {
      if (typeof cur !== 'undefined' && !!cur) acc.push(cur);
      return acc;
    }, [])
    .join(' ');
};

/**
 * Extract metadata from an XML parsed cheerio Object (use .loadTEI(xmlStr) function to get it)
 * @param {object} $ - XML parsed cheerio Object
 * @returns {object} JSON object representation of metadata
 * @example <caption>Structure of returned result</caption>
 * {
 *   'article_title': String,
 *   'journal': String,
 *   'publisher': String,
 *   'date_published': String,
 *   'manuscript_id': String,
 *   'submitting_author': String,
 *   'submitting_author_email': String,
 *   'authors': [
 *     {
 *       'name': String
 *       'affiliations': [String]
 *     }
 *   ],
 *   'doi': 'String,
 *   'pmid': String
 * }
 */
Self.extractMetadata = function ($) {
  let metadata = {};
  for (let key in selectors.metadata) {
    metadata[key] = selectors.metadata[key]($);
  }
  return metadata;
};

/**
 * Extract metadata from an XML parsed cheerio Object (use .loadTEI(xmlStr) function to get it)
 * @param {object} $ - XML parsed cheerio Object
 * @param {object} dataTypes - DataTypes JSON (stored in app.get('dataTypes'))
 * @returns {Array} Array of JSON object representation of datasets
 * @example <caption>Structure of returned result</caption>
 * [{
 *   id: String,
 *   sentenceId: String,
 *   reuse: Boolean,
 *   cert: String,
 *   dataType: String,
 *   subType: String,
 *   description: String,
 *   bestDataFormatForSharing: String,
 *   mostSuitableRepositories: String,
 *   DOI: String,
 *   name: String,
 *   comments: String,
 *   text: String,
 * }]
 */
Self.extractDatasets = function ($, dataTypes) {
  return $('div[subtype=dataseer] s[id]')
    .map(function (i, el) {
      // this === el
      let element = $(el),
        type = element.attr('type'),
        reuse = element.attr('reuse') === 'true',
        dataType = Self.getDataTypesOf(type, dataTypes, reuse);
      return {
        id: element.attr('id'),
        sentenceId: element.attr('sentenceId'),
        reuse: reuse,
        cert: element.attr('cert') ? element.attr('cert') : '0',
        dataType: dataType.dataType,
        subType: dataType.subType ? dataType.subType : '',
        description: dataType.description ? dataType.description : '',
        bestDataFormatForSharing: dataType.bestDataFormatForSharing ? dataType.bestDataFormatForSharing : '',
        bestPracticeForIndicatingReUseOfExistingData: dataType.bestPracticeForIndicatingReUseOfExistingData
          ? dataType.bestPracticeForIndicatingReUseOfExistingData
          : '',
        mostSuitableRepositories: dataType.mostSuitableRepositories ? dataType.mostSuitableRepositories : '',
        DOI: '',
        name: '',
        comments: '',
        text: element.text()
      };
    })
    .get();
};

/**
 * Get dataType corresponding with a given type
 * @param {string} type - Type attribute of dataset
 * @param {object} dataTypes - DataTypes JSON (stored in app.get('dataTypes'))
 * @return {object} Objet JSON Object of dataType or null
 */
Self.getDataTypesOf = function (type, dataTypes, reuse) {
  let result = {
      dataType: '',
      subType: '',
      description: '',
      bestDataFormatForSharing: '',
      bestPracticeForIndicatingReUseOfExistingData: '',
      mostSuitableRepositories: ''
    },
    indexOfSeparator = type.indexOf(DATATYPE_SEPARATOR);
  if (typeof type === 'undefined') return result;
  else if (indexOfSeparator > -1) {
    // case there is dataType & subtype
    let dataType = type.substr(0, indexOfSeparator),
      subtype = type.substr(indexOfSeparator + DATATYPE_SEPARATOR.length);
    if (dataTypes.metadata[dataType]) {
      result.dataType = dataType;
    } else console.log('type unknow : ' + dataType);
    if (dataTypes.metadata[subtype] && dataTypes.metadata[subtype].path === type) {
      result.subType = subtype;
    } else console.log('subtype unknow : ' + subtype);
    if (dataTypes.metadata[subtype]) {
      result.description = dataTypes.metadata[subtype].description;
      result.bestDataFormatForSharing = dataTypes.metadata[subtype].bestDataFormatForSharing;
      result.bestPracticeForIndicatingReUseOfExistingData =
        dataTypes.metadata[subtype].bestPracticeForIndicatingReUseOfExistingData;
      result.mostSuitableRepositories = reuse
        ? dataTypes.metadata[subtype].mostSuitableRepositories.reuse
        : dataTypes.metadata[subtype].mostSuitableRepositories.default;
    } else if (dataTypes.metadata[dataType]) {
      result.description = dataTypes.metadata[dataType].description;
      result.bestDataFormatForSharing = dataTypes.metadata[dataType].bestDataFormatForSharing;
      result.bestPracticeForIndicatingReUseOfExistingData =
        dataTypes.metadata[dataType].bestPracticeForIndicatingReUseOfExistingData;
      result.mostSuitableRepositories = reuse
        ? dataTypes.metadata[dataType].mostSuitableRepositories.reuse
        : dataTypes.metadata[dataType].mostSuitableRepositories.default;
    } else console.log('subtype unknow : ' + subtype);
  } else {
    // case there is dataType & not subtype
    if (dataTypes.metadata[type]) {
      result.dataType = type;
      result.description = dataTypes.metadata[type].description;
      result.bestDataFormatForSharing = dataTypes.metadata[type].bestDataFormatForSharing;
      result.mostSuitableRepositories = reuse
        ? dataTypes.metadata[type].mostSuitableRepositories.reuse
        : dataTypes.metadata[type].mostSuitableRepositories.default;
    } else console.log('type unknow : ' + type);
  }
  return result;
};

/**
 * Add new dataset in given XML
 * @param {object} $ XML parsed cheerio Object
 * @param {object} opts - JSON containing all data
 * @param {string} opts.sentenceId - Dataset sentenceId
 * @param {string} opts.id - Dataset id
 * @param {string} opts.type - Dataset type
 * @param {string} opts.cert - Dataset cert
 * @param {boolean} opts.reuse - Dataset reuse
 * @returns {string} Xml string or empty string
 */
Self.addDataset = function ($, opts) {
  let sentence = $(`s[sentenceId="${opts.sentenceId}"]`);
  if (!sentence.length) return '';
  sentence.parents('div').first().attr('subtype', 'dataseer');
  sentence.attr('id', opts.id).attr('type', opts.type).attr('cert', opts.cert).attr('reuse', opts.reuse.toString());
  return $.xml();
};

/**
 * Update dataset in given XML
 * @param {object} $ XML parsed cheerio Object
 * @param {object} opts - JSON containing all data
 * @param {string} opts.sentenceId - Dataset sentenceId
 * @param {string} opts.id - Dataset id
 * @param {string} opts.type - Dataset type
 * @param {string} opts.cert - Dataset cert
 * @param {boolean} opts.reuse - Dataset reuse
 * @returns {string} Xml string or empty string
 */
Self.updateDataset = function ($, opts) {
  let sentence = $(`s[sentenceId="${opts.sentenceId}"]`);
  if (!sentence.length) return '';
  sentence.parents('div').first().attr('subtype', 'dataseer');
  sentence.attr('id', opts.id).attr('type', opts.type).attr('cert', opts.cert).attr('reuse', opts.reuse.toString());
  return $.xml();
};

/**
 * Delete given dataset in given XML
 * @param {object} $ - XML parsed cheerio Object
 * @param {string} opts.sentenceId - Dataset sentenceId
 * @returns {string} Xml string or empty string
 */
Self.deleteDataset = function ($, opts) {
  let sentence = $(`s[sentenceId="${opts.sentenceId}"]`);
  if (!sentence.length) return '';
  let datasetId = sentence.attr('id');
  $(`s[corresp="#${datasetId}"]`).removeAttr('corresp'); // delete all corresp
  sentence.removeAttr('id').removeAttr('type').removeAttr('cert').removeAttr('reuse');
  $('tei div:has(s)').map(function (i, el) {
    let elem = $(el);
    if (!elem.has('s[id]').length) elem.removeAttr('subtype');
  });
  return $.xml();
};

/**
 * Add new corresp in given XML
 * @param {object} $ - XML parsed cheerio Object
 * @param {string} opts.sentenceId - Corresp sentenceId
 * @param {string} opts.id - Dataset id
 * @returns {string} Xml string or empty string
 */
Self.addCorresp = function ($, opts) {
  let sentence = $(`s[sentenceId="${opts.sentenceId}"]`);
  if (!sentence.length) return '';
  sentence.attr('corresp', '#' + opts.id);
  sentence.parents('div').first().attr('subtype', 'dataseer');
  return $.xml();
};

/**
 * Delete given corresp in given XML
 * @param {object} $ - XML parsed cheerio Object
 * @param {string} opts.sentenceId - Corresp sentenceId
 * @returns {string} Xml string or empty string
 */
Self.deleteCorresp = function ($, opts) {
  let sentence = $(`s[sentenceId="${opts.sentenceId}"]`);
  if (!sentence.length) return '';
  sentence.removeAttr('corresp');
  $('tei div:has(s)').map(function (i, el) {
    let elem = $(el);
    if (!elem.has('s[id]').length) elem.removeAttr('subtype');
  });
  return $.xml();
};

/**
 * Extract PDF metadata sentences (use .loadTEI(xmlStr) function to get it)
 * @param {object} $ - XML parsed cheerio Object
 * @returns {object} JSON object representation of PDF sentences metadata
 */
Self.extractPDFSentencesMetadata = function ($) {
  let metadata = {
    sentences: {},
    pages: {}
  };
  $('TEI s[coords]')
    .map(function (i, el) {
      // Build coords
      return { coords: $(el).attr('coords').toString() };
    })
    .get()
    .map(function (sentence, sentenceId) {
      metadata.sentences[sentenceId] = {
        sentenceId: sentenceId,
        chunks: [],
        pages: {}
      };
      let chunks = sentence.coords.split(';');
      for (let i = 0; i < chunks.length; i++) {
        let parts = chunks[i].split(','),
          chunk = {
            index: i,
            p: parseInt(parts[0]),
            x: parseInt(parts[1]),
            y: parseInt(parts[2]),
            w: parseInt(parts[3]),
            h: parseInt(parts[4]),
            sentenceId: sentenceId
          };
        // Add chunk to sentence
        metadata.sentences[sentenceId].chunks.push(chunk);
        metadata.sentences[sentenceId].pages[chunk.p] = true;

        // Map sentence per page
        if (typeof metadata.pages[chunk.p] === 'undefined') metadata.pages[chunk.p] = {};
        if (typeof metadata.pages[chunk.p][sentenceId] === 'undefined') {
          metadata.pages[chunk.p][sentenceId] = {
            location: {
              min: { x: +Infinity, y: +Infinity },
              max: { x: -Infinity, y: -Infinity }
            }
          };
        }
        // Calculate location
        metadata.pages[chunk.p][sentenceId].location.min.x =
          chunk.x < metadata.pages[chunk.p][sentenceId].location.min.x
            ? chunk.x
            : metadata.pages[chunk.p][sentenceId].location.min.x;
        metadata.pages[chunk.p][sentenceId].location.min.y =
          chunk.y < metadata.pages[chunk.p][sentenceId].location.min.y
            ? chunk.y
            : metadata.pages[chunk.p][sentenceId].location.min.y;
        metadata.pages[chunk.p][sentenceId].location.max.x =
          chunk.x > metadata.pages[chunk.p][sentenceId].location.max.x
            ? chunk.x
            : metadata.pages[chunk.p][sentenceId].location.max.x;
        metadata.pages[chunk.p][sentenceId].location.max.y =
          chunk.y > metadata.pages[chunk.p][sentenceId].location.max.y
            ? chunk.y
            : metadata.pages[chunk.p][sentenceId].location.max.y;
      }
    });
  return metadata;
};

/**
 * Add sentenceId attr on each sentence (usefull for PDF display)
 * @param {string} - xmlStr XML string
 * @returns {Array} Array of JSON object representation of datasets
 */
Self.addSentencesId = function (xmlStr) {
  let $ = Self.load(xmlStr);
  if ($) {
    $('TEI s[coords]').map(function (i, el) {
      // Add id on sentences
      $(el).attr('sentenceId', i);
    });
    return $.xml();
  } else return xmlStr;
};

/**
 * Parse XML content
 * @param {string} - xmlStr String representation of xml document
 * @returns {object} Objet JSON Object of XML document or null
 */
Self.load = function (xmlStr) {
  const $ = cheerio.load(xmlStr.replace(/\n\s*/gm, ''), {
    xmlMode: true
  });
  if (!Object.keys($).length) return null;
  else return $;
};

module.exports = Self;
