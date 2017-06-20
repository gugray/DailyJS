var sharp = require("sharp");
var fs = require("fs");

function copyFile(source, target, cb) {
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
      cb(err);
      cbCalled = true;
    }
  }
}

var fnSource = "micu.jpg";
var img = sharp(fnSource);
img.resize(200, 200).max().jpeg({ quality: 90 }).toFile("sm.jpg", function (err, info) {
  if (err) console.log(err);
  else {
    console.log(info);
    img.metadata(function (err, md) {
      if (err) console.log(err);
      else {
        if (md.width > 1600) {
          img.resize(1600, 10000).max().jpeg({ quality: 90 }).toFile("lg.jpg", function (err, info) {
            if (err) console.log(err);
            else console.log("DONE - resize");
          });
        }
        else {
          copyFile(fnSource, "lg.jpg", function (err) {
            if (err) console.log(err);
            else console.log("DONE - copy");
          });
        }
      }
    });
  }
});
