var config = require("./config.js");
var filehelper = require("./filehelper.js");
// Different image libraries used on dev and prod!
var sharp = process.env.NODE_ENV == "production" ? require("sharp") : null;
var jimp = process.env.NODE_ENV == "production" ? null : require("jimp");

var image = (function () {
  "use strict"

  const maxW = 1600;
  const maxH = 1000;

  function processImage(guid) {
    return new Promise((resolve, reject) => {
      var result = {};
      var fnOrig = config.uploadDir + "/" + guid + ".jpg";
      var fnMedium = config.uploadDir + "/" + guid + "-md.jpg";
      var fnLarge = config.uploadDir + "/" + guid + "-lg.jpg";
      // Resizing with jimp
      // ------------------------------------
      if (jimp) {
        jimp.read(fnOrig, function (err, img) {
          if (err) return reject(err);
          result.origw = img.bitmap.width;
          result.origh = img.bitmap.height;
          result.finalw = result.origw;
          result.finalh = result.origh;
          if (result.origw > maxW || result.origh > maxH) {
            img.scaleToFit(maxW, maxH);
            result.finalw = img.bitmap.width;
            result.finalh = img.bitmap.height;
          }
          img.quality(90);
          img.write(fnLarge, function (err, img) {
            if (err) return reject(err);
            img.scaleToFit(200, 200);
            result.mediumw = img.bitmap.width;
            result.mediumh = img.bitmap.height;
            img.quality(90);
            img.write(fnMedium, function (err, img) {
              if (err) return reject(err);
              return resolve(result);
            });
          });
        });
      }
      // Resizing with sharp
      // ------------------------------------
      else {
        var img = sharp(fnOrig);
        img.resize(200, 200).max().jpeg({ quality: 90 }).toFile(fnMedium, function (err, info) {
          if (err) return reject(err);
          img.metadata(function (err, md) {
            if (err) return reject(err);
            result.origw = md.width;
            result.origh = md.height;
            result.mediumw = info.width;
            result.mediumh = info.height;
            result.finalw = result.origw;
            result.finalh = result.origh;
            if (md.width > 1600) {
              img.resize(1600, 10000).max().jpeg({ quality: 90 }).toFile(fnLarge, function (err, info) {
                if (err) return reject(err);
                result.finalw = info.width;
                result.finalh = info.height;
                resolve(result);
              });
            }
            else {
              filehelper.copy(fnOrig, fnLarge, function (err) {
                if (err) return reject(err);
                else resolve(result);
              });
            }
          });
        });
      }
    });
  }

  return {
    processImage: processImage
  };
})();


module.exports = image;
