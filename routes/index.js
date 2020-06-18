/*
 * @prettier
 */

const express = require('express'),
  crypto = require('crypto'),
  nodemailer = require('nodemailer'),
  router = express.Router(),
  passport = require('passport'),
  smtpConf = require('../conf/smtp.conf.json'),
  Upload = require('../lib/upload.js'),
  AccountsManager = require('../lib/accountsManager.js'),
  Documents = require('../models/documents.js'),
  Accounts = require('../models/accounts.js');

const passwordRegExp = new RegExp('[\\w^\\w]{6,}'),
  emailRegExp = new RegExp("[A-Za-z0-9!#$%&'*+-/=?^_`{|}~]+@[A-Za-z0-9-]+(.[A-Za-z0-9-]+)*");

const conf = require('../conf/conf.json');

let transporter = nodemailer.createTransport({
  'host': smtpConf.host,
  'port': smtpConf.port,
  'secure': false, // upgrade later with STARTTLS
  'auth': smtpConf.auth
});

const getMailTxt = function(url) {
    return (
      'Hi,\n' +
      'You can reset your password here : ' +
      url +
      '\n' +
      "Just ignore this email if you don't want to reset your password\n" +
      'This email has been automatically generated'
    );
  },
  getMailHtml = function(url) {
    return (
      'Hi,<br/>' +
      `You can reset your password <a href="${url}">here</a><br/>` +
      "Just ignore this email if you don't want to reset your password<br/>" +
      'This email has been automatically generated'
    );
  };

/* GET home page. */
router.get('/', function(req, res, next) {
  if (typeof req.user !== 'undefined') {
    if (AccountsManager.checkAccountAccessRight(req.user, AccountsManager.roles.curator))
      return res.render('index', {
        'route': '',
        'root': conf.root,
        'current_user': req.user
      });
    else return res.redirect('./myDocuments?redirect=true');
  } else return res.redirect('./signin');
});

router.get('/signup', function(req, res) {
  if (typeof req.user !== 'undefined') return res.redirect('./myDocuments');
  res.render('signup', { 'route': 'signup', 'root': conf.root });
});

router.post('/signup', function(req, res, next) {
  if (typeof req.user !== 'undefined')
    return res.status(401).send('Your current role do not grant access to this part of website');
  if (typeof req.body.username !== 'string' || !emailRegExp.test(req.body.username))
    return res.render('signup', {
      'route': 'signup',
      'root': conf.root,
      'error': 'Email incorrect !'
    });
  if (typeof req.body.password !== 'string' || !passwordRegExp.test(req.body.password))
    return res.render('signup', {
      'route': 'signup',
      'root': conf.root,
      'error': 'Password incorrect ! (At least 6 chars)'
    });
  return Accounts.register(
    new Accounts({ 'username': req.body.username, 'role': AccountsManager.roles.standard_user }),
    req.body.password,
    function(err) {
      if (err && err.name === 'UserExistsError') {
        console.log(err);
        return res.render('signup', {
          'route': 'signup',
          'root': conf.root,
          'error': 'A user with the given email address is already registered'
        });
      } else if (err) {
        console.log(err);
        return res.render('signup', {
          'route': 'signup',
          'root': conf.root,
          'error': 'Sorry, an error has occured. Try to signup later, or send an email to ' + smtpConf.auth.user
        });
      } else
        return res.render('signin', {
          'route': 'signin',
          'root': conf.root,
          'success': 'New account created !',
          'username': req.body.username
        });
    }
  );
});

router.get('/forgotPassword', function(req, res) {
  if (typeof req.user !== 'undefined')
    return res.status(401).send('Your current role do not grant access to this part of website');
  res.render('forgotPassword', { 'route': 'forgotPassword', 'root': conf.root });
});

router.post('/forgotPassword', function(req, res) {
  if (typeof req.user !== 'undefined')
    return res.status(401).send('Your current role do not grant access to this part of website');
  if (typeof req.body.username !== 'string' || !emailRegExp.test(req.body.username))
    res.render('forgotPassword', {
      'route': 'forgotPassword',
      'root': conf.root,
      'error': 'Email incorrect !'
    });
  return Accounts.findOne({ 'username': req.body.username }, function(err, user) {
    if (err) return res.render('forgotPassword', { 'route': 'forgotPassword', 'error': err.toString() });
    if (!user)
      return res.render('forgotPassword', {
        'route': 'forgotPassword',
        'root': conf.root,
        'error': 'Current username is incorrect !'
      });
    user.token = getRandomToken();
    return user.save(function(err) {
      if (err)
        return res.render('forgotPassword', {
          'route': 'forgotPassword',
          'root': conf.root,
          'error': err.toString()
        });
      let url = smtpConf.dataseerUrl + '/resetPassword?token=' + user.token + '&username=' + user.username;
      return transporter.sendMail(
        {
          'from': smtpConf.from, // sender address
          'to': user.username, // list of receivers
          'subject': smtpConf.subject, // Subject line
          'text': getMailTxt(url), // plain text body
          'html': getMailHtml(url) // html body
        },
        function(err, info) {
          if (err) {
            console.log(err);
            return res.render('forgotPassword', {
              'route': 'forgotPassword',
              'root': conf.root,
              'error':
                'Sorry, an error has occured. Try to reset your password later, or send an email to ' +
                smtpConf.auth.user
            });
          }
          return res.render('forgotPassword', {
            'route': 'forgotPassword',
            'root': conf.root,
            'success':
              'An email (allowing you to redefine your password) has been sent at the following address : ' +
              user.username
          });
        }
      );
    });
  });
});

