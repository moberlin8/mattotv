'use strict';

//////////////////////////////
// Requires
//////////////////////////////
const gulp = require('gulp');
const nodemon = require('gulp-nodemon');
const sourcemaps = require('gulp-sourcemaps');
const eslint = require('gulp-eslint');
const uglify = require('gulp-uglify');
const sass = require('gulp-sass');
const eyeglass = require('eyeglass');
const autoprefixer = require('gulp-autoprefixer');
const sasslint = require('gulp-sass-lint');
const imagemin = require('gulp-imagemin');
const cfenv = require('cfenv');
const gulpif = require('gulp-if');
const browserSync = require('browser-sync').create();
const util = require("gulp-util");
const tap = require("gulp-tap");
const path = require('path');


//////////////////////////////
// Variables
//////////////////////////////
const dirs = {
  js: {
    lint: {
      browser: [
        'src/**/*.js',
        '!src/**/*.min.js'
      ],
      node: [
        'index.js',
        'lib/**/*.js',
      ],
    },
    uglify: [
      'src/js/**/*.js',
      '!src/js/**/*.min.js'
    ]
  },
  server: {
    main: 'index.js',
    watch: [
      'index.js',
      'lib',
      'views',
    ],
    extension: 'js html',
  },
  sass: 'src/sass/**/*.scss',
  images: 'src/images/**/*.*',
  public: 'public/'
};

const isCI = (typeof process.env.CI !== 'undefined') ? Boolean(process.env.CI) : false;

const sassOptions = {
  'outputStyle': isCI ? 'expanded' : 'compressed',
};

//////////////////////////////
// JavaScript Lint Tasks
//////////////////////////////
gulp.task('eslint', ['eslint:browser', 'eslint:node']);

gulp.task('eslint:browser', function () {
  return gulp.src(dirs.js.lint.browser)
    .pipe(eslint('./.eslintrc-browser.yml'))
    .pipe(eslint.format())
    .pipe(gulpif(isCI, eslint.failOnError()));
});

gulp.task('eslint:node', function () {
  return gulp.src(dirs.js.lint.node)
    .pipe(eslint('./.eslintrc-node.yml'))
    .pipe(eslint.format())
    .pipe(gulpif(isCI, eslint.failOnError()));
});

gulp.task('uglify', function () {
  return gulp.src(dirs.js.uglify)
    .pipe(gulpif(!isCI, sourcemaps.init()))
      .pipe(uglify({
        'mangle': isCI ? true : false
      }))
    .pipe(gulpif(!isCI, sourcemaps.write('maps')))
    .pipe(gulp.dest(dirs.public + 'js'))
    .pipe(browserSync.stream());
});

gulp.task('eslint:watch', function () {
  return gulp.watch([dirs.js.lint.browser, dirs.js.lint.node], ['eslint']);
});

gulp.task('uglify:watch', function () {
  return gulp.watch(dirs.js.uglify, ['uglify']);
});

//////////////////////////////
// Sass Tasks
//////////////////////////////
gulp.task('sass', function () {
  return gulp.src(dirs.sass)
    .pipe(sasslint())
    .pipe(sasslint.format())
//mao    .pipe(gulpif(isCI, sasslint.failOnError()))
    .pipe(gulpif(!isCI, sourcemaps.init()))
      .pipe(sass(eyeglass(sassOptions)))
      .pipe(autoprefixer())
    .pipe(gulpif(!isCI, sourcemaps.write('maps')))
    .pipe(gulp.dest(dirs.public + 'css'))
    .pipe(browserSync.stream());
});

gulp.task('sass:watch', function () {
  return gulp.watch(dirs.sass, ['sass']);
});

//////////////////////////////
// Image Tasks
//////////////////////////////
gulp.task('images', function () {
  var nSrc=0, nDes=0;
  return gulp.src(dirs.images)
    .on("data", function() { nSrc+=1;})
    .pipe(gulp.dest(dirs.public + 'images'))
//mao .pipe(changed(dirs.public + '/images')) //filter out src files not newer than dest
    .pipe(tap(function (file,t) {
    console.log(path.basename(file.path));
     }))
    .on("data", function() { nDes+=1;})
    .on("finish", function() {
        util.log("Results for images");
        util.log("# src files: ", nSrc);
        util.log("# dest files:", nDes);
    })
  });

//mao     .pipe(imagemin({
    //   'progressive': true,
    //   'svgoPlugins': [
    //     { 'removeViewBox': false }
    //   ]
    //}))

gulp.task('images:watch', function () {
  return gulp.watch(dirs.images, ['images']);
});

//////////////////////////////
// Nodemon Task
//////////////////////////////
gulp.task('nodemon', function (cb) {
  nodemon({
    script: dirs.server.main,
    watch: dirs.server.watch,
    env: {
      'NODE_ENV': 'development'
    },
    ext: dirs.server.extension
  })
  .once('start', function () {
    cb();
  })
  .on('restart', function () {
    setTimeout(function () {
      browserSync.reload();
    }, 500);
  });
});

//////////////////////////////
// Browser Sync Task
//////////////////////////////
gulp.task('browser-sync', ['nodemon'], function () {
  var appEnv = cfenv.getAppEnv();

  browserSync.init({
    'proxy': appEnv.url
  });
});

//////////////////////////////
// Running Tasks
//////////////////////////////
gulp.task('build', ['uglify', 'sass', 'images']);

gulp.task('test', ['build']);

gulp.task('watch', ['eslint:watch', 'uglify:watch', 'sass:watch', 'images:watch']);

gulp.task('default', ['browser-sync', 'build', 'watch']);
