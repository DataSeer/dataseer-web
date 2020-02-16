/*
 * @prettier
 */

const express = require('express'),
  router = express.Router(),
  path = require('path'),
  async = require('async'),
  AccountsManager = require('../lib/accountsManager.js'),
  Accounts = require('../models/accounts.js'),
  extractor = require('../lib/extractor.js'),
  Upload = require('../lib/upload.js');

const emailRegExp = new RegExp("[A-Za-z0-9!#$%&'*+-/=?^_`{|}~]+@[A-Za-z0-9-]+(.[A-Za-z0-9-]+)*");

/* GET all accounts */
router.get('/accounts', function(req, res, next) {
  if (
    typeof req.user === 'undefined' ||
    !AccountsManager.checkAccountAccessRight(req.user, AccountsManager.roles.curator)
  )
    return res.status(401).send('Your current role do not grant access to this part of website');
  let limit = parseInt(req.query.limit),
    error = req.flash('error'),
    success = req.flash('success');
  if (isNaN(limit)) limit = 20;
  Accounts.find({})
    .limit(limit)
    .exec(function(err, post) {
      if (err) return next(err);
      return res.render(path.join('backoffice', 'accounts'), {
        'route': '/backoffice/accounts',
        'deep': '../../',
        'search': true,
        'current_user': req.user,
        'accounts': post,
        'error': Array.isArray(error) && error.length > 0 ? error : undefined,
        'success': Array.isArray(success) && success.length > 0 ? success : undefined
      });
    });
});

/* Update an account */
router.post('/accounts', function(req, res, next) {
  if (
    typeof req.user === 'undefined' ||
    !AccountsManager.checkAccountAccessRight(req.user, AccountsManager.roles.curator)
  )
    return res.status(401).send('Your current role do not grant access to this part of website');
  if (typeof req.body.username !== 'string' || !emailRegExp.test(req.body.username)) {
    req.flash('error', 'Incorrect Email');
    return res.redirect('/backoffice/accounts');
  }

  return Accounts.findOne({ 'username': req.body.username }, function(err, user) {
    let role = AccountsManager.roles[req.body.role];
    if (typeof role === 'undefined') {
      req.flash('error', 'Incorrect role');
      return res.redirect('/backoffice/accounts');
    }
    user.role = role;
    return user.save(function(err) {
      if (err) {
        req.flash('error', err);
        return res.redirect('/backoffice/accounts');
      }
      req.flash('success', 'User role has been successfully updateted');
      return res.redirect('/backoffice/accounts');
    });
  });
});

/* UPLOAD Document */
router.get('/upload', function(req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccountAccessRight(req.user))
    return res.status(401).send('Your current role do not grant access to this part of website');
  return res.render(path.join('backoffice', 'upload'), {
    'route': '/backoffice/upload',
    'deep': '../../',
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
    return res.status(400).render(path.join('backoffice', 'upload'), {
      'route': '/backoffice/upload',
      'deep': '../../',
      'backoffice': true,
      'results': results,
      'current_user': req.user
    });
  }
  if (Object.keys(req.files).length == 0) {
    results.errors.push({ 'msg': 'No file(s) were uploaded' });
    return res.status(400).render(path.join('backoffice', 'upload'), {
      'route': '/backoffice/upload',
      'deep': '../../',
      'backoffice': true,
      'results': results,
      'current_user': req.user
    });
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
      return Upload.processFile(file, dataseerML, req.app.get('dataTypes.json'), req.user, function(error, result) {
        if (error) results.errors.push(error);
        if (result) results.successes.push(result);
        return callback();
      });
    },
    function(err) {
      // if any of the file processing produced an error, err would equal that error
      if (err) {
        console.log(err);
        return res.render(path.join('backoffice', 'upload'), {
          'route': '/backoffice/upload',
          'deep': '../../',
          'backoffice': true,
          'results': results,
          'current_user': req.user
        });
      }
      return res.render(path.join('backoffice', 'upload'), {
        'route': '/backoffice/upload',
        'deep': '../../',
        'backoffice': true,
        'results': results,
        'current_user': req.user
      });
    }
  );
});

module.exports = router;
