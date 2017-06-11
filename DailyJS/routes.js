var request = require('request');
var db = require("./db.js");
var pjson = require('./package.json');

var routes = function (app) {

  app.get('(/|/past/:date/:city)', function (req, resp) {
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
      (res) => {
        var model = {
          prod: process.env.node_env == "production",
          ver: pjson.version,
          pageNotFound: false,
          img: {
            prev_url: res.prev_dateint ? "/past/" + res.prev_dateint + "/" + encodeURIComponent(res.prev_city) : "#",
            prev_cls: "",
            next_url: res.next_dateint ? "/past/" + res.next_dateint + "/" + encodeURIComponent(res.next_city) : "#",
            next_cls: "",
            img_url: res.img_url,
            title: res.title,
            city: res.city,
            user: res.user,
            dateStr: res.dateStr,
          }
        };
        if (model.img.prev_url == "#") model.img.prev_cls = "disabled";
        if (model.img.next_url == "#") model.img.next_cls = "disabled";
        if (noCache) resp.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        resp.render('index', model);
      },
      (err) => {
        resp.status(404);
        resp.render('index', {
          prod: process.env.node_env == "production",
          ver: pjson.version,
          img: null,
          pageNotFound: true
        });
      });
  });

  app.get("/api/getlatestimage", function (req, resp) {
    db.getLatestImage().then(
      (res) => {
        resp.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        resp.send(res);
      },
      (err) => {
        resp.status(404).send("no such image");
      });
  });

  app.get("/api/getimage", function (req, resp) {
    db.getImage(req.query["date"], req.query["city"]).then(
      (res) => {
        resp.send(res);
      },
      (err) => {
        resp.status(404).send("no such image");
      });
  });

  app.get('*', function (req, resp) {
    resp.status(404);
    resp.render('index', {
      prod: process.env.node_env == "production",
      img: null,
      pageNotFound: true
    });
  });

};

module.exports = routes;

