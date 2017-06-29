var config = require("./config.js");
var pjson = require("./package.json");
var snl = require("simple-node-logger");

var logger = (function () {
  "use strict";

  var applog = snl.createSimpleFileLogger({
    timestampFormat: "YYYY-MM-DD HH:mm:ss.SSS",
    logFilePath: config.logDir + "/app.log"
  });
  applog.info("Starting up; version: " + pjson.version);

  var evtlog = snl.createSimpleFileLogger({
    timestampFormat: "YYYY-MM-DD HH:mm:ss.SSS",
    logFilePath: config.logDir + "/evt.log"
  });

  function appError(msg, ex) {
    var txt = msg + "\n" + (ex.stack || ex);
    applog.error(txt);
  }

  function appReqError(req, err) {
    var txt = "Failed to serve request: " + req.url + "\n";
    if (req.dailyUserName) txt += " > DailyUser: " + req.dailyUserName + "\n";
    //else txt += " > DailyUser: n/a\n";
    txt += " > Body: " + JSON.stringify(req.body) + "\n";
    txt += (err.stack || err);
    applog.error(txt);
  }

  function getIP(req) {
    var ip = req.headers['x-forwarded-for'] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      req.connection.socket.remoteAddress;
    return ip;
  }

  function evtReqInfo(req, status) {
    var txt = status + " " + req.url + "\n";
    if (req.dailyUserName) txt += " > DailyUser: " + req.dailyUserName + "\n";
    //else txt += " > DailyUser: n/a\n";
    txt += " > Body: " + JSON.stringify(req.body) + "\n";
    txt += " > IP: " + getIP(req) + "\n";
    txt += " > UserAgent: " + req.headers['user-agent'];
    evtlog.info(txt);
  }

  function evtReqWarning(req, msg) {
    var txt = req.url + "\n";
    txt += " > Details: " + msg + "\n";
    if (req.dailyUserName) txt += " > DailyUser: " + req.dailyUserName + "\n";
    //else txt += " > DailyUser: n/a\n";
    txt += " > IP: " + getIP(req) + "\n";
    txt += " > UserAgent: " + req.headers['user-agent'];
    // Not logging body. With warnings, it is likely to contain user credentials.
    evtlog.warn(txt);
  }

  return {
    appError: appError,
    appReqError: appReqError,
    evtReqInfo: evtReqInfo,
    evtReqWarning: evtReqWarning
  };

})();

module.exports = logger;
