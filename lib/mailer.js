/*
 * @prettier
 */
const smtpConf = require('../conf/smtp.conf.json'),
  nodemailer = require('nodemailer');

let transporter = nodemailer.createTransport({
  host: smtpConf.host,
  port: smtpConf.port,
  secure: false, // upgrade later with STARTTLS
  auth: smtpConf.auth
});

const object = {};

object.sendMail = function (opts, callback) {
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

module.exports = object;
