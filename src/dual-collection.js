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
      return this.fetchRemote(options);
    }
    return IDBCollection.prototype.fetch.call(this, options);
  },

  fetchRemote: function( options ){
    options = options || {};
    var self = this;
    var opts = _.extend({}, options, {
      parse: true,
      remove: false,
      remote: true,
      success: undefined
    });

    return this.sync('read', this, opts)
      .then( function( response ){
        response = opts.parse ? self.parse( response, opts ) : response;
        if( ! options.remove ){
          opts.success = options.success;
        }
        return self.saveLocalBatch( response, opts );
      })
      .then( function( response ){
        if( options.remove ){
          var ids = _.map( response, 'id' );
          return self.removeGarbage( ids, options );
        }
      });
  },

  saveBatch: function( models, options ){
    options = options || {};
    if( options.remote ){
      return this.saveRemoteBatch( models, options );
    }
    return this.saveLocalBatch( models, options );
  },

  saveLocalBatch: function( models, options ){
    models = _.map( models, function( model ){
      if( model instanceof bb.Model ){
        model = model.toJSON();
      }
      if( ! model[this.model.prototype.remoteIdAttribute] ){
        model._state = this.states.create;
      }
      return model;
    }.bind(this));
    return IDBCollection.prototype.saveBatch.call( this, models, options );
  },

  saveRemoteBatch: function(){},

  parse: function( resp, options ){
    options = options || {};
    resp = resp && resp[this.name] ? resp[this.name] : resp;
    if( options.remote ){
      _.each( resp, function( attrs ){
        this.mergeModels( attrs, options );
      }.bind(this));
    }
    return IDBCollection.prototype.parse.call( this, resp, options );
  },

  /* jshint -W071, -W074 */
  mergeModels: function( attrs, options ){
    var model, attr = {},
      idAttribute = this.model.prototype.idAttribute,
      remoteIdAttribute = this.model.prototype.remoteIdAttribute;

    attr[remoteIdAttribute] = attrs[remoteIdAttribute];
    model = this.findWhere(attr);

    if( model ){
      if( model.id ){
        attrs[idAttribute] = model.id;
      }
      if( options.remoteIds &&
        ( attrs['last_updated'] > model.get('last_updated') ) ){
        attrs['_state'] = this.states.read;
      }
    }

    if( !model && options.remoteIds ){
      attrs['_state'] = this.states.read;
    }

  },
  /* jshint +W071, +W074 */

  fetchRemoteIds: function( last_update, options ){
    var url = _.result(this, 'url') + '/ids';

    options = _.defaults(options, {
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
    });

    return this.fetchRemote(options);
      //.then( function( resp ){
      //  if( options.remove ){
      //    var ids = _.map( resp, function ( attrs ){
      //      return attrs.id;
      //    });
      //    return self.removeGarbage( ids, options );
      //  }
      //});
  },

  fetchUpdatedIds: function( options ){
    var last_update = _.compact( this.pluck('updated_at') ).sort().pop();
    return this.fetchRemoteIds( last_update, options );
  },

  removeGarbage: function( remoteIds, options ){
    var self = this, models,
      remoteIdAttribute = this.model.prototype.remoteIdAttribute;

    remoteIds = _.isArray( remoteIds ) ? remoteIds : [remoteIds];
    this.fetch()
      .then( function() {
        models = self.filter( function( model ) {
          return model.get(remoteIdAttribute) &&
            ! _.includes( remoteIds, model.get(remoteIdAttribute) );
        });
        return self.removeBatch( models, options );
      });
  },

  removeBatch: function(){
    return IDBCollection.prototype.removeBatch.apply( this, arguments );
  }

});