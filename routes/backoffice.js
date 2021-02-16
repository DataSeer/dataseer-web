/*
 * @prettier
 */

const express = require('express'),
  crypto = require('crypto'),
  router = express.Router(),
  path = require('path'),
  async = require('async'),
  mongoose = require('mongoose'),
  jwt = require('jsonwebtoken'),
  mailer = require('../lib/mailer.js'),
  AccountsManager = require('../lib/accountsManager.js'),
  Accounts = require('../models/accounts.js'),
  Organisations = require('../models/organisations.js'),
  Documents = require('../models/documents.js'),
  extractor = require('../lib/extractor.js'),
  Upload = require('../lib/upload.js');

const emailRegExp = new RegExp("[A-Za-z0-9!#$%&'*+-/=?^_`{|}~]+@[A-Za-z0-9-]+(.[A-Za-z0-9-]+)*");

const getGenerateTokenMailTxt = function (token) {
    return (
      'Hi,\n' +
      'Your personal token has been generated: ' +
      token +
      '\n' +
      "(It's linked to your account, so don't share it)\n" +
      'More informations about how to use dataseer-web API with this token here: https://github.com/DataSeer/dataseer-web/blob/master/README.md\n' +
      "Just ignore this email if you don't want to use dataseer-web API\n" +
      'This email has been automatically generated'
    );
  },
  getGenerateTokenMailHtml = function (token) {
    return (
      'Hi,<br/>' +
      'Your personal token has been generated: ' +
      token +
      '<br/>' +
      "(It's linked to your account, so don't share it)<br/>" +
      'More informations about how to use dataseer-web API with this token <a href="https://github.com/DataSeer/dataseer-web/blob/master/README.md">here</a><br/>' +
      "Just ignore this email if you don't want to use dataseer-web API<br/>" +
      'This email has been automatically generated'
    );
  },
  getJWT = function (username, privateKey, callback) {
    let date = new Date(Date.now());
    return jwt.sign(
      {
        'username': username
      },
      privateKey,
      { 'expiresIn': 5259492 }, // expire in 2 mounth
      function (err, token) {
        return callback(err, token);
      }
    );
  };

const conf = require('../conf/conf.json');

/* GET all accounts */
router.get('/accounts', function (req, res, next) {
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
    .exec(function (err, accounts) {
      if (err) {
        req.flash('error', err.message);
        return res.redirect('./accounts');
      }
      Organisations.find({}).exec(function (err, organisations) {
        if (err) return next(err);
        return res.render(path.join('backoffice', 'accounts'), {
          route: 'backoffice/accounts',
          root: conf.root,
          search: true,
          current_user: req.user,
          accounts: accounts,
          roles: AccountsManager.roles,
          organisations: organisations,
          error: Array.isArray(error) && error.length > 0 ? error : undefined,
          success: Array.isArray(success) && success.length > 0 ? success : undefined
        });
      });
    });
});

/* Update an account */
router.post('/accounts', function (req, res, next) {
  if (
    typeof req.user === 'undefined' ||
    !AccountsManager.checkAccountAccessRight(req.user, AccountsManager.roles.curator)
  )
    return res.status(401).send('Your current role do not grant access to this part of website');
  if (typeof req.body.update !== 'undefined' && req.body.update === '') return updateAccount(req, res, next);
  else if (typeof req.body.generate_token !== 'undefined' && req.body.generate_token === '')
    return generateToken(req, res, next);
  return res.redirect('./accounts');
});

