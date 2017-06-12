

var App = App || {};

App.auth = (function (path) {
  "use strict";

  function isLoggedIn() {
    var token = localStorage.getItem("token");
    if (!token || token == "") return false;
    return true;
  }

  function doLogin(secret, callback) {
    var prevToken = localStorage.getItem("token");
    var data = { secret: secret };
    if (prevToken) data.prevToken = prevToken;
    var request = $.ajax({
      url: "/api/login",
      type: "POST",
      contentType: "application/x-www-form-urlencoded; charset=UTF-8",
      data: data
    });
    request.done(function (respData) {
      localStorage.setItem("token", respData.token);
      callback(true);
    });
    request.fail(function () {
      if (localStorage.getItem("token")) localStorage.removeItem("token");
      callback(false);
    });
  }

  function doAjax(url, type, data) {
    var doneCallback;
    var failCallback;
    var res = {
      done: function (callback) { doneCallback = callback; },
      fail: function (callback) { failCallback = callback; }
    };
    var request = $.ajax({
      url: url,
      type: type,
      contentType: "application/x-www-form-urlencoded; charset=UTF-8",
      data: data,
      beforeSend: function (xhr) {
        var token = localStorage.getItem("token");
        if (token) xhr.setRequestHeader("Authorization", "Bearer " + token);
      }
    });
    request.done(function (data, textStatus, xtra) {
      var wasLoggedIn = isLoggedIn();
      var loggedIn = xtra.getResponseHeader("LoggedIn") === "true";
      if (!loggedIn && wasLoggedIn && localStorage.getItem("token")) {
        localStorage.removeItem("token");
      }
      if (doneCallback) doneCallback(data);
    });
    request.fail(function (jqXHR, textStatus, error) {
      if (failCallback) failCallback(jqXHR, textStatus, error);
    });
    return res;
  }

  return {
    // Submits an AJAX request. Boilerplate infuses auth token (if we're logged in),
    // and updates logged-in status from response.
    ajax: function (url, type, data) { return doAjax(url, type, data); },

    // Returns yes if we're logged on (or think so, based on presence of an auth token).
    isLoggedIn: isLoggedIn,

    // Attempts to log in
    login: function (secret, callback) { doLogin(secret, callback); }

  };

})();
