var gulp = require('gulp');
var concat = require('gulp-concat');
var uglify = require("gulp-uglify");
var rename = require('gulp-rename');


gulp.task('default', ['scripts', 'watch']);
//Map
gulp.task('scripts', function() {
    gulp.src([
            './src/GeoConvert.js',
            './src/XML.js',
            './src/KML.js',
            './src/KMZ.js',
            './src/GPX.js',
            './src/ShapeFile.js',
            './src/DXF.js',
            './src/WKT.js',
        ])
        .pipe(concat('GeoConvert.js'))
        .pipe(gulp.dest('dist'))
        .pipe(uglify())
        .pipe(rename('GeoConvert.min.js'))
        .pipe(gulp.dest('dist'));
});

gulp.task('watch', function() {
    gulp.watch('src/**/*.js', ['scripts']);
});