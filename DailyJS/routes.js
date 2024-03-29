﻿var logger = require("./logger.js");
var formidable = require("formidable");
var fs = require("fs");
var uuidv1 = require("uuid/v1");
var db = require("./db.js");
var sessions = require("./sessions.js");
var config = require("./config.js");
var image = require("./image.js");
var filehelper = require("./filehelper.js");
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
        var pageTitle = "daily : sojourn";
        pageTitle += " • " + result.dateStr + " / " + result.city + " / " + result.user;
        pageTitle += " • " + result.title;
        var model = {
          prod: process.env.NODE_ENV == "production",
          ver: pjson.version,
          title: pageTitle,
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
        logger.appReqError(req, err);
        res.status(404);
        res.render(__dirname + "/index.ejs", {
          prod: process.env.NODE_ENV == "production",
          ver: pjson.version,
          title: "daily : sojourn • page not found",
          img: null,
          pageNotFound: true
        });
      }
    );
  });

  // Known pages that are only rendered app-side
  app.get('(/inside/history|/inside/history/*|/inside/profile|/inside/upload|/x/*)', function (req, res) {
    res.render(__dirname + "/index.ejs", {
      prod: process.env.NODE_ENV == "production",
      ver: pjson.version,
      title: "daily : sojourn",
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
        logger.appReqError(req, err);
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
        logger.appReqError(req, err);
        res.status(404).send("no such image");
      }
    );
  });

  app.post("/framelogin", function (req, res) {
    res.setHeader("Cache-Control", "max-age=31536000, public");
    res.render(__dirname + "/login.ejs", { ver: pjson.version });
  });

  app.get("/framelogin", function (req, res) {
    res.setHeader("Cache-Control", "max-age=31536000, public");
    res.render(__dirname + "/login.ejs", { ver: pjson.version });
  });

  app.post("/api/login", function (req, res) {
    if (!req.body.secret) {
      logger.evtReqInfo(req, 400);
      return res.status(400).send("invalid request");
    }
    sessions.login(req.body.secret, req.body.prevToken).then(
      (result) => {
        if (result) res.send({ token: result.token, user: result.user });
        else {
          logger.evtReqWarning(req, "wrong secret");
          res.status(401).send("wrong secret");
        }
      },
      (err) => {
        logger.appReqError(req, err);
        res.status(500).send("internal server error");
      }
    );
  });

  app.post("/api/logout", function (req, res) {
    if (!req.dailyUserName) {
      logger.evtReqInfo(req, 401);
      return res.status(401).send("authentication needed");
    }
    sessions.logout(req.dailyToken).then(
      (result) => {
        if (result) res.send("bye");
        else {
          logger.evtReqWarning(req, "logout with invalid token: " + (req.dailyToken || ""));
          res.status(401).send("invalid token");
        }
      },
      (err) => {
        logger.appReqError(req, err);
        res.status(500).send("internal server error");
      }
    );
  });

  app.post("/api/resetsecret", function (req, res) {
    setTimeout(() => {
      if (!req.body.email) {
        logger.evtReqInfo(req, 400);
        return res.status(400).send("invalid request");
      }
      var email = req.body.email.toLowerCase().trim();
      db.sendResetLink(email).then(
        (result) => {
          logger.evtReqWarning(req, "Email: " + email);
          res.send();
        },
        (err) => {
          logger.appReqError(req, err);
          res.status(500).send("internal server error");
        }
      );
    }, 3000);
  });

  app.get("/api/checkmailcode", function (req, res) {
    var code = req.query.mailcode;
    if (!code) {
      logger.evtReqInfo(req, 400);
      return res.status(400).send("invalid request");
    }
    db.checkMailCode(code).then(
      (result) => {
        logger.evtReqWarning(req, JSON.stringify(result));
        res.send(result);
      },
      (err) => {
        logger.appReqError(req, err);
        res.status(500).send("internal server error");
      }
    );
  });

  app.get("/api/history", function (req, res) {
    if (!req.dailyUserName) {
      logger.evtReqInfo(req, 401);
      return res.status(401).send("authentication needed");
    }
    var q = req.query;
    var qUser = q.user ? decodeURIComponent(q.user) : null;
    var qCity = q.city ? decodeURIComponent(q.city) : null;
    db.getHistory(q.year, q.month, qUser, qCity).then(
      (result) => {
        if (!result) {
          logger.evtReqInfo(req, 400);
          res.status(400).send("invalid request");
        }
        else res.send(result);
      },
      (err) => {
        logger.appReqError(req, err);
        res.status(500).send("internal server error");
      }
    );
  });

  app.get("/api/getprofile", function (req, res) {
    if (!req.dailyUserName) {
      logger.evtReqInfo(req, 401);
      return res.status(401).send("authentication needed");
    }
    db.getUserProfile(req.dailyUserId).then(
      (result) => { res.send(result); },
      (err) => {
        logger.appReqError(req, err);
        res.status(500).send("internal server error");
      }
    );
  });

  function verifySecretDummy(ctxt) {
    return new Promise((resolve, reject) => {
      resolve(ctxt);
    });
  }

  app.post("/api/changeprofile", function (req, res) {
    if (!req.dailyUserName) {
      logger.evtReqInfo(req, 401);
      return res.status(401).send("authentication needed");
    }
    var q = req.body;
    var ctxt = {
      result: {},
      userId: req.dailyUserId,
      field: q.field
    };
    var verifyFun = verifySecretDummy;
    if (ctxt.field == "defcity") {
      if (!q.newDefCity) {
        logger.evtReqInfo(req, 400);
        return res.status(400).send("invalid request");
      }
      ctxt.newDefCity = q.newDefCity.trim().toLowerCase();
    }
    else if (ctxt.field == "email") {
      if (!q.secret || !q.newEmail) {
        logger.evtReqInfo(req, 400);
        return res.status(400).send("invalid request");
      }
      ctxt.secret = q.secret;
      ctxt.newEmail = q.newEmail.trim().toLowerCase();
      verifyFun = db.verifyUserSecret;
    }
    else {
      logger.evtReqInfo(req, 400);
      return res.status(400).send("invalid request");
    }
    verifyFun(ctxt)
      .then(db.changeUserProfile)
      .then(
      (result) => {
        setTimeout(function () { res.send(result); }, 1000);
      },
      (err) => {
        logger.appReqError(req, err);
        res.status(500).send("internal server error");
      }
      );
  });

  app.post("/api/changesecret", function (req, res) {
    // Either user is authenticated, or she has an email code
    var userId = req.dailyUserId;
    var mailCode = req.body.mailCode;
    var oldSecret = req.body.oldSecret;
    var newSecret = req.body.newSecret;
    if (!newSecret) {
      logger.evtReqWarning(req, "newSecret missing");
      return res.status(400).send("invalid request");
    }
    if (userId && oldSecret && mailCode) {
      logger.evtReqWarning(req, "got both mailCode and (userId, oldSecret)");
      return res.status(400).send("invalid request");
    }
    var canProceed = (userId && oldSecret) || mailCode;
    if (!canProceed) {
      logger.evtReqWarning(req, "neither mailCode nor (userId, oldSecret) present");
      return res.status(401).send("authentication needed");
    }
    // Verify: either old secret, or non-expired, non-used mail code
    var verifyFun = userId ? db.verifyUserSecret : db.verifyMailCode;
    var ctxt = {
      result: {},
      userId: userId,
      secret: oldSecret,
      mailCode: mailCode,
      newSecret: newSecret
    };
    verifyFun(ctxt)
      .then(db.changeSecret)
      .then(
      (ctxt) => {
        if (ctxt.result.error) logger.evtReqWarning(req, "changesecret failed: " + ctxt.result.error);
        else logger.evtReqWarning(req, "changesecret successful");
        setTimeout(function () { res.send(ctxt.result); }, 1000);
      },
      (err) => {
        logger.appReqError(req, err);
        res.status(500).send("internal server error");
      }
      );
  });

  app.get("/api/getuploadslots", function (req, res) {
    if (!req.dailyUserName) return res.status(401).send("authentication needed");
    var q = req.query;
    var qCity = q.city ? decodeURIComponent(q.city).trim().toLowerCase() : null;
    db.getUploadSlots(req.dailyUserId, qCity).then(
      (result) => {
        if (!result) {
          logger.evtReqInfo(req, 400);
          res.status(400).send("invalid request");
        }
        else res.send(result);
      },
      (err) => {
        logger.appReqError(req, err);
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
      if (files.file[0].mimetype != "image/jpeg") {
        logger.evtReqInfo(req, 400);
        return res.status(400).send("invalid request; only jpeg images accepted");
      }
      if (!fields["token"] || !sessions.isLoggedIn(fields["token"])) {
        logger.evtReqInfo(req, 401);
        return res.status(401).send("authentication needed");
      }
      var old_path = files.file[0].filepath;
      var file_size = files.file[0].size;
      var upload_name = myUuid + ".jpg";
      var new_path = config.uploadDir + "/" + upload_name;

      filehelper.move(old_path, new_path, function (err) {
        if (err) {
          logger.appReqError(req, err);
          res.status(500).send("internal server error");
        }
        else {
          res.send({
            guid: myUuid,
            size: file_size
          });
        }
      });
    });
  });

  app.post("/api/processimage", function (req, res) {
    if (!req.dailyUserName) {
      logger.evtReqInfo(req, 401);
      return res.status(401).send("authentication needed");
    }
    if (!req.body.guid) {
      logger.evtReqInfo(req, 400);
      return res.status(400).send("invalid request");
    }
    image.processImage(req.body.guid).then(
      (result) => {
        res.send(result);
      },
      (err) => {
        logger.appReqError(req, err);
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
    if (anyMissing) {
      logger.evtReqInfo(req, 400);
      return res.status(400).send("invalid request");
    }
    db.publishImage(params).then(
      (result) => {
        res.send(result);
      },
      (err) => {
        logger.appReqError(req, err);
        res.status(500).send("internal server error");
      }
    );
  });


  // All other GET requests: we serve a juicy 404
  app.get('*', function (req, res) {
    logger.evtReqInfo(req, 404);
    res.status(404);
    res.render(__dirname + "/index.ejs", {
      prod: process.env.NODE_ENV == "production",
      ver: pjson.version,
      title: "daily : sojourn • page not found",
      img: null,
      pageNotFound: true
    });
  });

};

module.exports = routes;

