
var dateformat = (function () {

  var _months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
  var _monthsShort = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

  return {
    intToDate: function (dateint) {
      var year = Math.floor(dateint / 10000);
      var month = Math.floor((dateint - year * 10000) / 100);
      var day = dateint - year * 10000 - month * 100;
      return _months[month - 1] + " " + day + ", " + year;
    },

    intToDateShort: function (dateint) {
      var year = Math.floor(dateint / 10000);
      var month = Math.floor((dateint - year * 10000) / 100);
      var day = dateint - year * 10000 - month * 100;
      return _monthsShort[month - 1] + " " + day;
    }
  };
})();

module.exports = dateformat;