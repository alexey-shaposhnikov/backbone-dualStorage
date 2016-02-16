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
    'delete' : 'DELETE_FAILED',
    'read'   : 'READ_FAILED'
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
        return self.save( null, opts )
          .done( function() {
            return resp;
          });
      })
      .then( function( resp ){
        options.success.call( options.context, self, resp, options );
      });
  },

  save: function( models, options ){
    options = options || {};
    if( options.remote ){
      return this.remoteSave( models, options );
    }
    return IDBCollection.prototype.save.apply( this, arguments );
  },

  remoteSave: function(){},

  parse: function( resp, options ){
    resp = resp && resp[this.name] ? resp[this.name] : resp;
    if( options.remote ){
      _.each( resp, function( attrs ){
        this.mergeModels( attrs, options );
      }.bind(this));
    }
    return IDBCollection.prototype.parse.call( this, resp, options );
  },

  mergeModels: function( attrs, options ){
    var model, attr = {},
      idAttribute = this.model.prototype.idAttribute,
      remoteIdAttribute = this.model.prototype.remoteIdAttribute;

    attr[remoteIdAttribute] = attrs[remoteIdAttribute];
    model = this.findWhere(attr);

    if( model ){
      attrs[idAttribute] = model.id;
      if( options.remoteIds &&
        ( attrs['last_updated'] > model.get('last_updated') ) ){
        attrs['_state'] = this.states.read;
      }
    }
    
    if( !model && options.remoteIds ){
      attrs['_state'] = this.states.read;
    }

  },

  fetchRemoteIds: function( last_update, options ){
    var url = _.result(this, 'url') + '/ids';
    options = _.defaults({
      url: url,
      remote: true,
      remoteIds: true,
      data: {
        fields: ['id', 'updated_at'],
        filter: {
          limit: -1,
          updated_at_min: last_update
        }
      }
    }, options);

    return this.fetch(options);
  },

  fetchUpdatedIds: function( options ){
    var last_update = _.compact( this.pluck('updated_at') ).sort().pop();
    return this.fetchRemoteIds( last_update, options );
  }

});