var gulp = require('gulp'),
    qunit = require('node-qunit-phantomjs');

gulp.task('default', function() {
    qunit('./tests/plugins/autotooltips.html','./tests/grid/index.html','./tests/dataview/index.html');
});