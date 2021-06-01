/*
 * @prettier
 */

'use strict';

const cheerio = require('cheerio'),
  _ = require('lodash');

const PDF = require('./pdf.js');

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
 *   sentenceIds: [],
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
  let datasets = {},
    dataInstances = {},
    result = [];
  $(`dataInstance`).map(function (index, element) {
    let dataInstance = $(element),
      dataInstanceId = dataInstance.attr('id'),
      datasetId = dataInstance.attr('corresp').replace('#', ''),
      dataset = $(`dataset[id="${datasetId}"]`),
      type = dataset.attr('type') ? dataset.attr('type') : '',
      subtype = dataset.attr('subtype') ? dataset.attr('subtype') : '',
      cert = dataInstance.attr('cert') ? dataInstance.attr('cert') : '0',
      reuse = dataInstance.attr('reuse') ? dataInstance.attr('reuse') : 'false';
    dataInstances[dataInstanceId] = datasetId;
    if (typeof datasets[datasetId] === 'undefined') datasets[datasetId] = { sentences: [] };
    datasets[datasetId].id = datasetId;
    datasets[datasetId].dataInstanceId = dataInstanceId;
    datasets[datasetId].cert = cert;
    datasets[datasetId].type = type;
    datasets[datasetId].subtype = subtype;
    datasets[datasetId].reuse = reuse;
  });
  $(`s[corresp]`).map(function (index, element) {
    let sentence = $(element),
      sentenceId = sentence.attr('xml:id'),
      corresps = sentence.attr('corresp') ? sentence.attr('corresp').replace('#', '').split(' ') : [];
    if (corresps.length > 0) {
      for (let i = 0; i < corresps.length; i++) {
        let dataset =
          typeof dataInstances[corresps[i]] !== 'undefined' ? datasets[dataInstances[corresps[i]]] : undefined;
        if (typeof dataset !== 'undefined') {
          if (!Array.isArray(dataset.sentences)) dataset.sentences = [];
          dataset.sentences.push({ id: `${sentenceId}`, text: sentence.text() });
        }
      }
    }
  });
  // re-build all datasets
  for (let key in datasets) {
    let dataset = datasets[key],
      dataType = Self.getDataTypesOf(
        dataset.subtype ? dataset.type + ':' + dataset.subtype : dataset.type,
        dataTypes,
        dataset.reuse
      );
    result.push({
      id: dataset.id,
      dataInstanceId: dataset.dataInstanceId,
      sentences: dataset.sentences,
      reuse: dataset.reuse,
      cert: dataset.cert,
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
      comments: ''
    });
  }
  return result;
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
    result.dataType = dataType;
    result.subType = subtype;
    if (!dataTypes.metadata[dataType]) console.log('type unknow : ' + dataType);
    if (!dataTypes.metadata[subtype] && dataTypes.metadata[subtype].path === type)
      console.log('subtype unknow : ' + subtype);
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
    }
  } else {
    // case there is dataType & not subtype
    result.dataType = type;
    if (!dataTypes.metadata[type]) console.log('type unknow : ' + type);
    if (dataTypes.metadata[type]) {
      result.description = dataTypes.metadata[type].description;
      result.bestDataFormatForSharing = dataTypes.metadata[type].bestDataFormatForSharing;
      result.mostSuitableRepositories = reuse
        ? dataTypes.metadata[type].mostSuitableRepositories.reuse
        : dataTypes.metadata[type].mostSuitableRepositories.default;
    }
  }
  return result;
};

/**
 * Convert old format
 * @param {object} $ XML parsed cheerio Object
 */
