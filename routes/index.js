const express = require('express'),
  router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { 'root':'./', 'title': 'DataSeer' });
});

module.exports = router;