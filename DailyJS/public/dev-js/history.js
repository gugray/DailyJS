/// <reference path="../lib/jquery-3.1.1.min.js" />
/// <reference path="zsnippets.js" />
/// <reference path="auth.js" />
/// <reference path="page.js" />

var App = App || {};

App.history = (function (path) {
  "use strict";

  var path = path;
  var city = null;
  var user = null;
  var navBase = null;
  var cities = null;
  var users = null;
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
    // Data to render: our position comes from path in URL
    var params = getParamsFromPath();
    if (!params) {
      App.page.inPageNavigate("/inside/history");
      return;
    }
    city = params.city ? decodeURIComponent(params.city) : null;
    user = params.user ? decodeURIComponent(params.user) : null;
    // Our position on calendar, with filter - needed for rendered nav links
    navBase = "/inside/history";
    if (params.city) navBase += "/c/" + encodeURIComponent(params.city);
    else if (params.user) navBase += "/u/" + encodeURIComponent(params.user);
    // Retrieve history to render
    var req = App.auth.ajax("/api/history", "GET", params);
    req.done(function (data) {
      if (fullRender) renderSticker();
      cities = data.cities;
      users = data.users;
      renderInner(data);
    });
    req.fail(function (jqXHR, textStatus, error) {
      if (jqXHR.status == 401) App.auth.renderLogin();
      else {
        // Failed to get info: this can happen if we've fallen off the map,
        // or if something has gone wrong. Redirect to param-less history if we're not there;
        // show oops if we're already there.
        if (path == "/inside/history") {
          if (fullRender) renderSticker();
          renderOops();
        }
        else App.page.inPageNavigate("/inside/history");
      }
    });
  }

  function getParamsFromPath() {
    if (path == "/inside/history" || path == "/inside/history/") return {};
    var tail = path.replace("/inside/history/", ""); // Only relevant URL parts with params
    tail = tail.replace(/\/$/, ""); // Trim optional trailing slash
    var reFilter = /^([cu])\/([^\/]+)$/g;
    var reDate = /^([0-9]{4})\/([0-9]{2})$/g;
    var reFilterDate = /^([cu])\/([^\/]+)\/([0-9]{4})\/([0-9]{2})$/g;
    var match = reFilter.exec(tail);
    if (match) {
      if (match[1] == "c") return { city: match[2] };
      else if (match[1] == "u") return { user: match[2] };
      else return null;
    }
    match = reDate.exec(tail);
    if (match) return { year: match[1], month: match[2] };
    match = reFilterDate.exec(tail);
    if (match) {
      var res = { year: match[3], month: match[4] };
      if (match[1] == "c") res.city = match[2];
      else if (match[1] == "u") res.user = match[2];
      else return null;
      return res;
    }
    return null;
  }

  var monthsShort = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

  function renderInner(data) {
    //$(".content-inner").html(zsnippets["in-history"]);
    var html = "<div class='inner-history'>";
    // Images
    html += "<div class='thumbs'>";
    for (var i = 0; i != data.images.length; ++i) {
      var img = data.images[i];
      var dataNav = "/past/" + img.dateint + "/" + encodeURIComponent(img.city);
      html += "<div class='thumb' data-nav='" + dataNav + "'>";
      html += "<div class='meta'>";
      html += img.dateStrShort + "<br/>" + App.page.esc(img.city) + " &bull; " + App.page.esc(img.user);
      html += "<div class='image'><img src='";
      html += img.img_url + "' /></div>";
      html += "<div class='title'>" + App.page.esc(img.title) + "</div>";
      html += "</div>"; // <div class='meta'>
      html += "</div>"; // <div class='thumb'>
    }
    html += "</div>"; // <div class='thumbs'>
    // Calendar
    html += "<div class='nav'>";
    html += "<div><div class='navUser'>";
    if (!user) html += "all sojourners";
    else html += App.page.esc(user);
    html += "</div><div class='navCity'>";
    if (!city) html += "all cities";
    else html += App.page.esc(city);
    html += "</div></div>";
    html += "<div class='calendar'>";
    html += "<div class='sep'></div>";
    // Years
    for (var i = 0; i != data.years.length; ++i) {
      var year = data.years[i];
      if (i % 4 == 0) {
        if (i != 0) html += "</div>"; // <div class='navYear'>
        html += "<div class='navYear navParent'>";
      }
      var cls = "";
      if (year.year == data.currentYear) cls += " selected";
      if (year.maxMonth == 0) cls += " empty";
      var dataNav = navBase + "/" + year.year + "/" + ("0" + year.maxMonth).slice(-2);
      html += "<div class='" + cls + "' data-nav='" + dataNav + "'> ";
      html += year.year;
      html += "</div>";
    }
    html += "</div>"; // <div class='navYear'>
    html += "<div class='sep'></div>";
    // Months
    for (var i = 12; i > 0; --i) {
      if (i % 4 == 0) {
        if (i != 12) html += "</div>"; // <div class='navMonth'>
        html += "<div class='navMonth navParent'>";
      }
      var ixx = data.activeMonths.indexOf(i);
      var cls = ixx >= 0 ? "" : "empty";
      if (i == data.currentMonth) cls += " selected";
      var dataNav = navBase + "/" + data.currentYear + "/" + ("0" + i).slice(-2);
      html += "<div class='" + cls + "' data-nav='" + dataNav + "'>" + monthsShort[i - 1] + "</div>";
    }
    html += "</div>"; // <div class='navMonth'>
    html += "</div>"; // <div class='calendar'>
    html += renderFilter(users);
    html += renderFilter(cities);
    html += "</div>"; // <div class='nav'>
    // Close
    html += "</div>"; // <div class='inner-history'>
    $(".content-inner").html(html);
    // Fancy scrollbar: thumbs
    // http://noraesae.github.io/perfect-scrollbar/
    $(".inner-history .thumbs").perfectScrollbar();
    // Fancy scrollbar and dynamic max-height: filter drop-downs
    var xa = $(".inner-history").height();
    var xb = $(".inner-history").offset().top;
    var xc = $(".nav .sep").first().offset().top;
    $(".inner-history .filterContent").css("max-height", (xa + xb - xc - 20) + "px");
    $(".inner-history .filterContent").perfectScrollbar();
    // Navigation
    $(".navParent div").click(function () {
      if ($(this).hasClass("empty")) return;
      App.page.inPageNavigate($(this).data("nav"));
    });
    $(".thumb").click(function () {
      App.page.inPageNavigate($(this).data("nav"));
    });
    $(".navUser").click(function () {
      if ($(".filter.users").hasClass("visible")) {
        $(".filter.users").removeClass("visible");
        $(".calendar").removeClass("hidden");
      }
      else {
        $(".filter.cities").removeClass("visible");
        $(".filter.users").addClass("visible");
        $(".calendar").addClass("hidden");
      }
    });
    $(".navCity").click(function () {
      if ($(".filter.cities").hasClass("visible")) {
        $(".filter.cities").removeClass("visible");
        $(".calendar").removeClass("hidden");
      }
      else {
        $(".filter.users").removeClass("visible");
        $(".filter.cities").addClass("visible");
        $(".calendar").addClass("hidden");
      }
    });
    $(".filter .nofilter div").click(function () {
      App.page.inPageNavigate("/inside/history/" + data.currentYear + "/" + data.currentMonth);
    });
    $(".filter.users .table div div").click(function () {
      App.page.inPageNavigate("/inside/history/u/" + encodeURIComponent($(this).text()));
    });
    $(".filter.cities .table div div").click(function () {
      App.page.inPageNavigate("/inside/history/c/" + encodeURIComponent($(this).text()));
    });
  }

  function renderFilter(arr) {
    var html = "";
    var cls = arr == cities ? "cities" : "users";
    var nfStr = arr == cities ? "all cities" : "all sojourners";
    html += "<div class='filter " + cls + "'>";
    html += "<div class='diamond'>&nbsp;</div>";
    html += "<div class='filterContent'>";
    html += "<div class='nofilter'><div>" + nfStr + "</div></div>";
    html += "<div class='table'>";

    var lim = Math.ceil(arr.length / 2);
    for (var i = 0; i < lim; ++i) {
      var strLeft = arr[i];
      var strRight = null;
      if (lim + i < arr.length) strRight = arr[lim + i];
      html += "<div><div>" + App.page.esc(strLeft) + "</div>";
      if (strRight) html += "<div>" + App.page.esc(strRight) + "</div>";
      html += "</div>";
    }

    html += "</div>"; // <div class='table'>
    html += "</div>"; // <div class='filterContent'>
    html += "</div>"; // <div class='filter users'>
    return html;
  }

  function renderSticker() {
    $(".stickerTop").html(zsnippets["sticker-all-inside"]);
    var helloHtml = "Hello, <span class='userName'>" + App.page.esc(App.auth.getUserName()) + "</span>!";
    $(".sticker-inside .welcome").html(helloHtml)
    $(".menuHistory").addClass("selected");
    $(".sticker-inside .enter").click(function () {
      App.page.inPageNavigate("/");
    });
    $(".sticker-inside .menuSignout").click(function () {
      App.auth.logout();
      App.page.inPageNavigate("/");
    });
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
