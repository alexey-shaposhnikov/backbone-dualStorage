var bb = require('backbone');
var IDBCollection = require('../backbone-idb/src/idb-collection');
var DualModel = require('./dual-model');

module.exports = bb.DualCollection = IDBCollection.extend({

  model: DualModel

});