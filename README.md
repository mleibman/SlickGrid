# About this Fork

This fork adds some methods that make it more performant to do auto column resizing and exposes some methods that make it easier to work with multiple grid instances and pinned columns.

## Main Change:

```
grid.updateColumnWidths(columnDefinitions)
```

Using this method improves the performance of changing the width of one or more grid columns by a lot. The existing API only allows for a whole grid redraw, which can be very slow. Pull request with notes [here](https://github.com/mleibman/SlickGrid/pull/897). Use cases for fast column size adjustment may be: auto-sizing columns to fit content, responsive sizing cells to fill the screen, and similar. 

## Other Changes:

* `grid.getId()` lets you get the uid of the grid instance
* Triggers existing event `onColumnsResized` when you change the column widths
* Triggers a new event `onColumnsChanged` when you set the columns
* Exposes the existing method `grid.setupColumnResize`, which allows you to re-enable column resizing if you're manually screwing around with the headers.
* Some new options on `setColumns` and `resizeCanvas` let you prevent some of the expensive calculations, useful if you're doing them yourself externally.




## (Original Documentation) Welcome to SlickGrid

Find documentation and examples in [the wiki](https://github.com/mleibman/SlickGrid/wiki).

### SlickGrid is an advanced JavaScript grid/spreadsheet component

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
