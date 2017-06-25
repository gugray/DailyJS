var config = require("./config.js");
var logger = require("./logger.js");

process.on("uncaughtException", function (ex) {
  logger.appError("Unhandled exception. Shutting down.", ex);
  console.log(ex);
  setTimeout(function () {
    process.exit(-1);
  }, 200);
});
process.on('unhandledRejection', function (reason, p) {
  applog.appError("Unhandled rejection. Shutting down.", reason);
  console.log(reason);
  setTimeout(function () {
    process.exit(-1);
  }, 200);
});

var express = require("express");
var bodyParser = require("body-parser");
var db = require("./db.js");
var sessions = require("./sessions.js");

// Set up server
var app = express();
app.use(sessions.sessionWare);
app.set("view engine", "ejs");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/images", express.static(config.imageDir, { maxage: "365d" }));
app.use("/uploads", express.static(config.uploadDir, { maxage: "365d" }));
app.use(express.static("public", { maxage: "365d" }));
var routes = require("./routes.js")(app, logger);

// Serve.
var port = process.env.PORT || 3017;
var server = app.listen(port);

// Periodic cleanup (every hour)
setInterval(function () {
  try { sessions.cleanup(); }
  catch (err) { logger.appError("Session cleanup failed", err); }
  db.cleanup().then(
    (result) => { },
    (err) => { logger.appError("DB cleanup failed", err); }
  );
}, 1000 * 60 * 60);
