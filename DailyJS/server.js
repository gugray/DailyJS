var express = require("express");
var bodyParser = require("body-parser");
var db = require("./db.js");
var app = express();

app.set('view engine', 'ejs');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
var routes = require("./routes.js")(app);

var port = process.env.port || 3017;
var server = app.listen(port);
