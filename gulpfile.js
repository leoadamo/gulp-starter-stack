const {
  src, task, parallel, series, dest, watch,
} = require('gulp');
const rename = require('gulp-rename');
const sass = require('gulp-sass');
const sourcemaps = require('gulp-sourcemaps');
const autoprefixer = require('gulp-autoprefixer');
const uglify = require('gulp-uglify');
const htmlmin = require('gulp-htmlmin');
const imagemin = require('gulp-imagemin');
const imageminMozjpeg = require('imagemin-mozjpeg');
const imageminPngquant = require('imagemin-pngquant');
const cache = require('gulp-cache');
const browserify = require('browserify');
const babelify = require('babelify');
const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');
const browserSync = require('browser-sync').create();

const paths = {
  jsFolder: 'src/assets/js/',
  srcHTML: 'src/pages/*.html',
  srcJS: 'main.js',
  srcCSS: 'src/assets/scss/main.scss',
  srcIMG: 'src/assets/images/**/*.+(png|jpg|jpeg)',
  srcFONTS: 'src/assets/fonts/**/*.*',

  watchHTML: 'src/pages/*.html',
  watchCSS: 'src/assets/scss/**/*.scss',
  watchJS: 'src/assets/js/**/*.js',
  watchIMG: 'src/assets/images/**/*.+(png|jpg|jpeg)',
  watchFONTS: 'src/assets/fonts/**/*.*',

  dist: 'dist/',
  distCSS: 'dist/assets/css/',
  distJS: 'dist/assets/js/',
  distIMG: 'dist/assets/images/',
  distFONTS: 'dist/assets/fonts/',
};

/* In case we have multiple js files, for example, front-end files or back-end files */
const jsFiles = [paths.srcJS];

function server() {
  browserSync.init({
    server: {
      baseDir: paths.dist,
    },
    port: 80,
  });
}

function reload(done) {
  browserSync.reload();
  done();
}

function buildHTML(done) {
  src(paths.srcHTML)
    .pipe(htmlmin({ collapseWhitespace: true }))
    .pipe(dest(paths.dist));
  done();
}

function buildCSS(done) {
  src(paths.srcCSS)
    .pipe(sourcemaps.init())
    .pipe(
      sass({
        errorLogToConsole: true,
        outputStyle: 'compressed',
      }),
    )
    .on('error', console.error.bind(console))
    .pipe(
      autoprefixer({
        cascade: false,
      }),
    )
    .pipe(rename({ suffix: '.min' }))
    .pipe(sourcemaps.write('./'))
    .pipe(dest(paths.distCSS))
    .pipe(browserSync.stream());
  done();
}

function buildJS(done) {
  jsFiles.map((entry) => browserify({
    entries: [paths.jsFolder + entry],
  })
    .transform(babelify, { presets: ['airbnb'] })
    .bundle()
    .pipe(source(entry))
    .pipe(rename({ extname: '.min.js' }))
    .pipe(buffer())
    .pipe(sourcemaps.init({ loadMaps: true }))
    .pipe(uglify())
    .pipe(sourcemaps.write('./'))
    .pipe(dest(paths.distJS))
    .pipe(browserSync.stream()));
  done();
}

function optmizeIMG(done) {
  src(paths.srcIMG)
    .pipe(
      cache(
        imagemin([
          imageminMozjpeg({
            quality: 60,
          }),
          imageminPngquant({
            speed: 1,
            quality: [0.95, 1],
          }),
        ]),
      ),
    )
    .pipe(dest(paths.distIMG));
  done();
}

function moveFonts(done) {
  src(paths.srcFONTS).pipe(dest(paths.distFONTS));
  done();
}

function watchFiles() {
  watch(paths.watchHTML, series(buildHTML, reload));
  watch(paths.watchCSS, series(buildCSS));
  watch(paths.watchJS, series(buildJS, reload));
  watch(paths.watchIMG, optmizeIMG);
  watch(paths.watchFONTS, series(moveFonts, reload));
}

task('html', buildHTML);
task('css', buildCSS);
task('js', buildJS);
task('images', optmizeIMG);
task('fonts', moveFonts);
task('build', parallel(buildHTML, buildCSS, buildJS, optmizeIMG, moveFonts));
task('default', parallel(server, watchFiles));
