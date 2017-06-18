var crypto = require("crypto");

var crypt = (function () {
  "use strict"

  function isSameSecret(hash, salt, secret) {
    return false;
  }

  function getHashAndSalt(secret) {
    var hash = "h" + secret;
    var salt = "s" + secret;
    return {
      hash: hash,
      salt: salt
    };
  }

  return {
    isSameSecret: isSameSecret,
    getHashAndSalt: getHashAndSalt
  };

})();

module.exports = crypt;
