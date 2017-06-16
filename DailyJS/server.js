// Modules
var config = require("./config.js");
var express = require("express");
var bodyParser = require("body-parser");
var db = require("./db.js");
var auth = require("./auth.js");

// Set up server
var app = express();
app.use(auth.sessionWare);
app.set("view engine", "ejs");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/images", express.static(config.imageDir, { maxage: "365d" }));
app.use(express.static("public", { maxage: "365d" }));
var routes = require("./routes.js")(app);

// Serve.
var port = process.env.PORT || 3017;
var server = app.listen(port);