Self.convertOldFormat = function ($) {
  let datasets = {},
    dataInstanceNumber = 1;
  // get all datasets infos
  $(`s`).map(function (index, element) {
    let sentence = $(element),
      datasetId = sentence.attr('id'),
      sentenceId = sentence.attr('sentenceId'),
      dataInstanceId = '',
      corresp = sentence.attr('corresp') ? sentence.attr('corresp').replace('#', '') : undefined,
      cert = sentence.attr('cert') ? sentence.attr('cert') : '0',
      rawType = sentence.attr('type') ? sentence.attr('type').split(':') : [],
      type = rawType.length > 0 ? rawType[0] : undefined,
      subtype = rawType.length > 1 ? rawType[1] : undefined,
      reuse = sentence.attr('reuse') ? sentence.attr('reuse') : 'false';
    if (typeof datasetId !== 'undefined') {
      if (typeof datasets[datasetId] === 'undefined') datasets[datasetId] = {};
      if (!Array.isArray(datasets[datasetId].sentenceIds)) datasets[datasetId].sentenceIds = [];
      datasets[datasetId].id = datasetId;
      datasets[datasetId].dataInstanceId = datasets[datasetId].dataInstanceId
        ? datasets[datasetId].dataInstanceId
        : `dataInstance-${dataInstanceNumber++}`;
      datasets[datasetId].cert = cert;
      datasets[datasetId].type = type;
      datasets[datasetId].subtype = subtype;
      datasets[datasetId].reuse = reuse;
      datasets[datasetId].sentenceIds.push(`sentence-${sentenceId}`);
    }
    if (typeof corresp !== 'undefined') {
      if (typeof datasets[corresp] === 'undefined') datasets[corresp] = {};
      if (!Array.isArray(datasets[corresp].sentenceIds)) datasets[corresp].sentenceIds = [];
      datasets[corresp].sentenceIds.push(`sentence-${sentenceId}`);
    }
    sentence.removeAttr('id').removeAttr('corresp').removeAttr('cert').removeAttr('type').removeAttr('reuse');
    sentence.attr(`xml:id`, `sentence-${sentenceId}`).removeAttr('sentenceId');
  });
  // re-build all datasets
  for (let key in datasets) {
    let dataset = datasets[key];
    Self.addDataset($, {
      sentenceId: dataset.sentenceIds[0],
      dataInstanceId: dataset.dataInstanceId,
      id: dataset.id,
      type: dataset.type,
      subtype: dataset.subtype,
      cert: dataset.cert,
      reuse: dataset.reuse
    });
    if (dataset.sentenceIds.length > 1)
      for (let i = 1; i < dataset.sentenceIds.length; i++) {
        dataset.sentenceIds[i];
        Self.linkSentence($, {
          sentenceId: dataset.sentenceIds[i],
          id: dataset.id
        });
      }
  }
  return $.xml();
};

/**
 * Add new dataset in given XML
 * @param {object} $ XML parsed cheerio Object
 * @param {object} opts - JSON containing all data
 * @param {string} opts.sentenceId - Dataset sentenceId
 * @param {string} opts.dataInstanceId - Dataset dataInstanceId
 * @param {string} opts.id - Dataset id
 * @param {string} opts.type - Dataset type
 * @param {string} opts.subtype - Dataset subtype
 * @param {string} opts.cert - Dataset cert
 * @param {boolean} opts.reuse - Dataset reuse
 * @returns {string} Xml string or empty string
 */
Self.addDataset = function ($, opts) {
  let encodingDesc = $(`teiHeader encodingDesc`),
    datasetsList = encodingDesc.find('list[type="dataset"]'),
    dataInstancesList = encodingDesc.find('list[type="dataInstance"]'),
    sentence = $(`s[xml\\:id="${opts.sentenceId}"]`);
  if (!encodingDesc.length) return '';
  if (!sentence.length) return '';
  if (!datasetsList.length) {
    datasetsList = $('<list>').attr('type', 'dataset');
    encodingDesc.append(datasetsList);
  }
  if (!dataInstancesList.length) {
    dataInstancesList = $('<list>').attr('type', 'dataInstance');
    encodingDesc.append(dataInstancesList);
  }
  let dataset = $('<dataset>'),
    dataInstance = $('<dataInstance>'),
    lastDataInstance = dataInstancesList.find('dataInstance:last-child'),
    lastDataInstanceId = lastDataInstance.length ? lastDataInstance.attr(`id`).replace('dataInstance-', '') : 0,
    dataInstanceNumber = lastDataInstanceId ? parseInt(lastDataInstanceId) + 1 : 0,
    dataInstanceId =
      typeof opts.dataInstanceId !== 'undefined' ? opts.dataInstanceId : `dataInstance-${dataInstanceNumber}`;
  dataInstance
    .attr(`id`, dataInstanceId)
    .attr('corresp', `#${opts.id}`)
    .attr('cert', opts.cert)
    .attr('reuse', opts.reuse.toString());
  dataset.attr(`id`, opts.id).attr('type', opts.type).attr('subtype', opts.subtype);
  datasetsList.append(dataset);
  dataInstancesList.append(dataInstance);
  Self.linkSentence($, { id: opts.id, sentenceId: opts.sentenceId });
  return $.xml();
};