/* GET all organisations */
router.get('/organisations', function (req, res, next) {
  if (
    typeof req.user === 'undefined' ||
    !AccountsManager.checkAccountAccessRight(req.user, AccountsManager.roles.curator)
  )
    return res.status(401).send('Your current role do not grant access to this part of website');
  let limit = parseInt(req.query.limit),
    error = req.flash('error'),
    success = req.flash('success');
  if (isNaN(limit)) limit = 20;
  Organisations.find({}).exec(function (err, organisations) {
    if (err) {
      req.flash('error', err.message);
      return res.redirect('./organisations');
    }
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

/* Update an account */
router.post('/organisations', function (req, res, next) {
  if (
    typeof req.user === 'undefined' ||
    !AccountsManager.checkAccountAccessRight(req.user, AccountsManager.roles.curator)
  )
    return res.status(401).send('Your current role do not grant access to this part of website');
  if (typeof req.body.update !== 'undefined' && req.body.update === '') return updateOrganisation(req, res, next);
  else if (typeof req.body.create !== 'undefined' && req.body.create === '') return createOrganisation(req, res, next);
  else if (typeof req.body.delete !== 'undefined' && req.body.delete === '') return deleteOrganisation(req, res, next);
  else return res.redirect('./organisations');
});

/* UPLOAD Document */
router.get('/upload', function (req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccountAccessRight(req.user))
    return res.status(401).send('Your current role do not grant access to this part of website');
  return res.render(path.join('backoffice', 'upload'), {
    route: 'backoffice/upload',
    root: conf.root,
    title: 'DataSeer',
    backoffice: true,
    current_user: req.user
  });
});

/* UPLOAD Document */
router.post('/upload', function (req, res, next) {
  if (typeof req.user === 'undefined' || !AccountsManager.checkAccountAccessRight(req.user))
    return res.status(401).send('Your current role do not grant access to this part of website');
  let results = {
      errors: [],
      successes: []
    },
    isCurator = AccountsManager.checkAccountAccessRight(req.user, AccountsManager.roles.curator),
    uploadedFiles = null,
    dataseerML = '';
  if (!req.files) {
    results.errors.push({
      msg: 'You must send at least one file'
    });
    return res.status(400).render(path.join('backoffice', 'upload'), {
      route: 'backoffice/upload',
      root: conf.root,
      backoffice: true,
      results: results,
      current_user: req.user
    });
  }
  if (Object.keys(req.files).length == 0) {
    results.errors.push({
      msg: 'No file(s) were uploaded'
    });
    return res.status(400).render(path.join('backoffice', 'upload'), {
      route: 'backoffice/upload',
      root: conf.root,
      backoffice: true,
      results: results,
      current_user: req.user
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
    function (file, callback) {
      // Perform operation on file here.
      return Upload.processFile(file, dataseerML, req.app.get('dataTypes.json'), req.user, function (error, result) {
        if (error) results.errors.push(error);
        if (result) results.successes.push(result);
        return callback();
      });
    },
    function (err) {
      // if any of the file processing produced an error, err would equal that error
      if (err) {
        return res.render(path.join('backoffice', 'upload'), {
          route: 'backoffice/upload',
          root: conf.root,
          backoffice: true,
          results: results,
          current_user: req.user
        });
      }
      if (
        AccountsManager.checkAccountAccessRight(
          req.user,
          AccountsManager.roles.standard_user,
          AccountsManager.match.role
        )
      ) {
        // case upload has worked
        if (
          results.successes.length > 0 &&
          typeof results.successes[0].document === 'object' &&
          typeof results.successes[0].document.id !== 'undefined'
        )
          return res.redirect(path.join('../documents', results.successes[0].document.id));
        else
          return res.render(path.join('backoffice', 'upload'), {
            route: 'backoffice/upload',
            root: conf.root,
            backoffice: true,
            results: results,
            current_user: req.user
          });
      } else
        return res.render(path.join('backoffice', 'upload'), {
          route: 'backoffice/upload',
          root: conf.root,
          backoffice: true,
          results: results,
          current_user: req.user
        });
    }
  );
});

let updateOrganisation = function (req, res, next) {
    if (typeof req.body._id !== 'string' || req.body._id.length <= 0) {
      req.flash('error', 'Incorrect _id');
      return res.redirect('./organisations');
    }
    if (typeof req.body.name !== 'string' || req.body.name.length <= 0) {
      req.flash('error', 'Incorrect name');
      return res.redirect('./organisations');
    }
    return Organisations.findOne(
      {
        _id: req.body._id
      },
      function (err, organisation) {
        if (err) {
          req.flash('error', err.message);
          return res.redirect('./organisations');
        }
        let oldValue = organisation.name;
        organisation.name = req.body.name;
        return organisation.save(function (err) {
          if (err) {
            req.flash('error', err.message);
            return res.redirect('./organisations');
          }
          return updateAccountsAndDocuments(oldValue, organisation.name, function (err) {
            if (err) {
              req.flash('error', err.message);
              return res.redirect('./organisations');
            }
            req.flash('success', 'Organisation with name "' + organisation.name + '" has been successfully updated.');
            return res.redirect('./organisations');
          });
        });
      }
    );
  },
  createOrganisation = function (req, res, next) {
    if (typeof req.body.name !== 'string' || req.body.name.length <= 0) {
      req.flash('error', 'Incorrect name');
      return res.redirect('./organisations');
    }
    return Organisations.find({
      name: req.body.name
    }).exec(function (err, organisations) {
      if (err) {
        req.flash('error', err.message);
        return res.redirect('./organisations');
      }
      if (organisations.length > 0) {
        req.flash('error', 'Organisation with name "' + req.body.name + '" already exist.');
        return res.redirect('./organisations');
      }
      return Organisations.create({ name: req.body.name }, function (err, organisations) {
        if (err) {
          req.flash('error', err.message);
          return res.redirect('./organisations');
        }
        req.flash('success', 'Organisation "' + organisations.name + '" have been successfully created');
        return res.redirect('./organisations');
      });
    });
  },
  deleteOrganisation = function (req, res, next) {
    if (typeof req.body._id !== 'string' || req.body._id.length <= 0) {
      req.flash('error', 'Incorrect _id');
      return res.redirect('./organisations');
    }
    return Organisations.findByIdAndRemove(req.body._id, function (err, organisation) {
      if (err) {
        req.flash('error', err.message);
        return res.redirect('./organisations');
      }
      return updateAccountsAndDocuments(organisation.name, '', function (err) {
        if (err) {
          req.flash('error', err.message);
          return res.redirect('./organisations');
        }
        req.flash('success', 'Organisation with name "' + organisation.name + '" has been successfully removed.');
        return res.redirect('./organisations');
      });
    });
  },
  updateAccountsAndDocuments = function (oldValue, newValue, cb) {
    return Accounts.find({ organisation: oldValue }).exec(function (err, accounts) {
      return async.eachSeries(
        accounts,
        function (account, callback) {
          account.organisation = newValue;
          account.save(function (err) {
            if (err) return callback(err);
            return callback();
          });
        },
        function (err) {
          if (err) return cb(err);
          return Documents.find({ organisation: oldValue }).exec(function (err, documents) {
            if (err) return cb(err);
            return async.eachSeries(
              documents,
              function (doc, callback) {
                doc.organisation = newValue;
                doc.save(function (err) {
                  if (err) return callback(err);
                  return callback();
                });
              },
              function (err) {
                return cb(err);
              }
            );
          });
        }
      );
    });
  },
  updateAccount = function (req, res, next) {
    if (typeof req.body.username !== 'string' || !emailRegExp.test(req.body.username)) {
      req.flash('error', 'Incorrect Email');
      return res.redirect('./accounts');
    }
    return Accounts.findOne(
      {
        username: req.body.username
      },
      function (err, user) {
        let role = AccountsManager.roles[req.body.role],
          organisation = req.body.organisation;
        if (typeof role === 'undefined') {
          req.flash('error', 'Incorrect role');
          return res.redirect('./accounts');
        }
        if (typeof organisation === 'undefined') {
          req.flash('error', 'Incorrect organisation');
          return res.redirect('./accounts');
        }
        let saveUser = function () {
            return user.save(function (err) {
              if (err) {
                req.flash('error', err.message);
                return res.redirect('./accounts');
              }
              req.flash('success', 'Informations of User ' + user.username + ' have been successfully updated');
              return res.redirect('./accounts');
            });
          },
          updateDocuments = user.organisation !== organisation,
          updateQuery = updateDocuments ? AccountsManager.getModifiedByQuery(user) : undefined;
        user.role = role;
        user.organisation = organisation;
        if (updateDocuments) {
          return Documents.find(updateQuery).exec(function (err, documents) {
            if (err) {
              req.flash('error', err.message);
              return res.redirect('./accounts');
            }
            return async.eachSeries(
              documents,
              function (doc, callback) {
                doc.organisation = user.organisation;
                doc.save(function (err) {
                  if (err) return callback(err);
                  return callback();
                });
              },
              function (err) {
                if (err) {
                  req.flash('error', err.message);
                  return res.redirect('./accounts');
                }
                return saveUser();
              }
            );
          });
        } else return saveUser();
      }
    );
  },
  generateToken = function (req, res, next) {
    if (typeof req.body.username !== 'string' || !emailRegExp.test(req.body.username)) {
      req.flash('error', 'Incorrect Email');
      return res.redirect('./accounts');
    }
    return Accounts.findOne(
      {
        username: req.body.username
      },
      function (err, user) {
        let privateKey = req.app.get('private.key');
        if (privateKey)
          return getJWT(user.username, privateKey, function (err, token) {
            if (err) {
              req.flash('error', err.message);
              return res.redirect('./accounts');
            }
            user.apiToken = token;
            return user.save(function (err) {
              if (err) {
                req.flash('error', err.message);
                return res.redirect('./accounts');
              }
              return mailer.sendMail(
                {
                  'username': user.username,
                  'subject': 'Dataseer Token',
                  'text': getMailTxt(url),
                  'html': getMailHtml(url)
                },
                function (err, info) {
                  if (err) {
                    console.log(err);
                    req.flash('error', 'Error while creating token, email not sent');
                    return res.redirect('./accounts');
                  }
                  req.flash('success', 'Token of User ' + user.username + ' have been successfully updated');
                  return res.redirect('./accounts');
                }
              );
            });
          });
        else {
          req.flash('error', 'Error while creating token (server not ready)');
          return res.redirect('./accounts');
        }
      }
    );
  };

module.exports = router;
