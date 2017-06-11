/// <reference path="../lib/jquery-3.1.1.min.js" />
/// <reference path="zsnippets.js" />
/// <reference path="page.js" />

var App = App || {};

App.front = (function (path) {
  "use strict";

  var path = path;
  enter();

  function enter() {
    if (!initView()) return;
    fetchFrontData();
  }

  function initView() {
    var contentAlreadyThere = true;
    if ($(".stickerFront").length == 0) {
      $(".stickerTop").html(zsnippets["front"]);
      $(".content-inner").html("<div class='image-holder'>&nbsp;</div>");
      contentAlreadyThere = false;
    }
    $(".menu .enter").click(function () {
      if ($(".loginPanel").hasClass("visible")) {
        $(".photoMeta").removeClass("hidden");
        $(".loginPanel").removeClass("visible");
      }
      else {
        $(".photoMeta").addClass("hidden");
        $(".loginPanel").addClass("visible");
        $("#txtSecret").val("");
        $("#txtSecret").focus();
      }
    });
    return contentAlreadyThere;
  }

  function fetchFrontData() {
    // Naked path: latest image
    if (path == "/") {
      var req = $.ajax({
        url: "/api/getlatestimage",
        type: "GET",
        contentType: "application/x-www-form-urlencoded; charset=UTF-8"
      });
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
      var req = $.ajax({
        url: "/api/getimage",
        type: "GET",
        contentType: "application/x-www-form-urlencoded; charset=UTF-8",
        data: { date: parts[0], city: decodeURIComponent(parts[1]) }
      });
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

  function move(newPath) {
    path = newPath;
    fetchFrontData();
  }

  return {
    move: move,
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
