/*
 * Global variables
 */
const gulp = require('gulp'),
	bulkSass = require('gulp-sass-bulk-import'),
	sass = require('gulp-sass'),
	browserSync = require('browser-sync'), //ブラウザシンク
	plumber = require('gulp-plumber'), //エラー通知
	notify = require('gulp-notify'), //エラー通知
	imagemin = require('gulp-imagemin'), //画像圧縮
	imageminPngquant = require('imagemin-pngquant'), //png画像の圧縮
	pleeease = require('gulp-pleeease'), //ベンダープレフィックス
	source = require('vinyl-source-stream'),
	buffer = require('vinyl-buffer'),
	browserify = require('browserify'),
	babelify = require('babelify'),
	browserifyShim = require('browserify-shim'),
	watchify = require('watchify'),
	useref = require('gulp-useref'), //ファイル結合
	gulpif = require('gulp-if'), // if文
	uglify = require('gulp-uglify'), //js圧縮
	rename = require('gulp-rename'),
	minifyCss = require('gulp-cssnano'), //css圧縮
	del = require('del'), //ディレクトリ削除
	runSequence = require('run-sequence'), //並行処理
	fs = require("fs"),
	pug = require('gulp-pug'), //pug
	data = require('gulp-data'), //json-data
	sourcemaps = require('gulp-sourcemaps'),
	debug = require('gulp-debug'),
	util = require('gulp-util'),
	jQuery = require('jquery'),
	path = require('path'), //path
	// watch = require('gulp-watch'),
	paths = {
		rootDir: 'dev',
		dstrootDir: 'dist',
		srcDir: 'dev/img',
		dstDir: 'dist/img',
		serverDir: 'localhost',
		json: 'dev/src/views/_data'
	};
/*
 * Sass
 */
gulp.task('sass', () => {
	gulp.src(paths.rootDir + '/src/assets/styles/**/*.scss')
		.pipe(plumber({
			errorHandler: notify.onError('Error: <%= error.message %>')
		}))
		.pipe(sourcemaps.init())
		.pipe(bulkSass())
		.pipe(sass())
		.pipe(pleeease({
			sass: true,
			minifier: true //圧縮の有無 true/false
		}))
		.pipe(sourcemaps.write('./'))
		.pipe(gulp.dest(paths.rootDir + '/css'));
});

/*
 * JavaScript
 */

gulp.task('browserify', () => {
	const option = {
		bundleOption: {
			cache: {},
			packageCache: {},
			fullPaths: true,
			debug: true,
			entries: paths.rootDir + '/src/assets/js/main.js',
			extensions: ['js']
		},
		dest: paths.rootDir + '/js',
		filename: 'bundle.js'
	};
	const b = browserify(option.bundleOption)
		.transform(babelify.configure({
			compact: true,
			presets: ["es2015"]
		}))
		.transform(browserifyShim);
	const bundle = function() {
		b.bundle()
			.pipe(plumber({
				errorHandler: notify.onError('Error: <%= error.message %>')
			}))
			.pipe(source(option.filename))
			.pipe(gulp.dest(option.dest));
	};
	if (global.isWatching) {
		const bundler = watchify(b);
		bundler.on('update', bundle);
	}
	return bundle();
});

/*
 * Pleeease
 */
gulp.task('pleeease', () => {
	return gulp.src(paths.rootDir + '/css/*.css')
		.pipe(pleeease({
			sass: true,
			minifier: true //圧縮の有無 true/false
		}))
		.pipe(plumber({
			errorHandler: notify.onError('Error: <%= error.message %>')
		}))
		.pipe(gulp.dest(paths.rootDir + '/css'));
});

/*
 * Imagemin
 */
gulp.task('imagemin', () => {
	const srcGlob = paths.srcDir + '/**/*.+(jpg|jpeg|png|gif|svg)';
	const dstGlob = paths.dstDir;
	const imageminOptions = {
		optimizationLevel: 7,
		use: imageminPngquant({
			quality: '65-80',
			speed: 1
		})
	};

	gulp.src(srcGlob)
		.pipe(plumber({
			errorHandler: notify.onError('Error: <%= error.message %>')
		}))
		.pipe(imagemin(imageminOptions))
		.pipe(gulp.dest(paths.dstDir));
});

/*
 * Useref
 */
gulp.task('html', () => {
	return gulp.src(paths.rootDir + '/**/*.+(html|php)')
		.pipe(useref({
			searchPath: ['.', 'dev']
		}))
		.pipe(gulpif('*.js', uglify()))
		.pipe(gulpif('*.css', minifyCss()))
		.pipe(gulp.dest(paths.dstrootDir));
});

/*
 * pug
 */
gulp.task('pug', () => {
	gulp.src([paths.rootDir + '/src/views/**/*.pug', '!' + paths.rootDir + '/src/views/**/_*.pug'])
		.pipe(plumber({
			errorHandler: notify.onError('Error: <%= error.message %>')
		}))
		.pipe(data(function(file) {
			const locals = JSON.parse(fs.readFileSync(paths.json + '/site.json'));
			locals.relativePath = path.relative(file.base, file.path.replace(/.pug$/, '.html'));
			return {
				'site': locals
			};
		}))
		.pipe(pug({
			pretty: '\t'
		}, {
			ext: '.html'
		}))
		.pipe(gulp.dest(paths.rootDir));
});


/*
 * Browser-sync
 */
gulp.task('browser-sync', () => {
	browserSync.init({
		server: {
			baseDir: paths.rootDir,
			routes: {
				"/node_modules": "node_modules"
			}
		},
		// proxy: "localhost:8888",
		notify: true
	});
});
gulp.task('bs-reload', () => {
	browserSync.reload();
});

gulp.task('setWatch', () => {
	global.isWatching = true;
});


/*
 * Default
 */
gulp.task('default', ['browser-sync'], () => {
	const bsList = [
		paths.rootDir + '/**/*.html',
		paths.rootDir + '/**/*.php',
		paths.rootDir + '/js/**/*.js',
		paths.rootDir + '/css/*.css'
	];
	gulp.watch(paths.rootDir + '/src/views/**/*.pug', ['pug']);
	gulp.watch(paths.rootDir + '/src/assets/styles/**/*.scss', ['sass']);
	gulp.watch(paths.rootDir + '/src/assets/js/**/*.js', ['browserify']);
	gulp.watch(paths.rootDir + '/src/views/**/*.json', ['pug']);
	gulp.watch(bsList, ['bs-reload']);
});

/*
 * Build
 */
gulp.task('clean', del.bind(null, [paths.dstrootDir]));
gulp.task('devcopy', () => {
	return gulp.src([
		paths.rootDir + '/**/*.*',
		// '!'+ paths.rootDir + '/css/**',
		// '!'+ paths.rootDir + '/js/**',
		'!' + paths.rootDir + '/src/views/**',
		'!' + paths.rootDir + '/src//assets/**',
		'!' + paths.rootDir + '/img/**',
		'!' + paths.rootDir + '/**/*.html'
	], {
		dot: true
	}).pipe(gulp.dest(paths.dstrootDir));
});
gulp.task('build', ['clean'], function(cb) {
	runSequence('sass', 'browserify', 'pug', ['html', 'imagemin', 'devcopy'], cb);
});
