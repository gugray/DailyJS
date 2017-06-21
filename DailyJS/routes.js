//var request = require("request");
var formidable = require("formidable");
var fs = require("fs");
var uuidv1 = require("uuid/v1");
var db = require("./db.js");
var sessions = require("./sessions.js");
var config = require("./config.js");
var image = require("./image.js");
var pjson = require("./package.json");

var routes = function (app) {

  // Front page: rendered server-side too, for faster firs response (and non-JS browsers)
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
          prod: process.env.NODE_ENV == "production",
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
        res.render(__dirname + "/index.ejs", model);
      },
      (err) => {
        res.status(404);
        res.render(__dirname + "/index.ejs", {
          prod: process.env.NODE_ENV == "production",
          ver: pjson.version,
          img: null,
          pageNotFound: true
        });
      }
    );
  });

  // Known pages that are only rendered app-side
  app.get('(/inside/history|/inside/history/*|/inside/profile|/inside/upload)', function (req, res) {
    res.render(__dirname + "/index.ejs", {
      prod: process.env.NODE_ENV == "production",
      ver: pjson.version,
      img: null,
      pageNotFound: false
    });
  });

  app.get("/api/ping", function (req, res) {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.send("pong");
  });

  app.get("/api/getlatestimage", function (req, res) {
    db.getLatestImage().then(
      (result) => {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.send(result);
      },
      (err) => {
        res.status(404).send("no such image");
      }
    );
  });

  app.get("/api/getimage", function (req, res) {
    db.getImage(req.query["date"], req.query["city"]).then(
      (result) => {
        res.send(result);
      },
      (err) => {
        res.status(404).send("no such image");
      }
    );
  });

  app.post("/api/login", function (req, res) {
    if (req.body.secret) {
      sessions.login(req.body.secret, req.body.prevToken).then(
        (result) => {
          if (result) res.send({ token: result.token, user: result.user });
          else res.status(401).send("wrong secret");
        },
        (err) => {
          res.status(500).send("internal server error");
        }
      );
    }
    else res.status(400).send("invalid request");
  });

  app.post("/api/logout", function (req, res) {
    if (!req.dailyUserName) return res.status(401).send("authentication needed");
    sessions.logout(req.dailyToken).then(
      (result) => {
        if (result) res.send("bye");
        else res.status(401).send("invalid token");
      },
      (err) => {
        res.status(500).send("internal server error");
      }
    );
  });

  app.post("/api/resetsecret", function (req, res) {
    setTimeout(() => {
      if (req.body.email.startsWith("a")) res.status(200).send();
      else res.status(500).send();
    }, 3000);
  });

  app.get("/api/history", function (req, res) {
    if (!req.dailyUserName) return res.status(401).send("authentication needed");
    var q = req.query;
    var qUser = q.user ? decodeURIComponent(q.user) : null;
    var qCity = q.city ? decodeURIComponent(q.city) : null;
    db.getHistory(q.year, q.month, qUser, qCity).then(
      (result) => {
        if (!result) res.status(400).send("invalid request");
        else res.send(result);
      },
      (err) => {
        res.status(500).send("internal server error");
      }
    );
  });

  app.get("/api/getprofile", function (req, res) {
    if (!req.dailyUserName) return res.status(401).send("authentication needed");
    db.getUserProfile(req.dailyUserId).then(
      (result) => { res.send(result); },
      (err) => { res.status(500).send("internal server error"); }
    );
  });

  function verifySecretDummy(ctxt) {
    return new Promise((resolve, reject) => {
      resolve(ctxt);
    });
  }

  app.post("/api/changeprofile", function (req, res) {
    if (!req.dailyUserName) return res.status(401).send("authentication needed");
    var q = req.body;
    var ctxt = {
      result: {},
      userId: req.dailyUserId,
      field: q.field
    };
    var verifyFun = verifySecretDummy;
    if (ctxt.field == "defcity") {
      if (!q.newDefCity) { res.status(400).send("invalid request"); return; }
      ctxt.newDefCity = q.newDefCity.trim().toLowerCase();
    }
    else if (ctxt.field == "email") {
      if (!q.secret) { res.status(400).send("invalid request"); return; }
      if (!q.newEmail) { res.status(400).send("invalid request"); return; }
      ctxt.secret = q.secret;
      ctxt.newEmail = q.newEmail.trim().toLowerCase();
      verifyFun = sessions.verifyUserSecret;
    }
    else if (ctxt.field == "secret") {
      if (!q.secret) { res.status(400).send("invalid request"); return; }
      if (!q.newSecret) { res.status(400).send("invalid request"); return; }
      ctxt.secret = q.secret;
      ctxt.newSecret = q.newSecret;
      verifyFun = sessions.verifyUserSecret;
    }
    else { res.status(400).send("invalid request"); return; }
    verifyFun(ctxt)
      .then(db.changeUserProfile)
      .then(
      (result) => {
        setTimeout(function () { res.send(result); }, 1000);
      },
      (err) => { res.status(500).send("internal server error"); }
      );
  });

  app.get("/api/getuploadslots", function (req, res) {
    if (!req.dailyUserName) return res.status(401).send("authentication needed");
    var q = req.query;
    var qCity = q.city ? decodeURIComponent(q.city).trim().toLowerCase() : null;
    db.getUploadSlots(req.dailyUserId, qCity).then(
      (result) => {
        if (!result) res.status(400).send("invalid request");
        else res.send(result);
      },
      (err) => {
        res.status(500).send("internal server error");
      }
    );
  });

  app.post("/api/uploadimage", function (req, res) {
    var usr = req.dailyUserName;
    var myUuid = uuidv1();
    var form = new formidable.IncomingForm();
    form.maxFieldSize = 4 * 1024 * 1024;
    form.maxFields = 4 * 1024 * 1024;
    form.parse(req, function (err, fields, files) {
      if (files.file.type != "image/jpeg") {
        return res.status(400).send("invalid request; only jpeg images accepted");
      }
      if (!fields["token"] || !sessions.isLoggedIn(fields["token"])) {
        return res.status(401).send("authentication needed");
      }
      var orig_name = files.file.name;
      var old_path = files.file.path;
      var file_size = files.file.size;
      var file_ext = files.file.name.split('.').pop();
      var index = old_path.lastIndexOf('/') + 1;
      var file_name = old_path.substr(index);
      var upload_name = myUuid + ".jpg";
      var new_path = config.uploadDir + "/" + upload_name;

      fs.readFile(old_path, function (err, data) {
        fs.writeFile(new_path, data, function (err) {
          fs.unlink(old_path, function (err) {
            if (err) {
              res.status(500).send("internal server error");
            } else {
              res.send({ guid: myUuid, size: file_size });
            }
          });
        });
      });
    });
  });

  app.post("/api/processimage", function (req, res) {
    if (!req.dailyUserName) return res.status(401).send("authentication needed");
    if (!req.body.guid) return res.status(400).send("invalid request");
    image.processImage(req.body.guid).then(
      (result) => {
        res.send(result);
      },
      (err) => {
        res.status(500).send("internal server error");
      }
    );
  });

  app.post("/api/publishimage", function (req, res) {
    if (!req.dailyUserName) return res.status(401).send("authentication needed");
    var params = {
      userId: req.dailyUserId,
      guid: req.body.guid,
      dateint: req.body.dateint,
      city: req.body.city,
      title: req.body.title,
      largew: req.body.largew,
      largeh: req.body.largeh,
      mediumw: req.body.mediumw,
      mediumh: req.body.mediumh
    };
    var anyMissing = (!params.guid || !params.dateint || !params.city || !params.title);
    anyMissing |= (!params.largew || !params.largeh || !params.mediumw || !params.mediumh);
    if (anyMissing) return res.status(400).send("invalid request");
    db.publishImage(params).then(
      (result) => {
        res.send(result);
      },
      (err) => {
        res.status(500).send("internal server error");
      }
    );
  });


  // All other GET requests: we serve a juicy 404
  app.get('*', function (req, res) {
    res.status(404);
    res.render(__dirname + "/index.ejs", {
      prod: process.env.NODE_ENV == "production",
      ver: pjson.version,
      img: null,
      pageNotFound: true
    });
  });

};

module.exports = routes;

