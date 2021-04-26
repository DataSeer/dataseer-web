/*
 * @prettier
 */

'use strict';

const request = require('request'),
  cheerio = require('cheerio'),
  async = require('async'),
  path = require('path');

const FilesController = require('../controllers/documents.files.js');

const XML = require('../lib/xml.js');

const conf = require('../conf/conf.json');

const dataTypesCounts = require('../resources/dataTypesCounts.json');

let Self = {};

/**
 * Build dataTypes
 * @param {Array} data - List of dataTypes
 * @return {object} Objet JSON Object of dataTypes
 */
Self.buildDataTypes = function (data) {
  let result = {
    subTypes: {},
    dataTypes: {},
    metadata: {}
  };
  for (let i = 0; i < data.length; i++) {
    let dataType = data[i],
      split = dataType.path.split(':'),
      parent = split[0],
      child = split.length > 1 ? split.slice(1).join(':') : '';
    if (!Array.isArray(result.dataTypes[parent])) result.dataTypes[parent] = [];
    // Case this is a subType
    if (child) {
      result.subTypes[dataType.id] = parent;
      if (!Array.isArray(result.dataTypes[parent])) result.dataTypes[parent] = [];
      result.dataTypes[parent].push(dataType.id);
    }
    result.metadata[dataType.id] = dataType;
  }
  return result;
};

/**
 * Get DataTypes data from wiki
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: dataTypes JSON formated)
 * @returns {undefined} undefined
 */
Self.getDataTypes = function (cb) {
  return request.get(
    conf.services['dataseer-wiki'].root + conf.services['dataseer-wiki'].dataTypes,
    function (error, response, body) {
      if (!error && response.statusCode == 200) {
        return Self.extractDataTypes(body.toString('utf8'), function (err, res) {
          if (err) return cb(err);
          return cb(null, res);
        });
      } else if (error) {
        return cb(error);
      } else {
        return cb(new Error('unspecified error'));
      }
    }
  );
};

/**
 * Extract DataTypes data from wiki (request on each dataType page)
 * @param {string} htmlString - HTML string of DataTypes page
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: dataTypes JSON formated)
 * @returns {undefined} undefined
 */
Self.extractDataTypes = function (htmlString, cb) {
  let $ = XML.load(htmlString),
    urls = $('a.wikilink1')
      .map(function (i, el) {
        let elem = $(el);
        if (elem.attr('href').indexOf('/doku.php?id=data_type:') > -1) {
          return elem.attr('href');
        }
      })
      .get();
  return async.mapLimit(
    urls,
    conf.services['dataseer-wiki'].limit,
    function (url, callback) {
      let dataTypeUrl = conf.services['dataseer-wiki'].root + url;
      return request.get(dataTypeUrl, function (error, response, body) {
        if (!error && response.statusCode == 200) {
          return Self.parseDataTaype(body.toString('utf8'), function (err, res) {
            if (err) return callback(err);
            res.url = dataTypeUrl;
            return callback(null, res);
          });
        } else if (error) {
          return callback(error);
        } else {
          return callback(new Error('unspecified error'));
        }
      });
    },
    function (err, dataTypes) {
      if (err) return cb(err);
      return cb(null, Self.buildDataTypes(dataTypes));
    }
  );
};

/**
 * Parse DataType data from wiki (request on each dataType page)
 * @param {string} htmlString - HTML string of DataType page
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: dataTypes JSON formated)
 * @returns {undefined} undefined
 */
Self.parseDataTaype = function (htmlString, cb) {
  let $ = XML.load(htmlString),
    lastKey = '',
    h2 = $('h2.sectionedit1'),
    data = $('div.level2 > *')
      .map(function (i, el) {
        if (el.name === 'p') {
          // if this is a p element
          let elem = $(el),
            strong = elem.find('strong'),
            text = strong.text(),
            html = elem.html();
          // if there is a strong HTML element
          if (!strong.length)
            return {
              'key': '',
              'value': '<p>' + elem.html() + '</p>'
            };
          else
            return {
              'key': text
                .substring(0, text.length - 1)
                .toLowerCase()
                .replace(/\s+/g, '_'),
              'value':
                '<p>' +
                html
                  .replace(new RegExp(`${strong.length ? cheerio.html(strong) : ''}(\<br\/\>)?`), '')
                  .replace(/^\s+/, '') +
                '</p>'
            };
        }
        // else just return html
        else
          return {
            'key': '',
            'value': `<${el.name}>${$(el).html()}</${el.name}>`
          };
      })
      .get()
      .reduce(function (res, current) {
        if (current.key) {
          lastKey = current.key;
          if (typeof res[lastKey] === 'undefined') res[lastKey] = [];
          res[lastKey].push('');
        }
        res[lastKey][res[lastKey].length - 1] += current.value;
        return res;
      }, {}),
    dataType = {
      'path': h2.attr('id').replace(/\-\_/g, ':').replace(/\_+/g, ' ').replace(/\s+/g, ' ').toLowerCase(),
      'id': h2.attr('id').split('-_').slice(-1)[0].replace(/\_+/g, ' ').replace(/\s+/g, ' ').toLowerCase(),
      'mesh_id':
        Array.isArray(data.mesh_id) && data.mesh_id[0] !== '<p>n/a</p>' ? Self.extractMeshId(data.mesh_id[0]) : [],
      'description': Array.isArray(data.description) ? data.description[0] : '',
      'bestDataFormatForSharing': Array.isArray(data.best_practice_for_sharing_this_type_of_data)
        ? data.best_practice_for_sharing_this_type_of_data[0]
        : '',
      'mostSuitableRepositories': Array.isArray(data.most_suitable_repositories)
        ? {
            'reuse': data.most_suitable_repositories[1] ? data.most_suitable_repositories[1] : '',
            'default': data.most_suitable_repositories[0] ? data.most_suitable_repositories[0] : ''
          }
        : {
            'reuse': '',
            'default': ''
          },
      'bestPracticeForIndicatingReUseOfExistingData': Array.isArray(
        data['best_practice_for_indicating_re-use_of_existing_data']
      )
        ? data['best_practice_for_indicating_re-use_of_existing_data'][0]
        : '',
      'label': h2.text().split('- ').slice(-1)[0]
    };
  dataType.count = dataTypesCounts[dataType.id] ? dataTypesCounts[dataType.id] : 0;
  return cb(null, dataType);
};

/**
 * Extract meshId
 * @param {string} str - String that will be processsed
 * @returns {string} Return list of meshIds
 */
Self.extractMeshId = function (str) {
  let $ = cheerio.load(str);
  return $('a')
    .map(function (i, el) {
      return $(el).text();
    })
    .get();
};

/**
 * Format string to Title Case
 * @param {string} str - String that will be processsed
 * @returns {string} Return processsed string
 */
Self.toTitleCase = function (str) {
  return str.replace(/\w*/g, function (txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
};

module.exports = Self;
