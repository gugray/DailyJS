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
      var usrName = App.auth.getUserName();
      if (usrName) {
        usrName = App.page.esc(usrName);
        var helloHtml = "hello, <span class='userName'>" + usrName + "</span>!";
        $(".sticker-inside .welcome").html(helloHtml)
      }
      // Go to front event handler
      $(".sticker-inside .enter").click(function () {
        App.page.inPageNavigate("/");
      });
      // Sign out event handler
      $(".menuSignout").click(function () {
        App.auth.logout();
        App.page.inPageNavigate("/");
      });
      // Where am I?
      if (App.page.path().indexOf("/inside/upload") == 0)
        $(".menu-item.menuUpload").addClass("selected");
      else if (App.page.path().indexOf("/inside/history") == 0)
        $(".menu-item.menuHistory").addClass("selected");
      else if (App.page.path().indexOf("/inside/profile") == 0)
        $(".menu-item.menuProfile").addClass("selected");
    }
  };

})();
