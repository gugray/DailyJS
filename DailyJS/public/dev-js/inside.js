/// <reference path="../lib/jquery-3.1.1.min.js" />
/// <reference path="zsnippets.js" />
/// <reference path="auth.js" />
/// <reference path="page.js" />

var App = App || {};

App.inside = (function () {
  "use strict";

  return {
    renderSticker: function () {
      $(".stickerTop").html(zsnippets["sticker-all-inside"]);
      // Welcome message for current user
      var helloHtml = "Hello, <span class='userName'>" + App.page.esc(App.auth.getUserName()) + "</span>!";
      $(".sticker-inside .welcome").html(helloHtml)
      // Go to front event handler
      $(".sticker-inside .enter").click(function () {
        App.page.inPageNavigate("/");
      });
      // Sign out event handler
      $(".menu-item.menuSignout").click(function () {
        App.auth.logout();
        App.page.inPageNavigate("/");
      });
      // Where am I?
      if (App.page.path().startsWith("/inside/history"))
        $(".menu-item.menuHistory").addClass("selected");
      else if (App.page.path().startsWith("/inside/profile"))
        $(".menu-item.menuProfile").addClass("selected");
    }
  };

})();
