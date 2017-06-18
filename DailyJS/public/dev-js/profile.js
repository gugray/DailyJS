/// <reference path="../lib/jquery-3.1.1.min.js" />
/// <reference path="zsnippets.js" />
/// <reference path="auth.js" />
/// <reference path="page.js" />

var App = App || {};

App.profile = (function (path) {
  "use strict";

  enter();

  // Called when front first shown, or navigated to from back
  function enter() {
    fetchData(true);
  }

  // Called when navigating around within front
  function move(newPath) {
    path = newPath;
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
      var elmRow = $(this).closest(".formRow");
      elmRow.addClass("editing");
      $(".formRow .commands").addClass("hidden");
      elmRow.find("input:first-child").focus();
    });
    // Cancel
    $(".editor .cancel").click(function () {
      $(".editor input").val("");
      $(".formRow").removeClass("editing");
      $(".formRow .commands").removeClass("hidden");
    });
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
    if (path.startsWith("/inside/profile")) return true;
    return false;
  },
  getController: function (path) {
    return App.profile(path);
  }
});
