# About this Fork

This fork adds the following method:

```
grid.updateColumnWidths(columnDefinitions)
```

Using this method improves the performance of changing the width of one or more grid columns by a lot. The existing API only allows for a whole grid redraw, which can be very slow. Pull request with notes [here](https://github.com/mleibman/SlickGrid/pull/897). Use cases for fast column size adjustment may be: auto-sizing columns to fit content, responsive sizing cells to fill the screen, and similar. 

Tagged as `2.2.1` so that it meets semver requirements but shows after the non-semver slickgrid tag of `2.02`.
git
# Welcome to SlickGrid

Find documentation and examples in [the wiki](https://github.com/mleibman/SlickGrid/wiki).

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
