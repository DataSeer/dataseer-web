/*
 * @prettier
 */

'use strict';

const path = require('path'),
  express = require('express'),
  router = express.Router(),
  passport = require('passport');

const Mailer = require('../lib/mailer.js'),
  JWT = require('../lib/jwt.js'),
  AccountsManager = require('../lib/accounts.js'),
  Captcha = require('../lib/captcha.js');

const Documents = require('../models/documents.js'),
  Organisations = require('../models/organisations.js'),
  Accounts = require('../models/accounts.js');

const AccountsController = require('../controllers/accounts.js');

const conf = require('../conf/conf.json'),
  smtpConf = require('../conf/smtp.conf.json');

/* GET home page. */
router.get('/', function (req, res, next) {
  // If user is logged in
  if (typeof req.user !== 'undefined') {
    // If user is curator
    if (AccountsManager.checkAccessRight(req.user, AccountsManager.roles.curator))
      return res.render('index', {
        route: '',
        conf: conf,
        current_user: req.user
      });
    else return res.redirect('./myDocuments?redirect=true');
  } else return res.redirect('./signin');
});

/* GET privacy page. */
router.get('/privacy', function (req, res, next) {
  return res.render('privacy', {
    route: 'privacy',
    conf: conf
  });
});

/* GET signup page. */
router.get('/signup', function (req, res, next) {
  // If user is logged in
  if (typeof req.user !== 'undefined') return res.redirect('./myDocuments');
  // else
  return Organisations.find({}).exec(function (err, organisations) {
    if (err) return next(err);
    let error = req.flash('error'),
      success = req.flash('success');
    return res.render('signup', {
      route: 'signup',
      conf: conf,
      _reCAPTCHA_site_key_: conf._reCAPTCHA_site_key_.public,
      organisations: organisations,
      error: Array.isArray(error) && error.length > 0 ? error : undefined,
      success: Array.isArray(success) && success.length > 0 ? success : undefined
    });
  });
});

/* POST signup page. */
router.post('/signup', function (req, res, next) {
  return Captcha.check(req, function (err, data) {
    // If captcha not checked
    if (err || data.score < conf._reCAPTCHA_score_.limit) {
      let error = typeof data === 'string' ? data : conf._reCAPTCHA_score_.error;
      return res.render('signup', {
        route: 'signup',
        conf: conf,
        error: error,
        _reCAPTCHA_site_key_: conf._reCAPTCHA_site_key_.public
      });
    }
    // If user is logged in
    if (typeof req.user !== 'undefined')
      return res.status(401).send('Your current role does not grant you access to this part of the website');
    // If username is not set OR well formed
    if (typeof req.body.fullname !== 'string' || req.body.fullname.length <= 0)
      return res.render('signup', {
        route: 'signup',
        conf: conf,
        error: 'Email incorrect !',
        _reCAPTCHA_site_key_: conf._reCAPTCHA_site_key_.public
      });
    // If username is not set OR well formed
    if (typeof req.body.username !== 'string' || !AccountsController.RegExp.email.test(req.body.username))
      return res.render('signup', {
        route: 'signup',
        conf: conf,
        error: 'Email incorrect !',
        _reCAPTCHA_site_key_: conf._reCAPTCHA_site_key_.public
      });
    // If password is not set OR well formed
    if (typeof req.body.password !== 'string' || !AccountsController.RegExp.password.test(req.body.password))
      return res.render('signup', {
        route: 'signup',
        conf: conf,
        error: 'Password incorrect ! (At least 6 chars)',
        _reCAPTCHA_site_key_: conf._reCAPTCHA_site_key_.public
      });
    // If confirm_password is not set OR well formed OR not equal to password
    if (
      typeof req.body.confirm_password !== 'string' ||
      !AccountsController.RegExp.password.test(req.body.confirm_password) ||
      req.body.password !== req.body.confirm_password
    )
      return res.render('signup', {
        route: 'signup',
        conf: conf,
        error: 'Passwords must be same !',
        _reCAPTCHA_site_key_: conf._reCAPTCHA_site_key_.public
      });
    // If organisation is not set
    if (typeof req.body.organisation !== 'string') {
      return res.render('signup', {
        route: 'signup',
        conf: conf,
        error: 'Organisation incorrect !',
        _reCAPTCHA_site_key_: conf._reCAPTCHA_site_key_.public
      });
    }
    // Else process sign up
    return AccountsController.signup(
      {
        fullname: req.body.fullname,
        username: req.body.username,
        organisation: req.body.organisation,
        password: req.body.password
      },
      function (err) {
        // If user (username) already exist
        if (err && err.name === 'UserExistsError') {
          console.log(err);
          return res.render('signup', {
            route: 'signup',
            conf: conf,
            error: 'A user with the given email address is already registered',
            _reCAPTCHA_site_key_: conf._reCAPTCHA_site_key_.public
          });
          // If sign up failed for unknow reason
        } else if (err) {
          console.log(err);
          return res.render('signup', {
            route: 'signup',
            conf: conf,
            error: 'Sorry, an error has occured. Try to signup later, or send an email to ' + smtpConf.auth.user,
            _reCAPTCHA_site_key_: conf._reCAPTCHA_site_key_.public
          });
          // If sign up went well
        } else
          return res.render('signin', {
            route: 'signin',
            conf: conf,
            success: 'New account created !',
            username: req.body.username
          });
      }
    );
  });
});

