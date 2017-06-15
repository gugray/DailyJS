var etc = require('etc')();

var config = (function () {
  if (process.env.node_env == "production")
    etc.file("/etc/dailjs/config.json");
  else etc.file(__dirname + "/../dev-config.json");
  return etc.toJSON();
})();

module.exports = config;
