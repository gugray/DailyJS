var express = require("express");
var bodyParser = require("body-parser");
var db = require("./db.js");
var auth = require("./auth.js");

var app = express();
app.use(auth.sessionWare);
app.set('view engine', 'ejs');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public', { maxage: "365d" }));
var routes = require("./routes.js")(app);

var port = process.env.port || 3017;
var server = app.listen(port);
