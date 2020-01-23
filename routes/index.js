/*
 * @prettier
 */

const express = require('express'),
  router = express.Router(),
  passport = require('passport'),
  Upload = require('../lib/upload.js'),
  AccountsManager = require('../lib/accountsManager.js'),
  Accounts = require('../models/accounts.js');

/* GET home page. */
router.get('/', function(req, res, next) {
  return res.render('index', { 'title': 'DataSeer', 'current_user': req.user });
});

router.get('/', function(req, res) {
  res.render('index', { 'current_user': req.user });
});

router.get('/register', function(req, res) {
  if (typeof req.user !== 'undefined')
    return res.status(401).send('Your current role do not grant access to this part of website');
  res.render('register', {});
});

router.post('/register', function(req, res, next) {
  if (typeof req.user !== 'undefined')
    return res.status(401).send('Your current role do not grant access to this part of website');
  console.log('registering user');
  Accounts.register(
    new Accounts({ 'username': req.body.username, 'role': AccountsManager.roles.standard_user }),
    req.body.password,
    function(err) {
      if (err) {
        console.log('error while user register!', err);
        res.render('register', { 'error': err });
      }
      console.log('user registered!');
      return res.render('login', { 'success': 'New account created !', 'username': req.body.username });
    }
  );
});

router.get('/myAccount', function(req, res) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccountAccessRight(req.user))
    return res.status(401).send('Your current role do not grant access to this part of website');
  res.render('myAccount', { 'current_user': req.user });
});

router.post('/myAccount', function(req, res) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccountAccessRight(req.user))
    return res.status(401).send('Your current role do not grant access to this part of website');
  if (typeof req.body.current_password === 'undefined')
    return res.render('myAccount', { 'current_user': user, 'error': 'Current password incorrect !' });
  if (typeof req.body.new_password === 'undefined')
    return res.render('myAccount', { 'current_user': user, 'error': 'New password incorrect !' });
  Accounts.findOne({ 'username': req.user.username }, function(err, user) {
    if (err) return res.render('myAccount', { 'current_user': user, 'error': err.toString() });
    if (!user) return res.render('myAccount', { 'current_user': user, 'error': 'Current username is incorrect !' });
    user.changePassword(req.body.current_password, req.body.new_password, function(err) {
      if (err) return res.render('myAccount', { 'current_user': user, 'error': 'Current password incorrect !' });
      return res.render('myAccount', { 'current_user': req.user, 'success': 'Password update succeed !' });
    });
  });
});

router.get('/login', function(req, res) {
  let errors = req.flash('error');
  let error = Array.isArray(errors) && errors.length > 0 ? errors[0] : undefined;
  console.log(errors, error);
  return res.render('login', { 'current_user': req.user, 'error': error });
});

router.post(
  '/login',
  passport.authenticate('local', {
    'failureRedirect': '/login',
    'failureFlash': true
  }),
  function(req, res) {
    return res.redirect('/');
  }
);

router.get('/logout', function(req, res) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccountAccessRight(req.user))
    return res.status(401).send('Your current role do not grant access to this part of website');
  req.logout();
  return res.redirect('/');
});

/* UPLOAD Document */
router.get('/upload', function(req, res, next) {
  if (
    typeof req.user === 'undefined' ||
    !AccountsManager.checkAccountAccessRight(req.user, AccountsManager.roles.curator)
  )
    return res.status(401).send('Your current role do not grant access to this part of website');
  return res.render('/upload', {
    'title': 'DataSeer',
    'backoffice': true,
    'current_user': req.user
  });
});

module.exports = router;
