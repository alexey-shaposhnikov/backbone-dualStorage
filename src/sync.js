var bb = require('backbone');
var ajaxSync = bb.sync;
var idbSync = require('../backbone-idb/src/idb-sync');

module.exports = function(method, entity, options) {
  if( !options.remote && entity.db ) {
    return idbSync.apply(this, arguments);
  }
  return ajaxSync.apply(this, arguments);
};