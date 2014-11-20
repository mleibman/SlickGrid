# Slickgrid with Pinned Columns

* JLynch7's effort took `267` commits
* `3500` loc in `slick.grid.js`
* `463` non-whitespace changes



## Features
* Row hover spans the pinned columns
* Tabbing between editable cells spans the pinned columns



## Dreamcatcher (wish list)

In a perfect world, what would slickgrid do?

* Be waaaay smaller. Drop support for LTE ie9
* Be jQuery Free (incl. reorderable columns)
* Trim out some options so code can be shorter
* Not virtualize columns for simpler/shorter code


## Useful Simplifications

If `options.pinnedColumns` isn't set, it's undefined.
Any comparison that checks `columnIndex > options.pinnedColumns` will return false if either value is undefined.
This makes an elegant solution possible where we always put content in the left pane if the pinnedColumns option hasn't been set.



## Tasks

```todo
x branch and gh-pages
x Get livereload rigged up
x See if it's practical to do all my overrides in a separate file -- only if I copy and change. needed methods are private.
x Diff carefully. Learn useful things.
x Build the DOM in the way I think might work, even though the left panels will be empty to start with
x Get cells and headers in the dom
x remove topPanel
x Get useful values exposed in an easy to observe console object

o Remove "panes", and see if everything still works
o Rename elements using the more row-based nomenclature with 0 and 1 used for addressing left and right


```



## Issues

- [ ] On the first run, MarkupArrayL/R has thousands of rows. Why?
- [x] Sometimes, the cells in the left-side pinned columns are empty. Especially after scrolling down and right at the same time. Why?
  - If you're scrolled all the way right and then scroll down, it doesn't know that it should include the far left columns in the drawn cells



## Function Rewrites

Day 1:

- [x] init (new dom element setup)
- [x] getHeadersWidth > calculateHeadersWidth
- [x] setHeadersWidth (new)
- [x] getCanvasWidth > calculateCanvasWidth
- [x] updateCanvasWidth (way lots of mucho changes)
- [x] getHeaderRowColumn (get from the left or right pane)
- [x] createColumnHeaders (put columns in left or right pane)
- [x] getViewportHeight > calculateHeights
- [x] calculateViewportWidth (new)
- [x] resizeCanvas
- [x] setPaneVisibility (new)
- [x] setScroller (new)
- [x] renderRows
- [x] appendRowHtml
- [x] removeRowFromCache
- [x] handleScroll / ReallyHandleScroll

Day 2:

- [x] render (no changes needed without frozenBottom)
- [ ] cleanUpAndRenderCells
- [.] cleanUpCells
- [x] ensureCellNodesInRowsCache
- [ ] 
- [ ] 



## Concepts / Learnings

### Scrolling

When scrolling happens, the following stack fires:

1. `handleScroll`
2. `reallyHandleScroll`
3. `render`
4. `cleanUpAndRenderCells`
5. `ensureCellNodesInRowsCache`



### Render

1. Gets the ranges of what's rendered and what's in the viewport
2. Cleans up stuff that's scrolled away
3. TODO: if the `scrollLeft` has changed...
  1. cleanUpAndRenderCells(renderedRange)
