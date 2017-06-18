/// <binding BeforeBuild='default' Clean='clean' ProjectOpened='watch' />
var gulp = require('gulp');
var less = require('gulp-less');
var path = require('path');
var concat = require('gulp-concat');
var plumber = require('gulp-plumber');
var uglify = require('gulp-uglify');
var minifyCSS = require('gulp-minify-css');
var del = require('del');
var htmltojson = require('gulp-html-to-json');

// Compile all .less files to .css
gulp.task('less', function () {
  return gulp.src('./public/dev-style/*.less')
    .pipe(plumber())
    .pipe(less({
      paths: [path.join(__dirname, 'less', 'includes')]
    }))
    .pipe(gulp.dest('./public/dev-style/'));
});

// Delete all compiled and bundled files
gulp.task('clean', function () {
  return del(['./public/*.css', './public/app.min.js']);
});

gulp.task('snippets', function () {
  return gulp.src('./snippets/_snippets.js')
    .pipe(htmltojson({
      filename: "zsnippets",
      useAsVariable: true
    }))
    .pipe(gulp.dest('./public/dev-js'));
});

// Minify and bundle JS files
gulp.task('scripts', ['snippets'], function () {
  return gulp.src([
    './public/lib/*.js',
    './public/dev-js/zsnippets.js',
    './public/dev-js/auth.js',
    './public/dev-js/page.js',
    './public/dev-js/front.js',
    './public/dev-js/inside.js',
    './public/dev-js/history.js',
    './public/dev-js/profile.js'
  ])
    .pipe(uglify().on('error', function (e) { console.log(e); }))
    .pipe(concat('app.min.js'))
    .pipe(gulp.dest('./public/'));
});

// Minify and bundle CSS files
gulp.task('styles', ['less'], function () {
  return gulp.src(['./public/dev-style/*.css', '!./public/dev-style/*.min.css'])
    .pipe(minifyCSS())
    .pipe(concat('app.min.css'))
    .pipe(gulp.dest('./public/'));
});

// Default task: full clean+build.
gulp.task('default', ['clean', 'scripts', 'styles'], function () { });

// Watch: recompile less on changes
gulp.task('watch', function () {
  gulp.watch(['./snippets/*.html'], ['snippets']);
  gulp.watch(['./public/dev-style/*.less'], ['less']);
});
