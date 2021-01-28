const { src, task, parallel, series, dest, watch } = require('gulp')
const rename = require('gulp-rename')
const sass = require('gulp-sass')
const sourcemaps = require('gulp-sourcemaps')
const autoprefixer = require('gulp-autoprefixer')
const uglify = require('gulp-uglify')
const htmlmin = require('gulp-htmlmin')
const imagemin = require('gulp-imagemin')
const webp = require('gulp-webp')
const imageminMozjpeg = require('imagemin-mozjpeg')
const imageminPngquant = require('imagemin-pngquant')
const browserify = require('browserify')
const babelify = require('babelify')
const cache = require('gulp-cache')
const source = require('vinyl-source-stream')
const buffer = require('vinyl-buffer')
const del = require('del')
const browserSync = require('browser-sync').create()

const paths = {
  src: 'src/',
  dist: 'dist/',

  html: {
    input: 'src/pages/*.html',
    output: 'dist/',
    watch: 'src/pages/*.html'
  },

  styles: {
    input: 'src/assets/scss/main.scss',
    output: 'dist/assets/css/',
    watch: 'src/assets/scss/**/*.scss'
  },

  javascript: {
    input: 'src/assets/js/',
    output: 'dist/assets/js/',
    watch: 'src/assets/js/**/*.js'
  },

  images: {
    input: 'src/assets/images/**/*.+(png|jpg|jpeg|ico)',
    output: 'dist/assets/images/',
    watch: 'src/assets/images/**/*.+(png|jpg|jpeg|ico)'
  },

  fonts: {
    input: 'src/assets/fonts/**/*.*',
    output: 'dist/assets/fonts/',
    watch: 'src/assets/fonts/**/*.*'
  }
}

function server() {
  browserSync.init({
    server: {
      baseDir: paths.dist
    },
    port: 3030
  })
}

function reload(done) {
  browserSync.reload()
  done()
}

function buildHTML(done) {
  src(paths.html.input)
    .pipe(htmlmin({ collapseWhitespace: true }))
    .pipe(dest(paths.html.output))
  done()
}

function buildCSS(done) {
  src(paths.styles.input)
    .pipe(sourcemaps.init())
    .pipe(
      sass({
        errorLogToConsole: true,
        outputStyle: 'compressed'
      })
    )
    .on('error', console.error.bind(console))
    .pipe(
      autoprefixer({
        cascade: false
      })
    )
    .pipe(rename({ suffix: '.min' }))
    .pipe(sourcemaps.write('./'))
    .pipe(dest(paths.styles.output))
    .pipe(browserSync.stream())
  done()
}

/*
  In case we have multiple js files,
  for example, front-end files or back-end files
*/

const jsFiles = ['main.js']

function buildJS(done) {
  jsFiles.map(entry =>
    browserify({
      entries: [paths.javascript.input + entry]
    })
      .transform(babelify, { presets: ['airbnb'] })
      .bundle()
      .pipe(source(entry))
      .pipe(rename({ extname: '.min.js' }))
      .pipe(buffer())
      .pipe(sourcemaps.init({ loadMaps: true }))
      .pipe(uglify())
      .pipe(sourcemaps.write('./'))
      .pipe(dest(paths.javascript.output))
      .pipe(browserSync.stream())
  )
  done()
}

function optmizeIMG(done) {
  src(paths.images.input)
    .pipe(
      cache(
        imagemin(
          [imageminMozjpeg({ quality: 50 }), imageminPngquant({ speed: 1, quality: [0.3, 0.5] })],
          {
            verbose: true
          }
        )
      )
    )
    .pipe(dest(paths.images.output))
  done()
}

function webpConvert(done) {
  src(paths.images.input)
    .pipe(webp())
    .pipe(dest(paths.images.output))
  done()
}

function moveFonts(done) {
  src(paths.fonts.input).pipe(dest(paths.fonts.output))
  done()
}

function clearDist(done) {
  cache.clearAll()
  del.sync([paths.dist])
  done()
}

function watchFiles() {
  watch(paths.html.watch, series(buildHTML, reload))
  watch(paths.styles.watch, series(buildCSS))
  watch(paths.javascript.watch, series(buildJS, reload))
  watch(paths.images.watch, series(optmizeIMG, webpConvert))
  watch(paths.fonts.watch, series(moveFonts, reload))
}

task('html', buildHTML)
task('css', buildCSS)
task('js', buildJS)
task('images', optmizeIMG)
task('webp', webpConvert)
task('fonts', moveFonts)
task('clear', clearDist)

/*
  This task is executed by running 'gulp' command
*/

task(
  'default',
  series(
    parallel(buildHTML, buildCSS, buildJS, optmizeIMG, webpConvert, moveFonts),
    parallel(server, watchFiles)
  )
)
