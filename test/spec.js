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

  it('should be compatible with nested APIs', function( done ){

    // mock bb.ajax
    Backbone.ajax = function( options ){
      options = options || {};
      var payload = JSON.parse( options.data );
      expect( Object.keys(payload) ).to.eql(['test']);
      done();
    };

    var collection = new Backbone.DualCollection();
    collection.url = 'http://test';

    var model = collection.add({ foo: 'bar' });
    model.name = 'test';
    model.save({}, { remote: true });

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