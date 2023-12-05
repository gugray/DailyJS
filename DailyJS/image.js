var config = require("./config.js");
var filehelper = require("./filehelper.js");
var jimp = require("jimp");

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
    });
  }

  return {
    processImage: processImage
  };
})();


module.exports = image;
