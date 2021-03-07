/*
 * @prettier
 */
const request = require('request');

const conf = require('../conf/conf.json');

const Self = {};

/**
 * Check Google captcha (in HTTP body)
 * @param {Object} req Req express variable
 * @param {Function} cb Callback function(err, res) (err: error process OR null, res: JSON Google response OR undefined)
 * @returns {undefined} undefined
 */
Self.check = function (req, cb) {
  // g-recaptcha-response is the key that browser will generate upon form submit.
  // if its blank or null means user has not selected the captcha, so return the error.
  if (
    req.body['g-recaptcha-response'] === undefined ||
    req.body['g-recaptcha-response'] === '' ||
    req.body['g-recaptcha-response'] === null
  ) {
    return cb(true, 'Missing g-recaptcha-response');
  }
  // req.connection.remoteAddress will provide IP address of connected user.
  var verificationUrl =
    'https://www.google.com/recaptcha/api/siteverify?secret=' +
    conf._reCAPTCHA_site_key_.private +
    '&response=' +
    req.body['g-recaptcha-response'] +
    '&remoteip=' +
    req.connection.remoteAddress;
  // Hitting GET request to the URL, Google will respond with success or error scenario.
  return request(verificationUrl, function (error, response, body) {
    body = JSON.parse(body);
    return cb(false, body);
  });
};

module.exports = Self;
