/*
 * @prettier
 */

'use strict';

const fetch = require(`node-fetch`);
const async = require(`async`);

const services = require(`../conf/services/bioNLP.json`);

const fs = require(`fs`);

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
        if (services.API[`GeniaTagger`].disabled) return next(null, { service: `GeniaTagger`, res: null });
        return Self.request(
          `GeniaTagger`,
          {
            sentences: sentences.map(function (item) {
              return item.text.toString();
            })
          },
          function (err, query) {
            if (err) return next(null, { service: `GeniaTagger`, res: query, err });
            if (!Array.isArray(query.output.sentence))
              return next(null, {
                service: `GeniaTagger`,
                res: null,
                err: new Error(`Bad Bio NLP result : sentences not found`)
              });
            for (let i = 0; i < query.output.sentence.length; i++) {
              let sentence = query.output.sentence[i];
              let matchedSentence = sentences.filter(function (item) {
                return item.text === sentence.text;
              });
              if (matchedSentence.length === 1) results[`GeniaTagger`][matchedSentence[0].id] = { ...sentence };
            }
            return next(null, { service: `GeniaTagger`, res: query, err });
          }
        );
      },
      function (next) {
        if (services.API[`bioBERT`].disabled) return next(null, { service: `bioBERT`, res: null });
        return async.mapLimit(
          sentences,
          services.settings.limit,
          function (sentence, _next) {
            return Self.request(`bioBERT`, { sentence: sentence }, function (err, query) {
              if (!err) results[`bioBERT`][query.input.sentence.id] = { ...query.output };
              return _next(null, { err, query });
            });
          },
          function (err, res) {
            return next(null, { service: `bioBERT`, res, err });
          }
        );
      },
      function (next) {
        if (services.API[`BIONLP`].disabled) return next(null, { service: `BIONLP`, res: null });
        return async.mapLimit(
          sentences,
          services.settings.limit,
          function (sentence, _next) {
            return Self.request(`BIONLP`, { sentence: sentence }, function (err, query) {
              if (!err) results[`BIONLP`][query.input.sentence.id] = query.output;
              return _next(null, { err, query });
            });
          },
          function (err, res) {
            return next(null, { service: `BIONLP`, res, err });
          }
        );
      },
      function (next) {
        if (services.API[`BERT`][`CRAFT5000`].disabled) return next(null, { service: `BERT.CRAFT5000`, res: null });
        return async.mapLimit(
          sentences,
          services.settings.limit,
          function (sentence, _next) {
            return Self.request(`BERT.CRAFT5000`, { sentence: sentence }, function (err, query) {
              if (!err) results[`BERT.CRAFT5000`][query.input.sentence.id] = { ...query.output };
              return _next(null, { err, query });
            });
          },
          function (err, res) {
            return next(null, { service: `BERT.CRAFT5000`, res, err });
          }
        );
      },
      function (next) {
        if (services.API[`BERT`][`LabMaterials`].disabled)
          return next(null, { service: `BERT.LabMaterials`, res: null });
        return async.mapLimit(
          sentences,
          services.settings.limit,
          function (sentence, _next) {
            return Self.request(`BERT.LabMaterials`, { sentence: sentence }, function (err, query) {
              if (!err) results[`BERT.LabMaterials`][query.input.sentence.id] = { ...query.output };
              return _next(null, { err, query });
            });
          },
          function (err, res) {
            return next(null, { service: `BERT.LabMaterials`, res, err });
          }
        );
      }
    ],
    function (action, next) {
      return action(function (err, res) {
        return next(err, res);
      });
    },
    function (err, res) {
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
    body = JSON.stringify(opts.sentence.text);
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
    body = JSON.stringify({ sentence: opts.sentence.text });
    headers = { 'Content-Type': `application/json` };
    error = null;
    break;
  case `BERT.LabMaterials`:
    // BERT.LabMaterials -> //  curl --location 'URL' --header 'Content-Type: application/json' --data '{ "api_key": "...", "sentence":"..." }'
    url = services.API.BERT.LabMaterials.url;
    body = JSON.stringify({ sentence: opts.sentence.text });
    headers = { 'Content-Type': `application/json` };
    error = null;
    break;
  case `bioBERT`:
    // bioBERT -> // curl --location 'URL' --header 'Content-Type: application/json' --data '{ "text": "..." }'
    url = services.API.bioBERT.url;
    body = JSON.stringify({ text: opts.sentence.text });
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
    .then(function (data) {
      return cb(null, { input: opts, output: data });
    })
    .catch(function (err) {
      return cb(err);
    });
};

module.exports = Self;
