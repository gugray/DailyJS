var etc = require('etc')();

var config = (function () {
  let cfgFileName = __dirname + "/../dev-config.json";
  let secretsFileName = __dirname + "/../dev-secrets.json";
  if (process.env.CONFIG_FILE) {
    cfgFileName = process.env.CONFIG_FILE;
    secretsFileName = process.env.SECRETS_FILE;
  }
  etc.file(cfgFileName);
  etc.file(secretsFileName);
  return etc.toJSON();
})();

module.exports = config;
