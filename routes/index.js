const express = require('express'),
  router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  return res.render('index', { 'title': 'DataSeer' });
});

module.exports = router;
