/*
 * @prettier
 */

const express = require('express'),
  router = express.Router(),
  path = require('path');

const Mailer = require('../lib/mailer.js'),
  JWT = require('../lib/jwt.js'),
  AccountsManager = require('../lib/accounts.js'),
  Accounts = require('../models/accounts.js'),
  AccountsController = require('../controllers/accounts.js'),
  Organisations = require('../models/organisations.js'),
  Roles = require('../models/roles.js'),
  Documents = require('../models/documents.js'),
  DocumentsController = require('../controllers/documents.js');

const conf = require('../conf/conf.json'),
  smtpConf = require('../conf/smtp.conf.json');

/* GET on accounts page */
router.get('/accounts', function (req, res, next) {
  // If user is not logged in OR is not at least a curator
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccessRight(req.user, AccountsManager.roles.curator))
    return res.status(401).send('Your current role do not grant access to this part of website');
  let limit = parseInt(req.query.limit);
  if (isNaN(limit)) limit = 20;
  return Accounts.find({})
    .limit(limit)
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
            root: conf.root,
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
              'username': user.username,
              'subject': 'New DataSeer API token',
              'text': Mailer.getNewAPITokenTxt({ token: token }),
              'html': Mailer.getNewAPITokenHtml({ token: token })
            },
            function (err, info) {
              // If Mailer error has occured
              if (err) {
                console.log(err);
                next(err);
              }
              // If process succeed
              req.flash('success', 'Token of User ' + user.username + ' have been successfully updated');
              return res.redirect('./accounts');
            }
          );
        });
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
  let limit = parseInt(req.query.limit);
  if (isNaN(limit)) limit = 20;
  return Organisations.find({}).exec(function (err, organisations) {
    // If MongoDB error has occured
    if (err) return next(err);
    let error = req.flash('error'),
      success = req.flash('success');
    return res.render(path.join('backoffice', 'organisations'), {
      route: 'backoffice/organisations',
      root: conf.root,
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
      organisation.name = req.body.name;
      return organisation.save(function (err) {
        // If MongoDB error has occured
        if (err) return next(err);
        req.flash('success', 'Organisation ' + organisation.name + ' have been successfully updated');
        return res.redirect('./organisations');
      });
    });
  } else if (typeof req.body.create !== 'undefined' && req.body.create === '') {
    // If organisation name is not set
    if (typeof req.body.name !== 'string') {
      req.flash('error', 'Invalid organisation name !');
      return res.redirect('./organisations');
    }
    return Organisations.create({ 'name': req.body.name }, function (err, organisation) {
      // If organisation already exist
      if (err) {
        req.flash('error', 'Organisation already exist !');
        return res.redirect('./organisations');
      }
      req.flash('success', 'Organisation ' + organisation.name + ' have been successfully created');
      return res.redirect('./organisations');
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
    return Organisations.findOneAndDelete({ '_id': req.body._id, 'name': req.body.name }).exec(function (err) {
      // If MongoDB error has occured
      if (err) return next(err);
      req.flash('success', 'Organisation ' + req.body.name + ' have been successfully created');
      return res.redirect('./organisations');
    });
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
          accounts: accounts.sort(function (a, b) {
            return a.username.localeCompare(b.username);
          }),
          organisations: organisations.sort(function (a, b) {
            return a.name.localeCompare(b.name);
          }),
          root: conf.root,
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
      root: conf.root,
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
  // If file is not set
  if (!req.files || !req.files['file']) {
    req.flash('error', 'You must select a file !');
    return res.redirect('./upload');
  }
  let alreadyAssessed = !!req.body.already_assessed,
    file = req.files['file'],
    attachedFiles = Array.isArray(req.files['attached_files']) ? req.files['attached_files'] : [],
    uploaded_by = req.user._id,
    opts = {
      alreadyAssessed,
      file,
      attachedFiles,
      uploaded_by,
      dataTypes: req.app.get('dataTypes'),
      privateKey: req.app.get('private.key')
    };
  if (AccountsManager.checkAccessRight(req.user, AccountsManager.roles.standard_user, AccountsManager.match.role)) {
    // Case of standard_user
    opts.journal = req.user.organisation.name;
    opts.email = req.user.username;
    opts.fullname = req.user.fullname;
    opts.dataseerML = true; // always proceed dataseer-ml
  } else {
    // Case of annotator OR curator
    // If journal AND existing_journal are not set
    if (!req.body.journal && !req.body.existing_journal) {
      req.flash('error', 'You must select an existing "Journal" (or fill in "Journal" field) !');
      return res.redirect('./upload');
    }
    opts.journal = !req.body.journal ? req.body.existing_journal : req.body.journal;
    // If there is no account AND email is invalid
    if (
      !req.body.account &&
      (typeof req.body.email !== 'string' || !AccountsController.RegExp.email.test(req.body.email))
    ) {
      req.flash('error', 'Invalid Email !');
      return res.redirect('./upload');
    }
    // If user data are not set
    if (!(req.body.account || (req.body.email && req.body.fullname))) {
      req.flash('error', 'You must select an existing "Email" (or fill in "Full Name" and "Email" fields) !');
      return res.redirect('./upload');
    }
    if (req.body.account) {
      // If there is an existing account, data will be: email;fullname
      let tmp = req.body.account.split(';');
      opts.email = tmp[0];
      opts.fullname = tmp[1];
    } else {
      // If there is an new account
      opts.email = req.body.email;
      opts.fullname = req.body.fullname;
    }
    // dataseer-ml processing
    opts.dataseerML = !!req.body.dataseerML;
  }
  return DocumentsController.upload(
    opts,
    {
      onCreatedAccount: function (account) {
        // If privateKey not found
        let privateKey = req.app.get('private.key');
        if (!privateKey) {
          console.log('Server unable to send mail to ' + account.username + '(no private key)');
        }
        return JWT.create(
          { username: account.username },
          privateKey,
          conf.tokens.automaticAccountCreation.expiresIn,
          function (err, token) {
            // If JWT error has occured
            if (err) {
              console.log(account.username);
              console.log(err);
            }
            account.tokens.resetPassword = token;
            return account.save(function (err) {
              // If MongoDB error has occured
              if (err) {
                console.log(account.username);
                console.log(err);
              }
              let url = path.join(
                conf.root,
                'resetPassword?resetPasswordToken=' + account.tokens.resetPassword + '&username=' + account.username
              );
              return Mailer.sendMail(
                {
                  'username': account.username,
                  'subject': 'Set your DataSeer Password',
                  'text': Mailer.getAutomaticAccountCreationMailTxt({ url: url }),
                  'html': Mailer.getAutomaticAccountCreationMailHtml({ url: url })
                },
                function (err, info) {
                  // If Mailer error has occured
                  if (err) {
                    console.log(account.username);
                    console.log(err);
                  }
                }
              );
            });
          }
        );
      },
      onCreatedJournal: function (journal) {}
    },
    function (err, doc) {
      // If any of the file processing produced an error, err would equal that error
      if (err) {
        req.flash('error', 'Error while uploading document !');
        return res.redirect('./upload');
      }
      // send email to curator address
      Mailer.sendMail(
        {
          'username': conf.emails.upload,
          'subject': 'New document uploaded on DataSeer Web',
          'text': Mailer.getUploadDocumentMailTxt({
            url: DocumentsController.getUrl(doc._id),
            opts: opts,
            uploader: req.user.username
          }),
          'html': Mailer.getUploadDocumentMailHtml({
            url: DocumentsController.getUrl(doc._id),
            opts: opts,
            uploader: req.user.username
          })
        },
        function (err, info) {
          // If Mailer error has occured
          if (err) {
            console.log(conf.emails.upload);
            console.log(err);
          }
        }
      );
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
