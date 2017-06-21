var fs = require("fs");

var filehelper = (function () {
  "use strict";

  function copy(source, target, callback) {
    var cbCalled = false;
    var rd = fs.createReadStream(source);
    rd.on("error", done);
    var wr = fs.createWriteStream(target);
    wr.on("error", done);
    wr.on("close", function (ex) {
      done();
    });
    rd.pipe(wr);
    function done(err) {
      if (!cbCalled) {
        callback(err);
        cbCalled = true;
      }
    }
  }

  function move(oldPath, newPath, callback) {
    fs.rename(oldPath, newPath, function (err) {
      if (err) {
        if (err.code === 'EXDEV') {
          copy();
        } else {
          callback(err);
        }
        return;
      }
      callback();
    });
    function copy() {
      var readStream = fs.createReadStream(oldPath);
      var writeStream = fs.createWriteStream(newPath);
      readStream.on('error', callback);
      writeStream.on('error', callback);
      readStream.on('close', function () {
        fs.unlink(oldPath, callback);
      });
      readStream.pipe(writeStream);
    }
  }

  return {
    copy: copy,
    move: move
  };
})();

module.exports = filehelper;
