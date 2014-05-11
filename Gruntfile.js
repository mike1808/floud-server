module.exports = function(grunt) {

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        clean: {
            dist: ['public/css/bootstrap', 'public/views'],
        },
        jade: {
            floud: {
                options: {
                    data: {
                        debug: true
                    },
                    pretty: true,
                    client: false
                },
                files: [{
                    cwd: 'assets/views/',
                    src: ['*.jade'],
                    dest: 'public/views',
                    expand: true,
                    ext: '.html'
                }]
            }
        },
        less: {
            compileCore: {
                options: {
                    strictMath: true,
                    sourceMap: false,
                    outputSourceFiles: true,
                    sourceMapURL: 'bootstrap.css.map',
                    sourceMapFilename: 'public/css/bootstrap/bootstrap.css.map'
                },
                files: {
                    'public/css/bootstrap/bootstrap.css': 'assets/less/cosmo/build.less'
                }
            }
        },

        csscomb: {
            options: {
                config: 'assets/less/bootstrap/.csscomb.json'
            },
            dist: {
                files: {
                    'public/css/bootstrap/bootstrap.css': 'dist/css/bootstrap.css'
                }
            }
        },

        watch: {
            jade: {
                files: ['assets/views/**/*.jade'],
                tasks: ['jade']
            },
            less: {
                files: ['assets/less/**/*.less'],
                tasks: ['css']
            }
        }
    });

    require('load-grunt-tasks')(grunt);

    // Default task(s).
    grunt.registerTask('default', ['jade', 'watch']);
    grunt.registerTask('css', ['less', 'csscomb']);
    grunt.registerTask('build', ['clean', 'css', 'jade']);

};