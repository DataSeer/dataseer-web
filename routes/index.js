const express = require('express'),
  conf = require('../conf/conf.json'),
  router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  console.log(conf.baseUrl);
  res.render('index', { 'baseUrl' : conf.baseUrl, 'title': 'DataSeer' });
});

module.exports = router;