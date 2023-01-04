/*
 * @prettier
 */

'use strict';

const cheerio = require(`cheerio`);
const _ = require(`lodash`);

const PDF = require(`./pdf.js`);

const DocumentsDatasetsController = require(`../controllers/api/documents.datasets.js`);

const conf = require(`../conf/dataTypes.json`);

const DATATYPE_SEPARATOR = `:`;
const PDF_METADATA_VERSION = 3;
const XML_METADATA_VERSION = 3;

let Self = {};

Self.selectors = {
  metadata: {
    article_title: function ($) {
      return $(`TEI > teiHeader > fileDesc > titleStmt > title`).text();
    },
    journal: function ($) {
      return $(`TEI > teiHeader > fileDesc > sourceDesc > biblStruct > monogr > title[level="j"][type="main"]`).text();
    },
    publisher: function ($) {
      return $(`TEI > teiHeader > fileDesc > publicationStmt > publisher`).text();
    },
    date_published: function ($) {
      return $(`TEI > teiHeader > fileDesc > sourceDesc > biblStruct > monogr > imprint > date[type="published"]`).attr(
        `when`
      );
    },
    manuscript_id: function ($) {
      return $(`TEI > teiHeader > fileDesc > sourceDesc > biblStruct > analytic > idno[type=publisher-id]`).text();
    },
    submitting_author: function ($) {
      let elem = $(`TEI > teiHeader > fileDesc > sourceDesc > biblStruct > analytic > author[role="corresp"]`)
        .first()
        .find(`persName`);
      return [
        elem.find(`forename[type="first"]`).text(),
        elem.find(`forename[type="middle"]`).text(),
        elem.find(`surname`).text()
      ]
        .reduce(function (acc, cur) {
          if (typeof cur !== `undefined` && !!cur) acc.push(cur);
          return acc;
        }, [])
        .join(` `);
    },
    submitting_author_email: function ($) {
      let elem = $(`TEI > teiHeader > fileDesc > sourceDesc > biblStruct > analytic > author[role="corresp"]`).first();
      return elem.find(`email`).text();
    },
    authors: function ($) {
      return $(`TEI > teiHeader > fileDesc > sourceDesc > biblStruct > analytic > author`)
        .map(function (i, el) {
          let elem = $(el);
          return {
            'family-name': elem.find(`persName > surname`).text(),
            'given-names': elem.find(`persName > forename[type="first"]`).text(),
            'other-name': elem.find(`persName > forename[type="middle"]`).text(),
            'orcid': {
              fromTEI: elem
                .find(`idno[type="ORCID"]`)
                .map(function (j, _el) {
                  let _elem = $(_el);
                  return _elem.text();
                })
                .get()
            },
            'name': [
              elem.find(`persName > forename[type="first"]`).text(),
              elem.find(`persName > forename[type="middle"]`).text(),
              elem.find(`persName > surname`).text()
            ]
              .reduce(function (acc, cur) {
                if (typeof cur !== `undefined` && !!cur) acc.push(cur);
                return acc;
              }, [])
              .join(` `),
            'email': elem.find(`email`).text(),
            'affiliations': elem
              .find(`affiliation`)
              .map(function (j, _el) {
                let _elem = $(_el);
                return Self.buildAffiliation(
                  $,
                  _elem.find(`orgName[type="department"]`),
                  _elem.find(`orgName[type="laboratory"]`),
                  _elem.find(`orgName[type="institution"]`),
                  _elem.find(`address > addrLine`),
                  _elem.find(`address > settlement`),
                  _elem.find(`address > country`)
                );
              })
              .get()
              .filter(function (value, index, self) {
                return self.indexOf(value) === index;
              })
          };
        })
        .get();
    },
    doi: function ($) {
      return $(`TEI > teiHeader > fileDesc > sourceDesc > biblStruct > idno[type="DOI"]`).text();
    },
    pmid: function ($) {
      return $(`TEI > teiHeader > fileDesc > sourceDesc > biblStruct > idno[type="PMID"]`).text();
    },
    isbn: function ($) {
      return $(`TEI > teiHeader > fileDesc > sourceDesc > biblStruct > idno[type="ISBN"]`).text();
    },
    license: function ($) {
      return ``;
    },
    acknowledgement: function ($) {
      return ``;
    },
    affiliation: function ($) {
      return ``;
    }
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
        if (typeof cur !== `undefined` && !!cur) acc.push(cur);
        return acc;
      }, [])
      .join(` `),
    Self.reduceAndJoin($, settlement),
    Self.reduceAndJoin($, addrLine),
    Self.reduceAndJoin($, country)
  ]
    .reduce(function (acc, cur) {
      if (typeof cur !== `undefined` && !!cur) acc.push(cur.replace(/\s+/gm, ` `));
      return acc;
    }, [])
    .join(`, `);
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
      if (typeof cur !== `undefined` && !!cur) acc.push(cur);
      return acc;
    }, [])
    .join(` `);
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
  for (let key in Self.selectors.metadata) {
    metadata[key] = Self.selectors.metadata[key]($);
  }
  return metadata;
};

