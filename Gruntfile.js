module.exports = function(grunt) {

  grunt.initConfig({

    watch: {
      js: {
        files: ['src/*.js'],
        tasks: ['webpack', 'jshint']
      },
      test: {
        files: ['test/spec.js']
      }
    },

    jshint: {
      options: {
        jshintrc: true,
        reporter: require('jshint-stylish'),
        verbose: true
      },
      files: ['src/*.js']
    },

    webpack: {
      options: {
        entry: {
          'backbone-dualstorage': './index.js'
        },
        resolve: {
          alias: {
            underscore: 'lodash'
          },
          modulesDirectories: ['node_modules']
        },
        externals: {
          jquery: 'jQuery',
          lodash: '_',
          underscore: '_',
          backbone: 'Backbone',
          'idb-wrapper': 'IDBStore'
        },
        cache: true,
        watch: true
      },
      build: {
        output: {
          path: './',
          filename: '[name].js'
        }
      }
    }

  });

  require('load-grunt-tasks')(grunt);
  grunt.registerTask('default', ['webpack', 'jshint']);
  grunt.registerTask('dev', ['default', 'watch']);
}