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
    initView();
    fetchData();
  }

  // Called when navigating around within front
  function move(newPath) {
    path = newPath;
    fetchData();
  }

  function initView() {
    // Build page DOM
    $(".stickerTop").html(zsnippets["stickerInside"]);
    $(".content-inner").html("inside!");
  }

  function fetchData() {
  }

  return {
    move: move,
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
