/*
 * @prettier
 */

const express = require('express'),
  router = express.Router(),
  path = require('path'),
  async = require('async'),
  AccountsManager = require('../lib/accountsManager.js'),
  Upload = require('../lib/upload.js');

/* UPLOAD Document */
router.get('/upload', function(req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccountAccessRight(req.user))
    return res.status(401).send('Your current role do not grant access to this part of website');
  return res.render(path.join('backoffice', 'upload'), {
    'title': 'DataSeer',
    'backoffice': true,
    'current_user': req.user
  });
});

/* UPLOAD Document */
router.post('/upload', function(req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccountAccessRight(req.user))
    return res.status(401).send('Your current role do not grant access to this part of website');
  let results = { 'errors': [], 'successes': [] },
    isCurator = AccountsManager.checkAccountAccessRight(req.user, AccountsManager.roles.curator),
    uploadedFiles = null,
    dataseerML = '';
  if (!req.files) {
    results.errors.push({ 'msg': 'You must send at least one file' });
    return res
      .status(400)
      .render(path.join('backoffice', 'results'), { 'backoffice': true, 'results': results, 'current_user': req.user });
  }
  if (Object.keys(req.files).length == 0) {
    results.errors.push({ 'msg': 'No file(s) were uploaded' });
    return res
      .status(400)
      .render(path.join('backoffice', 'results'), { 'backoffice': true, 'results': results, 'current_user': req.user });
  }
  uploadedFiles = Array.isArray(req.files['uploadedFiles'])
    ? isCurator
      ? req.files['uploadedFiles']
      : [req.files['uploadedFiles'][0]]
    : [req.files['uploadedFiles']];
  dataseerML = isCurator ? req.body.dataseerML : 'dataseer-ml';
  async.each(
    uploadedFiles,
    function(file, callback) {
      // Perform operation on file here.
      return Upload.processFile(file, dataseerML, function(error, result) {
        if (error) results.errors.push(error);
        if (result) results.successes.push(result);
        return callback();
      });
    },
    function(err) {
      // if any of the file processing produced an error, err would equal that error
      if (err) return console.log(err);
      return res.render(path.join('backoffice', 'results'), {
        'backoffice': true,
        'results': results,
        'current_user': req.user
      });
    }
  );
});

module.exports = router;
