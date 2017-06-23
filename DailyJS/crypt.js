var crypto = require("crypto");

var crypt = (function () {
  "use strict"

  function genRandomString(length) {
    return crypto.randomBytes(Math.ceil(length / 2))
      .toString('hex')
      .slice(0, length)
      .toLowerCase();
  };

  function verifyHash(secret, storedHash, salt) {
    var hash = crypto.createHmac('sha512', salt);
    hash.update(secret);
    var value = hash.digest('hex');
    return storedHash == value;
  }

  function getHashAndSalt(secret) {
    var salt = genRandomString(32);
    var hash = crypto.createHmac('sha512', salt);
    hash.update(secret);
    var value = hash.digest('hex');
    return {
      hash: value,
      salt: salt,
    };
  }

  function getMailCode() {
    return genRandomString(24);
  }

  return {
    verifyHash: verifyHash,
    getHashAndSalt: getHashAndSalt,
    getMailCode: getMailCode
  };

})();

module.exports = crypt;
