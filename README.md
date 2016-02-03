## This is the 6pac slickgrid repo

I am maintaining this branch as a separate 'alternative master'. Check [my wiki](https://github.com/6pac/SlickGrid/wiki) for details.

Once we take on SlickGrid we all add [my patch for my specific app requirement]. This 'application noise' makes it much harder to share updates to SlickGrid with other users, who may want some of the changes, but find others irrelevant.  

This repo is deliberately **non-customised**. We have *only* kept jQuery up to date, made bug fixes where necessary and added small features carefully considered to enhance the overall usefulness of the grid.  
Example pages showcase any new features.

The following, in short, are the changes made since forking from the main MLeibman branch, a significant number in response to issues or pull requests.

**Maintenance:**

* update to jquery-1.11.2 and jquery-ui-1.11.3, with minor patches to accommodate the change
* Fix bug in dataview causing model benchmark test to throw an error
* Remove redundant slick pager code
* Fix unnecessary horizontal scroll for autosized columns when viewport has fractional pixel width
* Make default group comparer function more robust
* fix grouping bug (issue #841 & #896 mleibman#898)
* update DataView compiled-expression regex to deal with some forms of minification
* Fix Issue #963 ajax example not working
* additional version of ajax loading page, using Yahoo news and YQL as a source. the format of the grid rows is more in keeping with the newsfeed style of the original
* Fix tooltip error with draggable columns 
* Prevent useless onSelectedRangesChanged events in selectionmodels' setSelectedRanges
* Fix jQueryUI css interfering with SlickGrid css issues
* Fix column resizing issues with Bootstrap 3/box-sizing:border-box
* Patch absBox for null element bug (MLeibman #1066)
* fix bugs identified by JsHint
* remove deprecated jquery .browser property
* fix error in autotooltips test
* add internal keycode enums
* fix bug in compound editor example 'isValueChanged' method

**New features:**

* Add css manipulation so that grid initialises successfully if the parent element is hidden
* Add jQueryUI accordion and Bootstrap 3 examples
* Add multi grid on page example (example-multi-grid-basic)
* Add async post render async cleanup
* Allow custom editors to suppress automatic cell clear on edit
* Add Floating Point editor
* Add grid as member of args parameter for all events, and to column formatter. Add dataView as member of args parameter for all dataView events
* add custom validator option to integer, float and date editors
* Add example of dynamic tab and grid creation for basic grid 
* Add example of dynamic tab and grid creation for grid with all the features of example-4-model

# Original mleibman README follows:





Find documentation and examples in [the wiki](https://github.com/mleibman/SlickGrid/wiki).

# Welcome to SlickGrid

## SlickGrid is an advanced JavaScript grid/spreadsheet component

Some highlights:

* Adaptive virtual scrolling (handle hundreds of thousands of rows with extreme responsiveness)
* Extremely fast rendering speed
* Supports jQuery UI Themes
* Background post-rendering for richer cells
* Configurable & customizable
* Full keyboard navigation
* Column resize/reorder/show/hide
* Column autosizing & force-fit
* Pluggable cell formatters & editors
* Support for editing and creating new rows.
* Grouping, filtering, custom aggregators, and more!
* Advanced detached & multi-field editors with undo/redo support.
* “GlobalEditorLock” to manage concurrent edits in cases where multiple Views on a page can edit the same data.
* Support for [millions of rows](http://stackoverflow.com/a/2569488/1269037)
