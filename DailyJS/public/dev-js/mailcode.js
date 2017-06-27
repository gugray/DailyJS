/// <reference path="../lib/jquery-3.1.1.min.js" />
/// <reference path="zsnippets.js" />
/// <reference path="auth.js" />
/// <reference path="page.js" />

var App = App || {};

App.mailcode = (function () {
  "use strict";

  var code = null;
  enter();

  function move() {
    renderOops();
  }

  function renderOops() {
    $(".content-inner").html(zsnippets["in-oops"]);
  }

  function enter() {
    code = App.page.path().replace("/x/", "");
    fetchData();
    // DBG
    //renderResetSecret();
  }

  function fetchData() {
    var req = App.auth.ajax("/api/checkmailcode", "GET", { mailcode: code });
    req.done(function (data) {
      if (!data.status) $(".content-inner").html(zsnippets["in-oops"]);
      else {
        if (data.status == "resetsecret") renderResetSecret();
        else if (data.status == "badcode") $(".content-inner").html(zsnippets["in-badcode"]);
        else renderOops();
      }
    });
    req.fail(function (jqXHR, textStatus, error) {
      renderOops();
    });
  }

  function renderResetSecret() {
    $(".content-inner").html(zsnippets["in-resetsecret"]);
    $("#txtSecret").focus();
    $("#txtSecret").keyup(function (event) {
      if (event.keyCode == 13) {
        submit();
        return false;
      }
      else return true;
    });
    $(".submit").click(submit);
    $(".showSecret").mousedown(function (evt) {
      evt.stopPropagation();
      evt.preventDefault();
      if ($(this).hasClass("active")) {
        $(this).removeClass("active");
        $("#txtSecret").attr("type", "password");
      }
      else {
        $(this).addClass("active");
        $("#txtSecret").attr("type", "text");
        var elm = $(this);
        setTimeout(function () {
          elm.removeClass("active");
          $("#txtSecret").attr("type", "password");
          $("#txtSecret").focus();
        }, 2000);
      }
    });
  }

  function submit() {
    $(".error").removeClass("visible");
    if ($(".icoResetProgress").hasClass("visible")) return;
    if (!validateSecretPreSubmit()) return;
    $(".icoResetProgress").addClass("visible");
    var req = App.auth.ajax("/api/changesecret", "POST", { mailCode: code, newSecret: $("#txtSecret").val() });
    req.done(function (data) {
      $(".icoResetProgress").removeClass("visible");
      if (data.error) {
        if (data.error == "knownsecret") {
          $(".errKnownSecret").addClass("visible");
          $("#txtSecret").focus();
        }
        else renderOops();
      }
      else {
        $(".content-inner").html(zsnippets["in-resetsecret-ok"]);
      }
    });
    req.fail(function (jqXHR, textStatus, error) {
      renderOops();
    });
  }

  function validateSecretPreSubmit() {
    var ok = true;
    var newSecret = $("#txtSecret").val();
    var countUpper = 0;
    var countDigit = 0;
    for (var i = 0; i < newSecret.length; ++i) {
      var c = newSecret[i];
      if (c == c.toUpperCase())++countUpper;
      if (c >= '0' && c <= '9')++countDigit;
    }
    if (newSecret.length < 8 || countDigit == 0 || countUpper == 0) {
      $(".errNewSecret").addClass("visible");
      $("#txtSecret").focus();
      ok = false;
    }
    return ok;
  }

  return {
    move: move,
    enter: enter,
    name: "mailcode"
  };
});

App.page.registerPage({
  name: "mailcode",
  isMyRoute: function (path) {
    if (path.indexOf("/x/") == 0) return true;
    return false;
  },
  getController: function (path) {
    return App.mailcode(path);
  }
});
