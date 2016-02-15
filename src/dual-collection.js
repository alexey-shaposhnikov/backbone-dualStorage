var bb = require('backbone');
var IDBCollection = require('../backbone-idb/src/idb-collection');
var DualModel = require('./dual-model');
var _ = require('lodash');

module.exports = bb.DualCollection = IDBCollection.extend({

  model: DualModel,

  keyPath: 'local_id',

  indexes       : [
    {name: 'local_id', keyPath: 'local_id', unique: true},
    {name: 'id', keyPath: 'id', unique: true}
  ],

  // delayed states
  states: {
    //'patch'  : 'UPDATE_FAILED',
    'update' : 'UPDATE_FAILED',
    'create' : 'CREATE_FAILED',
    'delete' : 'DELETE_FAILED'
  },

  fetch: function( options ){
    options = options || {};
    if(options.remote){
      return this.remoteFetch(options);
    }
    return IDBCollection.prototype.fetch.call(this, options);
  },

  remoteFetch: function( options ){
    var self = this,
        opts = _.extend({}, options, { remove: false, success: false });

    return IDBCollection.prototype.fetch.call(this, opts)
      .then( function( resp ){
        opts.remote = false;
        return self.save( resp, opts )
          .done( function() {
            return resp;
          });
      })
      .then( function( resp ){
        options.success.call( options.context, self, resp, options );
      });
  },

  save: function( models, options ){
    var self = this;
    options = options || {};
    if( options.remote ){
      return this.remoteSave( models, options );
    }
    return this.db.putBatch( models )
      .then( function(){
        return self.fetch();
      });
  },

  remoteSave: function(){
    // bulk, check hasChanged?
  },

  parse: function( resp, options ){
    resp = resp && resp[this.name] ? resp[this.name] : resp;
    if( options.remote ){
      _.each( resp, function( attrs ){
        this.mergeAttributesByRemoteId( attrs );
      }.bind(this));
    }
    return IDBCollection.prototype.parse.call( this, resp, options );
  },

  mergeAttributesByRemoteId: function( attrs ){
    var idAttribute = this.model.prototype.idAttribute;
    var remoteIdAttribute = this.model.prototype.remoteIdAttribute;
    var attr = {};
    attr[remoteIdAttribute] = attrs[remoteIdAttribute];
    var model = this.findWhere(attr);
    if( model ){
      attrs[idAttribute] = model.id;
    }
  }

});