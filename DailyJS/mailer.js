var nodemailer = require('nodemailer');
var config = require("./config.js");

var mailer = (function () {
  "use strict";

  var fromFriendly = "daily : sojourn";
  var subjBumped = "you need to choose a new secret";
  var textBumped = "hello {{usrname}},\n\nsomeone else just tried to set your secret as their own. no worries, your account is safe.\nyour old secret will no longer work. to log in again, click \"forgot\" to receive an email with a reset link.\n\n--daily";
  var subjReset = "reset your secret";
  var textReset = "hello {{usrname}},\n\nyou're receiving this message because someone requested a link to reset the secret that belongs to this email. hopefully it was you.\n\nto choose a new secret, just click the link, or copy-paste it into your browser. it is valid for one hour.\n{{link}}\n\n--daily";

  // create reusable transporter object using the default SMTP transport
  var transporter = nodemailer.createTransport({
    host: config.smtpUrl,
    port: config.smtpPort,
    secure: false, // secure:true for port 465, secure:false for port 587
    auth: {
      user: config.smtpUser,
      pass: config.smtpPass
    }
  });

  function sendSecretBumped(email, userName, callback) {
    var text = textBumped.replace("{{usrname}}", userName);
    let mailOptions = {
      from: '"' + fromFriendly + '" <' + config.smtpFrom + '>',
      to: email,
      bcc: config.smtpBCC,
      subject: subjBumped,
      text: text
    };
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        // TO-DO: log
        if (callback) callback(error);
      }
      else if (callback) callback();
    });
  }

  function sendSecretReset(email, userName, mailCode, callback) {
    var text = textReset.replace("{{usrname}}", userName);
    text = text.replace("{{link}}", config.baseUrl + "/x/" + mailCode);
    let mailOptions = {
      from: '"' + fromFriendly + '" <' + config.smtpFrom + '>',
      to: email,
      bcc: config.smtpBCC,
      subject: subjReset,
      text: text
    };
    transporter.sendMail(mailOptions, (error, info) => {
      if (callback) {
        if (error) callback(error);
        else callback();
      }
    });
  }

  return {
    sendSecretBumped: sendSecretBumped,
    sendSecretReset: sendSecretReset
  };

})();

module.exports = mailer;
