/*
 * @prettier
 */

'use strict';

const cheerio = require(`cheerio`);
const _ = require(`lodash`);

const PDF = require(`./pdf.js`);
const DataObjects = require(`./dataObjects.js`);

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
 * Extract DataObjects from an XML parsed cheerio Object (use .loadTEI(xmlStr) function to get it)
 * @param {object} $ - XML parsed cheerio Object
 * @param {object} opts - JSON containing all data
 * @param {object} opts.dataTypes - DataTypes JSON (stored in app.get('dataTypes'))
 * @param {boolean} setCustomDefaultProperties - setCustomDefaultProperties
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
Self.extractDataObjects = function ($, opts) {
  let dataObjects = {};
  let dataInstances = {};
  let result = [];
  $(`dataInstance`).map(function (index, element) {
    let dataInstance = $(element);
    let dataInstanceId = dataInstance.attr(`xml:id`);
    let dataObjectId = dataInstance.attr(`corresp`).replace(`#`, ``);
    let dataset = $(`dataset[xml\\:id="${dataObjectId}"]`);
    let type = dataset.attr(`type`) ? dataset.attr(`type`) : ``;
    let subtype = dataset.attr(`subtype`) ? dataset.attr(`subtype`) : ``;
    let cert = dataInstance.attr(`cert`) ? dataInstance.attr(`cert`) : `0`;
    let reuse = dataInstance.attr(`reuse`) ? dataInstance.attr(`reuse`) : `false`;
    dataInstances[dataInstanceId] = dataObjectId;
    if (typeof dataObjects[dataObjectId] === `undefined`) dataObjects[dataObjectId] = { sentences: [] };
    dataObjects[dataObjectId]._id = dataObjectId;
    dataObjects[dataObjectId].name = `dataset-${index + 1}`;
    dataObjects[dataObjectId].dataInstanceId = dataInstanceId;
    dataObjects[dataObjectId].cert = cert;
    dataObjects[dataObjectId].type = type;
    dataObjects[dataObjectId].subtype = subtype;
    dataObjects[dataObjectId].reuse = reuse;
  });
  $(`s[corresp]`).map(function (index, element) {
    let sentence = $(element);
    let sentenceId = sentence.attr(`xml:id`);
    let corresps = sentence.attr(`corresp`) ? sentence.attr(`corresp`).replace(/#/gm, ``).split(` `) : [];
    if (corresps.length > 0) {
      for (let i = 0; i < corresps.length; i++) {
        let dataObject =
          typeof dataInstances[corresps[i]] !== `undefined` ? dataObjects[dataInstances[corresps[i]]] : undefined;
        if (typeof dataObject !== `undefined`) {
          if (!Array.isArray(dataObject.sentences)) dataObject.sentences = [];
          dataObject.sentences.push({ id: `${sentenceId}`, text: sentence.text() });
        }
      }
    }
  });
  // re-build all dataObjects
  for (let key in dataObjects) {
    let dataObject = dataObjects[key];
    let dataType = Self.getDataTypesOf(
      dataObject.subtype ? dataObject.type + `:` + dataObject.subtype : dataObject.type,
      opts.dataTypes,
      dataObject.reuse
    );
    let d = DataObjects.create({
      _id: dataObject._id,
      name: dataObject.name,
      dataInstanceId: dataObject.dataInstanceId,
      sentences: dataObject.sentences,
      reuse: dataObject.reuse,
      cert: dataObject.cert,
      dataType: dataType.dataType,
      subType: dataType.subType ? dataType.subType : ``
    });
    if (opts.setCustomDefaultProperties && d.kind === `dataset`) {
      d.reuse = false;
    }
    result.push(d);
  }
  return result;
};

/**
  * Add new dataObject in given XML
  * @param {object} $ XML parsed cheerio Object
  * @param {object} opts - JSON containing all data
  * @param {string} opts.dataObject.dataInstanceId - DataObject dataInstanceId
  * @param {string} opts.dataObject.id - DataObject id
  * @param {string} opts.dataObject.type - DataObject type
  * @param {string} opts.dataObject.subtype - DataObject subtype
  * @param {string} opts.dataObject.cert - DataObject cert
  * @param {boolean} opts.dataObject.reuse - DataObject reuse
  * @returns {object} Object {err, res} with properties:
    - "err" (new Error() or boolean) processing error
    - "res" (object) data related to this action
 */
Self.addDataObject = function ($, opts) {
  let res = { dataObject: {} };
  let err = true;
  let encodingDesc = $(`teiHeader encodingDesc`);
  let datasetsList = encodingDesc.find(`list[type="dataset"]`);
  let dataInstancesList = encodingDesc.find(`list[type="dataInstance"]`);
  if (typeof opts.dataObject.dataInstanceId !== `undefined`) {
    if (encodingDesc.length === 1) {
      if (!datasetsList.length) {
        datasetsList = $(`<list>`).attr(`type`, `dataset`);
        encodingDesc.append(datasetsList);
      }
      if (!dataInstancesList.length) {
        dataInstancesList = $(`<list>`).attr(`type`, `dataInstance`);
        encodingDesc.append(dataInstancesList);
      }
      let dataInstanceAlreadyExists = $(`dataInstance[xml\\:id=${opts.dataObject.dataInstanceId}]`).length >= 1;
      if (!dataInstanceAlreadyExists) {
        let dataObject = $(`<dataset>`);
        let dataInstance = $(`<dataInstance>`);
        let dataInstanceId = opts.dataObject.dataInstanceId;
        let dataObjectId = opts.dataObject.id;
        dataInstance
          .attr(`corresp`, `#${dataObjectId}`)
          .attr(`cert`, opts.dataObject.cert ? opts.dataObject.cert : `0`)
          .attr(`reuse`, opts.dataObject.reuse ? opts.dataObject.reuse.toString() : `false`)
          .attr(`xml:id`, dataInstanceId);
        dataObject
          .attr(`type`, typeof opts.dataObject.type !== `undefined` ? opts.dataObject.type : ``)
          .attr(`subtype`, typeof opts.dataObject.subtype !== `undefined` ? opts.dataObject.subtype : ``)
          .attr(`xml:id`, dataObjectId);
        datasetsList.append(dataObject);
        dataInstancesList.append(dataInstance);
        res.dataObject.id = dataObjectId;
        res.dataObject.dataInstanceId = dataInstanceId;
        err = false;
      } else err = new Error(`Bad dataInstance id: dataInstance already exists`);
    } else err = new Error(`Bad TEI structure: encodingDesc element not found`);
  } else err = new Error(`Missing required data: opts.dataObject.dataInstanceId`);
  return { err: err, res: res };
};

/**
 * Link given DataObject in given XML
 * @param {object} $ - XML parsed cheerio Object
 * @param {object} opts.dataObject - DataObject
 * @param {string} opts.dataObject.id - DataObject id
 * @param {array} opts.dataObject.sentences - DataObject sentences
 * @returns {object} Object {err, res} with properties:
    - "err" (new Error() or boolean) processing error
    - "res" (object) data related to this action
 */
Self.linkDataObject = function ($, opts) {
  let res = { links: [] };
  let err = true;
  let encodingDesc = $(`teiHeader encodingDesc`);
  let dataObject = encodingDesc.find(`list[type="dataset"] > dataset[xml\\:id="${opts.dataObject.id}"]`);
  let dataInstance = encodingDesc.find(`list[type="dataInstance"] > dataInstance[corresp="#${opts.dataObject.id}"]`);
  if (Array.isArray(opts.dataObject.sentences)) {
    if (dataObject.length === 1) {
      if (dataInstance.length === 1) {
        let dataInstanceId = dataInstance.attr(`xml:id`);
        let _dataInstanceId = `#${dataInstanceId}`;
        let ids = opts.dataObject.sentences.map(function (s) {
          return s.id;
        });
        err = false;
        for (let i = 0; i < ids.length; i++) {
          let sentenceId = ids[i];
          let sentence = $(`s[xml\\:id="${sentenceId}"]`);
          if (sentence.length === 1) {
            let corresp = sentence.attr(`corresp`);
            let isLinked = corresp ? corresp.indexOf(_dataInstanceId) > -1 : false;
            if (!isLinked) sentence.attr(`corresp`, `${corresp ? corresp : ``} ${_dataInstanceId}`.trim());
            res.links.push({ dataObject: { id: opts.dataObject.id }, sentence: { id: sentenceId } });
          } else err = new Error(`Bad sentence(s) id(s): sentence(s) not found`);
        }
      } else err = new Error(`Bad dataInstance id: dataInstance not found`);
    } else err = new Error(`Bad dataObject id: dataObject not found`);
  } else err = new Error(`Bad dataObject sentences: opts.dataObject.sentences must be an Array`);
  return { err: err, res: res };
};

/**
 * Delete given dataObject in given XML
 * @param {object} $ - XML parsed cheerio Object
 * @param {object} opts.dataObject - DataObject
 * @param {string} opts.dataObject.id - DataObject id
 * @returns {object} Object {err, res} with properties:
    - "err" (new Error() or boolean) processing error
    - "res" (object) data related to this action
 */
Self.deleteDataObject = function ($, opts) {
  let res = { dataObject: {} };
  let err = true;
  let encodingDesc = $(`teiHeader encodingDesc`);
  let dataObject = encodingDesc.find(`list[type="dataset"] > dataset[xml\\:id="${opts.dataObject.id}"]`);
  let dataInstance = encodingDesc.find(`list[type="dataInstance"] > dataInstance[corresp="#${opts.dataObject.id}"]`);
  if (dataObject.length === 1) {
    if (dataInstance.length === 1) {
      let dataInstanceId = dataInstance.attr(`xml:id`);
      res.dataObject.id = dataObject.attr(`xml:id`);
      res.dataObject.dataInstanceId = dataInstanceId;
      dataInstance.remove();
      dataObject.remove();
      err = false;
    } else err = new Error(`Bad dataInstance id: dataInstance not found`);
  } else err = new Error(`Bad dataObject id: dataObject not found`);
  return { err: err, res: res };
};

/**
 * Unlink given DataObject in given XML
 * @param {object} $ - XML parsed cheerio Object
 * @param {string} opts.dataObject.id - DataObject id
 * @returns {object} Object {err, res} with properties:
    - "err" (new Error() or boolean) processing error
    - "res" (object) data related to this action
 */
Self.unlinkDataObject = function ($, opts) {
  let res = { links: [] };
  let err = true;
  let encodingDesc = $(`teiHeader encodingDesc`);
  let dataObject = encodingDesc.find(`list[type="dataset"] > dataset[xml\\:id="${opts.dataObject.id}"]`);
  let dataInstance = encodingDesc.find(`list[type="dataInstance"] > dataInstance[corresp="#${opts.dataObject.id}"]`);
  if (dataObject.length === 1) {
    if (dataInstance.length === 1) {
      let dataInstanceId = dataInstance.attr(`xml:id`);
      let _dataInstanceId = `#${dataInstanceId}`;
      let sentences = $(`s[corresp~="${_dataInstanceId}"]`)
        .map(function (index, element) {
          let sentence = $(element);
          let dataInstanceIds = sentence.attr(`corresp`) ? sentence.attr(`corresp`).split(` `) : [];
          let dataInstanceIdsArray = dataInstanceIds.filter(function (item) {
            return item !== _dataInstanceId;
          });
          sentence.attr(`corresp`, dataInstanceIdsArray.join(` `));
          if (sentence.attr(`corresp`) === ``) sentence.removeAttr(`corresp`);
          res.links.push({ dataObject: { id: opts.dataObject.id }, sentence: { id: sentence.attr(`xml:id`) } });
          return { id: sentence.attr(`xml:id`) };
        })
        .filter(function (item) {
          return typeof item !== `undefined`;
        });
      err = false;
    } else err = new Error(`Bad dataInstance id: dataInstance element not found`);
  } else err = new Error(`Bad dataObject id: dataObject element not found`);
  return { err: err, res: res };
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
 * Extract TEI sentences (use .loadTEI(xmlStr) function to get it)
 * @param {object} $ - XML parsed cheerio Object
 * @param {string} type - Type of sentences structure
 * @returns {object} JSON object representation of TEI sentences metadata
 */
Self.extractTEISentences = function ($, type = `array`) {
  let sentences = type === `object` ? {} : [];
  $(`s[xml\\:id]`).map(function (i, el) {
    let element = $(el);
    if (Array.isArray(sentences)) sentences.push({ id: element.attr(`xml:id`), text: element.text() });
    else sentences[element.attr(`xml:id`)] = { id: element.attr(`xml:id`), text: element.text() };
  });
  return sentences;
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
