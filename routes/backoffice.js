/*
 * @prettier
 */

'use strict';

const express = require('express'),
  router = express.Router(),
  url = require('url'),
  path = require('path');

const Mailer = require('../lib/mailer.js'),
  JWT = require('../lib/jwt.js'),
  AccountsManager = require('../lib/accounts.js');

const Accounts = require('../models/accounts.js'),
  Organisations = require('../models/organisations.js'),
  Roles = require('../models/roles.js'),
  Documents = require('../models/documents.js');

const AccountsController = require('../controllers/accounts.js'),
  DocumentsController = require('../controllers/documents.js');

const conf = require('../conf/conf.json'),
  smtpConf = require('../conf/smtp.conf.json');

/* GET on accounts page */
router.get('/accounts', function (req, res, next) {
  // If user is not logged in OR is not at least a curator
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccessRight(req.user, AccountsManager.roles.curator))
    return res.status(401).send('Your current role do not grant access to this part of website');
  let limit = parseInt(req.query.limit),
    skip = parseInt(req.query.skip),
    role = req.query.role,
    organisation = req.query.organisation,
    query = {};
  if (isNaN(limit) || limit < 0) limit = 20;
  if (isNaN(skip) || skip < 0) skip = 0;
  if (role) query.role = role;
  if (organisation) query.organisation = organisation;
  return Accounts.find(query)
    .limit(limit)
    .skip(skip)
    .exec(function (err, accounts) {
      // If MongoDB error has occured
      if (err) return next(err);
      return Organisations.find({}).exec(function (err, organisations) {
        // If MongoDB error has occured
        if (err) return next(err);
        return Roles.find({}).exec(function (err, roles) {
          // If MongoDB error has occured
          if (err) return next(err);
          let error = req.flash('error'),
            success = req.flash('success');
          return res.render(path.join('backoffice', 'accounts'), {
            route: 'backoffice/accounts',
            params: req.query,
            conf: conf,
            search: true,
            current_user: req.user,
            accounts: accounts,
            roles: roles,
            organisations: organisations,
            error: Array.isArray(error) && error.length > 0 ? error : undefined,
            success: Array.isArray(success) && success.length > 0 ? success : undefined
          });
        });
      });
    });
});

/* POST on accounts page */
router.post('/accounts', function (req, res, next) {
  // If user is not logged in OR is not at least a curator
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccessRight(req.user, AccountsManager.roles.curator))
    return res.status(401).send('Your current role do not grant access to this part of website');
  if (typeof req.body.update !== 'undefined' && req.body.update === '') {
    // If username is not set
    if (typeof req.body.username !== 'string') {
      req.flash('error', 'Invalid username !');
      return res.redirect('./accounts');
    }
    // If fullname is not set OR not well formed
    if (typeof req.body.fullname !== 'string') {
      req.flash('error', 'Invalid fullname !');
      return res.redirect('./accounts');
    }
    // If organisation is not set
    if (typeof req.body.organisation !== 'string') {
      req.flash('error', 'Invalid organisation !');
      return res.redirect('./accounts');
    }
    return Accounts.findOne({ username: req.body.username }).exec(function (err, user) {
      // If MongoDB error has occured
      if (err) return next(err);
      return Organisations.findById(req.body.organisation).exec(function (err, organisation) {
        // If MongoDB error has occured
        if (err) return next(err);
        // If organisation does not exist
        if (!organisation) {
          req.flash('error', 'Invalid organisation !');
          return res.redirect('./accounts');
        }
        // If role is not set OR role does not exist
        if (typeof req.body.role !== 'string' || !req.app.get('roles')[req.body.role]) {
          req.flash('error', 'Invalid role !');
          return res.redirect('./accounts');
        }
        user.depopulate('organisation');
        user.depopulate('role');
        user.fullname = req.body.fullname;
        user.organisation = req.body.organisation;
        user.role = req.body.role;
        return user.save(function (err) {
          // If MongoDB error has occured
          if (err) return next(err);
          req.flash('success', 'User ' + user.username + ' have been successfully updated');
          return res.redirect('./accounts');
        });
      });
    });
  } else if (typeof req.body.generate_token !== 'undefined' && req.body.generate_token === '') {
    // If username is not set
    if (typeof req.body.username !== 'string') {
      req.flash('error', 'Invalid username !');
      return res.redirect('./accounts');
    }
    // If privateKey not found
    let privateKey = req.app.get('private.key');
    if (!privateKey) {
      req.flash('error', 'Server unable to create new JWT (private key not found)');
      return res.redirect('./accounts');
    }
    return Accounts.findOne({ username: req.body.username }).exec(function (err, user) {
      // If MongoDB error has occured
      if (err) return next(err);
      // If username is not set
      if (!user) {
        req.flash('error', 'User ' + user.username + ' does not exist !');
        return res.redirect('./accounts');
      }
      return JWT.create({ username: user.username }, privateKey, conf.tokens.api.expiresIn, function (err, token) {
        // If JWT error has occured
        if (err) {
          req.flash('error', `Server unable to create new JWT (${err.message})`);
          return res.redirect('./accounts');
        }
        user.tokens.api = token;
        return user.save(function (err) {
          if (err) return next(err);
          return Mailer.sendMail(
            {
              'to': user.username,
              'subject': Mailer.getNewAPITokenSubject(),
              'text': Mailer.getNewAPITokenBodyTxt({ token: token }),
              'html': Mailer.getNewAPITokenBodyHtml({ token: token })
            },
            function (err, info) {
              // If Mailer error has occured
              if (err) {
                console.log(err);
                return next(err);
              }
              // If process succeed
              req.flash('success', 'Token of User ' + user.username + ' have been successfully updated');
              return res.redirect('./accounts');
            }
          );
        });
      });
    });
  } else if (typeof req.body.revoke_token !== 'undefined' && req.body.revoke_token === '') {
    // If username is not set
    if (typeof req.body.username !== 'string') {
      req.flash('error', 'Invalid username !');
      return res.redirect('./accounts');
    }
    return Accounts.findOne({ username: req.body.username }).exec(function (err, user) {
      // If MongoDB error has occured
      if (err) return next(err);
      // If username is not set
      if (!user) {
        req.flash('error', 'User ' + user.username + ' does not exist !');
        return res.redirect('./accounts');
      }
      user.tokens.api = '';
      return user.save(function (err) {
        if (err) return next(err);
        // If process succeed
        req.flash('success', 'Token of User ' + user.username + ' have been successfully revoked');
        return res.redirect('./accounts');
      });
    });
  }
  return res.redirect('./accounts');
});

