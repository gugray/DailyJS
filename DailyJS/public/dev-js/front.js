/// <reference path="../lib/jquery-3.1.1.min.js" />
/// <reference path="zsnippets.js" />
/// <reference path="auth.js" />
/// <reference path="page.js" />

var App = App || {};

App.front = (function (path) {
  "use strict";

  var path = path;
  var pathOnLogin = "/inside/history";
  enter();

  // Called when front first shown, or navigated to from back
  function enter() {
    if (!initView()) return;
    fetchFrontData();
  }

  // Called when navigating around within front
  function move(newPath) {
    path = newPath;
    fetchFrontData();
  }

  function initView() {
    var contentAlreadyThere = true;
    // Build page DOM if missing
    if ($(".stickerFront").length == 0) {
      $(".stickerTop").html(zsnippets["front"]);
      $(".content-inner").html("<div class='image-holder'>&nbsp;</div>");
      contentAlreadyThere = false;
    }
    // Enter icon click
    $(".menu .enter").click(onEnterClicked);
    // Login panel with behavior
    var elmLoginPanel = $(zsnippets["loginpanel-inner"]);
    elmLoginPanel.insertBefore(".photoMeta");
    //$(".photoMeta").insertBefore(elmLoginPanel);
    App.auth.controlLogin(pathOnLogin);
    // Let caller now if we still need to fetch data
    return !contentAlreadyThere;
  }

  function onEnterClicked() {
    // Login panel currently shown: hide it
    if ($(".loginPanel").hasClass("visible")) {
      $(".photoMeta").removeClass("hidden");
      $(".loginPanel").removeClass("visible");
      return;
    }
    // Currently not logged in: show login panel
    if (!App.auth.isLoggedIn()) {
      $(".photoMeta").addClass("hidden");
      $(".loginPanel").addClass("visible");
      $("#txtSecret").val("");
      $("#txtSecret").focus();
    }
    // Currently logged in: go inside
    else App.page.inPageNavigate(pathOnLogin);
  }

  function fetchFrontData() {
    // Naked path: latest image
    if (path == "/") {
      var req = App.auth.ajax("/api/getlatestimage", "GET");
      req.done(function (data) {
        $(".image-holder").css("background-image", "url('" + data.img_url + "')");
        $(".photoTitle").text(data.title);
        $(".photoMeta .date").text(data.dateStr);
        $(".photoMeta .city").text(data.city);
        $(".photoMeta .poster").text(data.user);
        $(".menu .back").attr("href", "/past/" + data.prev_dateint + "/" + data.prev_city);
        $(".menu .back").removeClass("disabled");
        $(".menu .forward").addClass("disabled");
      });
      req.fail(function (jqXHR, textStatus, error) {
        App.page.show404();
      });
    }
    // The past
    else if (path.startsWith("/past/")) {
      var spec = path.replace("/past/", "");
      var parts = spec.split('/');
      var req = App.auth.ajax("/api/getimage", "GET", { date: parts[0], city: decodeURIComponent(parts[1]) });
      req.done(function (data) {
        $(".image-holder").css("background-image", "url('" + data.img_url + "')");
        $(".photoTitle").text(data.title);
        $(".photoMeta .date").text(data.dateStr);
        $(".photoMeta .city").text(data.city);
        $(".photoMeta .poster").text(data.user);
        if (data.prev_dateint) {
          $(".menu .back").attr("href", "/past/" + data.prev_dateint + "/" + data.prev_city);
          $(".menu .back").removeClass("disabled");
        }
        else {
          $(".menu .back").addClass("disabled");
        }
        if (data.next_dateint) {
          $(".menu .forward").attr("href", "/past/" + data.next_dateint + "/" + data.next_city);
          $(".menu .forward").removeClass("disabled");
        }
        else {
          $(".menu .forward").addClass("disabled");
        }
      });
      req.fail(function (jqXHR, textStatus, error) {
        App.page.show404();
      });
   }
  }

  return {
    move: move,
    enter: enter,
    name: "front"
  };
});

App.page.registerPage({
  name: "front",
  isMyRoute: function (path) {
    if (path == "" || path == "/") return true;
    var re = /^\/past\/([0-9]+)\/(.+)$/g;
    if (path.match(re)) return true;
    return false;
  },
  getController: function (path) {
    return App.front(path);
  }
});
