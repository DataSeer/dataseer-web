/*
 * @prettier
 */

'use strict';

const fetch = require(`node-fetch`);
const async = require(`async`);

const services = require(`../conf/services/bioNLP.json`);

let Self = {};

/**
 * Send sentences to BIONLP services
 * @param {array} sentences - Sentences that will be sent to the given service
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: xml string OR undefined)
 * @returns {undefined} undefined
 */
Self.processSentences = function (sentences, cb) {
  let results = {
    'GeniaTagger': {},
    'BERT.LabMaterials': {},
    'BERT.CRAFT5000': {},
    'bioBERT': {},
    'BIONLP': {}
  };
  if (!Array.isArray(sentences)) return cb(true, new Error(`Bad required data: sentences must be an Array`));
  return async.map(
    [
      function (next) {
        if (services.API[`GeniaTagger`].disabled) return next();
        return Self.request(
          `GeniaTagger`,
          {
            sentences: sentences.map(function (item) {
              return item.text.toString();
            })
          },
          function (err, body) {
            if (err) return next(err);
            if (!Array.isArray(body.sentence)) return next(new Error(`Bad Bio NLP result : sentences not found`));
            for (let i = 0; i < body.sentence.length; i++) {
              let sentence = body.sentence[i];
              let matchedSentence = sentences.filter(function (item) {
                return item.text === sentence.text;
              });
              if (matchedSentence.length === 1)
                results[`GeniaTagger`][matchedSentence[0].id] = { ...sentence, id: matchedSentence[0].id };
            }
            return next();
          }
        );
      },
      function (next) {
        if (services.API[`bioBERT`].disabled) return next();
        return async.mapLimit(
          sentences,
          services.settings.limit,
          function (sentence, _next) {
            return Self.request(`bioBERT`, { sentence: sentence.text.toString() }, function (err, body) {
              if (!err) results[`bioBERT`][sentence.id] = { ...body, id: sentence.id };
              return _next(err);
            });
          },
          function (err) {
            return next(err);
          }
        );
      },
      function (next) {
        if (services.API[`BIONLP`].disabled) return next();
        return async.mapLimit(
          sentences,
          services.settings.limit,
          function (sentence, _next) {
            return Self.request(`BIONLP`, { sentence: sentence.text.toString() }, function (err, body) {
              if (!err) results[`BIONLP`][sentence.id] = { ...body };
              return _next(err);
            });
          },
          function (err) {
            return next(err);
          }
        );
      },
      function (next) {
        if (services.API[`BERT`][`CRAFT5000`].disabled) return next();
        return async.mapLimit(
          sentences,
          services.settings.limit,
          function (sentence, _next) {
            return Self.request(`BERT.CRAFT5000`, { sentence: sentence.text.toString() }, function (err, body) {
              if (!err) results[`BERT.CRAFT5000`][sentence.id] = { ...body, id: sentence.id };
              return _next(err);
            });
          },
          function (err) {
            return next(err);
          }
        );
      },
      function (next) {
        if (services.API[`BERT`][`LabMaterials`].disabled) return next();
        return async.mapLimit(
          sentences,
          services.settings.limit,
          function (sentence, _next) {
            return Self.request(`BERT.LabMaterials`, { sentence: sentence.text.toString() }, function (err, body) {
              if (!err) results[`BERT.LabMaterials`][sentence.id] = { ...body, id: sentence.id };
              return _next(err);
            });
          },
          function (err) {
            return next(err);
          }
        );
      }
    ],
    function (action, next) {
      return action(function (err) {
        return next(err);
      });
    },
    function (err) {
      if (err) return cb(true, err);
      return cb(null, results);
    }
  );
};

/**
 * Send sentence to BIONLP services
 * @param {object} opts - Opts that will be sent to the given service
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: xml string OR undefined)
 * @returns {undefined} undefined
 */
Self.request = function (service, opts, cb) {
  let url = ``;
  let body = {};
  let headers = undefined;
  let error = new Error(`Service '${service}' not managed`);

  switch (service) {
  case `BIONLP`:
    // BIONLP -> curl --location 'URL' --header 'Content-Type: text/plain' --data 'SENTENCE'
    url = services.API.BIONLP.url;
    body = JSON.stringify(opts.sentence);
    headers = { 'Content-Type': `text/plain` };
    error = null;
    break;
  case `GeniaTagger`:
    // GeniaTagger -> curl --location 'URL' --header 'Content-Type: application/json' --data '{ "api_key": "...", "sentences": [...] }'
    url = services.API.GeniaTagger.url;
    body = JSON.stringify({ api_key: services.API.GeniaTagger.api_key, sentences: opts.sentences });
    headers = { 'Content-Type': `application/json` };
    error = null;
    break;
  case `BERT.CRAFT5000`:
    // BERT.CRAFT5000 -> // curl --location 'URL' --header 'Content-Type: application/json' --data '{ "sentence":"..." }'
    url = services.API.BERT.CRAFT5000.url;
    body = JSON.stringify({ sentence: opts.sentence });
    headers = { 'Content-Type': `application/json` };
    error = null;
    break;
  case `BERT.LabMaterials`:
    // BERT.LabMaterials -> //  curl --location 'URL' --header 'Content-Type: application/json' --data '{ "api_key": "...", "sentence":"..." }'
    url = services.API.BERT.LabMaterials.url;
    body = JSON.stringify({ sentence: opts.sentence });
    headers = { 'Content-Type': `application/json` };
    error = null;
    break;
  case `bioBERT`:
    // bioBERT -> // curl --location 'URL' --header 'Content-Type: application/json' --data '{ "text": "..." }'
    url = services.API.BIONLP.url;
    body = JSON.stringify({ text: opts.text });
    headers = { 'Content-Type': `application/json` };
    error = null;
    break;
  }
  if (error instanceof Error) return cb(null, error);
  return fetch(url, {
    method: `POST`,
    body: body,
    headers: headers
  })
    .then(function (res) {
      // res.status >= 200 && res.status < 300
      if (res.ok) return res;
      throw new Error(res.statusText);
    })
    .then(function (res) {
      return res.json();
    })
    .then(function (body) {
      return cb(null, body);
    })
    .catch(function (err) {
      return cb(err);
    });
};

module.exports = Self;
