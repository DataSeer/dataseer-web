/*
 * @prettier
 */

'use strict';

const path = require('path'),
  nodemailer = require('nodemailer'),
  pug = require('pug');

const JWT = require('../lib/jwt.js');

const conf = require('../conf/conf.json'),
  smtpConf = require('../conf/smtp.conf.json');

let transporter = nodemailer.createTransport({
  host: smtpConf.host,
  port: smtpConf.port,
  secure: false, // upgrade later with STARTTLS
  auth: smtpConf.auth
});

const Self = {};

/**
 * Send Account creation email (& build JWT)
 * @param {object} account - Account mongoose model
 * @param {string} privateKey - Private Key
 * @returns {undefined} undefined
 */
Self.sendAccountCreationMail = function (account, privateKey) {
  // If privateKey not found
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
        return Self.sendMail(
          {
            'username': account.username,
            'subject': 'Set your DataSeer Password',
            'text': Self.getAutomaticAccountCreationMailTxt({ url: url }),
            'html': Self.getAutomaticAccountCreationMailHtml({ url: url })
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
};

/**
 * Send Document upload email
 * @param {object} doc - Document mongoose model
 * @param {object} opts - Options used for upload
 * @param {string} uploader - Email of uploader
 * @returns {undefined} undefined
 */
Self.sendDocumentUploadMail = function (doc, opts, uploader) {
  let url = path.join(conf.root, 'documents?documentId=' + doc._id.toString());
  // send email to curator address
  return Self.sendMail(
    {
      'username': conf.emails.upload,
      'subject': 'New document uploaded on DataSeer Web',
      'text': Self.getUploadDocumentMailTxt({
        url: url,
        opts: opts,
        uploader: uploader
      }),
      'html': Self.getUploadDocumentMailHtml({
        url: url,
        opts: opts,
        uploader: uploader
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
};

/**
 * Build "Reset Passord" text of email
 * @param {object} data - JSON object containing all data
 * @param {string} data.url - Url of "Reset Password"
 * @returns {string} Text filled with data
 */
Self.getResetPasswordMailTxt = function (data) {
  return pug.renderFile(path.join(__dirname, '../conf/mails/resetPassword.txt.pug'), data);
};

/**
 * Build "Reset Passord" HTML of email
 * @param {object} data - JSON object containing all data
 * @param {string} data.url - Url of "Reset Password"
 * @returns {string} HTML filled with data
 */
Self.getResetPasswordMailHtml = function (data) {
  return pug.renderFile(path.join(__dirname, '../conf/mails/resetPassword.html.pug'), data);
};

/**
 * Build "New API Token" text of email
 * @param {object} data JSON object containing all data
 * @param {string} data.token - JWT string
 * @returns {string} Text filled with data
 */
Self.getNewAPITokenTxt = function (data) {
  return pug.renderFile(path.join(__dirname, '../conf/mails/newAPIToken.txt.pug'), data);
};

/**
 * Build "New API Token" HTLM of email
 * @param {object} data - JSON object containing all data
 * @param {string} data.token - JWT string
 * @returns {string} HTLM filled with data
 */
Self.getNewAPITokenHtml = function (data) {
  return pug.renderFile(path.join(__dirname, '../conf/mails/newAPIToken.html.pug'), data);
};

/**
 * Build "Automatic Account Creation" text of email
 * @param {object} data - JSON object containing all data
 * @param {string} data.url - Url of "Reset Password"
 * @returns {string} Text filled with data
 */
Self.getAutomaticAccountCreationMailTxt = function (data) {
  return pug.renderFile(path.join(__dirname, '../conf/mails/automaticAccountCreation.txt.pug'), data);
};

/**
 * Build "Automatic Account Creation" HTML of email
 * @param {object} data - JSON object containing all data
 * @param {string} data.url - Url of "Reset Password"
 * @returns {string} HTML filled with data
 */
Self.getAutomaticAccountCreationMailHtml = function (data) {
  return pug.renderFile(path.join(__dirname, '../conf/mails/automaticAccountCreation.html.pug'), data);
};

/**
 * Build "Automatic Account Creation" text of email
 * @param {object} data - JSON object containing all data
 * @param {string} data.url - Url of document
 * @param {object} data.opts - Upload options (c.f. backoffice/upload form)
 * @param {string} data.uploader - Email of uploader
 * @returns {string} Text filled with data
 */
Self.getUploadDocumentMailTxt = function (data) {
  return pug.renderFile(path.join(__dirname, '../conf/mails/uploadDocument.txt.pug'), data);
};

/**
 * Build "Automatic Account Creation" HTML of email
 * @param {object} data - JSON object containing all data
 * @param {string} data.url - Url of document
 * @param {object} data.opts - Upload options (c.f. backoffice/upload form)
 * @param {string} data.uploader - Email of uploader
 * @returns {string} HTML filled with data
 */
Self.getUploadDocumentMailHtml = function (data) {
  return pug.renderFile(path.join(__dirname, '../conf/mails/uploadDocument.html.pug'), data);
};

/**
 * Build "Automatic Account Creation" HTML of email
 * @param {object} opts - File object containing all data
 * @param {string} opts.username - Email address
 * @param {string} opts.subject - Email subject
 * @param {string} opts.text - Email text
 * @param {string} opts.html - Email HTML
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: infos about email OR undefined)
 * @returns {undefined} undefined
 */
Self.sendMail = function (opts, callback) {
  return transporter.sendMail(
    {
      from: smtpConf.from, // sender address
      to: opts.username, // list of receivers
      subject: opts.subject, // Subject line
      text: opts.text, // plain text body
      html: opts.html // html body
    },
    function (err, info) {
      return callback(err, info);
    }
  );
};

module.exports = Self;
