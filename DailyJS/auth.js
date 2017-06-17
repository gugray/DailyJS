var config = require("./config.js");
var crypto = require("crypto");
var db = require("./db.js");

var auth = (function () {

  // TO-DO:
  // - Periodic cleanup of expired sessions

  // Lease on tokens; if not seen for this long, login expires.
  var leaseSec = config.sessionTimeoutSec;

  // Maps from auth token to session object
  var sessions = {};

  function Session(userName, userId) {
    var self = this;
    this.userName = userName;
    this.userId = userId;
    this.expUtc = new Date(new Date().getTime() + 1000 * leaseSec);
    self.extend = function () {
      self.expUtc = new Date(self.expUtc.getTime() + 1000 * leaseSec);
    }
  }

  function getSession(token) {
    var s = sessions[token];
    if (!s) return null;
    var now = new Date();
    if (s.expUtc < now) {
      delete sessions[token];
      return null;
    }
    else s.extend();
    return s;
  }

  // Verifies authenticated session before serving requests
  // Updates session status; infuses info for later handlers
  function sessionWare(req, res, next) {
    if (req.headers.authorization) {
      var token = req.headers.authorization.replace("Bearer ", "");
      var s = getSession(token);
      if (s == null) res.header("LoggedIn", false);
      else {
        res.header("LoggedIn", true);
        req.dailyUserName = s.userName;
        req.dailyUserId = s.userId;
        req.dailyToken = token;
      }
    }
    next();
  }

  function loginUserBySecret(users, secret, prevToken) {
    var user = null;
    for (var i = 0; i != users.length; ++i) {
      // TO-DO: actual secret verification
      var thisUser = users[i];
      if (thisUser.usrname == secret) {
        user = thisUser;
        break;
      }
    }
    // TO-DO: remove previous token?
    if (user == null) return null;
    // Get genuinely random token that doesn't identify any session yet
    var token = crypto.randomBytes(64).toString('hex');
    while (token in sessions) token = crypto.randomBytes(64).toString('hex');
    sessions[token] = new Session(user.usrname, user.id);
    return { token: token, user: user.usrname };
  }

  function login(secret, prevToken) {
    return new Promise((resolve, reject) => {
      var ctxt = {};
      db.getAllUsers(ctxt)
        .then((ctxt) => {
          resolve(loginUserBySecret(ctxt.users, secret, prevToken));
        },
        (err) => {
          return reject(err);
        });
    });
  }

  function logout(token) {
    return new Promise((resolve, reject) => {
      var s = getSession(token);
      if (!s) resolve(false);
      delete sessions[token];
      resolve(true);
    });
  }

  return {
    sessionWare: sessionWare,
    login: login,
    logout: logout
  };

})();

module.exports = auth;
