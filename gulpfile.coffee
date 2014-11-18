

gulp        = require 'gulp'
browserSync = require 'browser-sync'


# --------------------------------------- Task Flows
gulp.task 'liveServer', ->
  browserSync server: baseDir: './'
  gulp.watch [
      "index.html"
      "slick.*.js"
      "slick.*.css"
      "examples/**"
    ],
    cwd: '',
    browserSync.reload


# --------------------------------------- Task Bundles
gulp.task 'default',  [ 'liveServer' ]
