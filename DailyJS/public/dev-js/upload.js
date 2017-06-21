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
    fetchData(false);
  }

  function fetchData(fullRender) {
    var reqId = ++slotReqId;
    var req = App.auth.ajax("/api/getuploadslots", "GET");
    req.done(function (data) {
      if (slotReqId != reqId) return;
      if (fullRender || $(".stickerFront").length == 0) App.inside.renderSticker();
      renderInner(data);
    });
    req.fail(function (jqXHR, textStatus, error) {
      if (slotReqId != reqId) return;
      state = null;
      if (jqXHR.status == 401) App.auth.renderLogin();
      else {
        if (fullRender || $(".stickerFront").length == 0) App.inside.renderSticker();
        renderOops();
      }
    });
  }

  function renderInner(data) {
    $(".content-inner").html(zsnippets["in-upload"]);
    if (state) $("#txtCity").val(state.city);
    else $("#txtCity").val(data.city);
    if (state) $("#txtTitle").val(state.title);
    initDateWidget(data.dates);
    $("#txtCity").on("input", onCityChanged);
    $("#txtCity").focus().val($("#txtCity").val()); // This puts caret at end of text
    $(".btnGoToPreview").click(onGoToPreview);
    if (state && state.imgGuid) showImageFromState();
    $(".uploadHot").click(onUploadClicked);
    $(".uploadHot").on("drop", function (event) {
      $(".uploadHot").removeClass("dragging");
      if (event.originalEvent.dataTransfer && event.originalEvent.dataTransfer.files.length) {
        event.preventDefault();
        event.stopPropagation();
        doUpload(event.originalEvent.dataTransfer.files[0]);
      }
    });
    $(".uploadHot").on("dragover", function (e) {
      e.preventDefault();
      e.stopPropagation();
      $(".uploadHot").addClass("dragging");
    });
    $(".uploadHot").on("dragenter", function (e) {
      e.preventDefault();
      e.stopPropagation();
      $(".uploadHot").addClass("dragging");
    });
    $(".uploadHot").on("dragleave", function (e) {
      e.preventDefault();
      e.stopPropagation();
      $(".uploadHot").removeClass("dragging");
    });
  }

  function onUploadClicked() {
    var fileSelector = $('<input type="file" accept=".jpg,.jpeg" hidden="true"></input>');
    fileSelector.click();
    fileSelector.change(function () {
      doUpload($(this)[0].files[0]);
    });
  }

  function doUpload(file) {
    $(".upload-widget img").attr("src", "");
    $(".image-upload-info").html("");
    var formData = new FormData();
    formData.append('file', file);
    var token = App.auth.getToken();
    if (token) formData.append("token", token);
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
  }

  function uploadProgress(e) {
    if (e.lengthComputable) {
      var percent = Math.round(e.loaded / e.total * 100);
      $(".upload-widget .progress").css("width", percent + "%");
    }
  }

  function uploadFail(xhr) {
    if (xhr.status == 401) App.auth.renderLogin();
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
    if (!state) state = {};
    state.imgGuid = data.guid;
    state.imgOrigBytes = data.size;
    $(".upload-widget .processing").addClass("visible");

    var req = App.auth.ajax("/api/processimage", "POST", { guid: data.guid });
    req.done(function (data) {
      state.origw = data.origw;
      state.origh = data.origh;
      state.finalw = data.finalw;
      state.finalh = data.finalh;
      state.mediumw = data.mediumw;
      state.mediumh = data.mediumh;
      $(".upload-widget .processing").removeClass("visible");
      $(".upload-widget .progress").css("width", "0");
      showImageFromState();
    });
    req.fail(function (jqXHR, textStatus, error) {
      if (jqXHR.status == 401) App.auth.renderLogin();
      else uploadFail();
    });
  }

  function showImageFromState() {
    var origBytesFmt = "" + Math.floor(state.imgOrigBytes / 1024);
    $(".upload-widget img").attr("src", "/uploads/" + state.imgGuid + "-md.jpg");
    $(".uploadHot").html("want a different one?<br/>click to upload and replace");
    var imgInfo = origBytesFmt + "KB, " + state.origw + " x " + state.origh;
    if (state.finalw != state.origw) {
      imgInfo += "\nresized to " + state.finalw + " x " + state.finalh;
    }
    $(".image-upload-info").html(imgInfo);
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
    // OK, checks out: show preview
    state.title = $("#txtTitle").val();
    state.city = $("#txtCity").val().trim().toLowerCase();
    state.dateint = $(".day.selected").data("dateint");
    state.dateStr = $(".day.selected").data("datestr");
    var elmSticker = $(zsnippets["sticker-front"]);
    elmSticker.find(".photoTitle").text(state.title);
    elmSticker.find(".photoMeta .date").text(state.dateStr);
    elmSticker.find(".photoMeta .city").text(state.city);
    elmSticker.find(".photoMeta .poster").text(App.auth.getUserName());
    elmSticker.find(".menu").html('<span class="accept"><i class="fa fa-check"></i></span><span class="reject"><i class="fa fa-times"></i></span>');
    $(".stickerTop").html("");
    $(".stickerTop").append(elmSticker);
    $(".content-inner").html("<div class='image-holder'>&nbsp;</div>");
    $(".image-holder").css("background-image", "url('/uploads/" + state.imgGuid + "-lg.jpg')");
    // Next steps
    $(".stickerFront .menu .accept").click(onPublishPreview);
    $(".stickerFront .menu .reject").click(onRejectPreview);
  }

  function onPublishPreview() {
    var params = {
      guid: state.imgGuid,
      dateint: state.dateint,
      city: state.city,
      title: state.title,
      largew: state.finalw,
      largeh: state.finalh,
      mediumw: state.mediumw,
      mediumh: state.mediumh
    };
    var req = App.auth.ajax("/api/publishimage", "POST", params);
    req.done(function (data) {
      // Req OK, but publish failed
      if (data.error) {
        if (data.error == "slottaken") renderSlotTaken();
        else {
          $(".stickerFront").remove();
          renderOops();
        }
      }
      // Publish OK! > Redirect to new image
      else {
        $(".stickerFront").remove();
        var path = "/past/" + state.dateint + "/" + encodeURIComponent(state.city);
        App.page.inPageNavigate(path);
      }
    });
    req.fail(function (jqXHR, textStatus, error) {
      $(".stickerFront").remove();
      if (jqXHR.status == 401) App.auth.renderLogin();
      else renderOops();
    });
    // Show progress until request returns
    $(".stickerFront .menu").html('<span><i class="fa fa-spinner fa-pulse fa-fw"></i></span>');
  }

  function onRejectPreview() {
    move();
    App.inside.renderSticker();
  }

  function onCityChanged() {
    var city = $("#txtCity").val().trim();
    if (city == "") {
      $(".formRow.date").addClass("empty")
      return;
    }
    $(".formRow.date").removeClass("empty")
    var reqId = ++slotReqId;
    var req = App.auth.ajax("/api/getuploadslots", "GET", { city: city });
    req.done(function (data) {
      if (slotReqId != reqId) return;
      updateDateWidget(data.dates);
    });
    req.fail(function (jqXHR, textStatus, error) {
      if (slotReqId != reqId) return;
      if (jqXHR.status == 401) App.auth.renderLogin();
      else renderOops();
    });
  }

  function initDateWidget(dates) {
    // Render days
    var html = "";
    for (var i = 0; i < dates.length; ++i) {
      var itm = dates[i];
      html += "<div class='day";
      if (!itm.free) html += " disabled";
      html += "' data-dateint='" + itm.dateint + "'";
      html += " data-datestr='" + itm.dateStr + "'>";
      html += itm.month + "/" + itm.dayOfMonth + "<br/>" + itm.dayStr;
      html += "</div>";
    }
    $(".date-widget").html(html);
    // We have a state, and last selected day is still available: select it
    var selected = false;
    if (state && state.dateint) {
      var elmDay = $(".date-widget .day[data-dateint='" + state.dateint + "']");
      if (elmDay.length != 0 && !elmDay.hasClass("disabled")) {
        elmDay.addClass("selected");
        selected = true;
      }
    }
    // Nothing selected yet? Select latest available slot
    if (!selected) {
      var lastAvailDateint = 0;
      for (var i = dates.length - 1; i >= 0; --i) {
        if (dates[i].free) {
          lastAvailDateint = dates[i].dateint;
          break;
        }
      }
      if (lastAvailDateint > 0) {
        $(".date-widget .day[data-dateint='" + lastAvailDateint + "']").addClass("selected");
        selected = true;
      }
    }

    if (!selected) $(".formRow.date").addClass("empty");
    else $(".formRow.date").removeClass("empty");
    $(".date-widget .day").click(function () {
      if ($(".formRow.date").hasClass("empty")) return;
      if ($(this).hasClass("disabled")) return;
      $(".date-widget .day").removeClass("selected");
      $(this).addClass("selected");
    });
  }

  function updateDateWidget(dates) {
    var selected = false;
    $(".date-widget .day").each(function () {
      var di = $(this).data("dateint");
      var avail = false;
      for (var i = 0; i != dates.length; ++i) {
        if (dates[i].dateint == di && dates[i].free) avail = true;
      }
      if (avail) $(this).removeClass("disabled");
      else $(this).addClass("disabled");
      if (state && state.dateint && di == state.dateint) {
        $(this).addClass("selected");
        selected = true;
      }
      else $(this).removeClass("selected");
    });
    // Nothing selected? Select latest available slot.
    if (!selected) {
      var lastAvailDateint = 0;
      for (var i = dates.length - 1; i >= 0; --i) {
        if (dates[i].free) {
          lastAvailDateint = dates[i].dateint;
          break;
        }
      }
      if (lastAvailDateint > 0) {
        $(".date-widget .day[data-dateint='" + lastAvailDateint + "']").addClass("selected");
        selected = true;
      }
    }
  }

  function renderSlotTaken() {
    $(".stickerFront").remove();
    $(".content-inner").html(zsnippets["in-slottaken"]);
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
    if (path.indexOf("/inside/upload") == 0) return true;
    return false;
  },
  getController: function (path) {
    return App.upload(path);
  }
});
