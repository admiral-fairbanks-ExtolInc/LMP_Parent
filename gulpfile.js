const gulp = require('gulp');
const less = require('gulp-less');
const browserSync = require('browser-sync').create();
const header = require('gulp-header');
const cleanCSS = require('gulp-clean-css');
const rename = require("gulp-rename");
const uglify = require('gulp-uglify');
const pkg = require('./package.json');

const env = require('gulp-env');
const eslint = require('gulp-eslint');
const istanbul = require('gulp-istanbul');
const mocha = require('gulp-mocha');
const del = require('del');
const tar = require('gulp-tar');
const gzip = require('gulp-gzip');
const rsync = require('gulp-rsync');


//-----------------------------------------------------------------------------
// Server Tasks
//-----------------------------------------------------------------------------

//-----------------------------------------------------------------------------
// i2c Tasks
//-----------------------------------------------------------------------------

gulp.task('clean-12c-dist', function () {
  return del(['dist/12c/*']);
});

//-----------------------------------------------------------------------------
// Deploy Tasks
//-----------------------------------------------------------------------------

gulp.task('deploy-raspi', function () {
  return gulp.src(['package.json', 'package-lock.json', 'gulpfile.js', 'bower.json', '.eslintrc.js', 'app/**', 'test/**', 'config/**', 'bin/**'])
    .pipe(rsync({
      hostname: 'raspi1',
      username: 'pi',
      destination: '/home/pi/projects/LMP_Parent',
      archive: true,
      progress: true,
      silent: false,
      compress: true
    }));
});