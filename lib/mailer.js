/*
 * @prettier
 */

`use strict`;

const path = require(`path`);
const nodemailer = require(`nodemailer`);
const pug = require(`pug`);

const JWT = require(`./jwt.js`);

const conf = require(`../conf/conf.json`);
const smtpConf = require(`../conf/smtp.conf.json`);
const mailsConf = require(`../conf/mails/conf.json`);

let transporter = nodemailer.createTransport(smtpConf);

const Self = {};

/**
 * Available templates
 */
Self.templates = {
  accounts: {
    create: `create`,
    forgotPassword: `forgotPassword`,
    resetPassword: `resetPassword`
  },
  documents: {
    upload: `upload`
  }
};

Self.default = {
  bcc: mailsConf.bcc
};

/**
 * Get content of an email
 * @param {string} mail - Template that should be used
 * @param {object} data - JSON object containing all data
 * @returns {object} content of templates filled with data ({subject, text, html})
 */
Self.getContent = function (mail, data = {}) {
  if (mail === Self.templates.accounts.create) {
    return {
      subject: pug.renderFile(path.join(__dirname, `../conf/mails/accounts/create/subject.pug`), data),
      text: pug.renderFile(path.join(__dirname, `../conf/mails/accounts/create/text.pug`), data),
      html: pug.renderFile(path.join(__dirname, `../conf/mails/accounts/create/html.pug`), data)
    };
  }
  if (mail === Self.templates.accounts.forgotPassword) {
    return {
      subject: pug.renderFile(path.join(__dirname, `../conf/mails/accounts/forgotPassword/subject.pug`), data),
      text: pug.renderFile(path.join(__dirname, `../conf/mails/accounts/forgotPassword/text.pug`), data),
      html: pug.renderFile(path.join(__dirname, `../conf/mails/accounts/forgotPassword/html.pug`), data)
    };
  }
  if (mail === Self.templates.accounts.resetPassword) {
    return {
      subject: pug.renderFile(path.join(__dirname, `../conf/mails/accounts/resetPassword/subject.pug`), data),
      text: pug.renderFile(path.join(__dirname, `../conf/mails/accounts/resetPassword/text.pug`), data),
      html: pug.renderFile(path.join(__dirname, `../conf/mails/accounts/resetPassword/html.pug`), data)
    };
  }
  if (mail === Self.templates.documents.upload) {
    return {
      subject: pug.renderFile(path.join(__dirname, `../conf/mails/documents/upload/subject.pug`), data),
      text: pug.renderFile(path.join(__dirname, `../conf/mails/documents/upload/text.pug`), data),
      html: pug.renderFile(path.join(__dirname, `../conf/mails/documents/upload/html.pug`), data)
    };
  }
};

/**
 * Build "Automatic Account Creation" HTML of email
 * @param {object} opts - File object containing all data
 * @param {string} opts.to - Email address
 * @param {string} opts.template - Template used to generate the email
 * @param {object} opts.data - Data used by the template
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: infos about email OR undefined)
 * @returns {undefined} undefined
 */
Self.sendMail = function (opts = {}, cb) {
  if (typeof opts.to === `undefined`) return cb(new Error(`Missing required data: opts.to`));
  if (typeof opts.template === `undefined`) return cb(new Error(`Missing required data: opts.template`));
  let content = Self.getContent(opts.template, opts.data);
  if (typeof content === `undefined`) return cb(new Error(`Mail has not been generated (wrong template)`));
  return transporter.sendMail(
    {
      from: smtpConf.from,
      to: opts.to,
      bcc: opts.bcc,
      subject: content.subject,
      text: content.text,
      html: content.html
    },
    function (err, info) {
      return cb(err, info);
    }
  );
};

module.exports = Self;