/**
 * Update dataset in given XML
 * @param {object} $ XML parsed cheerio Object
 * @param {object} opts - JSON containing all data
 * @param {string} opts.id - Dataset id
 * @param {string} opts.type - Dataset type
 * @param {string} opts.subtype - Dataset subtype
 * @param {string} opts.cert - Dataset cert
 * @param {boolean} opts.reuse - Dataset reuse
 * @returns {string} Xml string or empty string
 */
Self.updateDataset = function ($, opts) {
  let encodingDesc = $(`teiHeader encodingDesc`),
    dataset = encodingDesc.find(`list[type="dataset"] > dataset[id="${opts.id}"]`),
    dataInstance = encodingDesc.find(`list[type="dataInstance"] > dataInstance[corresp="#${opts.id}"]`);
  if (!dataset.length) return '';
  if (!dataInstance.length) return '';
  dataInstance.attr('cert', opts.cert).attr('reuse', opts.reuse.toString());
  dataset.attr('type', opts.type).attr('subtype', opts.subtype);
  return $.xml();
};

/**
 * Delete given dataset in given XML
 * @param {object} $ - XML parsed cheerio Object
 * @param {string} opts.id - Dataset sentenceId
 * @returns {string} Xml string or empty string
 */
Self.deleteDataset = function ($, opts) {
  let encodingDesc = $(`teiHeader encodingDesc`),
    dataset = encodingDesc.find(`list[type="dataset"] > dataset[id="${opts.id}"]`),
    dataInstance = encodingDesc.find(`list[type="dataInstance"] > dataInstance[corresp="#${opts.id}"]`);
  if (!dataset.length) return '';
  if (!dataInstance.length) return '';
  let dataInstanceId = dataInstance.attr(`id`),
    sentences = $(`s[corresp]`).map(function (index, element) {
      let sentence = $(element),
        sentenceId = sentence.attr(`xml:id`),
        isLinked = sentence.attr('corresp') ? sentence.attr('corresp').indexOf(`#${dataInstanceId}`) > -1 : false;
      if (isLinked) Self.unlinkSentence($, { id: opts.id, sentenceId: sentenceId });
    });
  dataInstance.remove();
  dataset.remove();
  return $.xml();
};

/**
 * Add new corresp in given XML
 * @param {object} $ - XML parsed cheerio Object
 * @param {string} opts.sentenceId - Corresp sentenceId
 * @param {string} opts.id - Dataset id
 * @returns {string} Xml string or empty string
 */
Self.linkSentence = function ($, opts) {
  let encodingDesc = $(`teiHeader encodingDesc`),
    dataset = encodingDesc.find(`list[type="dataset"] > dataset[id="${opts.id}"]`),
    dataInstance = encodingDesc.find(`list[type="dataInstance"] > dataInstance[corresp="#${opts.id}"]`),
    sentence = $(`s[xml\\:id="${opts.sentenceId}"]`);
  if (!sentence.length) return '';
  if (!dataset.length) return '';
  if (!dataInstance.length) return '';
  let dataInstanceId = dataInstance.attr(`id`);
  sentence.parents('div').first().attr('subtype', 'dataseer');
  if (!sentence.attr('corresp')) sentence.attr('corresp', `#${dataInstanceId}`);
  else
    sentence.attr(
      'corresp',
      (sentence.attr('corresp').replace(`#${dataInstanceId}`, '') + ` #${dataInstanceId}`).trim()
    );
  return $.xml();
};

/**
 * Delete given corresp in given XML
 * @param {object} $ - XML parsed cheerio Object
 * @param {string} opts.sentenceId - Corresp sentenceId
 * @param {string} opts.id - Dataset id
 * @returns {string} Xml string or empty string
 */
