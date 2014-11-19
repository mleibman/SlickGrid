# Slickgrid with Pinned Columns

* JLynch7's effort took `267` commits
* `3500` loc in `slick.grid.js`
* `463` non-whitespace changes

## Features
* Row hover spans the pinned columns
* Tabbing between editable cells spans the pinned columns

## Tasks

```todo
x branch and gh-pages
x Get livereload rigged up
x See if it's practical to do all my overrides in a separate file -- only if I copy and change. needed methods are private.
x Diff carefully. Learn useful things.
x Build the DOM in the way I think might work, even though the left panels will be empty to start with
x Get cells and headers in the dom
```

## Function Rewrites

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
- [ ] 
- [ ] 
- [ ] 


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