/* GET forgotPassword page. */
router.get('/forgotPassword', function (req, res) {
  // If user is logged in
  if (typeof req.user !== 'undefined')
    return res.status(401).send('Your current role does not grant you access to this part of the website');
  res.render('forgotPassword', { route: 'forgotPassword', conf: conf });
});

/* POST forgotPassword page. */
router.post('/forgotPassword', function (req, res) {
  // If user is logged in
  if (typeof req.user !== 'undefined')
    return res.status(401).send('Your current role does not grant you access to this part of the website');
  // If username is not set OR well formed
  if (typeof req.body.username !== 'string' || !AccountsController.RegExp.email.test(req.body.username))
    res.render('forgotPassword', {
      route: 'forgotPassword',
      conf: conf,
      error: 'Email incorrect !'
    });
  return Accounts.findOne({ username: req.body.username }).exec(function (err, user) {
    // If MongoDB error has occured
    if (err)
      return res.render('forgotPassword', {
        route: 'forgotPassword',
        error: err.toString()
      });
    // If user not found
    if (!user)
      return res.render('forgotPassword', {
        route: 'forgotPassword',
        conf: conf,
        error: 'Current username is incorrect !'
      });
    // If privateKey not found
    let privateKey = req.app.get('private.key');
    if (!privateKey)
      return res.render('forgotPassword', {
        route: 'forgotPassword',
        conf: conf,
        error:
          'Sorry, an error has occured. Try to reset your password later, or send an email to ' + smtpConf.auth.user
      });
    return JWT.create(
      { username: user.username },
      privateKey,
      conf.tokens.resetPassword.expiresIn,
      function (err, token) {
        // If JWT error has occured
        if (err) {
          console.log(err);
          return res.render('forgotPassword', {
            route: 'forgotPassword',
            conf: conf,
            error:
              'Sorry, an error has occured. Try to reset your password later, or send an email to ' + smtpConf.auth.user
          });
        }
        user.tokens.resetPassword = token;
        return user.save(function (err) {
          // If MongoDB error has occured
          if (err)
            return res.render('forgotPassword', {
              route: 'forgotPassword',
              conf: conf,
              error: err.toString()
            });
          let url =
            conf.root + 'resetPassword?resetPasswordToken=' + user.tokens.resetPassword + '&username=' + user.username;
          return Mailer.sendMail(
            {
              'to': user.username,
              'subject': Mailer.getResetPasswordSubject(),
              'text': Mailer.getResetPasswordBodyTxt({ url: url }),
              'html': Mailer.getResetPasswordBodyHtml({ url: url })
            },
            function (err, info) {
              // If Mailer error has occured
              if (err) {
                console.log(err);
                return res.render('forgotPassword', {
                  route: 'forgotPassword',
                  conf: conf,
                  error:
                    'Sorry, an error has occured. Try to reset your password later, or send an email to ' +
                    smtpConf.auth.user
                });
              }
              // If process succeed
              return res.render('forgotPassword', {
                route: 'forgotPassword',
                conf: conf,
                success:
                  'An email (allowing you to redefine your password) has been sent at the following address: ' +
                  user.username
              });
            }
          );
        });
      }
    );
  });
});

