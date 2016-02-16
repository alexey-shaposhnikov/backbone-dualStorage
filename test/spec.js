describe('Backbone.DualCollection', function () {

  it('should be in a valid state', function() {
    var collection = new Backbone.DualCollection();
    expect( collection).to.be.ok;
  });

  it('should create to local IndexedDB', function( done ){
    var collection = new Backbone.DualCollection();

    collection.create({ foo: 'bar' }, {
      wait: true,
      success: function( model, response, options ){
        expect( model.isNew() ).to.be.false;
        expect( model.id ).to.equal( response.local_id );
        expect( model.get('_state') ).to.equal( collection.states.create );

        collection.fetch({
          reset: true,
          success: function(){
            expect( collection.at(0).attributes ).to.eql( model.attributes );
            done();
          }
        });
      }
    });

  });

  it('should update to local IndexedDB', function( done ){
    var collection = new Backbone.DualCollection();

    collection.create({ foo: 'bar' }, {
      //wait: true,
      success: function( model, response, options ){
        model.save({ foo: 'baz' }, {
          success: function( model, response, options ){
            expect( model.get('_state') ).to.equal( collection.states.create );
            expect( model.get('foo') ).to.equal( 'baz' );

            collection.fetch({
              reset: true,
              success: function(){
                expect( collection.at(0).attributes ).to.eql( model.attributes );
                done();
              }
            });
          }
        });
      }
    });

  });

  it('should create to local and remote with \'remote: true\' option', function( done ){

    // mock bb.ajax
    Backbone.ajax = function( options ){
      options = options || {};
      expect( options.type ).to.equal('POST');
      var dfd = $.Deferred();
      _.delay( function(){
        var resp = {
          foo: 'bar',
          id: 1
        };
        if( options.success ){
          options.success(resp);
        }
        dfd.resolve(resp);
      }, 500 );
      return dfd;
    };

    var collection = new Backbone.DualCollection();
    collection.url = 'test';

    collection.create({ foo: 'bar' }, {
      wait: true,
      remote: true,
      success: function( model, response, options ){
        expect( model.isNew() ).to.be.false;
        expect( model.get('id') ).to.equal( 1 );
        expect( model.get('_state') ).to.be.undefined;

        collection.fetch({
          reset: true,
          success: function(){
            expect( collection.at(0).attributes ).to.eql( model.attributes );
            done();
          }
        });
      }
    });

  });

  it('should update to local and remote with \'remote: true\' option', function( done ){

    // mock bb.ajax
    Backbone.ajax = function( options ){
      options = options || {};
      expect( options.type ).to.equal('PUT');
      var dfd = $.Deferred();
      _.delay( function(){
        var resp = {
          foo: 'baz',
          id: 2
        };
        if( options.success ){
          options.success(resp);
        }
        dfd.resolve(resp);
      }, 500 );
      return dfd;
    };

    var collection = new Backbone.DualCollection();
    collection.url = 'http://test';

    collection.create({ id: 2, foo: 'bar' }, {
      wait: true,
      success: function( model, response, options ){
        expect( model.isNew() ).to.be.false;
        expect( model.get('_state') ).to.equal( collection.states.update );

        model.save({ foo: 'baz' }, {
          remote: true,
          wait: true,
          success: function( model, response, options ){
            expect( model.get('_state') ).to.be.undefined;
            expect( model.get('foo') ).to.equal( 'baz' );

            collection.fetch({
              reset: true,
              success: function(){
                expect( collection.at(0).attributes ).to.eql( model.attributes );
                done();
              }
            });
          }
        });
      }
    });

  });

  it('model should be compatible with nested APIs', function( done ){

    // mock bb.ajax
    Backbone.ajax = function( options ){
      options = options || {};
      var payload = JSON.parse( options.data );
      expect( Object.keys(payload) ).to.eql(['test'] );
      return {
        'test': { foo: 'bar' }
      };
    };

    var collection = new Backbone.DualCollection();
    collection.url = 'http://test';

    var model = collection.add({ foo: 'bar' });
    model.name = 'test';
    model.save({}, {
      remote: true,
      success: function(m){
        expect( m ).eqls( model );
        done();
      }
    });

  });

  it('should fetch and merge a remote collection', function( done ){

    var count = 1;
    var resp1 = [
      { id: 1, foo: 'bar' },
      { id: 2, foo: 'baz' },
      { id: 3, foo: 'boo' }
    ];
    var resp2 = {
        nested: [
        { id: 1, foo: 'bar' },
        { id: 3, foo: 'baz' },
        { id: 4, foo: 'boo' }
      ]
    };

    // mock bb.ajax
    Backbone.ajax = function( options ){
      options = options || {};
      expect( options.type ).to.equal('GET');
      var dfd = $.Deferred();
      _.delay( function(){
        var resp = count === 1 ? resp1 : resp2;
        count++;
        if( options.success ){
          options.success(resp);
        }
        dfd.resolve(resp);
      }, 500 );
      return dfd;
    };

    var collection = new Backbone.DualCollection();
    collection.url = 'http://test';
    collection.name = 'nested';

    collection.fetch({
      remote: true,
      success: function( collection, response, options ){
        expect( collection ).to.have.length( 3 );
        var ids = collection.map( function( model ) {
          expect( model.isNew() ).to.be.false;
          return model.get('id');
        });
        expect( ids ).eqls([ 1, 2, 3 ]);

        collection.fetch({
          remote: true,
          success: function( collection, response, options ){
            expect( collection ).to.have.length( 4 );

            var ids = collection.map( function( model ) {
              expect( model.isNew() ).to.be.false;
              return model.get('id');
            });
            expect( ids ).eqls([ 1, 2, 3, 4 ]);

            var vals = collection.map( function( model ) {
              return model.get('foo');
            });
            expect( vals ).eqls([ 'bar', 'baz', 'baz', 'boo' ]);

            done();
          }
        });
      }
    });

  });

  it('should fetch all remote ids', function( done ){

    // mock bb.ajax
    Backbone.ajax = function( options ){
      options = options || {};
      expect( options.type ).to.equal('GET');
      var dfd = $.Deferred();
      _.delay( function(){
        var resp = {
          nested: [
            { id: 1 }, { id: 2 }, { id: 3 }
          ]
        };
        if( options.success ){
          options.success(resp);
        }
        dfd.resolve(resp);
      }, 500 );
      return dfd;
    };

    var collection = new Backbone.DualCollection();
    collection.url = 'http://test';
    collection.name = 'nested';

    collection.fetchRemoteIds(null, {
      success: function(){
        expect( collection ).to.have.length( 3 );
        collection.each( function( model) {
          expect( model.isNew()).to.be.false;
          expect( model.get('_state')).equals( collection.states.read );
        });
        done();
      }
    });

  });

  it('should fetch updated models from server', function( done ){

    // mock bb.ajax
    Backbone.ajax = function( options ){
      options = options || {};
      expect( options.type ).to.equal('GET');
      var dfd = $.Deferred();
      _.delay( function(){
        var resp = {
          nested: [
            { id: 2, last_updated: '2016-01-14T13:15:04Z' },
            { id: 4, last_updated: '2016-01-12T13:15:04Z' }
          ]
        };
        if( options.success ){
          options.success(resp);
        }
        dfd.resolve(resp);
      }, 500 );
      return dfd;
    };

    var collection = new Backbone.DualCollection();
    collection.url = 'http://test';
    collection.name = 'nested';

    collection.save([
      { id: 1, last_updated: '2016-01-04T13:15:04Z' },
      { id: 2, last_updated: '2016-01-11T13:15:04Z' },
      { id: 3, last_updated: '2015-01-04T13:15:04Z' }
    ]).then(function(){

        collection.fetchUpdatedIds({
          success: function(){
            expect( collection ).to.have.length( 4 );
            var states = collection.map( function(model) {
              return model.get('_state');
            });
            expect( states ).eqls([ undefined, 'READ_FAILED', undefined, 'READ_FAILED' ]);
            done();
          }
        });

      });

  });

  /**
   * Clear test database
   */
  afterEach(function() {
    var collection = new Backbone.DualCollection();
    collection.clear();
  });

  /**
   * Delete test database
   */
  after(function() {
    window.indexedDB.deleteDatabase('IDBWrapper-Store');
  });

});