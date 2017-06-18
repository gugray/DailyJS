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
    if (fullRender) App.inside.renderSticker();
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