router.get('/resetPassword', function(req, res) {
  if (typeof req.user !== 'undefined')
    return res.status(401).send('Your current role do not grant access to this part of website');
  res.render('resetPassword', {
    'route': 'resetPassword',
    'root': conf.root,
    'token': req.query.token,
    'username': req.query.username
  });
});

router.post('/resetPassword', function(req, res) {
  if (typeof req.user !== 'undefined')
    return res.status(401).send('Your current role do not grant access to this part of website');
  if (typeof req.body.username !== 'string' || !emailRegExp.test(req.body.username))
    return res.render('resetPassword', {
      'route': 'resetPassword',
      'root': conf.root,
      'error': 'Email incorrect !',
      'token': req.body.token,
      'username': req.body.username
    });
  if (typeof req.body.token !== 'string')
    return res.render('resetPassword', {
      'route': 'resetPassword',
      'error': 'Token incorrect !',
      'token': req.body.token,
      'username': req.body.username
    });
  if (typeof req.body.password !== 'string' || !passwordRegExp.test(req.body.password))
    return res.render('resetPassword', {
      'route': 'resetPassword',
      'root': conf.root,
      'error': 'New password incorrect ! (At least 6 chars)',
      'token': req.body.token,
      'username': req.body.username
    });
  return Accounts.findOne({ 'username': req.body.username, 'token': req.body.token }, function(err, user) {
    if (err)
      return res.render('resetPassword', {
        'route': 'resetPassword',
        'root': conf.root,
        'error': err.toString(),
        'token': req.body.token,
        'username': req.body.username
      });
    if (!user)
      return res.render('resetPassword', {
        'route': 'resetPassword',
        'root': conf.root,
        'error': 'Credentials incorrect !',
        'token': req.body.token,
        'username': req.body.username
      });
    return user.setPassword(req.body.password, function(err) {
      if (err)
        return res.render('resetPassword', {
          'route': 'resetPassword',
          'root': conf.root,
          'error': err.toString(),
          'token': req.body.token,
          'username': req.body.username
        });
      user.token = undefined;
      return user.save(function(err) {
        if (err)
          return res.render('resetPassword', {
            'route': 'resetPassword',
            'root': conf.root,
            'error': err.toString(),
            'token': req.body.token,
            'username': req.body.username
          });
        return res.render('signin', {
          'route': 'signin',
          'success': 'your password has been updated successfully',
          'root': './'
        });
      });
    });
  });
});

router.get('/settings', function(req, res) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccountAccessRight(req.user))
    return res.status(401).send('Your current role do not grant access to this part of website');
  return res.render('settings', {
    'route': 'settings',
    'root': conf.root,
    'current_user': req.user
  });
});

router.post('/settings', function(req, res) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccountAccessRight(req.user))
    return res.status(401).send('Your current role do not grant access to this part of website');
  if (typeof req.body.current_password !== 'string' || !passwordRegExp.test(req.body.current_password))
    return res.render('settings', {
      'route': 'settings',
      'root': conf.root,
      'current_user': req.user,
      'error': 'Current password incorrect ! (At least 6 chars)'
    });
  if (typeof req.body.new_password !== 'string' || !passwordRegExp.test(req.body.new_password))
    return res.render('settings', {
      'route': 'settings',
      'root': conf.root,
      'current_user': req.user,
      'error': 'New password incorrect ! (At least 6 chars)'
    });
  return Accounts.findOne({ 'username': req.user.username }, function(err, user) {
    if (err)
      return res.render('settings', {
        'route': 'settings',
        'root': conf.root,
        'current_user': user,
        'error': err.toString()
      });
    if (!user)
      return res.render('settings', {
        'route': 'settings',
        'root': conf.root,
        'current_user': user,
        'error': 'Current username is incorrect !'
      });
    user.changePassword(req.body.current_password, req.body.new_password, function(err) {
      if (err)
        return res.render('settings', {
          'route': 'settings',
          'root': conf.root,
          'current_user': user,
          'error': 'Current password incorrect !'
        });
      return res.render('settings', {
        'route': 'settings',
        'root': conf.root,
        'current_user': req.user,
        'success': 'Password update succeed !'
      });
    });
  });
});

router.get('/signin', function(req, res) {
  let errors = req.flash('error');
  let error = Array.isArray(errors) && errors.length > 0 ? 'Credentials incorrect !' : undefined;
  return res.render('signin', {
    'route': 'signin',
    'root': conf.root,
    'current_user': req.user,
    'error': error
  });
});

router.post(
  '/signin',
  passport.authenticate('local', {
    'failureRedirect': './signin',
    'failureFlash': true
  }),
  function(req, res) {
    return Accounts.findOne({ 'username': req.body.username }, function(err, user) {
      user.token = undefined;
      return user.save(function(err) {
        if (err) console.log('Error : token not deleted');
        return res.redirect('./');
      });
    });
  }
);

router.get('/signout', function(req, res) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccountAccessRight(req.user))
    return res.status(401).send('Your current role do not grant access to this part of website');
  req.logout();
  return res.redirect('./');
});

router.get('/myDocuments', function(req, res) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccountAccessRight(req.user))
    return res.status(401).send('Your current role do not grant access to this part of website');
  let key = 'modifiedBy.' + req.user.role.label + '.' + req.user.id,
    query = {},
    redirect = typeof req.query.redirect !== 'undefined' && req.query.redirect === 'true';
  query[key] = req.user.username;
  Documents.find(query).exec(function(err, post) {
    if (err) return next(err);
    if (post.length === 0 && redirect) return res.redirect('./backoffice/upload');
    return res.render('myDocuments', {
      'route': 'myDocuments',
      'root': conf.root,
      'search': true,
      'documents': post,
      'current_user': req.user
    });
  });
});

function getRandomToken(length = 256) {
  return crypto.randomBytes(length).toString('hex');
}

module.exports = router;
