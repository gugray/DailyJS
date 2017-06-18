/// <reference path="../lib/jquery-3.1.1.min.js" />

var App = App || {};

App.page = (function () {
  "use strict";

  var pages = [];
  var path = null; // (Current) path after domain name
  var ctrl = null; // Controller for current path

  $(document).ready(function () {
    // Where am I? Also instantiates controller.
    parseLocation();
    $(window).on('popstate', function (e) {
      parseLocation();
    });
    // After first ("real") page load, send a ping
    // Response will update our logged-in status (session may have expired, but token still in local store)
    App.auth.ajax("/api/ping", "GET");
  });

  function parseLocation() {
    var loc = window.history.location || window.location;
    var rePath = /https?:\/\/[^\/]+(.*)/i;
    var match = rePath.exec(loc);
    path = match[1];
    var found = false;
    for (var i = 0; i < pages.length; ++i) {
      if (pages[i].isMyRoute(path)) {
        if (ctrl != null && ctrl.name == pages[i].name) ctrl.move(path);
        else ctrl = pages[i].getController(path);
        found = true;
        break;
      }
    }
    // TO-DO: 404
    if (!found) show404();
    initDynNav();
  }

  function onDynNav() {
    $(".popup").removeClass("visible");
    history.pushState(null, null, this.href);
    parseLocation();
    return false;
  }

  function inPageNavigate(path) {
    $(".popup").removeClass("visible");
    history.pushState(null, null, path);
    parseLocation();
  }

  function initDynNav() {
    // Remove old handlers
    $(document).off('click', 'a.ajax', onDynNav);
    // Re-add handlers
    $(document).on('click', 'a.ajax', onDynNav);
  }

  function show404() {
    $(".stickerTop").html("");
    $(".content-inner").html(zsnippets["in-404"]);
  }

  function esc(s) {
    return s.replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }


  return {
    registerPage: function (ctrl) {
      pages.push(ctrl);
    },
    esc: esc,
    path: function () { return path; },
    show404: show404,
    inPageNavigate: inPageNavigate,
    reEnterCurrent: function() { ctrl.enter(); }
  };

})();
