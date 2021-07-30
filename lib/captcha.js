/*
 * @prettier
 */

'use strict';

const fetch = require(`node-fetch`);

const recaptcha = require(`../conf/recaptcha.json`);

const Self = {};

/**
 * Check Google captcha (in HTTP body)
 * @param {object} req - req express variable
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: JSON Google response OR undefined)
 * @returns {undefined} undefined
 */
Self.check = function (req, cb) {
  // g-recaptcha-response is the key that browser will generate upon form submit.
  // if its blank or null means user has not selected the captcha, so return the error.
  if (
    req.body[`g-recaptcha-response`] === undefined ||
    req.body[`g-recaptcha-response`] === `` ||
    req.body[`g-recaptcha-response`] === null
  ) {
    return cb(null, new Error(`Missing g-recaptcha-response`));
  }
  // req.connection.remoteAddress will provide IP address of connected user.
  var verificationUrl =
    `https://www.google.com/recaptcha/api/siteverify?secret=` +
    recaptcha._reCAPTCHA_site_key_.private +
    `&response=` +
    req.body[`g-recaptcha-response`] +
    `&remoteip=` +
    req.connection.remoteAddress;
  // Hitting GET request to the URL, Google will respond with success or error scenario.
  return fetch(verificationUrl)
    .then((res) => {
      if (res.ok) {
        let body = res.json();
        if (body.score < recaptcha._reCAPTCHA_score_.limit)
          return cb(null, new Error(recaptcha._reCAPTCHA_score_.error));
        return cb(null, true);
      } else return cb(null, new Error(`recaptcha respond with HTTP status =/= 200`));
    })
    .catch(function (err) {
      // In case of process error
      return cb(err);
    });
};

module.exports = Self;