/* GET resetPassword page. */
router.get('/resetPassword', function (req, res) {
  // If user is logged in
  if (typeof req.user !== 'undefined')
    return res.status(401).send('Your current role does not grant you access to this part of the website');
  res.render('resetPassword', {
    route: 'resetPassword',
    conf: conf,
    resetPasswordToken: req.query.resetPasswordToken,
    username: req.query.username
  });
});

/* POST resetPassword page. */
router.post('/resetPassword', function (req, res) {
  // If user is logged in
  if (typeof req.user !== 'undefined')
    return res.status(401).send('Your current role does not grant you access to this part of the website');
  // If username is not set OR not well formed
  if (typeof req.body.username !== 'string' || !AccountsController.RegExp.email.test(req.body.username))
    return res.render('resetPassword', {
      route: 'resetPassword',
      conf: conf,
      error: 'Email incorrect !',
      resetPasswordToken: req.body.resetPasswordToken,
      username: req.body.username
    });
  // If token is not set
  if (typeof req.body.resetPasswordToken !== 'string')
    return res.render('resetPassword', {
      route: 'resetPassword',
      error: 'Token incorrect !',
      resetPasswordToken: req.body.resetPasswordToken,
      username: req.body.username
    });
  // If password is not set OR not well formed
  if (typeof req.body.password !== 'string' || !AccountsController.RegExp.password.test(req.body.password))
    return res.render('resetPassword', {
      route: 'resetPassword',
      conf: conf,
      error: 'New password incorrect ! (At least 6 chars)',
      resetPasswordToken: req.body.resetPasswordToken,
      username: req.body.username
    });
  // If privateKey not found
  let privateKey = req.app.get('private.key');
  if (!privateKey)
    return res.render('resetPassword', {
      route: 'resetPassword',
      conf: conf,
      error: 'Sorry, an error has occured. Try to reset your password later, or send an email to ' + smtpConf.auth.user
    });
  return JWT.check(
    req.body.resetPasswordToken,
    privateKey,
    { maxAge: conf.tokens.resetPassword.maxAge },
    function (err, decoded) {
      // If token did not match
      if (err)
        return res.render('resetPassword', {
          route: 'resetPassword',
          conf: conf,
          error: `Token incorrect ! (${err.message})`
        });
      // If token did not match
      if (decoded.username !== req.body.username)
        return res.render('resetPassword', {
          route: 'resetPassword',
          conf: conf,
          error: 'Token incorrect ! (authentication failed)'
        });
      return AccountsController.resetPassword(
        { username: req.body.username, token: req.body.resetPasswordToken, password: req.body.password },
        function (err) {
          if (err)
            return res.render('resetPassword', {
              route: 'resetPassword',
              conf: conf,
              error: err.toString(),
              resetPasswordToken: req.body.resetPasswordToken,
              username: req.body.username
            });
          req.flash('success', 'your password has been updated successfully');
          return res.redirect('./signin');
        }
      );
    }
  );
});

/* GET settings page. */
router.get('/settings', function (req, res) {
  // If user is not logged in OR is not at least a standard_user
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccessRight(req.user))
    return res.status(401).send('Your current role does not grant you access to this part of the website');
  return res.render('settings', {
    route: 'settings',
    conf: conf,
    current_user: req.user
  });
});

