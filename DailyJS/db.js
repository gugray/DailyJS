var config = require("./config.js");
var filehelper = require("./filehelper.js");
var crypt = require("./crypt.js");
var mysql = require('mysql');
var dateformat = require("./dateformat.js");
var mailer = require("./mailer.js");

var db = (function () {
  "use strict";

  var _pool = mysql.createPool({
    host: config.dbhost,
    port: config.dbport,
    user: config.dbuser,     
    password: config.dbpass,
    database: config.dbname,
    connectionLimit: config.dbconnlimit,
    debug: false
  });

  // Test connection first time this file is required, i.e., at startup.
  _pool.getConnection((err, conn) => {
    if (err) throw err;
    conn.release();
  });

  function DayImage(imgFile, title, dateint, city, usrname, prev_dateint, prev_city, next_dateint, next_city) {
    this.img_url = "/images/" + imgFile;
    this.title = title;
    this.dateStr = dateformat.intToDate(dateint);
    this.city = city;
    this.user = usrname;
    this.prev_dateint = prev_dateint;
    this.prev_city = prev_city;
    this.next_dateint = next_dateint;
    this.next_city = next_city;
  }

  function User(id, usrname, defcity, secret_hash, secret_salt, email) {
    this.id = id;
    this.usrname = usrname;
    this.defcity = defcity;
    this.secret_hash = secret_hash;
    this.secret_salt = secret_salt;
    this.email = email;
  }

  var _selLatest = "\
    SELECT imgfile, title, usrname, images.id, dateint, city\
    FROM images, users\
    WHERE images.user_id = users.id\
    ORDER BY images.id DESC LIMIT 1;\
  ";

  var _selPast = "\
    SELECT imgfile, title, usrname, images.id, dateint\
    FROM images, users\
    WHERE images.user_id = users.id AND dateint=? AND city=?\
  ";

  var _selPrev = "\
    SELECT dateint, city\
    FROM images\
    WHERE (dateint < ?) OR (dateint = ? AND id < ?) \
    ORDER BY dateint DESC, id DESC LIMIT 1;\
  ";

  var _selNext = "\
    SELECT dateint, city\
    FROM images\
    WHERE (dateint > ?) OR (dateint = ? AND id > ?)\
    ORDER BY dateint ASC, id ASC LIMIT 1;\
  ";

  function getConn(ctxt) {
    return new Promise((resolve, reject) => {
      _pool.getConnection((err, conn) => {
        if (err) return reject(err);
        ctxt.conn = conn;
        resolve(ctxt);
      });
    });
  }

  function selLatest(ctxt) {
    return new Promise((resolve, reject) => {
      ctxt.conn.query(_selLatest, (err, rows) => {
        try {
          if (err) return reject(err);
          ctxt.rowsPast = rows;
          resolve(ctxt);
        } catch (ex) {
          return reject(ex);
        }
      });
    });
  }

  function selPast(ctxt) {
    return new Promise((resolve, reject) => {
      ctxt.conn.query(_selPast, [ctxt.dateint, ctxt.city], (err, rowsPast) => {
        if (err) return reject(err);
        ctxt.rowsPast = rowsPast;
        resolve(ctxt);
      });
    });
  }

  function selPrev(ctxt) {
    return new Promise((resolve, reject) => {
      ctxt.conn.query(_selPrev, [ctxt.rowsPast[0].dateint, ctxt.rowsPast[0].dateint, ctxt.rowsPast[0].id], (err, rowsPrev) => {
        if (err) return reject(err);
        ctxt.rowsPrev = rowsPrev;
        resolve(ctxt);
      });
    });
  }

  function selNext(ctxt) {
    return new Promise((resolve, reject) => {
      ctxt.conn.query(_selNext, [ctxt.rowsPast[0].dateint, ctxt.rowsPast[0].dateint, ctxt.rowsPast[0].id], (err, rowsNext) => {
        if (err) return reject(err);
        ctxt.rowsNext = rowsNext;
        resolve(ctxt);
      });
    });
  }

  function prepareImage(ctxt) {
    var prev_dateint = null;
    var prev_city = null;
    if (ctxt.rowsPrev.length > 0) {
      prev_dateint = ctxt.rowsPrev[0].dateint;
      prev_city = ctxt.rowsPrev[0].city;
    }
    var next_dateint = null;
    var next_city = null;
    if (ctxt.rowsNext.length > 0) {
      next_dateint = ctxt.rowsNext[0].dateint;
      next_city = ctxt.rowsNext[0].city;
    }
    if (!ctxt.dateint) ctxt.dateint = ctxt.rowsPast[0].dateint;
    if (!ctxt.city) ctxt.city = ctxt.rowsPast[0].city;
    var res = new DayImage(
      ctxt.rowsPast[0].imgfile, ctxt.rowsPast[0].title, ctxt.dateint, ctxt.city, ctxt.rowsPast[0].usrname,
      prev_dateint, prev_city,
      next_dateint, next_city);
    return res;
  }

  function getLatestImage() {
    return new Promise((resolve, reject) => {
      var ctxt = {};
      getConn(ctxt)
        .then(selLatest)
        .then(selPrev)
        .then(selNext)
        .then((data) => {
          if (ctxt.conn) { ctxt.conn.release(); ctxt.conn = null; }
          resolve(prepareImage(ctxt));
        })
        .catch((err) => {
          if (ctxt.conn) ctxt.conn.release();
          return reject(err);
        });
    });
  }

  function getImage(dateint, city) {
    return new Promise((resolve, reject) => {
      var ctxt = {};
      ctxt.dateint = dateint;
      ctxt.city = city;
      getConn(ctxt)
        .then(selPast)
        .then(selPrev)
        .then(selNext)
        .then((ctxt) => {
          if (ctxt.conn) { ctxt.conn.release(); ctxt.conn = null; }
          resolve(prepareImage(ctxt));
        })
        .catch((err) => {
          if (ctxt.conn) ctxt.conn.release();
          return reject(err);
        });
    });
  }

  var _selAllUsers = "SELECT * FROM users;";

  function selAllUsers(ctxt) {
    return new Promise((resolve, reject) => {
      ctxt.conn.query(_selAllUsers, (err, rows) => {
        if (err) return reject(err);
        try {
          for (var i = 0; i != rows.length; ++i) {
            var row = rows[i];
            ctxt.users.push(new User(row.id, row.usrname, row.defcity, row.secret_hash, row.secret_salt, row.email));
          }
          resolve(ctxt);
        } catch (ex) {
          return reject(ex);
        }
      });
    });
  }

  function getAllUsers(ctxt) {
    return new Promise((resolve, reject) => {
      ctxt.users = [];
      getConn(ctxt)
        .then(selAllUsers)
        .then((ctxt) => {
          if (ctxt.conn) { ctxt.conn.release(); ctxt.conn = null; }
          resolve(ctxt);
        })
        .catch((err) => {
          if (ctxt.conn) ctxt.conn.release();
          return reject(err);
        });
    });
  }

  var _selMaxDateInt = "SELECT MAX(dateint) AS max FROM images;";
  var _selMaxDateIntCity = "SELECT MAX(dateint) AS max FROM images WHERE city = ?;";
  var _selMaxDateIntUser = "SELECT MAX(dateint) AS max FROM images, users WHERE user_id=users.id AND usrname = ?;";
  var _selAllDateInts = "SELECT dateint FROM images;";
  var _selAllDateIntsCity = "SELECT dateint FROM images WHERE city = ?;";
  var _selAllDateIntsUser = "SELECT dateint FROM images, users WHERE user_id=users.id AND usrname = ?;";
  var _selMonthImages = "\
    SELECT images.*, users.usrname\
    FROM images, users\
    WHERE user_id = users.id AND dateint > ? AND dateint < ?\
    ORDER BY dateint DESC, images.id DESC;\
  ";
  var _selMonthImagesCity = "\
    SELECT images.*, users.usrname\
    FROM images, users\
    WHERE user_id = users.id AND dateint > ? AND dateint < ? AND city = ?\
    ORDER BY dateint DESC, images.id DESC;\
  ";
  var _selMonthImagesUser = "\
    SELECT images.*, users.usrname\
    FROM images, users\
    WHERE user_id = users.id AND dateint > ? AND dateint < ? AND usrname = ?\
    ORDER BY dateint DESC, images.id DESC;\
  ";
  var _selHistoryCities = "SELECT DISTINCT city FROM images ORDER BY city ASC;";
  var _selHistoryUsers = "\
    SELECT DISTINCT usrname FROM users, images\
    WHERE user_id = users.id\
    ORDER BY usrname ASC;\
  ";

  function splitDateInt(dateInt) {
    var year = Math.floor(dateInt / 10000);
    var month = Math.floor(dateInt / 100) - year * 100;
    var day = dateInt - year * 10000 - month * 100;
    return { year: year, month: month, day: day };
  }

  function selHistoryCurrentImages(ctxt) {
    return new Promise((resolve, reject) => {
      // Result must be here by now. Otherwise, nothing to do.
      if (!ctxt.result) return resolve(ctxt);
      if (ctxt.city && ctxt.user) return reject(new Error("Cannot filter by city and date at the same time"));
      var loBound = ctxt.result.currentYear * 10000 + ctxt.result.currentMonth * 100;
      var hiBound = loBound + 100;
      var query = _selMonthImages;
      var qparams = [loBound, hiBound];
      if (ctxt.city) { query = _selMonthImagesCity; qparams.push(ctxt.city); }
      if (ctxt.user) { query = _selMonthImagesUser; qparams.push(ctxt.user); }
      ctxt.conn.query(query, qparams, (err, rows) => {
        if (err) return reject(err);
        try {
          ctxt.result.images = [];
          for (var i = 0; i != rows.length; ++i) {
            var row = rows[i];
            var mediumFile = row.imgfile.replace(".jpg", "-md.jpg");
            mediumFile = mediumFile.replace(".jpeg", "-md.jpeg");
            var img = {
              img_url: "/images/" + mediumFile,
              title: row.title,
              dateint: row.dateint,
              dateStrShort: dateformat.intToDateShort(row.dateint),
              city: row.city,
              user: row.usrname
            };
            ctxt.result.images.push(img);
          }
          resolve(ctxt);
        }
        catch (ex) {
          return reject(ex);
        }
      });
    });
  }

  function selHistoryCalendar(ctxt) {
    return new Promise((resolve, reject) => {
      if (ctxt.city && ctxt.user) return reject(new Error("Cannot filter by city and date at the same time"));
      var query = _selAllDateInts;
      var qparams = [];
      if (ctxt.city) { query = _selAllDateIntsCity; qparams.push(ctxt.city); }
      if (ctxt.user) { query = _selAllDateIntsUser; qparams.push(ctxt.user); }
      ctxt.conn.query(query, qparams, (err, rows) => {
        if (err) return reject(err);
        try {
          var minYear = 2010;
          var maxYear = 2010;
          var activeYears = {};
          var activeMonths = {};
          for (var i = 0; i != rows.length; ++i) {
            var date = splitDateInt(rows[i].dateint);
            if (date.year > maxYear) maxYear = date.year;
            if (date.year < minYear) minYear = date.year;
            var xx = activeYears[date.year];
            if (!xx || date.month > xx) activeYears[date.year] = date.month;
            if (date.year == ctxt.currentYear) activeMonths[date.month] = 1;
          }
          ctxt.result = {
            years: [],
            currentYear: ctxt.currentYear,
            activeMonths: [],
            currentMonth: ctxt.currentMonth
          };
          if (maxYear < new Date().getFullYear()) maxYear = new Date().getFullYear();
          for (var i = maxYear; i >= minYear; --i) {
            var xx = activeYears[i];
            if (xx) ctxt.result.years.push({ year: i, maxMonth: xx });
            else ctxt.result.years.push({ year: i, maxMonth: 0 });
          }
          for (var i = 12; i >= 1; --i) {
            var xx = activeMonths[i];
            if (xx) ctxt.result.activeMonths.push(i);
          }
          // Are we off the calendar?
          if (ctxt.result.activeMonths.length == 0) delete ctxt.result;
          else if (ctxt.currentYear < minYear || ctxt.currentYear > maxYear) delete ctxt.result;
          else {
            var xx = activeMonths[Math.floor(ctxt.result.currentMonth)];
            if (!xx) delete ctxt.result;
          }
          // Done here
          resolve(ctxt);
        }
        catch (ex) {
          return reject(ex);
        }
      });
    });
  }

  function selHistoryYearMonth(ctxt) {
    return new Promise((resolve, reject) => {
      if (ctxt.month && !ctxt.year) return reject(new Error("Month specified but year is not"));
      if (ctxt.year && !ctxt.month) return reject(new Error("Year specified but month is not"));
      if (ctxt.year) {
        ctxt.currentYear = ctxt.year;
        ctxt.currentMonth = ctxt.month;
        resolve(ctxt);
      }
      else {
        if (ctxt.city && ctxt.user) return reject(new Error("Cannot filter by city and date at the same time"));
        var query = _selMaxDateInt;
        var qparams = [];
        if (ctxt.city) { query = _selMaxDateIntCity; qparams.push(ctxt.city); }
        if (ctxt.user) { query = _selMaxDateIntUser; qparams.push(ctxt.user); }
        ctxt.conn.query(query, qparams, (err, rows) => {
          if (err) return reject(err);
          try {
            if (rows.length != 1) return reject(new Error("Failed to get latest image timestamp"));
            var date = splitDateInt(rows[0].max);
            ctxt.currentYear = date.year;
            ctxt.currentMonth = date.month;
            resolve(ctxt);
          }
          catch (ex) {
            return reject(ex);
          }
        });
      }
    });
  }

  function selHistoryCities(ctxt) {
    return new Promise((resolve, reject) => {
      if (!ctxt.result) return resolve(ctxt);
      ctxt.conn.query(_selHistoryCities, (err, rows) => {
        if (err) return reject(err);
        try {
          ctxt.result.cities = [];
          for (var i = 0; i != rows.length; ++i) {
            ctxt.result.cities.push(rows[i].city);
          }
          resolve(ctxt);
        }
        catch (ex) {
          return reject(ex);
        }
      });
    });
  }

  function selHistoryUsers(ctxt) {
    return new Promise((resolve, reject) => {
      if (!ctxt.result) return resolve(ctxt);
      ctxt.conn.query(_selHistoryUsers, (err, rows) => {
        if (err) return reject(err);
        try {
          ctxt.result.users = [];
          for (var i = 0; i != rows.length; ++i) {
            ctxt.result.users.push(rows[i].usrname);
          }
          resolve(ctxt);
        }
        catch (ex) {
          return reject(ex);
        }
      });
    });
  }

  function getHistory(year, month, user, city) {
    return new Promise((resolve, reject) => {
      var ctxt = { year: year, month: month, user: user, city: city };
      getConn(ctxt)
        .then(selHistoryYearMonth)
        .then(selHistoryCalendar)
        .then(selHistoryCurrentImages)
        .then(selHistoryCities)
        .then(selHistoryUsers)
        .then((ctxt) => {
          if (ctxt.conn) { ctxt.conn.release(); ctxt.conn = null; }
          resolve(ctxt.result);
        })
        .catch((err) => {
          if (ctxt.conn) ctxt.conn.release();
          return reject(ctxt);
        });
    });
  }

  var _selUserProfile = "SELECT usrname, defcity, email FROM users WHERE id = ?;"
  var _updDefCity = "UPDATE users SET defcity=? WHERE id=?;"
  var _selOtherEmails = "SELECT COUNT(*) AS count FROM users WHERE id != ? AND email = ?;"
  var _updEmail = "UPDATE users SET email=? WHERE id=?;"

  function selUserProfile(ctxt) {
    return new Promise((resolve, reject) => {
      ctxt.conn.query(_selUserProfile, [ctxt.userId], (err, rows) => {
        if (err) return reject(err);
        try {
          if (rows.length != 1) return reject(new Error("Failed to retrieve user record"));
          var row = rows[0];
          ctxt.result = {
            usrname: row.usrname,
            defcity: row.defcity,
            email: row.email
          };
          resolve(ctxt);
        }
        catch (ex) {
          return reject(ex);
        }
      });
    });
  }

  function getUserProfile(userId) {
    return new Promise((resolve, reject) => {
      var ctxt = { userId: userId };
      getConn(ctxt)
        .then(selUserProfile)
        .then((ctxt) => {
          if (ctxt.conn) { ctxt.conn.release(); ctxt.conn = null; }
          resolve(ctxt.result);
        })
        .catch((err) => {
          if (ctxt.conn) ctxt.conn.release();
          return reject(ctxt);
        });
    });
  }

  function updDefCity(ctxt) {
    return new Promise((resolve, reject) => {
      ctxt.conn.query(_updDefCity, [ctxt.newDefCity, ctxt.userId], (err, rows) => {
        if (err) return reject(err);
        try {
          ctxt.result = { error: null, newDefCity: ctxt.newDefCity };
          resolve(ctxt);
        }
        catch (ex) {
          return reject(ex);
        }
      });
    });
  }

  function alwaysTrue(ctxt) {
    return new Promise((resolve, reject) => {
      resolve(ctxt);
    });
  }

  function verifyUniqueEmail(ctxt) {
    return new Promise((resolve, reject) => {
      ctxt.conn.query(_selOtherEmails, [ctxt.userId, ctxt.newEmail], (err, rows) => {
        if (err) return reject(err);
        try {
          if (rows.length != 1) return reject(new Error("Failed to retrieve count of identical emails"));
          if (rows[0].count != 0) ctxt.result.error = "knownemail";
          resolve(ctxt);
        }
        catch (ex) {
          return reject(ex);
        }
      });
    });
  }

  function updEmail(ctxt) {
    return new Promise((resolve, reject) => {
      if (ctxt.result.error) return resolve(ctxt);
      ctxt.conn.query(_updEmail, [ctxt.newEmail, ctxt.userId], (err, rows) => {
        if (err) return reject(err);
        try {
          ctxt.result = { error: null, newEmail: ctxt.newEmail };
          resolve(ctxt);
        }
        catch (ex) {
          return reject(ex);
        }
      });
    });
  }

  function changeUserProfile(ctxt) {
    return new Promise((resolve, reject) => {
      // If preceding verification step failed, nothing to do.
      if (ctxt.result.error) return resolve(ctxt.result);
      var verifyFun = alwaysTrue;
      var changeFun = null;
      if (ctxt.field == "defcity") changeFun = updDefCity;
      else if (ctxt.field == "email") { verifyFun = verifyUniqueEmail; changeFun = updEmail; }
      else throw new Error("Missing or wrong profile field to update.");
      getConn(ctxt)
        .then(verifyFun)
        .then(changeFun)
        .then((ctxt) => {
          if (ctxt.conn) { ctxt.conn.release(); ctxt.conn = null; }
          resolve(ctxt.result);
        })
        .catch((err) => {
          if (ctxt.conn) ctxt.conn.release();
          return reject(ctxt);
        });
    });
  }

  var _selUserSecret = "SELECT secret_hash AS hash, secret_salt AS salt FROM users WHERE id=?;"
  var _selAllSecrets = "\
    SELECT secret_hash AS hash, secret_salt AS salt, id AS user_id, email, usrname\
    FROM users WHERE secret_hash != '.'\
    UNION ALL\
    SELECT hash, salt, user_id, '', '' FROM past_secrets;\
    ";
  var _fileSecret = "\
    INSERT INTO past_secrets (hash, salt, user_id)\
    SELECT secret_hash AS hash, secret_salt AS salt, -id AS user_id FROM users WHERE id=?;\
    ";
  var _updateSecret = "\
    UPDATE users SET secret_hash=?, secret_salt=? WHERE id=?;\
    ";
  var _setCodeUsed = "UPDATE mail_codes SET expiry=0 WHERE code=?;";

  function doVerifyUniqueSecret(ctxt) {
    return new Promise((resolve, reject) => {
      ctxt.conn.query(_selAllSecrets, (err, rows) => {
        if (err) return reject(err);
        try {
          var userIdToBump = null;
          var userEmailToBump = null;
          var userNameToBump = null;
          for (var i = 0; i != rows.length && userIdToBump == null; ++i) {
            var row = rows[i];
            // User's own current secrets are OK
            if (row.user_id == ctxt.userId || row.user_id == -ctxt.userId) continue;
            if (crypt.verifyHash(ctxt.newSecret, row.hash, row.salt)) {
              userIdToBump = row.user_id;
              userEmailToBump = row.email;
              userNameToBump = row.usrname;
            }
          }
          if (userIdToBump != null) {
            ctxt.result.error = "knownsecret";
            // If this is a different user's *past* secret, nothing to bump
            if (userIdToBump > 0) {
              ctxt.userIdToBump = userIdToBump;
              ctxt.userEmailToBump = userEmailToBump;
              ctxt.userNameToBump = userNameToBump;
            }
          }
          resolve(ctxt);
        }
        catch (ex) {
          return reject(ex);
        }
      });
    });
  }

  function doKillSecret(ctxt) {
    return new Promise((resolve, reject) => {
      if (!ctxt.userIdToBump) return resolve(ctxt);
      ctxt.conn.query(_fileSecret, [ctxt.userIdToBump], (err, rows) => {
        if (err) return reject(err);
        ctxt.conn.query(_updateSecret, [".", ".", ctxt.userIdToBump], (err, rows) => {
          if (err) return reject(err);
          if (ctxt.userIdToBump != -1) {
            // Not waiting for callback of this mail
            try {
              mailer.sendSecretBumped(ctxt.userEmailToBump, ctxt.userNameToBump);
            }
            catch (ex) {
              // TO-DO: log
            }
          }
          resolve(ctxt);
        });
      });
    });
  }

  function doInvalidateMailCode(ctxt) {
    return new Promise((resolve, reject) => {
      if (ctxt.result.error) return resolve(ctxt);
      if (!ctxt.mailCode) return resolve(ctxt);
      ctxt.conn.query(_setCodeUsed, [ctxt.mailCode], (err, rows) => {
        if (err) return reject(err);
        resolve(ctxt);
      });
    });
  }

  function doUpdateSecret(ctxt) {
    return new Promise((resolve, reject) => {
      if (ctxt.result.error) return resolve(ctxt);
      var hns = crypt.getHashAndSalt(ctxt.newSecret);
      ctxt.conn.query(_fileSecret, [ctxt.userId], (err, rows) => {
        if (err) return reject(err);
        ctxt.conn.query(_updateSecret, [hns.hash, hns.salt, ctxt.userId], (err, rows) => {
          if (err) return reject(err);
          resolve(ctxt);
        });
      });
    });
  }

  function changeSecret(ctxt) {
    return new Promise((resolve, reject) => {
      if (ctxt.result.error) return resolve(ctxt);
      getConn(ctxt)
        .then(doVerifyUniqueSecret)
        .then(doKillSecret)
        .then(doInvalidateMailCode)
        .then(doUpdateSecret)
        .then((ctxt) => {
          if (ctxt.conn) { ctxt.conn.release(); ctxt.conn = null; }
          resolve(ctxt);
        })
        .catch((err) => {
          if (ctxt.conn) ctxt.conn.release();
          return reject(err);
        });
    });
  }

  // Same as doCheckMailCode, just output different
  function doVerifyMailCode(ctxt) {
    return new Promise((resolve, reject) => {
      if (ctxt.result.error) return resolve(ctxt);
      ctxt.conn.query(_selMailCode, [ctxt.mailCode], (err, rows) => {
        if (err) return reject(err);
        try {
          ctxt.result.error = "badcode";
          // No such code
          if (rows.length != 1) return resove(ctxt);
          // Is "token" still OK?
          var expiry = new Date(rows[0].expiry)
          if (expiry < new Date()) return resolve(ctxt); // Expired
          ctxt.userId = rows[0].user_id;
          delete ctxt.result.error;
          resolve(ctxt);
        }
        catch (ex) {
          return reject(ex);
        }
      });
    });
  }

  function verifyMailCode(ctxt) {
    return new Promise((resolve, reject) => {
      if (ctxt.result.error) return resolve(ctxt);
      getConn(ctxt)
        .then(doVerifyMailCode)
        .then((ctxt) => {
          if (ctxt.conn) { ctxt.conn.release(); ctxt.conn = null; }
          resolve(ctxt);
        })
        .catch((err) => {
          if (ctxt.conn) ctxt.conn.release();
          return reject(err);
        });
    });
  }

  function doCheckUserSecret(ctxt) {
    return new Promise((resolve, reject) => {
      if (ctxt.result.error) return resolve(ctxt);
      ctxt.conn.query(_selUserSecret, [ctxt.userId], (err, rows) => {
        if (err) return reject(err);
        try {
          if (rows.length != 1) return reject(new Error("Failed to query user secret for ID."));
          if (!crypt.verifyHash(ctxt.secret, rows[0].hash, rows[0].salt)) {
            ctxt.result.error = "badsecret";
          }
          resolve(ctxt);
        }
        catch (ex) {
          return reject(ex);
        }
      });
    });
  }

  function verifyUserSecret(ctxt) {
    return new Promise((resolve, reject) => {
      if (ctxt.result.error) return resolve(ctxt);
      getConn(ctxt)
        .then(doCheckUserSecret)
        .then((ctxt) => {
          if (ctxt.conn) { ctxt.conn.release(); ctxt.conn = null; }
          resolve(ctxt);
        })
        .catch((err) => {
          if (ctxt.conn) ctxt.conn.release();
          return reject(err);
        });
    });
  }

  var _selUserByEmail = "SELECT id, usrname FROM users WHERE email=?;";
  var _insMailCode = "INSERT INTO mail_codes (code, expiry, action, user_id) VALUES (?, ?, ?, ?);";
  var _selMailCode = "SELECT * FROM mail_codes WHERE code=?;";
  var _delOldMailCodes = "DELETE FROM mail_codes WHERE expiry<?;";

  function selUserByEmail(ctxt) {
    return new Promise((resolve, reject) => {
      ctxt.conn.query(_selUserByEmail, [ctxt.email], (err, rows) => {
        if (err) return reject(err);
        try {
          // If email not there, we don't return error: don't want to leak info about emails.
          if (rows.length != 1) return resolve(ctxt);
          ctxt.userId = rows[0].id;
          ctxt.userName = rows[0].usrname;
          resolve(ctxt);
        }
        catch (ex) {
          return reject(ex);
        }
      });
    });
  }

  function insMailCode(ctxt) {
    return new Promise((resolve, reject) => {
      if (!ctxt.userId) return resolve(ctxt);
      var code = crypt.getMailCode();
      var expiry = new Date().getTime() + 1000 * 60 * 60;
      var qparams = [code, expiry, 1, ctxt.userId];
      ctxt.conn.query(_insMailCode, qparams, (err, rows) => {
        if (err) return reject(err);
        ctxt.mailCode = code;
        resolve(ctxt);
      });
    });
  }

  function mailResetLink(ctxt) {
    return new Promise((resolve, reject) => {
      if (!ctxt.mailCode) return resolve(ctxt);
      mailer.sendSecretReset(ctxt.email, ctxt.userName, ctxt.mailCode, (err) => {
        if (err) reject(err);
        else resolve(ctxt);
      });
    });
  }

  function sendResetLink(email) {
    return new Promise((resolve, reject) => {
      var ctxt = {};
      ctxt.email = email;
      getConn(ctxt)
        .then(selUserByEmail)
        .then(insMailCode)
        .then(mailResetLink)
        .then((ctxt) => {
          if (ctxt.conn) { ctxt.conn.release(); ctxt.conn = null; }
          resolve(null);
        })
        .catch((err) => {
          if (ctxt.conn) ctxt.conn.release();
          return reject(err);
        });
    });
  }

  function doCheckMailCode(ctxt) {
    return new Promise((resolve, reject) => {
      ctxt.conn.query(_selMailCode, [ctxt.code], (err, rows) => {
        if (err) return reject(err);
        try {
          // No such code
          if (rows.length != 1) return resolve(ctxt);
          // Is "token" still OK?
          var expiry = new Date(rows[0].expiry)
          if (expiry < new Date()) return resolve(ctxt); // Expired
          if (rows[0].action == 1) { // Reset secret
            ctxt.result.status = "resetsecret";
            ctxt.result.userId = rows[0].user_id;
          }
          // Unknown action: bad code
          resolve(ctxt);
        }
        catch (ex) {
          return reject(ex);
        }
      });
    });
  }

  function checkMailCode(code) {
    return new Promise((resolve, reject) => {
      var ctxt = {};
      ctxt.code = code;
      ctxt.result = { status: "badcode" };
      getConn(ctxt)
        .then(doCheckMailCode)
        .then((ctxt) => {
          if (ctxt.conn) { ctxt.conn.release(); ctxt.conn = null; }
          resolve(ctxt.result);
        })
        .catch((err) => {
          if (ctxt.conn) ctxt.conn.release();
          return reject(err);
        });
    });
  }

  function delOldMailCodes(ctxt) {
    return new Promise((resolve, reject) => {
      ctxt.conn.query(_delOldMailCodes, [new Date().getTime()], (err, rows) => {
        if (err) return reject(err);
        resolve(ctxt);
      });
    });
  }

  var _selDefCity = "SELECT defcity FROM users WHERE id=?;";
  var _selBusySlots = "SELECT dateint FROM images WHERE (city=? OR user_id=?) AND (dateint >= ? AND dateint <= ?);";
  var _selSlotCount = "SELECT COUNT(*) AS count FROM images WHERE (city=? OR user_id=?) AND (dateint=?);";
  var _insImage = "\
    INSERT INTO images\
    (dateint, user_id, city, title, imgfile, largew, largeh, smallw, smallh, mediumw, mediumh)\
    VALUES(?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?);\
  ";

  function selCityIfNeeded(ctxt) {
    return new Promise((resolve, reject) => {
      if (ctxt.city) return resolve(ctxt);
      ctxt.conn.query(_selDefCity, [ctxt.userId], (err, rows) => {
        if (err) return reject(err);
        try {
          if (rows.length != 1) throw new Error("Failed to retrieve default city.");
          ctxt.city = rows[0].defcity;
          resolve(ctxt);
        }
        catch (ex) {
          return reject(ex);
        }
      });
    });
  }

  function selUploadSlots(ctxt) {
    return new Promise((resolve, reject) => {
      ctxt.dates = [];
      for (var i = 7; i >= 0; --i) {
        var d = new Date();
        d.setDate(d.getDate() - i);
        ctxt.dates.push({
          dateint: dateformat.dateToInt(d),
          dateStr: dateformat.intToDate(dateformat.dateToInt(d)),
          month: d.getMonth() + 1,
          dayOfMonth: d.getDate(),
          dayStr: dateformat.getDayStr(d),
          free: true
        });
      }
      var qparams = [ctxt.city, ctxt.userId, ctxt.dates[0].dateint, ctxt.dates[ctxt.dates.length - 1].dateint];
      ctxt.conn.query(_selBusySlots, qparams, (err, rows) => {
        if (err) return reject(err);
        try {
          for (var i = 0; i != rows.length; ++i) {
            var di = rows[i].dateint;
            for (var j = 0; j != ctxt.dates.length; ++j) {
              if (ctxt.dates[j].dateint == di) ctxt.dates[j].free = false;
            }
          }
          resolve(ctxt);
        }
        catch (ex) {
          return reject(ex);
        }
      });
    });
  }

  function getUploadSlots(userId, city) {
    return new Promise((resolve, reject) => {
      var ctxt = {};
      ctxt.userId = userId;
      ctxt.city = city;
      getConn(ctxt)
        .then(selCityIfNeeded)
        .then(selUploadSlots)
        .then((ctxt) => {
          if (ctxt.conn) { ctxt.conn.release(); ctxt.conn = null; }
          var result = {
            city: ctxt.city,
            dates: ctxt.dates
          };
          resolve(result);
        })
        .catch((err) => {
          if (ctxt.conn) ctxt.conn.release();
          return reject(err);
        });
    });
  }

  function verifyUploadSlot(ctxt) {
    return new Promise((resolve, reject) => {
      var qparams = [ctxt.params.city, ctxt.params.userId, ctxt.params.dateint];
      ctxt.conn.query(_selSlotCount, qparams, (err, rows) => {
        if (err) return reject(err);
        try {
          if (rows.length != 1) throw new Error("Failed to get image count for date, city and user.");
          if (rows[0].count != 0) ctxt.error = "slottaken";
          resolve(ctxt);
        }
        catch (ex) {
          return reject(ex);
        }
      });
    });
  }

  function moveUploadFiles(ctxt) {
    return new Promise((resolve, reject) => {
      if (ctxt.error) return resolve(ctxt);
      var uplMd = config.uploadDir + "/" + ctxt.params.guid + "-md.jpg";
      var uplLg = config.uploadDir + "/" + ctxt.params.guid + "-lg.jpg";
      var pubMd = config.imageDir + "/" + ctxt.params.guid + "-md.jpg";
      var pubLg = config.imageDir + "/" + ctxt.params.guid + ".jpg";
      filehelper.move(uplMd, pubMd, (err) => {
        if (err) return reject(err);
        filehelper.move(uplLg, pubLg, (err) => {
          if (err) return reject(err);
          return resolve(ctxt);
        });
      });
    });
  }

  function insNewImage(ctxt) {
    return new Promise((resolve, reject) => {
      if (ctxt.error) return resolve(ctxt);
      // (dateint, user_id, city, title, imgfile, largew, largeh, 0, 0, mediumw, mediumh)
      var qparams = [ctxt.params.dateint, ctxt.params.userId, ctxt.params.city, ctxt.params.title];
      qparams.push(ctxt.params.guid + ".jpg");
      qparams.push(ctxt.params.largew);
      qparams.push(ctxt.params.largeh);
      qparams.push(ctxt.params.mediumw);
      qparams.push(ctxt.params.mediumh);
      ctxt.conn.query(_insImage, qparams, (err) => {
        if (err) return reject(err);
        resolve(ctxt);
      });
    });
  }

  function publishImage(params) {
    return new Promise((resolve, reject) => {
      var ctxt = { params: params };
      getConn(ctxt)
        .then(verifyUploadSlot)
        .then(moveUploadFiles)
        .then(insNewImage)
        .then((ctxt) => {
          if (ctxt.conn) { ctxt.conn.release(); ctxt.conn = null; }
          var result = { error: ctxt.error };
          resolve(result);
        })
        .catch((err) => {
          if (ctxt.conn) ctxt.conn.release();
          return reject(err);
        });
    });
  }

  function cleanup() {
    return new Promise((resolve, reject) => {
      var ctxt = { };
      getConn(ctxt)
        .then(delOldMailCodes)
        .then((ctxt) => {
          if (ctxt.conn) { ctxt.conn.release(); ctxt.conn = null; }
          resolve(true);
        })
        .catch((err) => {
          if (ctxt.conn) ctxt.conn.release();
          return reject(err);
        });
    });
  }

  return {
    getLatestImage: getLatestImage,
    getImage: getImage,
    getAllUsers: getAllUsers,
    getHistory: getHistory,
    getUserProfile: getUserProfile,
    changeUserProfile: changeUserProfile,
    changeSecret: changeSecret,
    verifyUserSecret: verifyUserSecret,
    verifyMailCode: verifyMailCode,
    sendResetLink: sendResetLink,
    checkMailCode: checkMailCode,
    getUploadSlots: getUploadSlots,
    publishImage: publishImage,
    cleanup: cleanup
  };
})();

module.exports = db;

