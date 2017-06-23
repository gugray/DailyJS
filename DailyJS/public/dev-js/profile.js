/// <reference path="../lib/jquery-3.1.1.min.js" />
/// <reference path="zsnippets.js" />
/// <reference path="auth.js" />
/// <reference path="page.js" />

var App = App || {};

App.profile = (function () {
  "use strict";

  enter();

  // Called when front first shown, or navigated to from back
  function enter() {
    fetchData(true);
  }

  // Called when navigating around within front
  function move(newPath) {
    fetchData(false);
  }

  function fetchData(fullRender) {
    var req = App.auth.ajax("/api/getprofile", "GET");
    req.done(function (data) {
      if (fullRender) App.inside.renderSticker();
      renderInner(data);
    });
    req.fail(function (jqXHR, textStatus, error) {
      if (jqXHR.status == 401) App.auth.renderLogin();
      else {
        if (fullRender) App.inside.renderSticker();
        renderOops();
      }
    });
  }

  function renderInner(data) {
    $(".content-inner").html(zsnippets["in-profile"]);
    $(".formRow.defCity .value").text(data.defcity);
    $(".formRow.email .value").text(data.email);
    // Edit action
    $(".commands i").click(function () {
      $(".formRow .commands").addClass("hidden");
      var elmRow = $(this).closest(".formRow");
      elmRow.addClass("editing");
      if (elmRow.hasClass("defCity")) onEditDefCity();
      if (elmRow.hasClass("secret")) onEditSecret();
      if (elmRow.hasClass("email")) onEditEmail();
      $(".cancelsave").removeClass("hidden");
      $(".progress").removeClass("visible");
    });
    // Cancel
    $(".editor .cancel").click(function () {
      cancelEdit();
    });
    wireupDefCity();
    wireupSecret();
    wireupEmail();
  }

  function cancelEdit() {
    $(".editor input").val("");
    $(".formRow").removeClass("editing");
    $(".formRow .commands").removeClass("hidden");
  }

  function wireupDefCity() {
    $("#txtDefCity").keyup(function (event) {
      if (event.keyCode == 13) {
        submitDefCity();
        return false;
      }
      if (event.keyCode == 27) {
        cancelEdit();
        return false;
      }
      else return true;
    });
    $(".formRow.defCity .save").click(function () {
      submitDefCity();
    });
  }

  function onEditDefCity() {
    $("#txtDefCity").val($(".formRow.defCity .value").text());
    $("#txtDefCity").focus();
  }

  function submitDefCity() {
    if ($(".formRow.defCity .progress").hasClass("visible")) return;
    var params = {
      field: "defcity",
      newDefCity: $("#txtDefCity").val()
    }
    var req = App.auth.ajax("/api/changeprofile", "POST", params);
    req.done(function (data) {
      if (data.error) renderOops();
      else {
        cancelEdit();
        $(".formRow.defCity .value").text(data.newDefCity);
        $(".formRow.defCity .field").addClass("blue");
        setTimeout(function () {
          $(".formRow.defCity .field").removeClass("blue");
        }, 100);
      }
    });
    req.fail(function (jqXHR, textStatus, error) {
      if (jqXHR.status == 401) App.auth.renderLogin();
      else renderOops();
    });
    $(".formRow.defCity .cancelsave").addClass("hidden");
    $(".formRow.defCity .progress").addClass("visible");
  }

  function wireupSecret() {
    $(".formRow.secret input").keyup(function (event) {
      if (event.keyCode == 13) {
        if (!$(".formRow.secret.save").hasClass("disabled")) submitSecret();
        return false;
      }
      if (event.keyCode == 27) {
        cancelEdit();
        return false;
      }
      else return true;
    });
    $(".formRow.secret .save").click(function () {
      if ($(this).hasClass("disabled")) return;
      submitSecret();
    });
    $(".formRow.secret input").on("input", function () {
      var ok = true;
      if ($("#txtOldSecret").val().length == 0) ok = false;
      if ($("#txtNewSecret1").val().length == 0) ok = false;
      if (ok) $(".formRow.secret .save").removeClass("disabled");
      else $(".formRow.secret .save").addClass("disabled");
    });
  }

  function onEditSecret() {
    $("#txtOldSecret").focus();
  }

  function validateSecretPreSubmit() {
    var ok = true;
    var newSecret = $("#txtNewSecret1").val();
    var countUpper = 0;
    var countDigit = 0;
    for (var i = 0; i < newSecret.length; ++i) {
      var c = newSecret[i];
      if (c == c.toUpperCase())++countUpper;
      if (c >= '0' && c <= '9')++countDigit;
    }
    if (newSecret.length < 8 || countDigit == 0 || countUpper == 0) {
      $(".formRow.secret .errNewSecret1").addClass("visible");
      ok = false;
    }
    return ok;
  }

  function submitSecret() {
    if ($(".formRow.secret .progress").hasClass("visible")) return;
    $(".editor .error").removeClass("visible");
    if (!validateSecretPreSubmit()) return;
    var params = {
      oldSecret: $("#txtOldSecret").val(),
      newSecret: $("#txtNewSecret1").val()
    }
    var req = App.auth.ajax("/api/changesecret", "POST", params);
    req.done(function (data) {
      $(".formRow.secret .cancelsave").removeClass("hidden");
      $(".formRow.secret .progress").removeClass("visible");
      if (data.error == "knownsecret") {
        $(".formRow.secret .errKnownSecret").addClass("visible");
      }
      else if (data.error == "badsecret") {
        $(".formRow.secret .errOldSecret").addClass("visible");
      }
      else if (data.error) renderOops();
      else {
        cancelEdit();
        $(".formRow.secret .field").addClass("blue");
        setTimeout(function () {
          $(".formRow.secret .field").removeClass("blue");
        }, 100);
      }
    });
    req.fail(function (jqXHR, textStatus, error) {
      if (jqXHR.status == 401) App.auth.renderLogin();
      else renderOops();
    });
    $(".formRow.secret .cancelsave").addClass("hidden");
    $(".formRow.secret .progress").addClass("visible");
  }

  function wireupEmail() {
    $(".formRow.email input").keyup(function (event) {
      if (event.keyCode == 13) {
        if (!$(".formRow.email .save").hasClass("disabled")) submitEmail();
        return false;
      }
      if (event.keyCode == 27) {
        cancelEdit();
        return false;
      }
      else return true;
    });
    $(".formRow.email .save").click(function () {
      if ($(this).hasClass("disabled")) return;
      submitEmail();
    });
    $("#txtSecretForEmail").on("input", function () {
      validateEditEmail();
    });
    $("#txtEmail").on("input", function () {
      validateEditEmail();
    });
  }

  function onEditEmail() {
    $("#txtEmail").val($(".formRow.email .value").text());
    $("#txtEmail").focus();
  }

  function validateEditEmail() {
    var ok = true;
    if ($("#txtSecretForEmail").val().length == 0) ok = false;
    if (!App.auth.isValidEmail($("#txtEmail").val())) ok = false;
    if (ok) $(".formRow.email .save").removeClass("disabled");
    else $(".formRow.email .save").addClass("disabled");
  }

  function submitEmail() {
    if ($(".formRow.email .progress").hasClass("visible")) return;
    var params = {
      field: "email",
      secret: $("#txtSecretForEmail").val(),
      newEmail: $("#txtEmail").val()
    }
    var req = App.auth.ajax("/api/changeprofile", "POST", params);
    req.done(function (data) {
      $(".formRow.email .cancelsave").removeClass("hidden");
      $(".formRow.email .progress").removeClass("visible");
      if (data.error == "knownemail") {
        $(".formRow.email .errEmailExists").addClass("visible");
      }
      else if (data.error == "badsecret") {
        $(".formRow.email .errOldSecret").addClass("visible");
      }
      else if (data.error) renderOops();
      else {
        cancelEdit();
        $(".formRow.email .value").text(data.newEmail);
        $(".formRow.email .field").addClass("blue");
        setTimeout(function () {
          $(".formRow.email .field").removeClass("blue");
        }, 100);
      }
    });
    req.fail(function (jqXHR, textStatus, error) {
      if (jqXHR.status == 401) App.auth.renderLogin();
      else renderOops();
    });
    $(".editor .error").removeClass("visible");
    $(".formRow.email .cancelsave").addClass("hidden");
    $(".formRow.email .progress").addClass("visible");
  }

  function renderOops() {
    $(".content-inner").html(zsnippets["in-oops"]);
  }

  return {
    move: move,
    enter: enter,
    name: "profile"
  };
});

App.page.registerPage({
  name: "profile",
  isMyRoute: function (path) {
    if (path.indexOf("/inside/profile") == 0) return true;
    return false;
  },
  getController: function (path) {
    return App.profile();
  }
});
