/// <reference path="../lib/jquery-3.1.1.min.js" />
/// <reference path="zsnippets.js" />
/// <reference path="auth.js" />
/// <reference path="page.js" />

var App = App || {};

App.history = (function (path) {
  "use strict";

  var path = path;
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
    var req = App.auth.ajax("/api/history", "GET");
    req.done(function (data) {
      if (fullRender) renderSticker();
      renderInner();
    });
    req.fail(function (jqXHR, textStatus, error) {
      if (jqXHR.status == 401) App.auth.renderLogin();
      else {
        if (fullRender) renderSticker();
        renderOops();
      }
    });
  }

  function renderInner() {
    $(".content-inner").html("[in]");
  }

  function renderSticker() {
    $(".stickerTop").html(zsnippets["sticker-all-inside"]);
  }

  function renderOops() {
    $(".content-inner").html(zsnippets["in-oops"]);
  }

  return {
    move: move,
    enter: enter,
    name: "history"
  };
});

App.page.registerPage({
  name: "history",
  isMyRoute: function (path) {
    if (path == "/inside/history" || path.startsWith("/inside/history/")) return true;
    return false;
  },
  getController: function (path) {
    return App.history(path);
  }
});