4. `renderRows(rangeToRender)`
5. Get range for post processing (only what's visible)
6. `startPostProcessing()`
7. mark `lastRenderedScrollTop` and `lastRenderedScrollLeft`
8. null `h_render`, the timeout handle for deferring the render



### `renderRows(range)`

Loops over every row index in the range. For each one:

1. Skips the row index if it's already in `rowsCache`
2. Increments the `renderedRows` counter and pushes the index into a local array
3. Adds a stub entry to `rowsCache[idx]`
4. Calls `appendRowHtml`
5. Checks to see if it should reselect a cell
6. Increments `counter_rows_rendered` (TODO: why two counters?)



### `appendRowHtml()`

Given:

* an array of markup for the left and right side
* `row` index
* range of things that are rendered

It:

1. Gets the data for that row index
2. Creates the HTML for the row
3. Uses the range to determine whether it should draw cells that are outside the viewport (TODO: does this manage the left and right pinned viewports correctly? Looks like not)
4. uses `appendCellHtml` to add markup for each cell it decides should be drawn
5. Adds all of this to the `markupArrayL` and `markupArrayR` strings, which are meant to hold all rendered row markup



### `appendCellHtml(markupArray, rowIdx, cellIdx, colspan, item)`

1. Builds the markup and css for the cell and append it to the `markupArray`
2. Pushes the cell index to `rowsCache[rowIdx].cellRenderQueue`
3. Adds the colspan the same way.



### `cleanUpAndRenderCells(range)`

Loops over every row index in the range. For each one:

1. Skip if there is no entry in `rowsCache` for the row
2. `ensureCellNodesInRowsCache()` // Roughly: this method fills in `rowsCache[rowIdx].cellNodesByColumnIdx` with dom el references
3. `cleanUpCells(range, rowIdx)` // build an array of every cell col index to remove. For every one, remove the dom element, cellColSpans, cellNodesByColumnIdx, and postProcessedRows entries.

Inside every row, loops over every column index. For each col index:

1. `break` if the left edge is past range.rightPx (any columns to follow would also be off the right edge, this is why it's safe to break, rather than continue)
2. `continue` if the cell is already rendered, which it checks using `cacheEntry.cellColSpans[colIdx]`.
3. adjust the colspan if needed
4. add cell markup to a local array if the cell is in range
5. increment `cellsAdded`

After each col but still inside each row:

1. increment `totalCellsAdded`
2. push the row index into `processedRows`

If there were any additions:

1. Create a temporary DOM element to hold the markup for every cell in every row that was created
2. 




### `rowsCache`

This is a hash containing data about rows.
Each key is the index of a row.
Each entry has these properties:

* ? cellColSpans
* ? cellNodesByColumnIdx
* ? cellRenderQueue
* rowNode
  * This is the actual dom element of the row, containing all the cells. If columns are pinned, there are two entries, one for the left side and one for the right.
  * This is what is drawn into the dom when a scroll happens



### `postProcessedRows`

? A hash of rows used to support the asyncPostRender feature, I think.



### `cleanupRows(rangeToKeep)` > `removeRowFromCache(rowIdx)`

You pass `cleanupRows` the range you want to keep, and it loops through the `rowsCache` to remove every row that isn't needed.

`removeRowFromCache` does the following:

* remove the row dom element (from both panes, if columns are pinned)
* delete the entry from `rowsCache` (TODO: would it be faster to try to keep this object in the fast path and not add/delete properties dynamically?)
* delete the entry from `postProcessedRows`



### Visible / Rendered

The visible range are the rows and columns actually and currently visible.
The rendered range is larger, because it prerenders things that are a little bit out of the viewport.

Find out how much is visible:

    getVisibleRange() // object with top row index, bottom row index, and left/right in pixels
    
How much is rendered:

	getRenderedRange() // object with top row index, bottom row index, and left/right in pixels







## Renames

```javascript
// els
tl.pane
tl.viewport                 // fka: $headerScrollerL
tl.canvas                   // $headerL

cl.headerRowViewport
cl.headerRowSpacer
cl.headerRowCanvas

cl.topPanelViewport			 // $topPanelScroller
cl.topPanelCanvas

cl.viewport
cl.canvas    



// Size naming idea:
cl.paneHeight				// was paneTopH
cl.viewportHeight		// was viewportH
cl.topPanelHeight		// topPanelH
cl.headerRowHeight 		// headerRowH

// New idea. From:
t.l.pane
	headerScroller
		header
c.l.pane
	headerRowScroller
		headerRowSpacer
		headerRow
	viewport
		canvas

// ...To:
els.tl.pane
	els.tl.headerViewport
		els.tl.headerCanvas
els.cl.pane
	els.cl.headerRowViewport
		els.cl.headerRowSpacer
		els.cl.headerRowCanvas
	els.cl.viewport
		els.cl.canvas



```













