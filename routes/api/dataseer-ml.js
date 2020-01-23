/*
 * @prettier
 */

const express = require('express'),
  router = express.Router(),
  request = require('request'),
  AccountsManager = require('../../lib/accountsManager.js'),
  conf = require('../../conf/conf.json');

/* SAVE Document */
router.post('/processDataseerSentence', function(req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccountAccessRight(req.user))
    return res.status(401).send('Your current role do not grant access to this part of website');
  return request.post(
    {
      'headers': { 'content-type': 'application/x-www-form-urlencoded' },
      'url': conf.services['dataseer-ml'] + '/processDataseerSentence',
      'body': 'text=' + encodeURIComponent(req.body.text)
    },
    function(error, response, body) {
      if (!error && response.statusCode == 200) {
        return res.json(body);
      } else {
        return next(error);
      }
    }
  );
});

module.exports = router;
