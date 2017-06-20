/// <reference path="../lib/jquery-3.1.1.min.js" />
/// <reference path="zsnippets.js" />
/// <reference path="auth.js" />
/// <reference path="page.js" />

var App = App || {};

App.upload = (function () {
  "use strict";

  var slotReqId = 0;
  var state = null;

  enter();

  // Called when front first shown, or navigated to from back
  function enter() {
    state = null;
    fetchData(true);
  }

  // Called when navigating around within front
  function move(newPath) {
    state = null;
    fetchData(false);
  }

  function fetchData(fullRender) {
    var reqId = ++slotReqId;
    var req = App.auth.ajax("/api/getuploadslots", "GET");
    req.done(function (data) {
      if (slotReqId != reqId) return;
      state = {};
      if (fullRender) App.inside.renderSticker();
      renderInner(data);
    });
    req.fail(function (jqXHR, textStatus, error) {
      if (slotReqId != reqId) return;
      if (jqXHR.status == 401) App.auth.renderLogin();
      else {
        if (fullRender) App.inside.renderSticker();
        renderOops();
      }
    });
  }

  function renderInner(data) {
    $(".content-inner").html(zsnippets["in-upload"]);
    $("#txtCity").val(data.city);
    initDateWidget(data.dates);
    $("#txtCity").on("input", onCityChanged);
    $("#txtCity").focus().val($("#txtCity").val()); // This puts caret at end of text
    $(".btnGoToPreview").click(onGoToPreview);
    $(".uploadHot").click(onUploadClicked);
  }

  function onUploadClicked() {
    var fileSelector = $('<input type="file" accept=".jpg,.jpeg"></input>');
    fileSelector.click();
    fileSelector.change(function () {
      $(".upload-widget img").attr("src", "");
      $(".image-upload-info").html("");
      var formData = new FormData();
      formData.append('file', $(this)[0].files[0]);
      $.ajax({
        url: '/api/uploadimage',
        type: 'POST',
        data: formData,
        cache: false,
        contentType: false,
        processData: false,
        xhr: function () {
          var myXhr = $.ajaxSettings.xhr();
          if (myXhr.upload) myXhr.upload.addEventListener('progress', uploadProgress, false);
          return myXhr;
        },
        success: uploadSuccess,
        error: uploadFail
      }, 'json');
    });
  }

  function uploadProgress(e) {
    if (e.lengthComputable) {
      var percent = Math.round(e.loaded / e.total * 100);
      $(".upload-widget .progress").css("width", percent + "%");
    }
  }

  function uploadFail() {
    $(".upload-widget .processing").removeClass("visible");
    $(".upload-widget .progress").css("width", "0");
    $(".formRow.image").addClass("failed");
    setTimeout(function () {
      $(".formRow.image").removeClass("failed");
    }, 100);
    if (state.imgGuid) delete state.imgGuid;
    if (state.imgOrigBytes) delete state.imgOrigBytes;
  }

  function uploadSuccess(data) {
    state.imgGuid = data.guid;
    state.imgOrigBytes = data.size;
    var origBytesFmt = "" + Math.floor(state.imgOrigBytes / 1024);
    $(".upload-widget .processing").addClass("visible");

    var req = App.auth.ajax("/api/processimage", "POST", { guid: data.guid });
    req.done(function (data) {
      state.origw = data.origw;
      state.origh = data.origh;
      state.finalw = data.finalw;
      state.finalh = data.finalh;
      $(".upload-widget .processing").removeClass("visible");
      $(".upload-widget .progress").css("width", "0");
      $(".upload-widget img").attr("src", "/uploads/" + state.imgGuid + "-md.jpg");
      $(".uploadHot").html("want a different picture?<br/>just upload again the same way");
      var imgInfo = origBytesFmt + "KB, " + state.origw + " x " + state.origh;
      if (state.finalw != state.origw) {
        imgInfo += "\nresized to " + state.finalw + " x " + state.finalh;
      }
      $(".image-upload-info").html(imgInfo);
    });
    req.fail(function (jqXHR, textStatus, error) {
      if (jqXHR.status == 401) App.auth.renderLogin();
      else uploadFail();
    });
  }

  function onGoToPreview() {
    // Validate input: selectors for fields that must be flashed
    var badFields = [];
    if ($("#txtCity").val().trim() == "") badFields.push(".formRow.city");
    if ($(".day.selected").length == 0) badFields.push(".formRow.date");
    if ($("#txtTitle").val().trim() == "") badFields.push(".formRow.title");
    var thumbSrc = $(".upload-widget img").attr("src");
    if (!thumbSrc || thumbSrc == "") badFields.push(".formRow.image");
    if (badFields.length != 0) {
      for (var i = 0; i != badFields.length; ++i) $(badFields[i]).addClass("failed");
      setTimeout(function () {
        $(".formRow").removeClass("failed");
      }, 100);
      return;
    }
    // OK, checks out: request preview
    // TO-DO
  }

  function onCityChanged() {
    $(".date-widget .day").removeClass("selected");
    $(".date-widget .day").addClass("disabled");
    var city = $("#txtCity").val().trim();
    if (city == "") {
      $(".formRow.date").addClass("empty")
      return;
    }
    var reqId = ++slotReqId;
    var req = App.auth.ajax("/api/getuploadslots", "GET", { city: city });
    req.done(function (data) {
      if (slotReqId != reqId) return;
      initDateWidget(data.dates);
    });
    req.fail(function (jqXHR, textStatus, error) {
      if (slotReqId != reqId) return;
      if (jqXHR.status == 401) App.auth.renderLogin();
      else  renderOops();
    });
  }

  function initDateWidget(dates) {
    // Select latest available slot
    var selIx = -1;
    for (var i = dates.length - 1; i >= 0; --i) {
      if (dates[i].free) {
        selIx = i;
        break;
      }
    }
    var html = "";
    for (var i = dates.length - 1; i >= 0; --i) {
      var itm = dates[i];
      html += "<div class='day";
      if (!itm.free) html += " disabled";
      if (i == selIx) html += " selected";
      html += "' data-dateint='" + itm.dateint + "'>";
      html += itm.month + "/" + itm.dayOfMonth + "<br/>" + itm.dayStr;
      html += "</div>";
    }
    $(".date-widget").html(html);
    if (selIx == -1) $(".formRow.date").addClass("empty");
  }

  function renderOops() {
    $(".content-inner").html(zsnippets["in-oops"]);
  }

  return {
    move: move,
    enter: enter,
    name: "upload"
  };
});

App.page.registerPage({
  name: "upload",
  isMyRoute: function (path) {
    if (path.startsWith("/inside/upload")) return true;
    return false;
  },
  getController: function (path) {
    return App.upload(path);
  }
});
