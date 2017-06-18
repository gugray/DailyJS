

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
      localStorage.setItem("user", respData.user);
      callback(true);
    });
    request.fail(function () {
      if (localStorage.getItem("token")) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
      callback(false);
    });
  }

  function doLogout() {
    doAjax("/api/logout", "POST");
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
        localStorage.removeItem("user");
      }
      if (doneCallback) doneCallback(data);
    });
    request.fail(function (jqXHR, textStatus, error) {
      if (failCallback) failCallback(jqXHR, textStatus, error);
    });
    return res;
  }

  function renderLogin() {
    $(".stickerTop").html("");
    var html = zsnippets["in-login"];
    html = html.replace("{{loginpanel-inner}}", zsnippets["chunk-loginpanel"]);
    $(".content-inner").html(html);
    $("#txtSecret").val("");
    $("#txtSecret").focus();
    controlLogin();
  }

  function isValidEmail(str) {
    // - email regex
    // http://emailregex.com/
    var reMail = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return reMail.test(str);
  }

  function controlLogin(pathOnSuccess) {
    $("#txtSecret").on("input", function () {
      if ($("#txtSecret").val() != "") $(".btnLoginGo").removeClass("disabled");
      else $(".btnLoginGo").addClass("disabled");
    });
    $("#txtResetEmail").on("input", function () {
      if (isValidEmail($("#txtResetEmail").val())) $(".btnLoginGo").removeClass("disabled");
      else $(".btnLoginGo").addClass("disabled");
    });
    $("#txtSecret").keyup(function (event) {
      if (event.keyCode == 13) {
        onLoginGo(pathOnSuccess);
        return false;
      }
      else return true;
    });
    $("#txtResetEmail").keyup(function (event) {
      if (event.keyCode == 13) {
        onLoginGo(pathOnSuccess);
        return false;
      }
      else return true;
    });
    $(".btnLoginGo").click(function () { onLoginGo(pathOnSuccess); });
    $(".forgotSecret").click(onForgotSecret);
    $(".resetEmailFeedback .close span").click(function () {
      $(".resetEmailFeedback").removeClass("visible");
    });
  }

  function setForgotOrCancel(forgot) {
    if (forgot) {
      $(".forgotSecret").text("forgot?");
      $("#txtResetEmail").addClass("hidden");
      $("#txtSecret").removeClass("hidden");
      $("#txtSecret").val("");
      $("#txtSecret").focus();
    }
    else {
      $(".forgotSecret").text("cancel");
      $("#txtResetEmail").removeClass("hidden");
      $("#txtSecret").addClass("hidden");
      $("#txtResetEmail").val("");
      $("#txtResetEmail").focus();
    }
  }

  function onForgotSecret() {
    // "forgot?" clicked
    if ($("#txtResetEmail").hasClass("hidden")) setForgotOrCancel(false);
    // "cancel" clicked
    else setForgotOrCancel(true);
    $(".btnLoginGo").addClass("disabled")
  }

  function onLoginGo(pathOnSuccess) {
    // Disabled does nothing
    if ($(".btnLoginGo").hasClass("disabled")) return;
    // Hide previous popup if we still have it
    $(".popup").removeClass("visible");
    // We're in "enter secret" mode
    if (!$("#txtSecret").hasClass("hidden")) {
      $(".btnLoginGo").addClass("disabled");
      App.auth.login($("#txtSecret").val(), function (res) {
        $(".btnLoginGo").removeClass("disabled");
        if (!res) {
          // Failed login feedback
          $(".loginPanel").addClass("failed");
          setTimeout(function () {
            $(".loginPanel").removeClass("failed");
          }, 100);
        }
        else {
          // Re-init current page (inside) or move (from front)
          if (!pathOnSuccess) App.page.reEnterCurrent();
          else App.page.inPageNavigate(pathOnSuccess);
        }
      });
    }
    // We're in "send reset email" mode
    else {
      var req = doAjax("/api/resetsecret", "POST", { email: $("#txtResetEmail").val() });
      req.done(function () {
        showEmailFeedback(true);
        setForgotOrCancel(true);
      });
      req.fail(function () {
        showEmailFeedback(false);
        $("#txtResetEmail").focus();
      });
      $(".btnLoginGo").addClass("hidden");
      $(".icoEmailSending").removeClass("hidden");
    }
  }

  function showEmailFeedback(success) {
    $(".resetEmailFeedback").addClass("visible");
    if (success) {
      $(".resetEmailFeedback .success").addClass("visible");
      $(".resetEmailFeedback .fail").removeClass("visible");
    }
    else {
      $(".resetEmailFeedback .success").removeClass("visible");
      $(".resetEmailFeedback .fail").addClass("visible");
    }
    var offs = {
      left: $(".loginPanel").offset().left,
      top: $(".loginPanel").offset().top + $(".loginPanel").height() + 10
    }
    $(".resetEmailFeedback").offset(offs);
    $(".btnLoginGo").removeClass("hidden");
    $(".icoEmailSending").addClass("hidden");
  }


  return {
    // Submits an AJAX request. Boilerplate infuses auth token (if we're logged in),
    // and updates logged-in status from response.
    ajax: function (url, type, data) { return doAjax(url, type, data); },

    // Returns yes if we're logged on (or think so, based on presence of an auth token).
    isLoggedIn: isLoggedIn,

    getUserName: function () { return localStorage.getItem("user"); },

    // Attempts to log in
    login: function (secret, callback) { doLogin(secret, callback); },

    logout: doLogout,

    renderLogin: renderLogin,

    controlLogin: controlLogin,

    isValidEmail: isValidEmail

  };

})();