/* GET on organisations page */
router.get('/organisations', function (req, res, next) {
  // If user is not logged in OR is not at least a curator
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccessRight(req.user, AccountsManager.roles.curator))
    return res.status(401).send('Your current role do not grant access to this part of website');
  let limit = parseInt(req.query.limit),
    skip = parseInt(req.query.skip);
  if (isNaN(limit) || limit < 0) limit = 20;
  if (isNaN(skip) || skip < 0) skip = 0;
  return Organisations.find({})
    .limit(limit)
    .skip(skip)
    .exec(function (err, organisations) {
      // If MongoDB error has occured
      if (err) return next(err);
      let error = req.flash('error'),
        success = req.flash('success');
      return res.render(path.join('backoffice', 'organisations'), {
        route: 'backoffice/organisations',
        conf: conf,
        params: req.query,
        search: true,
        current_user: req.user,
        organisations: organisations,
        error: Array.isArray(error) && error.length > 0 ? error : undefined,
        success: Array.isArray(success) && success.length > 0 ? success : undefined
      });
    });
});

/* POST on organisations page */
router.post('/organisations', function (req, res, next) {
  // If user is not logged in OR is not at least a curator
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccessRight(req.user, AccountsManager.roles.curator))
    return res.status(401).send('Your current role do not grant access to this part of website');
  if (typeof req.body.update !== 'undefined' && req.body.update === '') {
    // If organisation id is not set
    if (typeof req.body._id !== 'string') {
      req.flash('error', 'Invalid organisation id !');
      return res.redirect('./organisations');
    }
    // If organisation name is not set
    if (typeof req.body.name !== 'string') {
      req.flash('error', 'Invalid organisation name !');
      return res.redirect('./organisations');
    }
    return Organisations.findById(req.body._id).exec(function (err, organisation) {
      // If MongoDB error has occured
      if (err) return next(err);
      // If organisation does not exist
      if (!organisation) {
        req.flash('error', 'Invalid organisation !');
        return res.redirect('./organisations');
      }
      organisation.name = req.body.name.replace(/\s+/gm, ' ');
      return organisation.save(function (err) {
        // If MongoDB error has occured
        if (err) return next(err);
        req.flash('success', 'Organisation ' + organisation.name + ' have been successfully updated');
        return res.redirect('./organisations');
      });
    });
  } else if (typeof req.body.create !== 'undefined' && req.body.create === '') {
    // If organisation name is not set
    if (typeof req.body.name !== 'string' || !req.body.name) {
      req.flash('error', 'Invalid organisation name !');
      return res.redirect('./organisations');
    }
    let name = req.body.name.replace(/\s+/gm, ' ');
    return Organisations.findOne({ 'name': name }, function (err, organisation) {
      if (err) {
        req.flash('error', 'An error has occured !');
        return res.redirect('./organisations');
      }
      if (organisation) {
        req.flash('error', 'Organisation already exist !');
        return res.redirect('./organisations');
      }
      return Organisations.create({ 'name': name }, function (err, organisation) {
        // If organisation already exist
        if (err) {
          req.flash('error', 'An error has occured !');
          return res.redirect('./organisations');
        }
        req.flash('success', 'Organisation ' + organisation.name + ' have been successfully created');
        return res.redirect('./organisations');
      });
    });
  } else if (typeof req.body.delete !== 'undefined' && req.body.delete === '') {
    // If organisation id is not set
    if (typeof req.body._id !== 'string') {
      req.flash('error', 'Invalid organisation id !');
      return res.redirect('./organisations');
    }
    // If organisation name is not set
    if (typeof req.body.name !== 'string') {
      req.flash('error', 'Invalid organisation name !');
      return res.redirect('./organisations');
    }
    return Documents.updateMany({ 'organisation': req.body._id }, { 'organisation': conf.upload.default.journal }).exec(
      function (err, results) {
        if (err) {
          req.flash('error', 'Error while updating documents organisation !');
          return res.redirect('./organisations');
        }
        return Documents.updateMany(
          { 'upload_journal': req.body._id },
          { 'upload_journal': conf.upload.default.journal }
        ).exec(function (err, results) {
          if (err) {
            req.flash('error', 'Error while updating documents upload_journal !');
            return res.redirect('./organisations');
          }
          return Organisations.findOneAndDelete({ '_id': req.body._id, 'name': req.body.name }).exec(function (err) {
            // If MongoDB error has occured
            if (err) return next(err);
            req.flash('success', 'Organisation ' + req.body.name + ' have been successfully created');
            return res.redirect('./organisations');
          });
        });
      }
    );
  } else return res.redirect('./organisations');
});

