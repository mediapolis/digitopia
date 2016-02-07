module.exports = function (grunt) {
	var jsFiles = [
		'js/controller.js',
		'js/geometry.js',
		'js/viewport.js',
		'js/lazy.js',
		'js/container.js',
		'js/ajax.js',
		'js/hijax.js',
		'js/wiggler.js',
	];

	var cssFiles = [
		'css/responsive.css',
	];

	var copyFiles = [
		'images/*'
	];

	var copyCommand = [{
		expand: true,
		src: ['images/*'],
		dest: 'dist/',
		filter: 'isFile'
	}];


	var allFiles = [];
	allFiles = allFiles.concat(jsFiles, cssFiles, copyFiles);

	grunt.initConfig({
		jsDistDir: 'dist/js/',
		cssDistDir: 'dist/css/',
		pkg: grunt.file.readJSON('package.json'),

		copy: {
			main: {
				files: copyCommand
			}
		},
		concat: {
			js: {
				options: {
					separator: ';'
				},
				src: jsFiles,
				dest: '<%=jsDistDir%><%= pkg.name %>.js',
				nonull: true

			},
			css: {
				src: cssFiles,
				dest: '<%=cssDistDir%><%= pkg.name %>.css',
				nonull: true
			}
		},
		uglify: {
			options: {
				banner: '/*! <%= pkg.name %> <%=grunt.template.today("dd-mm-yyyy") %> */\n'
			},
			dist: {
				files: {
					'<%=jsDistDir%><%= pkg.name %>.min.js': ['<%= concat.js.dest %>']
				}
			}
		},
		cssmin: {
			add_banner: {
				options: {
					rebase: false,
					banner: '/*! <%= pkg.name %> <%=grunt.template.today("dd-mm-yyyy") %> */\n'
				},
				files: {
					'<%=cssDistDir%><%= pkg.name %>.min.css': ['<%= concat.css.dest %>']
				}
			}
		},
		watch: {
			files: allFiles,
			tasks: ['run', 'less', 'stylus', 'copy', 'concat']
		}
	});

	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-cssmin');
	grunt.loadNpmTasks('grunt-contrib-watch');

	grunt.registerTask('default', [
		'copy',
		'concat',
		'uglify',
		'cssmin'
	]);

	grunt.registerTask('devel', [
		'copy',
		'concat',
		'watch'
	]);
};
