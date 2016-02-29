const autoprefixer = require('gulp-autoprefixer');
const babel = require('gulp-babel');
const browser = require('browser-sync');
const concat = require('gulp-concat');
const cssnano = require('gulp-cssnano');
const fs = require('fs');
const gulp = require('gulp');
const gulpif = require('gulp-if');
const imagemin = require('gulp-imagemin');
const rimraf = require('rimraf');
const sass = require('gulp-sass');
const series = require('run-sequence');
const sourcemaps = require('gulp-sourcemaps');
const uglify = require('gulp-uglify');
const uncss = require('gulp-uncss');
const yaml = require('js-yaml');
const yargs = require('yargs');

const cssImporter = require('node-sass-css-importer');

// Check for --production flag
const PRODUCTION = !!(yargs.argv.production);

function loadConfig() {
  const ymlFile = fs.readFileSync('config.yml', 'utf8');
  return yaml.load(ymlFile);
}

// Load settings from config.yml
const config = loadConfig();

// Delete the "dist" folder
// This happens every time a build starts
gulp.task('clean', (done) => {
  rimraf('dist', done);
});

// Copy assets
gulp.task('copy', () => {
  return gulp.src(config.PATHS.assets)
    .pipe(gulp.dest('dist/assets'));
});

// Copy html
gulp.task('html', () => {
  return gulp.src(config.PATHS.html)
    .pipe(gulp.dest('dist'));
});

// Compile Sass into CSS
// In production, the CSS is compressed
gulp.task('sass', () => {
  return gulp.src('src/assets/scss/app.scss')
    .pipe(sourcemaps.init({loadMaps: true}))
    .pipe(sass({
      includePaths: config.PATHS.sass,
      importer: cssImporter({import_paths: config.PATHS.sass}),
    })
      .on('error', sass.logError))
    .pipe(autoprefixer({
      browsers: ['last 2 versions', 'ie >= 0'],
    }))
    .pipe(gulpif(PRODUCTION, uncss(config.UNCSS_OPTIONS)))
    .pipe(gulpif(PRODUCTION, cssnano()))
    .pipe(gulpif(!PRODUCTION, sourcemaps.write()))
    .pipe(gulp.dest('dist/assets/css'))
    .pipe(browser.reload({stream: true}));
});

// Copy jquery
gulp.task('jquery', () => {
  return gulp.src(config.PATHS.jquery)
    .pipe(gulp.dest('dist/assets/js'));
});

// Combine Foundation js into one file
// In production, the file is minified
gulp.task('foundation', () => {
  return gulp.src(config.PATHS.foundation)
    .pipe(sourcemaps.init({loadMaps: true}))
    .pipe(babel())
    .pipe(concat('foundation.js'))
    .pipe(gulpif(PRODUCTION, uglify()
      .on('error', e => { console.log(e); }) // eslint-disable-line
    ))
    .pipe(gulpif(!PRODUCTION, sourcemaps.write('./', {addComment: true})))
    .pipe(gulp.dest('dist/assets/js'));
});

// Combine javascript into one file
// In production, the file is minified
gulp.task('javascript', () => {
  return gulp.src(config.PATHS.javascript)
    .pipe(sourcemaps.init({loadMaps: true}))
    .pipe(babel())
    .pipe(concat('app.js'))
    .pipe(gulpif(PRODUCTION, uglify()
      .on('error', e => { console.log(e); }) // eslint-disable-line
    ))
    .pipe(gulpif(!PRODUCTION, sourcemaps.write('./', {addComment: true})))
    .pipe(gulp.dest('dist/assets/js'));
});

// Copy images to the "dist" folder
// In production, the images are compressed
gulp.task('images', () => {
  return gulp.src('src/assets/img/**/*')
    .pipe(gulpif(PRODUCTION, imagemin({progressive: true})))
    .pipe(gulp.dest('dist/assets/img'));
});

// Start a server with BrowserSync to preview the site in
gulp.task('server', (done) => {
  browser.init({
    server: 'dist',
    port: config.PORT,
    files: {
      match: [
        'dist/**/*.html',
        'dist/assets/img/**/*',
        'dist/assets/js/**/*',
      ],
    },
    ghostMode: false,
    notify: false,
  });
  done();
});

// Watch for changes to static assets, pages, Sass, and JavaScript
gulp.task('watch', () => {
  gulp.watch(['config.yml'], ['build']);
  gulp.watch(['src/**/*.html'], ['html']);
  gulp.watch(['src/assets/images/**/*'], ['images']);
  gulp.watch(['src/assets/js/**/*.js'], ['javascript']);
  gulp.watch(['src/assets/scss/**/*.scss'], ['sass']);
  gulp.watch(config.PATHS.assets, ['copy']);
});

// Build the "dist" folder by running all of the below tasks
gulp.task('build', () => {
  series('clean', ['sass', 'javascript', 'jquery', 'foundation', 'images', 'copy', 'html']);
});

// Build the site, run the server, and watch for file changes
gulp.task('default', () => {
  series('build', 'server', 'watch');
});