/* POST settings page. */
router.post('/settings', function (req, res) {
  // If user is not logged in OR is not at least a standard_user
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccessRight(req.user))
    return res.status(401).send('Your current role does not grant you access to this part of the website');
  // If current_password is not set OR is not well formed
  if (
    typeof req.body.current_password !== 'string' ||
    !AccountsController.RegExp.password.test(req.body.current_password)
  )
    return res.render('settings', {
      route: 'settings',
      conf: conf,
      current_user: req.user,
      error: 'Current password incorrect ! (At least 6 chars)'
    });
  // If new_password is not set OR is not well formed
  if (typeof req.body.new_password !== 'string' || !AccountsController.RegExp.password.test(req.body.new_password))
    return res.render('settings', {
      route: 'settings',
      conf: conf,
      current_user: req.user,
      error: 'New password incorrect ! (At least 6 chars)'
    });
  return Accounts.findOne({ username: req.user.username }).exec(function (err, user) {
    if (err)
      return res.render('settings', {
        route: 'settings',
        conf: conf,
        current_user: user,
        error: err.toString()
      });
    // If user not found
    if (!user)
      return res.render('settings', {
        route: 'settings',
        conf: conf,
        current_user: user,
        error: 'Current username is incorrect !'
      });
    user.changePassword(req.body.current_password, req.body.new_password, function (err) {
      // If password not changed
      if (err)
        return res.render('settings', {
          route: 'settings',
          conf: conf,
          current_user: user,
          error: 'Current password incorrect !'
        });
      // If password has been well updated
      return res.render('settings', {
        route: 'settings',
        conf: conf,
        current_user: req.user,
        success: 'Password update succeed !'
      });
    });
  });
});

/* GET signin page. */
router.get('/signin', function (req, res) {
  // If user is logged in
  if (typeof req.user !== 'undefined') return res.redirect('./myDocuments');
  let errors = req.flash('error'),
    success = req.flash('success'),
    redirect = typeof req.query.redirect !== 'undefined' ? req.query.redirect : undefined,
    error = Array.isArray(errors) && errors.length > 0 ? 'Credentials incorrect !' : undefined;
  return res.render('signin', {
    route: 'signin',
    conf: conf,
    current_user: req.user,
    error: error,
    success: Array.isArray(success) && success.length > 0 ? success : undefined,
    redirect: redirect
  });
});

/* POST signin page. */
router.post(
  '/signin',
  passport.authenticate('local', {
    failureRedirect: './signin',
    failureFlash: true
  }),
  function (req, res) {
    let redirect = typeof req.body.redirect !== 'undefined' ? req.body.redirect : undefined;
    return Accounts.findOne({ username: req.body.username }).exec(function (err, user) {
      user.tokens.resetPassword = '';
      return user.save(function (err) {
        if (err) console.log('Error: token not deleted');
        if (!redirect) return res.redirect('./');
        else return res.redirect('./' + redirect);
      });
    });
  }
);

/* GET signout page. */
router.get('/signout', function (req, res) {
  // If user is not logged in OR is not at least a standard_user
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccessRight(req.user))
    return res.status(401).send('Your current role does not grant you access to this part of the website');
  req.logout();
  return res.redirect('./');
});

/* GET myDocuments page. */
router.get('/myDocuments', function (req, res) {
  // If user is not logged in OR is not at least a standard_user
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccessRight(req.user))
    return res.status(401).send('Your current role does not grant you access to this part of the website');
  let query = { 'owner': req.user.id },
    limit = parseInt(req.query.limit),
    skip = parseInt(req.query.skip),
    redirect = typeof req.query.redirect !== 'undefined' && req.query.redirect === 'true';
  if (isNaN(limit) || limit < 0) limit = 0;
  if (isNaN(skip) || skip < 0) skip = 0;
  return Documents.find(query)
    .sort({ _id: -1 })
    .limit(limit)
    .skip(skip)
    .populate('metadata')
    .populate('pdf')
    .populate('tei')
    .exec(function (err, post) {
      if (err) return next(err);
      if (post.length === 0 && redirect) return res.redirect('./backoffice/upload');
      return res.render('myDocuments', {
        route: 'myDocuments',
        conf: conf,
        search: true,
        documents: post,
        current_user: req.user
      });
    });
});

module.exports = router;
