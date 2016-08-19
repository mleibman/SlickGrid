## This is the 6pac SlickGrid repo

This is the acknowledged most active non-customised fork of SlickGrid.

It aims to be a viable alternative master repo, building on the legacy of the mleibman/SlickGrid master branch, keeping libraries up to date and applying small, safe core patches and enhancements without turning into a personalised build.

Check out the [examples](https://github.com/6pac/SlickGrid/wiki/Examples) for examples demonstrating new features and use cases, such as dynamic grid creation and editors with third party controls.

Also check out my [wiki](https://github.com/6pac/SlickGrid/wiki).

The following are the changes (most recent first) made since forking from the main MLeibman branch, a significant number in response to issues or pull requests.

**Maintenance:**

* breaking change: updated jquery.event.drag-2.2.js and jquery.event.drop-2.2.js to be compatible with jQuery 3, bumped these to jquery.event.drag-2.3.0.js and jquery.event.drop-2.3.0.js
* tested with jQuery 1.8.3, 1.11.2, 2.2.4, and 3.1.0  -- thanks to lfilho
* updated repo to work with jQuery 3.x (without needing jQuery-Migrate) -- thanks to lfilho
* fix bug with refresh last row of grid
* fix bug in compound editor example 'isValueChanged' method
* add internal keycode enums
* fix error in autotooltips test
* remove deprecated jquery .browser property
* fix bugs identified by JsHint
* Patch absBox for null element bug (MLeibman #1066)
* Fix column resizing issues with Bootstrap 3/box-sizing:border-box
* Fix jQueryUI css interfering with SlickGrid css issues
* Prevent useless onSelectedRangesChanged events in selectionmodels' setSelectedRanges
* Fix tooltip error with draggable columns 
* additional version of ajax loading page, using Yahoo news and YQL as a source. the format of the grid rows is more in keeping with the newsfeed style of the original
* Fix Issue #963 ajax example not working
* update DataView compiled-expression regex to deal with some forms of minification
* fix grouping bug (issue #841 & #896 mleibman#898)
* Make default group comparer function more robust
* Fix unnecessary horizontal scroll for autosized columns when viewport has fractional pixel width
* Remove redundant slick pager code
* Fix bug in dataview causing model benchmark test to throw an error
* update to jquery-1.11.2 and jquery-ui-1.11.3, with minor patches to accommodate the change

**New features:**

* Add example of jQueryUI autocomplete editor
* Add KeyCaptureList property to editor, to allow editor to capture specified keys
* add optional fixed footer row
* Add example of dynamic tab and grid creation for grid with all the features of example-4-model
* Add example of dynamic tab and grid creation for basic grid 
* add custom validator option to integer, float and date editors
* Add grid as member of args parameter for all events, and to column formatter. Add dataView as member of args parameter for all dataView events
* Add Floating Point editor
* Allow custom editors to suppress automatic cell clear on edit
* Add async post render async cleanup
* Add multi grid on page example (example-multi-grid-basic)
* Add jQueryUI accordion and Bootstrap 3 examples
* Add css manipulation so that grid initialises successfully if the parent element is hidden

Original mleibman [wiki](https://github.com/mleibman/SlickGrid/wiki).