Self.unlinkSentence = function ($, opts) {
  let encodingDesc = $(`teiHeader encodingDesc`),
    dataset = encodingDesc.find(`list[type="dataset"] > dataset[id="${opts.id}"]`),
    dataInstance = encodingDesc.find(`list[type="dataInstance"] > dataInstance[corresp="#${opts.id}"]`),
    sentence = $(`s[xml\\:id="${opts.sentenceId}"]`);
  if (!sentence.length) return '';
  if (!dataset.length) return '';
  if (!dataInstance.length) return '';
  let dataInstanceId = dataInstance.attr(`id`);
  if (sentence.attr('corresp'))
    sentence.attr('corresp', sentence.attr('corresp').replace(`#${dataInstanceId}`, '').trim());
  if (sentence.attr('corresp') === '') sentence.removeAttr('corresp');
  let div = sentence.parents('div').first(),
    hasDatasets = div.find('s[corresp]');
  if (!hasDatasets) div.removeAttr('subtype');
  let shouldDeleteDataset = true,
    sentences = $(`s[corresp]`).map(function (index, element) {
      let sentence = $(element),
        sentenceId = sentence.attr(`xml:id`),
        isLinked = sentence.attr('corresp') ? sentence.attr('corresp').indexOf(`#${dataInstanceId}`) > -1 : false;
      if (isLinked) shouldDeleteDataset = false;
    });
  if (shouldDeleteDataset) Self.deleteDataset($, opts);
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
        let split = chunks[i].split(','),
          chunk = new PDF.Chunk({
            p: parseInt(split[0], 10),
            x: parseInt(split[1], 10),
            y: parseInt(split[2], 10),
            w: parseInt(split[3], 10),
            h: parseInt(split[4], 10)
          });
        // Sentence informations
        metadata.sentences[sentenceId].chunks.push(chunk);
        metadata.sentences[sentenceId].pages[chunk.p] = {
          columns: [],
          min: { x: Infinity, y: Infinity },
          max: { x: -Infinity, y: -Infinity }
        };
        metadata.sentences[sentenceId].pages[chunk.p].min.x =
          chunk.x < metadata.sentences[sentenceId].pages[chunk.p].min.x
            ? chunk.x
            : metadata.sentences[sentenceId].pages[chunk.p].min.x;
        metadata.sentences[sentenceId].pages[chunk.p].min.y =
          chunk.y < metadata.sentences[sentenceId].pages[chunk.p].min.y
            ? chunk.y
            : metadata.sentences[sentenceId].pages[chunk.p].min.y;
        metadata.sentences[sentenceId].pages[chunk.p].max.x =
          chunk.x > metadata.sentences[sentenceId].pages[chunk.p].max.x
            ? chunk.x
            : metadata.sentences[sentenceId].pages[chunk.p].max.x;
        metadata.sentences[sentenceId].pages[chunk.p].max.y =
          chunk.y > metadata.sentences[sentenceId].pages[chunk.p].max.y
            ? chunk.y
            : metadata.sentences[sentenceId].pages[chunk.p].max.y;
        // Page informations
        if (typeof metadata.pages[chunk.p] === 'undefined') metadata.pages[chunk.p] = { sentences: {} };
        if (typeof metadata.pages[chunk.p].sentences[sentenceId] === 'undefined')
          metadata.pages[chunk.p].sentences[sentenceId] = true;
      }
    });
  // Set areas
  _.flatten(PDF.buildAreas(metadata.sentences)).map(function (areas) {
    // Sentence informations
    if (typeof metadata.sentences[areas.sentenceId].areas === 'undefined')
      metadata.sentences[areas.sentenceId].areas = [];
    let boxes = areas.collection.map(function (area) {
      area.lines = area.lines.length;
      return area;
    });
    metadata.sentences[areas.sentenceId].areas.push({
      sentenceId: areas.sentenceId,
      interlines: areas.interlines,
      boxes: boxes
    });
  });
  // Detect columns in PDF pages
  for (let page in metadata.pages) {
    let boxes = [];
    for (let sentenceId in metadata.pages[page].sentences) {
      boxes = boxes.concat(
        metadata.sentences[sentenceId].areas.map(function (item) {
          return item.boxes;
        })
      );
    }
    metadata.pages[page].columns = PDF.buildColumns(
      _.flatten(boxes).filter(function (box) {
        return box.p.toString() === page;
      }),
      page
    );
    for (let i = 0; i < metadata.pages[page].columns.length; i++) {
      let column = metadata.pages[page].columns[i];
      for (let sentenceId in column.sentences) {
        metadata.sentences[sentenceId].pages[page].columns.push(i);
      }
    }
  }
  // metadata version
  metadata.version = 1;
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
      $(el).attr(`xml:id`, `sentence-${i}`);
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
