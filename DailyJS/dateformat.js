
var dateformat = (function () {

  var _months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

  return {
    intToDate: function (dateint) {
      var year = Math.floor(dateint / 10000);
      var month = Math.floor((dateint - year * 10000) / 100);
      var day = dateint - year * 10000 - month * 100;
      return _months[month - 1] + " " + day + ", " + year;
    }
  };
})();

module.exports = dateformat;