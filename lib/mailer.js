/*
 * @prettier
 */
const path = require('path'),
  nodemailer = require('nodemailer'),
  pug = require('pug');

const smtpConf = require('../conf/smtp.conf.json');

let transporter = nodemailer.createTransport({
  host: smtpConf.host,
  port: smtpConf.port,
  secure: false, // upgrade later with STARTTLS
  auth: smtpConf.auth
});

const Self = {};

/**
 * Build "Reset Passord" text of email
 * @param {Object} data JSON object containing all data
 * @param {String} data.url Url of "Reset Password"
 * @returns {String} Text filled with data
 */
Self.getResetPasswordMailTxt = function (data) {
  return pug.renderFile(path.join(__dirname, '../conf/mails/resetPassword.txt.pug'), data);
};

/**
 * Build "Reset Passord" HTML of email
 * @param {Object} data JSON object containing all data
 * @param {String} data.url Url of "Reset Password"
 * @returns {String} HTML filled with data
 */
Self.getResetPasswordMailHtml = function (data) {
  return pug.renderFile(path.join(__dirname, '../conf/mails/resetPassword.html.pug'), data);
};

/**
 * Build "New API Token" text of email
 * @param {Object} data JSON object containing all data
 * @param {String} data.token JWT string
 * @returns {String} Text filled with data
 */
Self.getNewAPITokenTxt = function (data) {
  return pug.renderFile(path.join(__dirname, '../conf/mails/newAPIToken.txt.pug'), data);
};

/**
 * Build "New API Token" HTLM of email
 * @param {Object} data JSON object containing all data
 * @param {String} data.token JWT string
 * @returns {String} HTLM filled with data
 */
Self.getNewAPITokenHtml = function (data) {
  return pug.renderFile(path.join(__dirname, '../conf/mails/newAPIToken.html.pug'), data);
};

/**
 * Build "Automatic Account Creation" text of email
 * @param {Object} data JSON object containing all data
 * @param {String} data.url Url of "Reset Password"
 * @returns {String} Text filled with data
 */
Self.getAutomaticAccountCreationMailTxt = function (data) {
  return pug.renderFile(path.join(__dirname, '../conf/mails/automaticAccountCreation.txt.pug'), data);
};

/**
 * Build "Automatic Account Creation" HTML of email
 * @param {Object} data JSON object containing all data
 * @param {String} data.url Url of "Reset Password"
 * @returns {String} HTML filled with data
 */
Self.getAutomaticAccountCreationMailHtml = function (data) {
  return pug.renderFile(path.join(__dirname, '../conf/mails/automaticAccountCreation.html.pug'), data);
};

/**
 * Build "Automatic Account Creation" text of email
 * @param {Object} data JSON object containing all data
 * @param {String} data.url Url of document
 * @param {Object} data.opts Upload options (c.f. backoffice/upload form)
 * @param {String} data.uploader Email of uploader
 * @returns {String} Text filled with data
 */
Self.getUploadDocumentMailTxt = function (data) {
  return pug.renderFile(path.join(__dirname, '../conf/mails/uploadDocument.txt.pug'), data);
};

/**
 * Build "Automatic Account Creation" HTML of email
 * @param {Object} data JSON object containing all data
 * @param {String} data.url Url of document
 * @param {Object} data.opts Upload options (c.f. backoffice/upload form)
 * @param {String} data.uploader Email of uploader
 * @returns {String} HTML filled with data
 */
Self.getUploadDocumentMailHtml = function (data) {
  return pug.renderFile(path.join(__dirname, '../conf/mails/uploadDocument.html.pug'), data);
};

/**
 * Build "Automatic Account Creation" HTML of email
 * @param {Object} opts File object containing all data
 * @param {String} opts.username Email address
 * @param {String} opts.subject Email subject
 * @param {String} opts.text Email text
 * @param {String} opts.html Email HTML
 * @param {Function} cb Callback function(err, res) (err: error process OR null, res: infos about email OR undefined)
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
