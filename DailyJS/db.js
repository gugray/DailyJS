var mysql = require('mysql');
var dateformat = require("./dateformat.js");

var db = (function () {

  var _pool = mysql.createPool({
    host: process.env.dbhost || 'localhost',
    port: process.env.dbport || 3306,
    user: process.env.dbuser || 'root',
    password: process.env.dbpass || '',
    database: process.env.dbname || 'daily_js',
    connectionLimit: 5,
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
    SELECT imgfile, title, dateint, city, usrname\
    FROM images, users\
    WHERE images.user_id = users.id\
    ORDER BY images.id DESC LIMIT 2;\
  ";

  var _selPast = "\
    SELECT imgfile, title, usrname, images.id\
    FROM images, users\
    WHERE images.user_id = users.id AND dateint=? AND city=?\
  ";

  var _selPrev = "\
    SELECT dateint, city\
    FROM images\
    WHERE id < ?\
    ORDER BY id DESC LIMIT 1;\
  ";

  var _selNext = "\
    SELECT dateint, city\
    FROM images\
    WHERE id > ?\
    ORDER BY id ASC LIMIT 1;\
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
          var prev_dateint = null;
          var prev_city = null;
          if (rows.length > 1) {
            prev_dateint = rows[1].dateint;
            prev_city = rows[1].city;
          }
          ctxt.res = new DayImage(
            rows[0].imgfile, rows[0].title, rows[0].dateint, rows[0].city, rows[0].usrname,
            prev_dateint, prev_city,
            null, null);
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
      ctxt.conn.query(_selPrev, [ctxt.rowsPast[0].id], (err, rowsPrev) => {
        if (err) return reject(err);
        ctxt.rowsPrev = rowsPrev;
        resolve(ctxt);
      });
    });
  }

  function selNext(ctxt) {
    return new Promise((resolve, reject) => {
      ctxt.conn.query(_selNext, [ctxt.rowsPast[0].id], (err, rowsNext) => {
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
        .then((data) => {
          if (ctxt.conn) { ctxt.conn.release(); ctxt.conn = null; }
          resolve(ctxt.res);
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
        for (var i = 0; i != rows.length; ++i) {
          var row = rows[i];
          ctxt.users.push(new User(row.id, row.usrname, row.defcity, row.secret_hash, row.secret_salt, row.email));
        }
        resolve(ctxt);
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
          return reject(ctxt);
        });
    });
  }

  return {
    getLatestImage: getLatestImage,
    getImage: getImage,
    getAllUsers: getAllUsers
  };
})();

module.exports = db;