/* GET on upload page */
router.get('/upload', function (req, res, next) {
  // If user is not logged in OR is not at least a standard_user
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccessRight(req.user))
    return res.status(401).send('Your current role do not grant access to this part of website');
  // If user is a curator
  if (AccountsManager.checkAccessRight(req.user, AccountsManager.roles.curator))
    return Organisations.find({}).exec(function (err, organisations) {
      // If MongoDB error has occured
      if (err) return next(err);
      return Accounts.find({}).exec(function (err, accounts) {
        // If MongoDB error has occured
        if (err) return next(err);
        let error = req.flash('error'),
          success = req.flash('success');
        return res.render(path.join('backoffice', 'upload'), {
          route: 'backoffice/upload',
          params: req.query,
          accounts: accounts.sort(function (a, b) {
            return a.username.localeCompare(b.username);
          }),
          organisations: organisations.sort(function (a, b) {
            return a.name.localeCompare(b.name);
          }),
          conf: conf,
          title: 'DataSeer',
          backoffice: true,
          current_user: req.user,
          error: Array.isArray(error) && error.length > 0 ? error : undefined,
          success: Array.isArray(success) && success.length > 0 ? success : undefined
        });
      });
    });
  else {
    let error = req.flash('error'),
      success = req.flash('success');
    return res.render(path.join('backoffice', 'upload'), {
      route: 'backoffice/upload',
      conf: conf,
      title: 'DataSeer',
      backoffice: true,
      current_user: req.user,
      error: Array.isArray(error) && error.length > 0 ? error : undefined,
      success: Array.isArray(success) && success.length > 0 ? success : undefined
    });
  }
});

/* POST on upload page */
router.post('/upload', function (req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccessRight(req.user))
    return res.status(401).send('Your current role do not grant access to this part of website');
  let opts = DocumentsController.getUploadParams(Object.assign({ files: req.files }, req.body), req.user);
  if (opts instanceof Error) {
    req.flash('error', opts.toString());
    return res.redirect(
      url.format({
        pathname: './upload',
        query: req.body
      })
    );
  }
  opts.privateKey = req.app.get('private.key');
  opts.dataTypes = req.app.get('dataTypes');
  return DocumentsController.upload(
    opts,
    {
      onCreatedAccount: function (account) {
        return Mailer.sendAccountCreationMail(account, req.app.get('private.key'));
      }
    },
    function (err, doc) {
      // If any of the file processing produced an error, err would equal that error
      if (err || !doc) {
        console.log(err);
        req.flash('error', 'Error while uploading document !');
        return res.redirect(
          url.format({
            pathname: './upload',
            query: req.body
          })
        );
      }
      // Send upload email to curators
      Mailer.sendDocumentUploadMail(doc, opts, req.user.username);

      // Case of standard_user
      if (AccountsManager.checkAccessRight(req.user, AccountsManager.roles.standard_user, AccountsManager.match.role))
        return res.redirect(path.join('../documents', doc.id));
      // Case of annotator OR curator
      else {
        req.flash('success', 'Document upload complete !');
        return res.redirect('./upload');
      }
    }
  );
});

module.exports = router;
