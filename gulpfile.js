'use strict';

var gulp = require('gulp');
var inheritance = require('gulp-jade-inheritance');
var pug = require('gulp-pug'),
    data = require('gulp-data'),
    yaml = require('js-yaml'),
    path = require('path'),
    fs = require('fs');
var sass = require('gulp-sass'),
    sourcemaps = require('gulp-sourcemaps'),
    postcss = require('gulp-postcss'),
    autoprefixer = require('autoprefixer'),
    nano = require('gulp-cssnano'),
    bourbon = require('node-bourbon').includePaths;
var svgstore = require('gulp-svgstore'),
    svgmin = require('gulp-svgmin'),
    cheerio = require('gulp-cheerio');
var dirSync = require('gulp-directory-sync');
var notify = require('gulp-notify');
var plumber = require('gulp-plumber');
var gutil = require('gulp-util');
var rename = require('gulp-rename');
var browserSync = require('browser-sync');
var reload = browserSync.reload;

var f = {
    dev: 'dev',
    build: 'build',
    css: 'build/css',
    scss: 'dev/styles/**/**/*.{scss,sass}',
    html: 'build/*.html',
    pug: 'dev/**/**/**/!(_)*.pug'
};

// // error and change functions
// var onError = function(err) {
//   gutil.beep();
//   this.emit('end');
// };

// Custom Plumber function for catching errors
function customPlumber(errTitle) {
    return plumber({
        errorHandler: notify.onError({
            // Customizing error title
            title: errTitle || 'Error running Gulp',
            message: 'Error: <%= error.message %>',
        })
    });
}

var onChange = function(event) {
    console.log('File ' + event.path + ' was ' + event.type + ', running tasks...');
};

// Get data json => yaml
// var getJsonData = function(file, cb) {
//     var jsonPath = yaml.safeLoad(fs.readFileSync('./dev/' + path.basename(file.path) + '.yml', 'utf8')),
//         meta = require(jsonPath),
//         data = extend(meta, { "var1": "bla bla" });
//     cb(data);
// };

// // Nunjucks json
// function getDataForFile(file) {
//   return {
//     example: 'data loaded for ' + file.relative
//   };
// }

// Browser definitions for autoprefixer
var autoprefixer_options = [
    'ie >= 8',
    'ie_mob >= 10',
    'ff >= 30',
    'chrome >= 34',
    'safari >= 7',
    'opera >= 23',
    'ios >= 7',
    'android >= 4.4',
    'bb >= 10'
];

// Pug(jade) convert
gulp.task('pug', function() {
    gulp.src(f.pug)
        .pipe(customPlumber('Error Running Pug'))
        .pipe(inheritance({basedir: 'dev'}))
        .pipe(data(function() {
            return yaml.safeLoad(fs.readFileSync(f.dev + '/data.yml', 'utf8'));
        }))
        .pipe(pug({
            pretty: true
        }))
        .pipe(rename({ dirname: '.' }))
        .pipe(gulp.dest(f.build))
        .pipe(browserSync.stream());
});

// Sass convert & Autoprefixer
gulp.task('sass', function() {
    gulp.src(f.scss)
        .pipe(sourcemaps.init())
        .pipe(customPlumber('Error Running Sass'))
        .pipe(sass({
            style: 'expanded',
            sourcemap: true,
            includePaths: bourbon
        }))
        .pipe(rename({ dirname: '.' }))
        .pipe(gulp.dest(f.css)) //export expanded css
        .pipe(postcss([autoprefixer({
            browsers: autoprefixer_options
        })]))
        .pipe(nano())
        .pipe(rename({
            suffix: '.min',
            dirname: '.'
        }))
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest(f.css)) //export minified css
        .pipe(browserSync.stream());
});

// Image sync
gulp.task('images:sync', function() {
    return gulp.src('')
        .pipe(dirSync(f.dev + '/images', f.build + '/images'))
        .on('error', gutil.log);
});

// SVG
gulp.task('icons', function() {
    return gulp.src('dev/images/*.svg')
        .pipe(customPlumber('Error Making SVG'))
        .pipe(svgmin())
        .pipe(svgstore({ fileName: 'icons.svg', inlineSvg: true }))
        .pipe(cheerio({
            run: function($, file) {
                $('svg').addClass('hide');
                $('[fill]').removeAttr('fill');
                $('[style]').removeAttr('style');
            },
            parserOptions: { xmlMode: true }
        }))
        .pipe(gulp.dest('build/images'))
        .pipe(reload({ stream: true }));
});

// Javascript sync
gulp.task('js:sync', function() {
    return gulp.src('')
        .pipe(dirSync(f.dev + '/js', f.build + '/js'))
        .pipe(browserSync.stream());
});

// HTML merge layouts with nunjucks
// gulp.task('nunjucks', ['sass'], function() {
//   return gulp.src('dev/**/**/*.+(html|nunjucks)')
//       .pipe(customPlumber('Error Running Nunjucks'))
//       .pipe(data(function() {
//         return yaml.safeLoad(fs.readFileSync(f.dev + '/data.yml', 'utf8'));
//       }))
//       .pipe(nunjucksRender({
//         path: ['dev/layouts'],
//         watch: false
//       }))
//       .pipe(gulp.dest('build'))
//       .pipe(browserSync.reload({
//         stream: true
//       }));
// });

// HTML sync
// gulp.task('html:sync', function() {
//   return gulp.src(f.dev + '/*.html')
//       .pipe(gulp.dest(f.build))
//       .pipe(browserSync.stream());
// });

// Browsersync server
gulp.task('server', function() {
    // browserSync.use(injector, {
    //   files: 'dev/*.html'
    // });
    browserSync({
        server: {
            baseDir: 'build'
        },
        notify: false
    });
});

//Watch
gulp.task('watch', function() {
    gulp.watch(f.scss, ['sass']).on('change', onChange);
    gulp.watch([f.pug, f.dev + '/data.yml'], ['pug']).on('change', onChange);
    gulp.watch(f.dev + '/images', ['images:sync']).on('change', onChange);
    gulp.watch(f.dev + '/js', ['js:sync']).on('change', onChange);
    // gulp.watch(f.dev + '**/**/*.html', ['html:sync']).on('change', onChange);
    // gulp.watch([
    //   f.dev + '/**/**/*.+(html|nunjucks)',
    //   f.dev + '/scss/layouts/**/*',
    //   f.dev + '/data.yml'
    // ], ['nunjucks']).on('change', onChange);
    gulp.watch('dev/images/*.svg', ['icons']).on('change', onChange);
});

// Default Task
gulp.task('default', ['server', 'watch']);
