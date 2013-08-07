exports.each = function(list, fn) {
  for (var i = 0, j = list.length; i < j; i++) {
    fn(list[i]);
  }
};

exports.eachAsync = function(list, fn, cb) {
  var results = [];
  var firstErr = null;
  var itemsProcessed = 0;
  if (list.length > 0) {
    exports.each(list, function(item) {
      fn(item, function(err, result) {
        if (!firstErr) {
          if (err) {
            firstErr = err;
          } else {
            results.push(result);
          }
        }
        if (++itemsProcessed === list.length) {
          if (firstErr) {
            cb(firstErr);
          } else {
            cb(null, results);
          }
        }
      });
    });
  } else {
    cb(null, results);
  }
};

exports.asyncSeries = function(fns, cb) {
  var fnList = fns.concat();

  function callNextFn() {
    var fn = fnList.shift();
    if (fn) {
      fn(function(err) {
        if (err) { return cb(err); }
        callNextFn();
      });
    } else {
      cb(null);
    }
  }

  callNextFn();
};

exports.filter = function(list, fnFilter) {
  var items = [];
  exports.each(list, function(item) {
    if (fnFilter(item)) {
      items.push(item);
    }
  });
  return items;
};

exports.stringEndsWith = function(str, text) {
  if (str.length >= text.length)
    return str.substr(str.length - text.length) == text;
  else
    return false;
};
