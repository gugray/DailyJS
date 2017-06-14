﻿//var request = require('request');
var db = require("./db.js");
var auth = require("./auth.js");
var pjson = require('./package.json');

var routes = function (app) {

  app.get('(/|/past/:date/:city)', function (req, res) {
    // Load picture info, populate page
    var ps = null;
    var noCache = false;
    if (req.url == "/") {
      ps = db.getLatestImage();
      noCache = true;
    }
    else {
      var spec = decodeURIComponent(req.url.replace("/past/", ""));
      var parts = spec.split('/');
      ps = db.getImage(parts[0], parts[1]);
    }
    ps.then(
      (result) => {
        var model = {
          prod: process.env.node_env == "production",
          ver: pjson.version,
          pageNotFound: false,
          img: {
            prev_url: result.prev_dateint ? "/past/" + result.prev_dateint + "/" + encodeURIComponent(result.prev_city) : "#",
            prev_cls: "",
            next_url: result.next_dateint ? "/past/" + result.next_dateint + "/" + encodeURIComponent(result.next_city) : "#",
            next_cls: "",
            img_url: result.img_url,
            title: result.title,
            city: result.city,
            user: result.user,
            dateStr: result.dateStr,
          }
        };
        if (model.img.prev_url == "#") model.img.prev_cls = "disabled";
        if (model.img.next_url == "#") model.img.next_cls = "disabled";
        if (noCache) res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.render('index', model);
      },
      (err) => {
        res.status(404);
        res.render('index', {
          prod: process.env.node_env == "production",
          ver: pjson.version,
          img: null,
          pageNotFound: true
        });
      });
  });

  app.get('(/inside/history|/inside/history/c/:city|/inside/history/s/:user)', function (req, res) {
    res.render('index', {
      prod: process.env.node_env == "production",
      ver: pjson.version,
      img: null,
      pageNotFound: false
    });
  });

  app.get("/api/getlatestimage", function (req, res) {
    db.getLatestImage().then(
      (result) => {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.send(result);
      },
      (err) => {
        res.status(404).send("no such image");
      });
  });

  app.get("/api/getimage", function (req, res) {
    db.getImage(req.query["date"], req.query["city"]).then(
      (result) => {
        res.send(result);
      },
      (err) => {
        res.status(404).send("no such image");
      });
  });

  app.post("/api/login", function (req, res) {
    if (req.body.secret) {
      auth.login(req.body.secret, req.body.prevToken).then(
        (result) => {
          if (result) res.send({ token: result });
          else res.status(401).send("wrong secret");
        },
        (err) => {
          res.status(500).send("internal server error");
        });
    }
    else res.status(400).send("invalid request");
  });

  app.get("/api/history", function (req, res) {
    if (req.dailyUserName) {
      res.send("hello");
    }
    else res.status(401).send("authentication needed");
  });

  app.get('*', function (req, res) {
    res.status(404);
    res.render('index', {
      prod: process.env.node_env == "production",
      img: null,
      pageNotFound: true
    });
  });

};

module.exports = routes;