/**
 * Update metadata of an XML parsed cheerio Object (use .loadTEI(xmlStr) function to get it)
 * @param {object} $ - XML parsed cheerio Object
 * @param {object} metadata - DataTypes JSON (stored in app.get('dataTypes'))
 * @return {string} XML string
 */
Self.updateMetadata = function ($, metadata) {
  let selectors = {
    article_title: function ($, value) {
      if (value === ``) value = `Unknow`; // empty title element not allowed
      let elem = $(`TEI > teiHeader > fileDesc > titleStmt > title`);
      if (!elem.length) {
        elem = $(`<title>`);
        $(`TEI > teiHeader > fileDesc > titleStmt`).append(elem);
      }
      return elem.text(value);
    },
    journal: function ($, value) {
      if (value === ``) value = `Unknow`; // empty title element not allowed
      let elem = $(`TEI > teiHeader > fileDesc > sourceDesc > biblStruct > monogr > title[level="j"][type="main"]`);
      if (!elem.length) {
        elem = $(`<title></title>`);
        elem.attr(`level`, `j`);
        elem.attr(`type`, `main`);
        $(`TEI > teiHeader > fileDesc > sourceDesc > biblStruct > monogr`).append(elem);
      }
      return elem.text(value);
    },
    publisher: function ($, value) {
      let elem = $(`TEI > teiHeader > fileDesc > publicationStmt > publisher`);
      if (!elem.length) {
        elem = $(`<publisher>`);
        $(`TEI > teiHeader > fileDesc > publicationStmt`).append(elem);
      }
      return elem.text(value);
    },
    date_published: function ($, value) {
      let elem = $(`TEI > teiHeader > fileDesc > sourceDesc > biblStruct > monogr > imprint > date[type="published"]`);
      if (!elem.length) {
        elem = $(`<date></date>`);
        elem.attr(`type`, `published`);
        $(`TEI > teiHeader > fileDesc > sourceDesc > biblStruct > monogr > imprint`).append(elem);
      }
      return elem.attr(`when`, value);
    },
    manuscript_id: function ($, value) {
      let elem = $(`TEI > teiHeader > fileDesc > sourceDesc > biblStruct > analytic > idno[type="publisher-id"]`);
      if (!elem.length) {
        elem = $(`<idno></idno>`);
        elem.attr(`type`, `publisher-id`);
        $(`TEI > teiHeader > fileDesc > sourceDesc > biblStruct > analytic`).append(elem);
      }
      return elem.text(value);
    },
    doi: function ($, value) {
      let elem = $(`TEI > teiHeader > fileDesc > sourceDesc > biblStruct > idno[type="DOI"]`);
      if (!elem.length) {
        elem = $(`<idno></idno>`);
        elem.attr(`type`, `DOI`);
        $(`TEI > teiHeader > fileDesc > sourceDesc > biblStruct`).append(elem);
      }
      return elem.text(value);
    },
    pmid: function ($, value) {
      let elem = $(`TEI > teiHeader > fileDesc > sourceDesc > biblStruct > idno[type="PMID"]`);
      if (!elem.length) {
        elem = $(`<idno></idno>`);
        elem.attr(`type`, `PMID`);
        $(`TEI > teiHeader > fileDesc > sourceDesc > biblStruct`).append(elem);
      }
      return elem.text(value);
    }
  };
  for (let selector in selectors) {
    if (typeof metadata[selector] !== `undefined` && typeof selectors[selector] === `function`) {
      selectors[selector]($, metadata[selector]);
    }
  }
  return $.xml();
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
  let datasets = {};
  let dataInstances = {};
  let result = [];
  $(`dataInstance`).map(function (index, element) {
    let dataInstance = $(element);
    let dataInstanceId = dataInstance.attr(`xml:id`);
    let datasetId = dataInstance.attr(`corresp`).replace(`#`, ``);
    let dataset = $(`dataset[xml\\:id="${datasetId}"]`);
    let type = dataset.attr(`type`) ? dataset.attr(`type`) : ``;
    let subtype = dataset.attr(`subtype`) ? dataset.attr(`subtype`) : ``;
    let cert = dataInstance.attr(`cert`) ? dataInstance.attr(`cert`) : `0`;
    let reuse = dataInstance.attr(`reuse`) ? dataInstance.attr(`reuse`) : `false`;
    dataInstances[dataInstanceId] = datasetId;
    if (typeof datasets[datasetId] === `undefined`) datasets[datasetId] = { sentences: [] };
    datasets[datasetId].id = datasetId;
    datasets[datasetId].dataInstanceId = dataInstanceId;
    datasets[datasetId].cert = cert;
    datasets[datasetId].type = type;
    datasets[datasetId].subtype = subtype;
    datasets[datasetId].reuse = reuse;
  });
  $(`s[corresp]`).map(function (index, element) {
    let sentence = $(element);
    let sentenceId = sentence.attr(`xml:id`);
    let corresps = sentence.attr(`corresp`) ? sentence.attr(`corresp`).replace(/#/gm, ``).split(` `) : [];
    if (corresps.length > 0) {
      for (let i = 0; i < corresps.length; i++) {
        let dataset =
          typeof dataInstances[corresps[i]] !== `undefined` ? datasets[dataInstances[corresps[i]]] : undefined;
        if (typeof dataset !== `undefined`) {
          if (!Array.isArray(dataset.sentences)) dataset.sentences = [];
          dataset.sentences.push({ id: `${sentenceId}`, text: sentence.text() });
        }
      }
    }
  });
  // re-build all datasets
  for (let key in datasets) {
    let dataset = datasets[key];
    let dataType = Self.getDataTypesOf(
      dataset.subtype ? dataset.type + `:` + dataset.subtype : dataset.type,
      dataTypes,
      dataset.reuse
    );
    let d = DocumentsDatasetsController.createDataset({
      id: dataset.id,
      dataInstanceId: dataset.dataInstanceId,
      sentences: dataset.sentences,
      reuse: dataset.reuse,
      cert: dataset.cert,
      dataType: dataType.dataType,
      subType: dataType.subType ? dataType.subType : ``
    });
    result.push(d);
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
    dataType: ``,
    subType: ``,
    description: ``,
    bestDataFormatForSharing: ``,
    bestPracticeForIndicatingReUseOfExistingData: ``,
    mostSuitableRepositories: ``
  };
  let indexOfSeparator = type.indexOf(DATATYPE_SEPARATOR);
  if (typeof type === `undefined`) return result;
  else if (indexOfSeparator > -1) {
    // case there is dataType & subtype
    let dataType = type.substr(0, indexOfSeparator);
    let subtype = type.substr(indexOfSeparator + DATATYPE_SEPARATOR.length);
    result.dataType = dataType;
    result.subType = subtype;
    if (!dataTypes.metadata[dataType]) {
      console.log(`type unknow : ` + dataType);
      dataType = conf.defaultDataType;
      result.dataType = dataType;
    }
    if (!dataTypes.metadata[subtype] && dataTypes.metadata[subtype].path === type) {
      console.log(`subtype unknow : ` + subtype);
      subtype = conf.defaultSubType;
      result.subType = subtype;
    }
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
    if (!dataTypes.metadata[type]) {
      console.log(`type unknow : ` + type);
      type = `tabular data`;
      result.dataType = type;
    }
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
 * @param {object} $ XML parsed cheerio Object
 * @return {string} XML string
 */
Self.convertOldFormat = function ($, version) {
  if (version === 1) $ = Self.convertOldFormat_v1($);
  if (version === 2) $ = Self.convertOldFormat_v2($);
  return $.xml();
};

/**
 * Convert old format version === 2 to version === 3
 * @param {object} $ XML parsed cheerio Object
 * @return {object} XML cheerio object
 */
Self.convertOldFormat_v2 = function ($) {
  let encodingDesc = $(`teiHeader encodingDesc`);
  let datasetsList = encodingDesc.find(`list[type="dataset"]`);
  let dataInstancesList = encodingDesc.find(`list[type="dataInstance"]`);
  if (encodingDesc.length === 1) {
    if (datasetsList.length)
      datasetsList.find(`dataset[id]`).map(function (index, element) {
        let dataset = $(element);
        dataset.attr(`xml:id`, dataset.attr(`id`)).removeAttr(`id`);
      });
    if (dataInstancesList.length)
      dataInstancesList.find(`dataInstance[id]`).map(function (index, element) {
        let dataInstance = $(element);
        dataInstance.attr(`xml:id`, dataInstance.attr(`id`)).removeAttr(`id`);
      });
  }
  return $;
};

/**
 * Convert old format version === 1 to version === 2
 * @param {object} $ XML parsed cheerio Object
 * @return {object} XML cheerio object
 */
Self.convertOldFormat_v1 = function ($) {
  let datasets = {};
  let dataInstanceNumber = 1;
  // get all datasets infos
  $(`s`).map(function (index, element) {
    let sentence = $(element);
    let datasetId = sentence.attr(`id`);
    let sentenceId = sentence.attr(`sentenceId`);
    let dataInstanceId = ``;
    let corresp = sentence.attr(`corresp`) ? sentence.attr(`corresp`).replace(`#`, ``) : undefined;
    let cert = sentence.attr(`cert`) ? sentence.attr(`cert`) : `0`;
    let rawType = sentence.attr(`type`) ? sentence.attr(`type`).split(`:`) : [];
    let type = rawType.length > 0 ? rawType[0] : undefined;
    let subtype = rawType.length > 1 ? rawType[1] : undefined;
    let reuse = sentence.attr(`reuse`) ? sentence.attr(`reuse`) : `false`;
    if (typeof datasetId !== `undefined`) {
      if (typeof datasets[datasetId] === `undefined`) datasets[datasetId] = {};
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
    if (typeof corresp !== `undefined`) {
      if (typeof datasets[corresp] === `undefined`) datasets[corresp] = {};
      if (!Array.isArray(datasets[corresp].sentenceIds)) datasets[corresp].sentenceIds = [];
      datasets[corresp].sentenceIds.push(`sentence-${sentenceId}`);
    }
    sentence.removeAttr(`id`).removeAttr(`corresp`).removeAttr(`cert`).removeAttr(`type`).removeAttr(`reuse`);
    sentence.attr(`xml:id`, `sentence-${sentenceId}`).removeAttr(`sentenceId`);
  });
  // re-build all datasets
  for (let key in datasets) {
    let dataset = datasets[key];
    Self.addDataset($, {
      sentence: { id: dataset.sentenceIds[0] },
      dataset: {
        dataInstanceId: dataset.dataInstanceId,
        id: dataset.id,
        type: dataset.type,
        subtype: dataset.subtype,
        cert: dataset.cert,
        reuse: dataset.reuse
      }
    });
    if (dataset.sentenceIds.length > 1)
      for (let i = 1; i < dataset.sentenceIds.length; i++) {
        dataset.sentenceIds[i];
        Self.linkSentence($, {
          sentence: { id: dataset.sentenceIds[i] },
          dataset: { id: dataset.id }
        });
      }
  }
  return $;
};

/**
 * Add sentences to the xml string
 * @param {string} xmlString XML string
 * @return {string} XML string
 */
Self.addSentences = function (xmlString, sentences) {
  let $ = Self.load(xmlString);
  let body = $(`text body`);
  let sentencesListElement = body.find(`div[type="ocr-sentences"]`);
  if (!sentencesListElement.length) {
    sentencesListElement = $(`<div>`).attr(`type`, `ocr-sentences`);
    body.append(sentencesListElement);
  }
  for (let i = 0; i < sentences.length; i++) {
    let sentence = sentences[i];
    let sentenceElement = $(`<s>`)
      .attr(`xml:id`, `ocr-sentence-${process.hrtime.bigint()}`)
      .attr(`coords`, `${sentence.p},${sentence.x},${sentence.y},${sentence.w},${sentence.h}`)
      .text(sentence.text);
    sentencesListElement.append(sentenceElement);
  }
  return $.xml();
};

/**
 * Refresh datasets in given XML
 * @param {object} $ XML parsed cheerio Object
 * @param {object} opts - JSON containing all data
 * @param {array} opts.datasets - datasets
  * @returns {object} Object {err, res} with properties:
    - "err" (new Error() or boolean) processing error
    - "res.xml" (string) updated XML
    - "res.data" (object) data related to this action
 */
Self.refreshDatasets = function ($, opts) {
  // Check all required data
  if (!Array.isArray(opts.datasets))
    return { err: new Error(`Missing required data: opts.datasets`), res: { xml: $.xml(), data: data } };
  let err = false;
  let encodingDesc = $(`teiHeader encodingDesc`);
  let datasetsList = encodingDesc.find(`list[type="dataset"]`);
  let dataInstancesList = encodingDesc.find(`list[type="dataInstance"]`);
  if (encodingDesc.length === 1) {
    if (!datasetsList.length) {
      datasetsList = $(`<list>`).attr(`type`, `dataset`);
      encodingDesc.append(datasetsList);
    }
    if (!dataInstancesList.length) {
      dataInstancesList = $(`<list>`).attr(`type`, `dataInstance`);
      encodingDesc.append(dataInstancesList);
    }
    // Remove old data
    datasetsList.empty();
    dataInstancesList.empty();
    $(`s`).removeAttr(`corresp`);
    // Add new data
    for (let i = 0; i < opts.datasets.length; i++) {
      let dataset = opts.datasets[i];
      if (Array.isArray(dataset.sentences) && dataset.sentences.length > 0) {
        for (let j = 0; j < dataset.sentences.length; j++) {
          if (err) break;
          let sentence = dataset.sentences[j];
          let data = {
            dataInstanceId: dataset.dataInstanceId,
            id: dataset.id,
            type: dataset.dataType,
            subtype: dataset.subType,
            cert: dataset.cert,
            reuse: dataset.reuse
          };
          let res;
          if (j === 0) res = Self.addDataset($, { dataset: data, sentence: sentence });
          else res = Self.linkSentence($, { dataset: data, sentence: sentence });
          err = res.err === true || res.err instanceof Error ? res.err : false;
        }
      }
    }
  } else err = new Error(`Bad TEI structure: encodingDesc elemenent not found`);
  return { err: err, res: { xml: $.xml() } };
};

/**
 * Add new dataset in given XML
 * @param {object} $ XML parsed cheerio Object
 * @param {object} opts - JSON containing all data
 * @param {string} opts.sentence.id - Sentence id
 * @param {string} opts.dataset.dataInstanceId - Dataset dataInstanceId
 * @param {string} opts.dataset.id - Dataset id
 * @param {string} opts.dataset.type - Dataset type
 * @param {string} opts.dataset.subtype - Dataset subtype
 * @param {string} opts.dataset.cert - Dataset cert
 * @param {boolean} opts.dataset.reuse - Dataset reuse
  * @returns {object} Object {err, res} with properties:
    - "err" (new Error() or boolean) processing error
    - "res.xml" (string) updated XML
    - "res.data" (object) data related to this action
 */
Self.addDataset = function ($, opts) {
  let data = { dataset: {}, links: [] };
  let err = true;
  let encodingDesc = $(`teiHeader encodingDesc`);
  let datasetsList = encodingDesc.find(`list[type="dataset"]`);
  let dataInstancesList = encodingDesc.find(`list[type="dataInstance"]`);
  let sentence = $(`s[xml\\:id="${opts.sentence.id}"]`);
  if (encodingDesc.length === 1) {
    if (sentence.length === 1) {
      if (!datasetsList.length) {
        datasetsList = $(`<list>`).attr(`type`, `dataset`);
        encodingDesc.append(datasetsList);
      }
      if (!dataInstancesList.length) {
        dataInstancesList = $(`<list>`).attr(`type`, `dataInstance`);
        encodingDesc.append(dataInstancesList);
      }
      let dataset = $(`<dataset>`);
      let dataInstance = $(`<dataInstance>`);
      let _lastDatasetId = datasetsList
        .find(`dataset`)
        .map(function (index, element) {
          return parseInt($(element).attr(`xml:id`).replace(`dataset-`, ``), 10);
        })
        .get()
        .sort(function (a, b) {
          if (a < b) return -1;
          if (a > b) return 1;
          return 0;
        })
        .slice(-1)[0];
      let lastDatasetId = typeof _lastDatasetId !== `undefined` ? _lastDatasetId : 0;
      let datasetNumber = lastDatasetId ? lastDatasetId + 1 : 1;
      let datasetId = typeof opts.dataset.id !== `undefined` ? opts.dataset.id : `dataset-${datasetNumber}`;
      let _lastDataInstanceId = dataInstancesList
        .find(`dataInstance`)
        .map(function (index, element) {
          return parseInt($(element).attr(`xml:id`).replace(`dataInstance-`, ``), 10);
        })
        .get()
        .sort(function (a, b) {
          if (a < b) return -1;
          if (a > b) return 1;
          return 0;
        })
        .slice(-1)[0];
      let lastDataInstanceId = typeof _lastDataInstanceId !== `undefined` ? _lastDataInstanceId : 0;
      let dataInstanceNumber = lastDataInstanceId ? lastDataInstanceId + 1 : 1;
      let dataInstanceId =
        typeof opts.dataset.dataInstanceId !== `undefined`
          ? opts.dataset.dataInstanceId
          : `dataInstance-${dataInstanceNumber}`;
      dataInstance
        .attr(`corresp`, `#${datasetId}`)
        .attr(`cert`, opts.dataset.cert ? opts.dataset.cert : `0`)
        .attr(`reuse`, opts.dataset.reuse ? opts.dataset.reuse.toString() : `false`)
        .attr(`xml:id`, dataInstanceId);
      dataset
        .attr(`type`, typeof opts.dataset.type !== `undefined` ? opts.dataset.type : ``)
        .attr(`subtype`, typeof opts.dataset.subtype !== `undefined` ? opts.dataset.subtype : ``)
        .attr(`xml:id`, datasetId);
      datasetsList.append(dataset);
      dataInstancesList.append(dataInstance);
      data.dataset.id = datasetId;
      data.dataset.dataInstanceId = dataInstanceId;
      let linkAction = Self.linkSentence($, { dataset: { id: datasetId }, sentence: { id: opts.sentence.id } });
      if (!linkAction.err) {
        data.links.push(linkAction.res.data);
        err = false;
      } else err = new Error(`Error while linking dataset with sentence`);
    } else err = new Error(`Bad sentence id: sentence not found`);
  } else err = new Error(`Bad TEI structure: encodingDesc elemenent not found`);
  return { err: err, res: { xml: $.xml(), data: data } };
};

/**
 * Update dataset in given XML
 * @param {object} $ XML parsed cheerio Object
 * @param {object} opts - JSON containing all data
 * @param {string} opts.dataset.id - Dataset id
 * @param {string} opts.dataset.type - Dataset type
 * @param {string} opts.dataset.subtype - Dataset subtype
 * @param {string} opts.dataset.cert - Dataset cert
 * @param {boolean} opts.dataset.reuse - Dataset reuse
 * @returns {object} Object {err, res} with properties:
    - "err" (new Error() or boolean) processing error
    - "res.xml" (string) updated XML
    - "res.data" (object) data related to this action
 */
Self.updateDataset = function ($, opts) {
  let data = { dataset: {} };
  let err = true;
  let encodingDesc = $(`teiHeader encodingDesc`);
  let dataset = encodingDesc.find(`list[type="dataset"] > dataset[xml\\:id="${opts.dataset.id}"]`);
  let dataInstance = encodingDesc.find(`list[type="dataInstance"] > dataInstance[corresp="#${opts.dataset.id}"]`);
  if (dataset.length === 1) {
    if (dataInstance.length === 1) {
      dataInstance.attr(`cert`, opts.dataset.cert).attr(`reuse`, opts.dataset.reuse.toString());
      dataset.attr(`type`, opts.dataset.type).attr(`subtype`, opts.dataset.subtype);
      data.dataset.id = dataset.attr(`xml:id`);
      data.dataset.dataInstanceId = dataInstance.attr(`xml:id`);
      data.dataset.type = dataset.attr(`type`);
      data.dataset.subtype = dataset.attr(`subtype`);
      data.dataset.cert = dataInstance.attr(`cert`);
      data.dataset.reuse = dataInstance.attr(`reuse`);
      err = false;
    } else err = new Error(`Bad dataInstance id: dataInstance not found`);
  } else err = new Error(`Bad dataset id: dataset not found`);
  return { err: err, res: { xml: $.xml(), data: data } };
};

/**
 * Delete given dataset in given XML
 * @param {object} $ - XML parsed cheerio Object
 * @param {string} opts.dataset.id - Dataset id
 * @returns {object} Object {err, res} with properties:
    - "err" (new Error() or boolean) processing error
    - "res.xml" (string) updated XML
    - "res.data" (object) data related to this action
 */
Self.deleteDataset = function ($, opts) {
  let data = { dataset: {}, links: [] };
  let linkError = false;
  let err = true;
  let encodingDesc = $(`teiHeader encodingDesc`);
  let dataset = encodingDesc.find(`list[type="dataset"] > dataset[xml\\:id="${opts.dataset.id}"]`);
  let dataInstance = encodingDesc.find(`list[type="dataInstance"] > dataInstance[corresp="#${opts.dataset.id}"]`);
  if (dataset.length === 1) {
    if (dataInstance.length === 1) {
      let dataInstanceId = dataInstance.attr(`xml:id`);
      let sentences = $(`s[corresp]`).map(function (index, element) {
        let sentence = $(element);
        let sentenceId = sentence.attr(`xml:id`);
        let isLinked = sentence.attr(`corresp`) ? sentence.attr(`corresp`).indexOf(`#${dataInstanceId}`) > -1 : false;
        if (isLinked) {
          let linkAction = Self.unlinkSentence($, { dataset: { id: opts.dataset.id }, sentence: { id: sentenceId } });
          if (!linkAction.err) data.links.push(linkAction.res.data);
          linkError = linkError && linkAction.err;
        }
      });
      data.dataset.id = dataset.attr(`xml:id`);
      data.dataset.dataInstanceId = dataInstanceId;
      dataInstance.remove();
      dataset.remove();
      err = false;
    } else err = new Error(`Bad dataInstance id: dataInstance not found`);
  } else err = new Error(`Bad dataset id: dataset not found`);
  return { err: err && linkError, res: { xml: $.xml(), data: data } };
};

/**
 * Add new link in given XML
 * @param {object} $ - XML parsed cheerio Object
 * @param {string} opts.sentence.id - Sentence id
 * @param {string} opts.dataset.id - Dataset id
 * @returns {object} Object {err, res} with properties:
    - "err" (new Error() or boolean) processing error
    - "res.xml" (string) updated XML
    - "res.data" (object) data related to this action
 */
Self.linkSentence = function ($, opts) {
  let data = { dataset: {}, sentence: {} };
  let err = true;
  let encodingDesc = $(`teiHeader encodingDesc`);
  let dataset = encodingDesc.find(`list[type="dataset"] > dataset[xml\\:id="${opts.dataset.id}"]`);
  let dataInstance = encodingDesc.find(`list[type="dataInstance"] > dataInstance[corresp="#${opts.dataset.id}"]`);
  let sentence = $(`s[xml\\:id="${opts.sentence.id}"]`);
  if (sentence.length === 1) {
    if (dataset.length === 1) {
      if (dataInstance.length === 1) {
        let dataInstanceId = dataInstance.attr(`xml:id`);
        sentence.parents(`div`).first().attr(`subtype`, `dataseer`);
        if (!sentence.attr(`corresp`)) sentence.attr(`corresp`, `#${dataInstanceId}`);
        else
          sentence.attr(
            `corresp`,
            (sentence.attr(`corresp`).replace(`#${dataInstanceId}`, ``) + ` #${dataInstanceId}`).trim()
          );
        data.dataset.id = dataset.attr(`xml:id`);
        data.dataset.dataInstanceId = dataInstance.attr(`xml:id`);
        data.sentence.id = sentence.attr(`xml:id`);
        data.sentence.text = sentence.text();
        err = false;
      } else err = new Error(`Bad dataInstance id: dataInstance not found`);
    } else err = new Error(`Bad dataset id: dataset not found`);
  } else err = new Error(`Bad sentence id: sentence not found`);
  return { err: err, res: { xml: $.xml(), data: data } };
};

/**
 * Delete given link in given XML
 * @param {object} $ - XML parsed cheerio Object
 * @param {string} opts.sentence.id - Sentence id
 * @param {string} opts.dataset.id - Dataset id
 * @returns {object} Object {err, res} with properties:
    - "err" (new Error() or boolean) processing error
    - "res.xml" (string) updated XML
    - "res.data" (object) data related to this action
 */
Self.unlinkSentence = function ($, opts) {
  let data = { dataset: {}, sentence: {} };
  let err = true;
  let encodingDesc = $(`teiHeader encodingDesc`);
  let dataset = encodingDesc.find(`list[type="dataset"] > dataset[xml\\:id="${opts.dataset.id}"]`);
  let dataInstance = encodingDesc.find(`list[type="dataInstance"] > dataInstance[corresp="#${opts.dataset.id}"]`);
  let sentence = $(`s[xml\\:id="${opts.sentence.id}"]`);
  if (sentence.length === 1) {
    if (dataset.length === 1) {
      if (dataInstance.length === 1) {
        let dataInstanceId = dataInstance.attr(`xml:id`);
        if (sentence.attr(`corresp`))
          sentence.attr(`corresp`, sentence.attr(`corresp`).replace(`#${dataInstanceId}`, ``).trim());
        if (sentence.attr(`corresp`) === ``) sentence.removeAttr(`corresp`);
        let div = sentence.parents(`div`).first();
        let hasDatasets = div.find(`s[corresp]`);
        if (!hasDatasets) div.removeAttr(`subtype`);
        data.dataset.id = dataset.attr(`xml:id`);
        data.dataset.dataInstanceId = dataInstanceId;
        data.sentence.id = sentence.attr(`xml:id`);
        data.sentence.text = sentence.text();
        let shouldDeleteDataset = true;
        let sentences = $(`s[corresp]`).map(function (index, element) {
          let sentence = $(element);
          let sentenceId = sentence.attr(`xml:id`);
          let isLinked = sentence.attr(`corresp`) ? sentence.attr(`corresp`).indexOf(`#${dataInstanceId}`) > -1 : false;
          if (isLinked) shouldDeleteDataset = false;
        });
        data.shouldDeleteDataset = shouldDeleteDataset;
        err = false;
      } else err = new Error(`Bad dataInstance id: dataInstance not found`);
    } else err = new Error(`Bad dataset id: dataset not found`);
  } else err = new Error(`Bad sentence id: sentence not found`);
  return { err: err, res: { xml: $.xml(), data: data } };
};

/**
 * Extract TEI metadata sentences (use .loadTEI(xmlStr) function to get it)
 * @param {object} $ - XML parsed cheerio Object
 * @returns {object} JSON object representation of TEI sentences metadata
 */
Self.extractTEISentencesMetadata = function ($) {
  let metadata = {};
  let tmp = {};
  let sentencesMapping = {};
  $(`s[xml\\:id]`).map(function (i, el) {
    tmp[$(el).attr(`xml:id`)] = i;
  });
  sentencesMapping.object = tmp;
  sentencesMapping.array = new Array(Object.keys(tmp).length);
  for (let key in tmp) {
    sentencesMapping.array[parseInt(tmp[key], 10)] = key;
  }
  // metadata version
  metadata.version = XML_METADATA_VERSION;
  metadata.mapping = sentencesMapping;
  return metadata;
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
  $(`TEI s[coords][xml\\:id]`)
    .map(function (i, el) {
      // Build coords
      return { coords: $(el).attr(`coords`).toString(), id: $(el).attr(`xml:id`) };
    })
    .get()
    .map(function (sentence, index) {
      let sentenceId = sentence.id;
      metadata.sentences[sentenceId] = {
        id: sentenceId,
        chunks: [],
        pages: {}
      };
      let chunks = sentence.coords.split(`;`);
      for (let i = 0; i < chunks.length; i++) {
        let split = chunks[i].split(`,`);
        let chunk = new PDF.Chunk({
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
        if (typeof metadata.pages[chunk.p] === `undefined`) metadata.pages[chunk.p] = { sentences: {} };
        if (typeof metadata.pages[chunk.p].sentences[sentenceId] === `undefined`)
          metadata.pages[chunk.p].sentences[sentenceId] = true;
      }
    });
  // Set areas
  _.flatten(PDF.buildAreas(metadata.sentences)).map(function (areas) {
    // Sentence informations
    if (typeof metadata.sentences[areas.sentence.id].areas === `undefined`)
      metadata.sentences[areas.sentence.id].areas = [];
    let boxes = areas.collection.map(function (area) {
      area.lines = area.lines.length;
      return area;
    });
    metadata.sentences[areas.sentence.id].areas.push({
      sentence: { id: areas.sentence.id },
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
  metadata.mapping = PDF.getSentencesMapping(metadata);
  // metadata version
  metadata.version = PDF_METADATA_VERSION;
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
    $(`TEI s[coords]`).map(function (i, el) {
      // Add id on sentences
      $(el).attr(`xml:id`, `sentence-${i}`);
    });
    return $.xml();
  } else return xmlStr;
};

/**
 * Sanitize the xml
 * @param {string} - xmlStr XML string
 * @returns {Array} Array of JSON object representation of datasets
 */
Self.sanitize = function (xmlStr) {
  let $ = Self.load(xmlStr);
  if ($) {
    Self.reformatHeadElements($);
    return $.xml().replace(`<title level="a" type="main"/>`, `<title level="a" type="main">Unknow</title>`);
  } else return xmlStr;
};

/**
 * Reformat head XML elements
 * @param {object} - $ cherrio object
 * @returns {Array} Array of JSON object representation of datasets
 */
Self.reformatHeadElements = function ($) {
  if ($) {
    $(`div > head[coords]`).map(function (index, element) {
      let el = $(element);
      if (!el.has(`s`).length) {
        let sentence = $(`<s>`);
        sentence.attr(`coords`, el.attr(`coords`)).attr(`xml:id`, `head-sentence-${process.hrtime.bigint()}`);
        sentence.text(el.text());
        el.text(``);
        el.append(sentence);
      }
    });
  }
};

/**
 * Parse XML content
 * @param {string} - xmlStr String representation of xml document
 * @returns {object} Objet JSON Object of XML document or null
 */
Self.load = function (xmlStr) {
  const $ = cheerio.load(xmlStr.replace(/\n\s*/gm, ``), {
    xmlMode: true
  });
  if (!Object.keys($).length) return null;
  else return $;
};

module.exports = Self;
