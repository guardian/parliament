var fs = require('fs')

module.exports = function(grunt) {

    require('jit-grunt')(grunt);

    grunt.initConfig({

        watch: {
            css: {
                files: ['src/css/**/*'],
                tasks: ['sass'],
            }
        },

        clean: {
            build: ['build']
        },

        sass: {
            options: {
                sourceMap: true
            },
            interactive: {
                files: {
                    'build/tool.css': 'src/css/tool.scss',
                    'build/main.css': 'src/css/main.scss',
                    'build/bill.css': 'src/css/bill.scss',
                    'build/division.css': 'src/css/division.scss',
                    'build/divisions.css': 'src/css/divisions.scss',
                    'build/rebels.css': 'src/css/rebels.scss',
                    'build/calendar.css': 'src/css/calendar.scss',
                    'build/state.css': 'src/css/state.scss',
                    'build/queenspeech.css': 'src/css/queenspeech.scss',
                    'build/analysis.css': 'src/css/analysis.scss'
                }
            }
        },

        shell: {
            options: {
                execOptions: { cwd: '.' }
            },
            state: {
                command: './node_modules/.bin/jspm bundle -m src/js/state build/state.js'
            },
            queenspeech: {
                command: './node_modules/.bin/jspm bundle -m src/js/queenspeech build/queenspeech.js'
            },
            division: {
                command: './node_modules/.bin/jspm bundle -m src/js/division build/division.js'
            },
            divisions: {
                command: './node_modules/.bin/jspm bundle -m src/js/divisions build/divisions.js'
            },
            bill: {
                command: './node_modules/.bin/jspm bundle -m src/js/billembed build/billembed.js'
            },
            tool: {
                command: './node_modules/.bin/jspm bundle -m src/js/tool build/tool.js'
            }
        },

        aws: grunt.file.readJSON('./aws-keys.json'),

        aws_s3: {
            options: {
                accessKeyId: '<%= aws.AWSAccessKeyId %>',
                secretAccessKey: '<%= aws.AWSSecretKey %>',
                region: 'us-east-1',
                uploadConcurrency: 10, // 5 simultaneous uploads
                downloadConcurrency: 10, // 5 simultaneous downloads
                debug: grunt.option('dry'),
                bucket: 'gdn-cdn',
                differential: true
            },
            data: {
                files: [
                    {
                        expand: true,
                        cwd: '.',
                        src: [
                            'data/bills/*', 'data/divisions/*', 'data/membersfordivisions.json', 'data/divisions.json'
                        ],
                        dest: 'embed/parliament/',
                        params: { CacheControl: 'max-age=60' }
                    }
                ]
            },
            production: {
                files: [
                    {
                        expand: true,
                        cwd: '.',
                        src: [
                            // shared
                            'jspm_packages/system.js', 'src/js/config.js',
                            // state
                            'build/state.css', 'build/state.js', 'build/state.js.map', 'state.html',
                            // queenspeech
                            'build/queenspeech.css', 'build/queenspeech.js', 'build/queenspeech.js.map', 'queenspeech.html',
                            // division
                            'build/division.css', 'build/division.js', 'build/division.js.map', 'division.html',
                            'data/membersfordivisions.json',
                            // divisions
                            'build/divisions.css', 'build/divisions.js', 'build/divisions.js.map', 'divisions.html',
                            // bill
                            'build/bill.css', 'build/billembed.js', 'build/billembed.js.map', 'bill.html',
                            // tool
                            'build/tool.css', 'build/tool.js', 'build/tool.js.map', 'index.html'
                        ],
                        dest: 'embed/parliament/',
                        params: { CacheControl: 'max-age=60' }
                    }
                ]
            }
        },

        connect: {
            server: {
                options: {
                    hostname: '0.0.0.0',
                    port: 8000,
                    base: '.',
                    middleware: function (connect, options, middlewares) {
                        // inject a custom middleware http://stackoverflow.com/a/24508523
                        middlewares.unshift(function (req, res, next) {
                            res.setHeader('Access-Control-Allow-Origin', '*');
                            res.setHeader('Access-Control-Allow-Methods', '*');
                            if (req.originalUrl.indexOf('/jspm_packages/') === 0 ||
                                req.originalUrl.indexOf('/bower_components/') === 0) {
                                res.setHeader('Cache-Control', 'public, max-age=315360000');
                            }
                            return next();
                        });
                        return middlewares;
                    }
                }
            }
        }
    });

    grunt.registerTask('build', ['clean', 'sass'])
    grunt.registerTask('deploy', ['build', 'shell', 'aws_s3:production']);
    grunt.registerTask('deploydata', ['aws_s3:data']);
    grunt.registerTask('default', ['build', 'connect', 'watch']);
}
