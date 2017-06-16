var etc = require('etc')();

var config = (function () {
  if (process.env.NODE_ENV == "production")
    etc.file("/etc/dailyjs/config.json");
  else etc.file(__dirname + "/../dev-config.json");
  return etc.toJSON();
})();

module.exports = config;
