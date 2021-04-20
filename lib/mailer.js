/*
 * @prettier
 */

'use strict';

const path = require('path'),
  nodemailer = require('nodemailer'),
  pug = require('pug');

const JWT = require('../lib/jwt.js');

const conf = require('../conf/conf.json'),
  subjects = require('../conf/mails/subjects.json'),
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
 * @param {function} cb - Callback
 * @returns {undefined} undefined
 */
Self.sendAccountCreationMail = function (account, privateKey, cb) {
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
        let url = new URL(
          '/resetPassword?resetPasswordToken=' + account.tokens.resetPassword + '&username=' + account.username,
          conf.root
        ).href;
        return Self.sendMail(
          {
            'to': account.username,
            'subject': Self.getAutomaticAccountCreationSubject(),
            'text': Self.getAutomaticAccountCreationBodyTxt({ url: url }),
            'html': Self.getAutomaticAccountCreationBodyHtml({ url: url })
          },
          function (err, info) {
            // If Mailer error has occured
            if (err) {
              console.log(account.username);
              console.log(err);
            }
            if (typeof cb === 'function') return cb(err, info);
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
 * @param {function} cb - Callback
 * @returns {undefined} undefined
 */
Self.sendDocumentUploadMail = function (doc, opts, uploader, cb) {
  let url = new URL('/documents?documentId=' + doc._id.toString(), conf.root).href;
  // send email to curator address
  return Self.sendMail(
    {
      'to': conf.emails.upload,
      'subject': Self.getUploadDocumentSubject(),
      'text': Self.getUploadDocumentBodyTxt({
        url: url,
        opts: opts,
        uploader: uploader
      }),
      'html': Self.getUploadDocumentBodyHtml({
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
      if (typeof cb === 'function') return cb(err, info);
    }
  );
};

/**
 * Send Document URL to authors email
 * @param {object} doc - Document mongoose model
 * @param {object} opts - Options used for mail
 * @param {function} cb - Callback
 * @returns {undefined} undefined
 */
Self.sendDocumentURLToAuthorsMail = function (doc, opts, cb) {
  let url = new URL('/documents/' + doc._id.toString() + '/?documentToken=' + doc.token.toString(), conf.root).href,
    mails = opts.authors
      .join(',')
      .replace(/(,){1,}/gm, ',')
      .replace(/(,)$/gm, '');
  if (!mails) return cb(new Error('There is no authors email'));
  // send email to curator address
  return Self.sendMail(
    {
      'to': mails,
      'subject': Self.getSendDocumentURLToAuthorsMailSubject(),
      'text': Self.getSendDocumentURLToAuthorsBodyTxt({
        url: url,
        opts: opts
      }),
      'html': Self.getSendDocumentURLToAuthorsBodyHtml({
        url: url,
        opts: opts
      })
    },
    function (err, info) {
      // If Mailer error has occured
      if (err) {
        console.log(mails);
        console.log(err);
      }
      if (typeof cb === 'function') return cb(err, info);
    }
  );
};

/**
 * Build "Send Document URL to authors email" subject of email
 * @returns {string} Subject filled with data
 */
Self.getSendDocumentURLToAuthorsMailSubject = function () {
  return subjects.sendDocumentURLToAuthorsMail;
};

/**
 * Build "Send Document URL to authors email" text of email
 * @param {object} data - JSON object containing all data
 * @param {object} data.opts - Metadata of doucument
 * @param {string} data.url - Url of doucument
 * @returns {string} Text filled with data
 */
Self.getSendDocumentURLToAuthorsBodyTxt = function (data) {
  return pug.renderFile(path.join(__dirname, '../conf/mails/sendDocumentURLToAuthorsMail.txt.pug'), data);
};

/**
 * Build "Send Document URL to authors email" text of email
 * @param {object} data - JSON object containing all data
 * @param {object} data.opts - Metadata of doucument
 * @param {string} data.url - Url of doucument
 * @returns {string} Text filled with data
 */
Self.getSendDocumentURLToAuthorsBodyHtml = function (data) {
  return pug.renderFile(path.join(__dirname, '../conf/mails/sendDocumentURLToAuthorsMail.html.pug'), data);
};

/**
 * Build "Share With Colleague" subject of email
 * @returns {string} Subject filled with data
 */
Self.getShareWithColleagueSubject = function () {
  return subjects.shareWithColleague;
};

/**
 * Build "Share With Colleague" text of email
 * @param {object} data - JSON object containing all data
 * @param {object} data.metadata - Metadata of doucument
 * @param {string} data.url - Url of doucument
 * @returns {string} Text filled with data
 */
Self.getShareWithColleagueBodyTxt = function (data) {
  return pug.renderFile(path.join(__dirname, '../conf/mails/shareWithColleague.txt.pug'), data);
};

/**
 * Build "Reset Passord" subject of email
 * @returns {string} Subject filled with data
 */
Self.getResetPasswordSubject = function () {
  return subjects.resetPassword;
};

/**
 * Build "Reset Passord" text of email
 * @param {object} data - JSON object containing all data
 * @param {string} data.url - Url of "Reset Password"
 * @returns {string} Text filled with data
 */
Self.getResetPasswordBodyTxt = function (data) {
  return pug.renderFile(path.join(__dirname, '../conf/mails/resetPassword.txt.pug'), data);
};

/**
 * Build "Reset Passord" HTML of email
 * @param {object} data - JSON object containing all data
 * @param {string} data.url - Url of "Reset Password"
 * @returns {string} HTML filled with data
 */
Self.getResetPasswordBodyHtml = function (data) {
  return pug.renderFile(path.join(__dirname, '../conf/mails/resetPassword.html.pug'), data);
};

/**
 * Build "New API Token" subject of email
 * @returns {string} Subject filled with data
 */
Self.getNewAPITokenSubject = function () {
  return subjects.newAPIToken;
};

/**
 * Build "New API Token" text of email
 * @param {object} data JSON object containing all data
 * @param {string} data.token - JWT string
 * @returns {string} Text filled with data
 */
Self.getNewAPITokenBodyTxt = function (data) {
  return pug.renderFile(path.join(__dirname, '../conf/mails/newAPIToken.txt.pug'), data);
};

/**
 * Build "New API Token" HTLM of email
 * @param {object} data - JSON object containing all data
 * @param {string} data.token - JWT string
 * @returns {string} HTLM filled with data
 */
Self.getNewAPITokenBodyHtml = function (data) {
  return pug.renderFile(path.join(__dirname, '../conf/mails/newAPIToken.html.pug'), data);
};

/**
 * Build "Automatic Account Creation" subject of email
 * @returns {string} Subject filled with data
 */
Self.getAutomaticAccountCreationSubject = function () {
  return subjects.automaticAccountCreation;
};

/**
 * Build "Automatic Account Creation" text of email
 * @param {object} data - JSON object containing all data
 * @param {string} data.url - Url of "Reset Password"
 * @returns {string} Text filled with data
 */
Self.getAutomaticAccountCreationBodyTxt = function (data) {
  return pug.renderFile(path.join(__dirname, '../conf/mails/automaticAccountCreation.txt.pug'), data);
};

/**
 * Build "Automatic Account Creation" HTML of email
 * @param {object} data - JSON object containing all data
 * @param {string} data.url - Url of "Reset Password"
 * @returns {string} HTML filled with data
 */
Self.getAutomaticAccountCreationBodyHtml = function (data) {
  return pug.renderFile(path.join(__dirname, '../conf/mails/automaticAccountCreation.html.pug'), data);
};

/**
 * Build "Upload Document" subject of email
 * @returns {string} Subject filled with data
 */
Self.getUploadDocumentSubject = function () {
  return subjects.uploadDocument;
};

/**
 * Build "Automatic Account Creation" text of email
 * @param {object} data - JSON object containing all data
 * @param {string} data.url - Url of document
 * @param {object} data.opts - Upload options (c.f. backoffice/upload form)
 * @param {string} data.uploader - Email of uploader
 * @returns {string} Text filled with data
 */
Self.getUploadDocumentBodyTxt = function (data) {
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
Self.getUploadDocumentBodyHtml = function (data) {
  return pug.renderFile(path.join(__dirname, '../conf/mails/uploadDocument.html.pug'), data);
};

/**
 * Build "Automatic Account Creation" HTML of email
 * @param {object} opts - File object containing all data
 * @param {string} opts.to - Email address
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
      to: opts.to, // list of receivers
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
