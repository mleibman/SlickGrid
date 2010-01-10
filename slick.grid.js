/***
 * 
 * (c) 2009 Michael Leibman (michael.leibman@gmail.com)
 * All rights reserved.
 * 
 * 
 * TODO:
 * 	- frozen columns
 * 	- consistent events (EventHelper?  jQuery events?)
 *
 *
 * OPTIONS:
 *  rowHeight				-	Row height in pixels.
 * 	enableAddRow			-	If true, a blank row will be displayed at the bottom - typing values in that row will add a new one.
 * 	manualScrolling			-	Disable automatic rerender on scroll.  Client will take care of calling Grid.onScroll().
 * 	editable				-	If false, no cells will be switched into edit mode.
 * 	editOnDoubleClick		-	Cell will not automatically go into edit mode without being double-clicked.
 * 	enableCellNavigation	-	If false, no cells will be selectable.
 * 	defaultColumnWidth		-	Default column width in pixels (if columns[cell].width is not specified).
 * 	enableColumnReorder		-	Allows the user to reorder columns.
 * 	asyncEditorLoading		-	Makes cell editors load asynchronously after a small delay.
 * 								This greatly increases keyboard navigation speed.
 * 	forceFitColumns			-	Force column sizes to fit into the viewport (avoid horizontal scrolling).
 *  enableAsyncPostProcessing	-	If true, async post rendering will occur and asyncPostProcess delegates on columns will be called.
 * 
 * 
 * COLUMN DEFINITION (columns) OPTIONS:
 * 	id						-	Column ID.
 * 	name					-	Column name to put in the header.
 * 	field					-	Property of the data context to bind to.
 * 	formatter				-	Function responsible for rendering the contents of a cell.
 * 	editor					-	An Editor class.
 * 	validator				-	An extra validation function to be passed to the editor.
 * 	unselectable			-	If true, the cell cannot be selected (and therefore edited).
 * 	cannotTriggerInsert		-	If true, a new row cannot be created from just the value of this cell.
 * 	setValueHandler			-	If true, this handler will be called to set field value instead of context[field].
 * 	width					-	Width of the column in pixels.
 * 	resizable				-	If false, the column cannot be resized.
 *  sortable				-	If true, the column can be sorted (onSort will be called).
 * 	minWidth				-	Minimum allowed column width for resizing.
 * 	maxWidth				-	Maximum allowed column width for resizing.
 * 	cssClass				-	A CSS class to add to the cell.
 * 	rerenderOnResize		-	Rerender the column when it is resized (useful for columns relying on cell width or adaptive formatters).
 * 	asyncPostRender			-	Function responsible for manipulating the cell DOM node after it has been rendered (called in the background).
 * 
 * EVENTS:
 * 
 * ...
 * 
 * 
 * NOTES:
 * 
 * 	Cell/row DOM manipulations are done directly bypassing jQuery's DOM manipulation methods.
 * 	This increases the speed dramatically, but can only be done safely because there are no event handlers
 * 	or data associated with any cell/row DOM nodes.  Cell editors must make sure they implement .destroy() 
 * 	and do proper cleanup.
 * 
 * 
 * @param {jQuery} $container	Container object to create the grid in.
 * @param {Array} data			An array of objects for databinding.
 * @param {Array} columns		An array of column definitions.
 * @param {Object} options		Grid options.
 * 
 */
(function() {
	function SlickGrid($container,data,columns,options)
	{
		// settings
		var defaults = {
			rowHeight: 25,
			defaultColumnWidth: 80,
			enableAddRow: false,
			leaveSpaceForNewRows: false,
			manualScrolling: false,
			editable: false,
			editOnDoubleClick: false,
			enableCellNavigation: true,
			enableColumnReorder: true,
			asyncEditorLoading: false,
			forceFitColumns: false,
			enableAsyncPostRender: false
		};
		
		var columnDefaults = {
            resizable: true,
            sortable: false,
            formatter: defaultFormatter
        };
		
		// consts
		var CAPACITY = 50;
		var MIN_BUFFER = 5;
		var BUFFER = MIN_BUFFER;  // will be set to equal one page
		var POSTPROCESSING_DELAY = 60,  // must be greater than the delay in handleScroll 
			EDITOR_LOAD_DELAY = 100;
		
		// private
		var uid = "slickgrid_" + Math.round(1000000 * Math.random());
		var self = this;
		var $divHeadersScroller;
		var $divHeaders;
		var $divMainScroller;
		var $divMain;
		var viewportH, viewportW;
		var headerColumnWidthDiff, headerColumnHeightDiff, cellWidthDiff, cellHeightDiff;  // padding+border
			
		var currentRow, currentCell;
		var currentCellNode = null;
		var currentEditor = null;	
		
		var rowsCache = {};
		var renderedRows = 0;
		var numVisibleRows;
		var lastRenderedScrollTop = 0;
		var currentScrollTop = 0;
		var currentScrollLeft = 0;
		var scrollDir = 1;
		var avgRowRenderTime = 10;
		
		var selectedRows = [];
		var selectedRowsLookup = {};
		var columnsById = {};
		
		// async call handles
		var h_editorLoader = null;
		var h_render = null;	
		var h_postrender = null;
		var postProcessedRows = {};
		var postProcessToRow = null;
		var postProcessFromRow = null;

		// perf counters
		var counter_rows_rendered = 0;
		var counter_rows_removed = 0;
		
		
		function init() {
			options = $.extend({},defaults,options);
			columnDefaults.width = options.defaultColumnWidth;
			
			$container
				.empty()
				.attr("tabIndex",0)
				.attr("hideFocus",true)
				.css("overflow","hidden")
				.css("outline",0)
				.css("position","relative")
				.addClass(uid);
			
			$divHeadersScroller = $("<div class='slick-header' style='overflow:hidden;position:relative;' />").appendTo($container);
			$divHeaders = $("<div class='slick-header-columns' style='width:100000px' />").appendTo($divHeadersScroller);
			$divMainScroller = $("<div tabIndex='0' hideFocus style='width:100%;overflow-x:auto;overflow-y:scroll;outline:0;position:relative;'>").appendTo($container);
			$divMain = $("<div class='grid-canvas' tabIndex='0' hideFocus style='overflow:hidden' />").appendTo($divMainScroller);
		
			// header columns and cells may have different padding/border skewing width calculations (box-sizing, hello?)
			// calculate the diff so we can set consistent sizes
			measureCellPaddingAndBorder();
			
			$divMainScroller.height($container.innerHeight() - $divHeadersScroller.outerHeight());
			
			if ($.browser.msie)		
					$divMainScroller[0].onselectstart = function() {		
						if (event.srcElement.tagName != "INPUT" && event.srcElement.tagName != "TEXTAREA")		
							return false;		
						};
			
			$divHeaders.disableSelection();
	
			createColumnHeaders();			
			setupMoveEvents();
			createCssRules();
			resizeCanvas();
			if (options.forceFitColumns)
				autosizeColumns();		
			render();
			
			if (!options.manualScrolling)
				$divMainScroller.bind("scroll", handleScroll);
			
			$container.bind("resize", resizeCanvas);
			
			$divMain.bind("keydown", handleKeyDown);
			$divMain.bind("click", handleClick);
			$divMain.bind("dblclick", handleDblClick);
			$divMain.bind("contextmenu", handleContextMenu);
			$divHeadersScroller.bind("contextmenu", handleHeaderContextMenu);
		}
		
		function createColumnHeaders() {
			for (var i = 0; i < columns.length; i++) {
				var m = columns[i] = $.extend({},columnDefaults,columns[i]);
				columnsById[m.id] = i;
				
				var header = $("<div class='slick-header-column' cell=" + i + " id='" + m.id + "' />")
					.html(m.name)
					.width(m.width - headerColumnWidthDiff)
					.appendTo($divHeaders);
				
				if (m.sortable) header.append("<span class='slick-sort-indicator' />");
				if (m.resizable) header.append("<div class='slick-resizable-handle' />");
			}
			
			setupColumnSort();
			setupColumnResizeEvents();
			if (options.enableColumnReorder) 
				setupColumnReorderEvents();
		}
		
		function setupColumnSort() {
	        $divHeaders.click(function(e) {
				var $col = $(e.target);
	            if (!$col.hasClass("slick-header-column") || !columns[columnsById[$col.attr("id")]].sortable) 
	                return;
				
				if (currentEditor && !commitCurrentEdit()) return;
	
	            if ($col.is(".slick-header-column-sorted")) 
	            {
	                $col.find(".slick-sort-indicator").toggleClass("slick-sort-indicator-asc").toggleClass("slick-sort-indicator-desc");
	            }
	            else 
	            {
	                $divHeaders.children().removeClass("slick-header-column-sorted");
	                $divHeaders.find(".slick-sort-indicator").removeClass("slick-sort-indicator-asc slick-sort-indicator-desc");
	                $col.addClass("slick-header-column-sorted");
	                $col.find(".slick-sort-indicator").addClass("slick-sort-indicator-asc");
	            }
				
				if (self.onSort)
					self.onSort(columns[columnsById[$col.attr("id")]], $col.find(".slick-sort-indicator").hasClass("slick-sort-indicator-asc"));
	        })			
		}
		
		function setupColumnReorderEvents() {
	        $divHeaders.sortable({
	            axis: "x",
	            cursor: "default",
	            tolerance: "intersect",
	            helper: "clone",
	            placeholder: "slick-sortable-placeholder slick-header-column",
	            forcePlaceholderSize: true,
	            start: function(e, ui) { $(ui.helper).addClass("slick-header-column-active") },
	            beforeStop: function(e, ui) { $(ui.helper).removeClass("slick-header-column-active") },
				stop: function(e, ui) {
					if (currentEditor && !commitCurrentEdit()) {
						$(this).sortable("cancel");
						return;
					}
					
					var newOrder = $divHeaders.sortable("toArray"), lookup = {};
					for (var i=0; i<columns.length; i++) {
						lookup[columns[i].id] = columns[i];
					}
					
					for (var i=0; i<newOrder.length; i++) {
						columnsById[newOrder[i]] = i;
						columns[i] = lookup[newOrder[i]];
					}
					
					removeAllRows();
					removeCssRules();
					createCssRules();
					render();
					
					if (self.onColumnsReordered)
						self.onColumnsReordered();
						
					e.stopPropagation();
				}					
	    	})			
		}
		
		function setupColumnResizeEvents() {
	        $divHeaders
				.find(".slick-resizable-handle")
				.bind('dragstart', function(e) {
		            var $col = $(this).parent();
					var colId = $col.attr("id");
					if (!columns[columnsById[colId]].resizable) return false;	
					if (currentEditor && !commitCurrentEdit()) return false;
								
		            $col
						.data("colId", colId)
						.data("width", $col.width())
		            	.data("pageX", e.pageX)
		            	.addClass("slick-header-column-active");
		        })
				.bind('drag', function(e) {
		            var $col = $(this).parent(), w = $col.data("width") - $col.data("pageX") + e.pageX;
					var cell = columnsById[$col.data("colId")];
					var m = columns[cell];
					if (m.minWidth) w = Math.max(m.minWidth - headerColumnWidthDiff,w);
					if (m.maxWidth) w = Math.min(m.maxWidth - headerColumnWidthDiff,w);
		            $col.css({ width: Math.max(0, w) });
		        })
				.bind('dragend', function(e) {
					var $col = $(this).parent();
					var cell = columnsById[$col.data("colId")];
					$col.removeClass("slick-header-column-active");
					columns[cell].width = $col.outerWidth();
					
					if (options.forceFitColumns)
						autosizeColumns(columns[cell]);
					else {
						updateColumnWidth(cell, $col.outerWidth());
						resizeCanvas();
					}
					
					if (columns[cell].rerenderOnResize)
						removeAllRows();				
					
					render();				
		        })
		}
	
		function setupMoveEvents() {
			$divMain
				.bind("beforedragstart", function(e) {
					var $cell = $(e.target).closest(".slick-cell");
					if ($cell.length == 0) return false;
					if (parseInt($cell.parent().attr("row")) >= data.length) return false;
					var colDef = columns[$cell.attr("cell")];
					if (colDef.behavior != "move") return false;
				})
				.bind("dragstart", function(e) {
					if (currentEditor && !commitCurrentEdit()) return false;
					
					var row = parseInt($(e.target).closest(".slick-row").attr("row"));
					
					if (!selectedRowsLookup[row])
						setSelectedRows([row]);
					
					var $selectionProxy = $("<div class='slick-reorder-proxy'/>");
					$selectionProxy	
						.css("position", "absolute")
						.css("zIndex", "99999")
						.css("width", $(this).innerWidth())
						.css("height", options.rowHeight*selectedRows.length)
						.appendTo($divMainScroller);
	
					$(this)
						.data("selectionProxy", $selectionProxy)
						.data("insertBefore", -1);
						
					var $guide = $("<div class='slick-reorder-guide'/>");
					$guide	
						.css("position", "absolute")
						.css("zIndex", "99998")
						.css("width", $(this).innerWidth())
						.css("top", -1000)
						.appendTo($divMainScroller);
					
					return $guide;
				})
				.bind("drag", function(e) {
					var top = e.clientY - $(this).offset().top;
					$(this).data("selectionProxy").css("top",top-5);
					
					var insertBefore = Math.max(0,Math.min(Math.round(top/options.rowHeight),data.length));
					if (insertBefore != $(this).data("insertBefore")) {
						if (self.onBeforeMoveRows && self.onBeforeMoveRows(getSelectedRows(),insertBefore) === false)
							$(e.dragProxy).css("top", -1000).data("canMove",false);
						else
							$(e.dragProxy).css("top",insertBefore*options.rowHeight).data("canMove",true);	
						$(this).data("insertBefore", insertBefore);			
					}
				})
				.bind("dragend", function(e) {
					var canMove = $(e.dragProxy).data("canMove");
					$(e.dragProxy).remove();
					$(this).data("selectionProxy").remove();
					var insertBefore = $(this).data("insertBefore");
					$(this).removeData("selectionProxy").removeData("insertBefore");
					if (self.onMoveRows && canMove) self.onMoveRows(getSelectedRows(),insertBefore);
				})		
		}
		
		function measureCellPaddingAndBorder() {
			var tmp = $("<div class='slick-header-column cell='' id='' style='visibility:hidden'>-</div>").appendTo($divHeaders);
			headerColumnWidthDiff = tmp.outerWidth() - tmp.width();
			headerColumnHeightDiff = tmp.outerHeight() - tmp.height();
			tmp.remove();
			
			var r = $("<div class='slick-row' />").appendTo($divMain);
			tmp = $("<div class='slick-cell' cell='' id='' style='visibility:hidden'>-</div>").appendTo(r);
			cellWidthDiff = tmp.outerWidth() - tmp.width();
			cellHeightDiff = tmp.outerHeight() - tmp.height();
			r.remove();
		}
		
		function createCssRules() {
			var $style = $("<style type='text/css' rel='stylesheet' lib='slickgrid' />").appendTo($("head"));
			$.rule("." + uid + " .slick-cell { height:" + (options.rowHeight - cellHeightDiff) + "px;}").appendTo($style);
			
			for (var i = 0; i < columns.length; i++) {
				$.rule(
					"." + uid + " .c" + i + " { " +
					"width:" + (columns[i].width - cellWidthDiff) + "px; " + 
					"display: " + (columns[i].hidden ? "none" : "block") +
					" }").appendTo($style);
			}
		}
		
		function removeCssRules() {
			$("style[lib=slickgrid]").remove();
		}
			
		function destroy() {
			if (currentEditor)
				cancelCurrentEdit();
			
			$divHeaders.sortable("destroy");
			$container.unbind("resize", resizeCanvas);
			removeCssRules();
			
			$container.empty().removeClass(uid);
		}
		
		//////////////////////////////////////////////////////////////////////////////////////////////
		// General
		
		function getColumnIndex(id) {
			return columnsById[id];	
		}
		
		function autosizeColumns(columnToHold) {
			var availWidth = viewportW-$.getScrollbarWidth();
			var total = 0;
			var existingTotal = 0;
			var minWidth = Math.max(headerColumnWidthDiff,cellWidthDiff);
			
			for (var i = 0; i < columns.length; i++) {
				if (!columns[i].hidden) 
					existingTotal += columns[i].width;
			}
			
			total = existingTotal;
			
			removeAllRows();
			
			// shrink
			var workdone = true;
			while (total > availWidth && workdone) {
				workdone = false;
				for (var i = 0; i < columns.length && total > availWidth; i++) {
					var c = columns[i];
					if (c.hidden || !c.resizable || c.minWidth == c.width || c.width == minWidth || (columnToHold && columnToHold.id == c.id)) continue;
					total -= 1;
					c.width -= 1;
					workdone = true;
				}			
			}
			
			// shrink the column being "held" as a last resort
			if (total > availWidth && columnToHold && columnToHold.resizable && !columnToHold.hidden) {
				while (total > availWidth) {
					if (columnToHold.minWidth == columnToHold.width || columnToHold.width == minWidth) break;
					total -= 1;
					columnToHold.width -= 1;
				}
			}
			
			// grow
			workdone = true;
			while (total < availWidth && workdone) {
				workdone = false;
				for (var i = 0; i < columns.length && total < availWidth; i++) {
					var c = columns[i];
					if (c.hidden || !c.resizable || c.maxWidth == c.width || (columnToHold && columnToHold.id == c.id)) continue;
					total += 1;
					c.width += 1;
					workdone = true;
				}
			}
	
			// grow the column being "held" as a last resort
			if (total < availWidth && columnToHold && columnToHold.resizable && !columnToHold.hidden) {
				while (total < availWidth) {
					if (columnToHold.maxWidth == columnToHold.width) break;
					total += 1;
					columnToHold.width += 1;
				}
			}		
			
			for (var i=0; i<columns.length; i++) {
				updateColumnWidth(i, columns[i].width);
			}
			
			resizeCanvas();
		}
		
		function updateColumnWidth(index,width) {
			columns[index].width = width;
			$divHeaders.find(".slick-header-column[id=" + columns[index].id + "]").css("width",width - headerColumnWidthDiff);
			$.rule("." + uid + " .c" + index, "style[lib=slickgrid]").css("width", (columns[index].width - cellWidthDiff) + "px");
		}
		
		function setColumnVisibility(column,visible) {
			var index = columnsById[column.id];
			columns[index].hidden = !visible;
			resizeCanvas();
			var header = $divHeaders.find("[id=" + columns[index].id + "]");
			header.css("display", visible?"block":"none");
			$.rule("." + uid + " .c" + index, "style[lib=slickgrid]").css("display", visible?"block":"none");
			
			if (options.forceFitColumns)
				autosizeColumns(columns[index]);
		}
	
		function getSelectedRows() {
			return selectedRows.sort().concat();
		}	
	
		function setSelectedRows(rows) {
			if (Slick.GlobalEditorLock.isEditing() && !Slick.GlobalEditorLock.hasLock(self))
				throw "Grid : setSelectedRows : cannot set selected rows when somebody else has an edit lock";
			
			var lookup = {};
			for (var i=0; i<rows.length; i++)
				lookup[rows[i]] = true;
			
			// unselect old rows
			for (var i=0; i<selectedRows.length; i++) {
				var row = selectedRows[i];
				if (rowsCache[row] && !lookup[row])
					$(rowsCache[row]).removeClass("selected");
			}
	
			// select new ones
			for (var i=0; i<rows.length; i++) {
				var row = rows[i];
				if (rowsCache[row] && !selectedRowsLookup[row])
					$(rowsCache[row]).addClass("selected");
			}
	
			selectedRows = rows.concat();
			selectedRowsLookup = lookup;				
		}
	
		function setOptions(args) {
			if (currentEditor && !commitCurrentEdit())
				return;
			
			makeSelectedCellNormal();
			
			if (options.enableAddRow != args.enableAddRow)
				removeRow(data.length);
				
			options = $.extend(options,args);		
			
			render();
		}
		
	    function setData(newData,scrollToTop) {
	    	removeAllRows();    
		    data = newData;
			if (scrollToTop)
		    	$divMainScroller.scrollTop(0);
		}	
		
		//////////////////////////////////////////////////////////////////////////////////////////////
		// Rendering / Scrolling
	
		function defaultFormatter(row, cell, value, columnDef, dataContext) { 
			return (value == null || value == undefined) ? "" : value;
		}
	
		function appendRowHtml(stringArray,row) {
			var d = data[row];
			var dataLoading = row < data.length && !d;
			var css = "slick-row " + (dataLoading ? " loading" : "") + (selectedRowsLookup[row] ? " selected" : "");
			
			stringArray.push("<div class='" + css + "' row='" + row + "' style='top:" + (options.rowHeight*row) + "px'>");
			
			for (var i=0, cols=columns.length; i<cols; i++) {
				var m = columns[i];
	
				stringArray.push("<div " + (m.unselectable ? "" : "hideFocus tabIndex=0 ") + "class='slick-cell c" + i + (m.cssClass ? " " + m.cssClass : "") + "' cell=" + i + ">");
	
				// if there is a corresponding row (if not, this is the Add New row or this data hasn't been loaded yet)				
				if (d && row < data.length)
					stringArray.push(m.formatter(row, i, d[m.field], m, d));
				
				stringArray.push("</div>");
			}
			
			stringArray.push("</div>");			
		}
		
		function getRowHtml(row) {
			var html = [];
			appendRowHtml(html,row);
			return html.join("");
		}
		
		function cleanupRows(visibleFrom,visibleTo) {
			var rowsBefore = renderedRows;
			var parentNode = $divMain[0];
			for (var i in rowsCache) {
				if ((i < visibleFrom || i > visibleTo) && i != currentRow)
					removeRowFromCache(i);
			}
		}
		
		function removeAllRows() {
			$divMain[0].innerHTML = "";
			rowsCache= {};
			postProcessedRows = {};
			counter_rows_removed += renderedRows;
			renderedRows = 0;
		}	
	
		function removeRowFromCache(row) {
			var node = rowsCache[row];
			if (!node) return;
			node.parentNode.removeChild(node);
			delete rowsCache[row];
			delete postProcessedRows[row];
			renderedRows--;
			counter_rows_removed++;
		}
	
		function removeRow(row) {
			removeRows([row]);
		}
		
		function removeRows(rows) {
			if (!rows || !rows.length) return;
			scrollDir = 0;
			var nodes = [];
			for (var i=0, rl=rows.length; i<rl; i++) {
				if (currentEditor && currentRow == i)
					throw "Grid : removeRow : Cannot remove a row that is currently in edit mode";	
				
				if (rowsCache[rows[i]]) 
					nodes.push(rows[i]);
			}
			
			if (renderedRows > 10 && nodes.length == renderedRows) {
				removeAllRows();			
			} else {
				for (var i=0, nl=nodes.length; i<nl; i++) 
					removeRowFromCache(nodes[i]);
			}
		}
		
		function updateCell(row,cell) {
			if (!rowsCache[row]) return;
			var $cell = $(rowsCache[row]).find(".c[cell=" + cell + "]");
			if ($cell.length == 0) return;
			
			var m = columns[cell], d = data[row];	
			if (currentEditor && currentRow == row && currentCell == cell) 
				currentEditor.setValue(d[m.field]);
			else {
				$cell[0].innerHTML = d ? m.formatter(row, cell, d[m.field], m, d) : "";
				invalidatePostProcessingResults(row);
			}
		}
	
		function updateRow(row) {
			if (!rowsCache[row]) return;
			
			// todo:  perf:  iterate over direct children?
			$(rowsCache[row]).find(".slick-cell").each(function(i) {
				var m = columns[i];
				if (row == currentRow && i == currentCell && currentEditor)
					currentEditor.setValue(data[currentRow][m.field]);
				else if (data[row])
					this.innerHTML = m.formatter(row, i, data[row][m.field], m, data[row]);
				else
					this.innerHTML = "";
			});
			
			invalidatePostProcessingResults(row);
		}
	
		function resizeCanvas() {
			viewportW = $divMainScroller.innerWidth();
			viewportH = $divMainScroller.innerHeight();
			BUFFER = numVisibleRows = Math.ceil(viewportH / options.rowHeight);
			CAPACITY = Math.max(50, numVisibleRows + 2*BUFFER);
	
			var totalWidth = 0;
			for (var i=0; i<columns.length; i++) {
				if (columns[i].hidden != true)
					totalWidth += columns[i].width;
			}
			$divMain.width(totalWidth);
		  
		    var newHeight = Math.max(options.rowHeight * (data.length + (options.enableAddRow?1:0) + (options.leaveSpaceForNewRows?numVisibleRows-1:0)), viewportH - $.getScrollbarWidth());
			$divMainScroller.height( $container.innerHeight() - $divHeadersScroller.outerHeight() );
			
	        // browsers sometimes do not adjust scrollTop/scrollHeight when the height of contained objects changes
			if ($divMainScroller.scrollTop() > newHeight - $divMainScroller.height() + $.getScrollbarWidth()) {
				$divMainScroller.scrollTop(newHeight - $divMainScroller.height() + $.getScrollbarWidth());
			}
			$divMain.height(newHeight);
			
			render();
		}
		
		function updateRowCount() {
		  	// remove the rows that are now outside of the data range
			// this helps avoid redundant calls to .removeRow() when the size of the data decreased by thousands of rows
			var parentNode = $divMain[0];
			var l = options.enableAddRow ? data.length : data.length - 1;
			for (var i in rowsCache) {
				if (i >= l)
					removeRowFromCache(i);
			}
			
			var newHeight = Math.max(options.rowHeight * (data.length + (options.enableAddRow?1:0) + (options.leaveSpaceForNewRows?numVisibleRows-1:0)), viewportH - $.getScrollbarWidth());			
	        
			// browsers sometimes do not adjust scrollTop/scrollHeight when the height of contained objects changes
			if ($divMainScroller.scrollTop() > newHeight - $divMainScroller.height() + $.getScrollbarWidth()) 
				$divMainScroller.scrollTop(newHeight - $divMainScroller.height() + $.getScrollbarWidth());
			$divMain.height(newHeight);			
		}
		
		function getViewport()
		{
			return {
				top:	Math.floor(currentScrollTop / options.rowHeight),
				bottom:	Math.floor((currentScrollTop + viewportH) / options.rowHeight)
			};	
		}
		
		function renderRows(from,to) {
			var parentNode = $divMain[0];
			var rowsBefore = renderedRows;
			var stringArray = [], rows =[];
			var _start = new Date();
			
			for (var i = from; i <= to; i++) {
				if (rowsCache[i]) continue;
				renderedRows++;
				rows.push(i);
				appendRowHtml(stringArray,i);
				counter_rows_rendered++;
			}
			
			var x = document.createElement("div");
			x.innerHTML = stringArray.join("");

			for (var i = 0, l = x.childNodes.length; i < l; i++) 
				rowsCache[rows[i]] = parentNode.appendChild(x.firstChild);
			
			if (renderedRows - rowsBefore > MIN_BUFFER)
				avgRowRenderTime = (new Date() - _start) / (renderedRows - rowsBefore);
		}	
		
		function startPostProcessing() {
			if (!options.enableAsyncPostRender) return;
			clearTimeout(h_postrender);
			h_postrender = setTimeout(asyncPostProcessRows, POSTPROCESSING_DELAY);
		}
		
		function invalidatePostProcessingResults(row) {
			delete postProcessedRows[row];
			postProcessFromRow = Math.min(postProcessFromRow,row);
			postProcessToRow = Math.max(postProcessToRow);
			startPostProcessing();
		}
		
		function render() {
			var vp = getViewport();
			var from = Math.max(0, vp.top - (scrollDir >= 0 ? MIN_BUFFER : BUFFER));
			var to = Math.min(options.enableAddRow ? data.length : data.length - 1, vp.bottom + (scrollDir > 0 ? BUFFER : MIN_BUFFER));
			
			if (renderedRows > 10 && Math.abs(lastRenderedScrollTop - currentScrollTop) > options.rowHeight*CAPACITY)
				removeAllRows();
			else
				cleanupRows(from,to);
	
			renderRows(from,to);	
					
			postProcessFromRow = Math.max(0,vp.top-MIN_BUFFER);
			postProcessToRow = Math.min(options.enableAddRow ? data.length : data.length - 1, vp.bottom+MIN_BUFFER);
			startPostProcessing();
			
			lastRenderedScrollTop = currentScrollTop;
			h_render = null;
		}
	
		function handleScroll() {
			currentScrollTop = $divMainScroller[0].scrollTop;
			var scrollDistance = Math.abs(lastRenderedScrollTop - currentScrollTop);
			var scrollLeft = $divMainScroller[0].scrollLeft;
			
			if (scrollLeft != currentScrollLeft)
				$divHeadersScroller[0].scrollLeft = currentScrollLeft = scrollLeft;
			
			// min scroll distance = 25% of the viewport or MIN_BUFFER rows (whichever is smaller)
			if (scrollDistance < Math.min(viewportH/4, MIN_BUFFER*options.rowHeight)) return;
			
			if (lastRenderedScrollTop == currentScrollTop)
				scrollDir = 0;
			else if (lastRenderedScrollTop < currentScrollTop)
				scrollDir = 1;
			else	
				scrollDir = -1;
			
			if (h_render)
				clearTimeout(h_render);
	
			if (scrollDistance < numVisibleRows*options.rowHeight) 
				render();
			else
				h_render = setTimeout(render, 50);
				
			if (self.onViewportChanged)
				self.onViewportChanged();
		}
	
		function asyncPostProcessRows () {
			while (postProcessFromRow <= postProcessToRow) {
				var row = (scrollDir > 0) ? postProcessFromRow++ : postProcessToRow--;
				var rowNode = rowsCache[row];
				if (!rowNode || postProcessedRows[row] || row>=data.length) continue;
				
				var d = data[row], cellNodes = rowNode.childNodes;
				for (var i=0, l=columns.length; i<l; i++) {
					var m = columns[i];
					if (m.asyncPostRender) 
						m.asyncPostRender(cellNodes[i], postProcessFromRow, d, m);
				}
				
				postProcessedRows[row] = true;
				h_postrender = setTimeout(asyncPostProcessRows, POSTPROCESSING_DELAY);
				return;
			}
		}
	
	
		//////////////////////////////////////////////////////////////////////////////////////////////
		// Interactivity
	
		function handleKeyDown(e) {
			// do we have any registered handlers?
			if (self.onKeyDown && data[currentRow]) {
				// grid must not be in edit mode
				if (!currentEditor) {
					// handler will return true if the event was handled
					if (self.onKeyDown(e, currentRow, currentCell)) {
						e.stopPropagation();
						e.preventDefault();
						return false;
					}
				}
			}
	
			switch (e.which) {
				case 27:  // esc
					if (Slick.GlobalEditorLock.isEditing() && Slick.GlobalEditorLock.hasLock(self))
						cancelCurrentEdit(self);
					
					if (currentCellNode)
						currentCellNode.focus();
					
					break;
				
				case 9:  // tab
					gotoDir(0, (e.shiftKey) ? -1 : 1, true);
					break;
					
				case 37:  // left
					gotoDir(0,-1);
					break;
					
				case 39:  // right
					gotoDir(0,1);
					break;
					
				case 38:  // up
					gotoDir(-1,0);
					break;
					
				case 40:  // down
				case 13:  // enter
					gotoDir(1,0);
					break;
									
				default:
					// exit without cancelling the event
					return;
			}
			
			e.stopPropagation();
			e.preventDefault();
			return false;		
		}	
		
		function handleClick(e)	{
			var $cell = $(e.target).closest(".slick-cell"); 
			if ($cell.length == 0) return;
			
			// are we editing this cell?
			if (currentCellNode == $cell[0] && currentEditor != null) return;
			
			var row = parseInt($cell.parent().attr("row"));
			var cell = parseInt($cell.attr("cell"));		
			var validated = null;
		
			// do we have any registered handlers?
			if (data[row] && self.onClick) {
				// grid must not be in edit mode
				if (!currentEditor || (validated = commitCurrentEdit())) {
					// handler will return true if the event was handled
					if (self.onClick(e, row, cell)) {
						e.stopPropagation();
						e.preventDefault();
						return false;
					}
				}
			}
	
			if (options.enableCellNavigation && !columns[cell].unselectable) {
				// commit current edit before proceeding
				if (validated == true || (validated == null && commitCurrentEdit())) 
					setSelectedCellAndRow($cell[0],!options.editOnDoubleClick);
			}
		}
		
		function handleContextMenu(e) {
			var $cell = $(e.target).closest(".slick-cell");
			if ($cell.length == 0) return;
			
			// are we editing this cell?
			if (currentCellNode == $cell[0] && currentEditor != null) return;
			
			var row = parseInt($cell.parent().attr("row"));
			var cell = parseInt($cell.attr("cell"));		
			var validated = null;
		
			// do we have any registered handlers?
			if (data[row] && self.onContextMenu) {
				// grid must not be in edit mode
				if (!currentEditor || (validated = commitCurrentEdit())) {
					// handler will return true if the event was handled
					if (self.onContextMenu(e, row, cell)) {
						e.stopPropagation();
						e.preventDefault();
						return false;
					}
				}
			}
		}
		
		function handleDblClick(e) {
			var $cell = $(e.target).closest(".slick-cell");
			if ($cell.length == 0) return;
			
			// are we editing this cell?
			if (currentCellNode == $cell[0] && currentEditor != null) return;
					
			var row = parseInt($cell.parent().attr("row"));
			var cell = parseInt($cell.attr("cell"));		
			var validated = null;
		
			// do we have any registered handlers?
			if (data[row] && self.onDblClick) {
				// grid must not be in edit mode
				if (!currentEditor || (validated = commitCurrentEdit())) {
					// handler will return true if the event was handled
					if (self.onDblClick(e, row, cell)) {
						e.stopPropagation();
						e.preventDefault();
						return false;
					}
				}
			}
					
			if (options.editOnDoubleClick)
				makeSelectedCellEditable();
		}
		
		function handleHeaderContextMenu(e) {
			if (self.onHeaderContextMenu && (!currentEditor || (validated = commitCurrentEdit()))) {
				e.preventDefault();
				// TODO:  figure out which column was acted on and pass it as a param to the handler
				self.onHeaderContextMenu(e);
			}
		}
	
		function getCellFromPoint(x,y) {
			var row = Math.floor(y/options.rowHeight);
			var cell = 0;
			
			var w = 0;		
			for (var i=0; i<columns.length && w<y; i++) {
				w += columns[i].width;
				cell++;
			}
			
			return {row:row,cell:cell-1};
		}
	
	
		//////////////////////////////////////////////////////////////////////////////////////////////
		// Cell switching
		
		function setSelectedCell(newCell,editMode) {
			if (currentCellNode != null) {
				makeSelectedCellNormal();			
				$(currentCellNode).removeClass("selected");
			}
			
			currentCellNode = newCell;
			
			if (currentCellNode != null) {
				currentRow = parseInt($(currentCellNode).parent().attr("row"));
				currentCell = parseInt($(currentCellNode).attr("cell"));
				
				$(currentCellNode).addClass("selected");
				
				scrollSelectedCellIntoView();
				
				if (options.editable && editMode && isCellPotentiallyEditable(currentRow,currentCell)) {
					clearTimeout(h_editorLoader);
					
					if (options.asyncEditorLoading) 
						h_editorLoader = setTimeout(makeSelectedCellEditable, EDITOR_LOAD_DELAY);
					else 
						makeSelectedCellEditable();
				}
				else
					currentCellNode.focus();
			}
			else {
				currentRow = null;
				currentCell = null;	
			}
		}
		
		function setSelectedCellAndRow(newCell,editMode) {
			setSelectedCell(newCell,editMode);
			
			if (newCell) 
				setSelectedRows([currentRow]);
			else
				setSelectedRows([]);
				
			if (self.onSelectedRowsChanged)
				self.onSelectedRowsChanged();			
		}
		
		function clearTextSelection() {
			if (document.selection && document.selection.empty) 
				document.selection.empty();
			else if (window.getSelection) {
				var sel = window.getSelection();
				if (sel && sel.removeAllRanges) 
					sel.removeAllRanges();
			}
		}	
	
		function isCellPotentiallyEditable(row,cell) {
			// is the data for this row loaded?
			if (row < data.length && !data[row])
				return false;
			
			// are we in the Add New row?  can we create new from this cell?
			if (columns[cell].cannotTriggerInsert && row >= data.length)
				return false;
				
			// does this cell have an editor?
			if (!columns[cell].editor)
				return false;
				
			return true;		
		}
	
		function makeSelectedCellNormal() {
			if (!currentEditor) return;
						
			currentEditor.destroy();
			$(currentCellNode).removeClass("editable invalid");
			
			if (data[currentRow]) {
				currentCellNode.innerHTML = columns[currentCell].formatter(currentRow, currentCell, data[currentRow][columns[currentCell].field], columns[currentCell], data[currentRow]);
				invalidatePostProcessingResults(currentRow);
			}
			
			currentEditor = null;
			
			// if there previously was text selected on a page (such as selected text in the edit cell just removed),
			// IE can't set focus to anything else correctly
			if ($.browser.msie) clearTextSelection();
	
			Slick.GlobalEditorLock.leaveEditMode(self);		
		}
	
		function makeSelectedCellEditable() {
			if (!currentCellNode) return;
			if (!options.editable)
				throw "Grid : makeSelectedCellEditable : should never get called when options.editable is false";
			
			// cancel pending async call if there is one
			clearTimeout(h_editorLoader);
			
			if (!isCellPotentiallyEditable(currentRow,currentCell))
				return;
	
			Slick.GlobalEditorLock.enterEditMode(self);
	
			$(currentCellNode).addClass("editable");
			
			var value = null;
		
			// if there is a corresponding row
			if (data[currentRow])
				value = data[currentRow][columns[currentCell].field];
	
			currentCellNode.innerHTML = "";
			
			currentEditor = new columns[currentCell].editor($(currentCellNode), columns[currentCell], value, data[currentRow]);
		}
	
		function scrollSelectedCellIntoView() {
			if (!currentCellNode) return;
			var scrollTop = $divMainScroller[0].scrollTop;
			
			// need to page down?
			if ((currentRow + 2) * options.rowHeight > scrollTop + viewportH) {
				$divMainScroller[0].scrollTop = (currentRow ) * options.rowHeight;
				handleScroll();
			}
			// or page up?
			else if (currentRow * options.rowHeight < scrollTop) {
				$divMainScroller[0].scrollTop = (currentRow + 2) * options.rowHeight - viewportH;
				handleScroll();			
			}	
		}
	
		function gotoDir(dy, dx, rollover) {
			if (!currentCellNode || !options.enableCellNavigation) return;		
			if (!Slick.GlobalEditorLock.commitCurrentEdit()) return;
			
			var nextRow = rowsCache[currentRow + dy];
			var nextCell = nextRow ? $(nextRow).find(".slick-cell[cell=" + (currentCell + dx) + "]") : null;
			if (nextCell && !nextCell.is("[tabIndex=0]:visible"))
				nextCell = (dx>0)?nextCell.nextAll("[tabIndex=0]:visible:first"):nextCell.prevAll("[tabIndex=0]:visible:first");
			
			if (rollover && dy == 0 && !(nextRow && nextCell && nextCell.length)) {
				if (!nextCell || !nextCell.length) {
					if (dx > 0) {
						nextRow = rowsCache[currentRow + dy + 1];
						nextCell = nextRow ? $(nextRow).find(".slick-cell[cell]:first") : null;	
					}
					else {
						nextRow = rowsCache[currentRow + dy - 1];
						nextCell = nextRow ? $(nextRow).find(".slick-cell[cell]:last") : null;		
					}
					if (nextCell && !nextCell.is("[tabIndex=0]:visible"))
						nextCell = (dx>0)?nextCell.nextAll("[tabIndex=0]:visible:first"):nextCell.prevAll("[tabIndex=0]:visible:first");
				}
			}
			
			
			if (nextRow && nextCell && nextCell.length) {
				setSelectedCellAndRow(nextCell[0],true);
				
				// if no editor was created, set the focus back on the cell
				if (!currentEditor) 
					currentCellNode.focus();
			}
			else 
				currentCellNode.focus();
		}
	
		function gotoCell(row,cell) {
			if (row > data.length || row < 0 || cell >= columns.length || cell < 0) return;
			if (!options.enableCellNavigation || columns[cell].unselectable) return;
			
			if (!Slick.GlobalEditorLock.commitCurrentEdit()) return;
			
			if (!rowsCache[row])
				renderRows(row,row);
			
			var cell = $(rowsCache[row]).find(".slick-cell[cell=" + cell + "][tabIndex=0]:visible")[0];
			
			setSelectedCellAndRow(cell,!options.editOnDoubleClick);
			
			// if no editor was created, set the focus back on the cell
			if (!currentEditor) 
				currentCellNode.focus();
		}
	
	
		//////////////////////////////////////////////////////////////////////////////////////////////
		// IEditor implementation for Slick.GlobalEditorLock	
		
		function commitCurrentEdit() {
			if (currentEditor) {
				if (currentEditor.isValueChanged()) {
					var validationResults = currentEditor.validate();
					
					if (validationResults.valid) {
						var value = currentEditor.getValue();
						
						if (currentRow < data.length) {
							if (columns[currentCell].setValueHandler) {
								makeSelectedCellNormal();
								columns[currentCell].setValueHandler(value, columns[currentCell], data[currentRow]);
							}
							else {
								data[currentRow][columns[currentCell].field] = value;
								makeSelectedCellNormal();
							}
						}
						else if (self.onAddNewRow) {
								makeSelectedCellNormal();
								self.onAddNewRow(columns[currentCell], value);
							}
						
						return true;
					}
					else {
						$(currentCellNode).addClass("invalid");
						$(currentCellNode).stop(true,true).effect("highlight", {color:"red"}, 300);
						
						if (self.onValidationError)
							self.onValidationError(currentCellNode, validationResults, currentRow, currentCell, columns[currentCell]);
						
						currentEditor.focus();
						return false;
					}
				}
				
				makeSelectedCellNormal();
			}
			
			
			return true;
		}
		
		function cancelCurrentEdit() {
			makeSelectedCellNormal();
		}
		
		
		
		//////////////////////////////////////////////////////////////////////////////////////////////
		// Debug
		
		this.debug = function() {
			var s = "";
			
			s += ("\n" + "counter_rows_rendered:  " + counter_rows_rendered);	
			s += ("\n" + "counter_rows_removed:  " + counter_rows_removed);	
			s += ("\n" + "renderedRows:  " + renderedRows);	
			s += ("\n" + "numVisibleRows:  " + numVisibleRows);			
			s += ("\n" + "CAPACITY:  " + CAPACITY);			
			s += ("\n" + "BUFFER:  " + BUFFER);		
			s += ("\n" + "avgRowRenderTime:  " + avgRowRenderTime);
			
			alert(s);
		};
		
		this.benchmark_render_200 = function() {
			removeAllRows();
			
			// render 200 rows in the viewport
			renderRows(0, 200);
			
			cleanupRows();
		};
		
		this.stressTest = function() {
			console.time("benchmark-stress");
	
			renderRows(0,500);
			
			cleanupRows();
			
			console.timeEnd("benchmark-stress");
			
			setTimeout(self.stressTest, 50);
		};
		
		this.benchmarkFn = function(fn) {
			var s = new Date();
			
			var args = new Array(arguments);
			args.splice(0,1);
			
			self[fn].call(this,args);
			
			alert("Grid : benchmarkFn : " + fn + " : " + (new Date() - s) + "ms");		
		};	
		
	
	
	
		init();	
		
		
		//////////////////////////////////////////////////////////////////////////////////////////////
		// Public API
		
		$.extend(this, {
			// Events
			"onSort":			null,
			"onHeaderContextMenu":	null,
			"onClick":			null,
			"onContextMenu":	null,
			"onKeyDown":		null,
			"onAddNewRow":		null,
			"onValidationError":	null,
			"onViewportChanged":	null,
			"onSelectedRowsChanged":	null,
			"onColumnsReordered":	null,
			"onBeforeMoveRows"	:	null,
			"onMoveRows":		null,
			
			// Methods
			"setOptions":		setOptions,
			"setData":			setData,
			"destroy":			destroy,
			"getColumnIndex":	getColumnIndex,
			"setColumnVisibility":	setColumnVisibility,
			"autosizeColumns":	autosizeColumns,
			"updateCell":		updateCell,
			"updateRow":		updateRow,
			"removeRow":		removeRow,
			"removeRows":		removeRows,
			"removeAllRows":	removeAllRows,
			"render":			render,
			"getViewport":		getViewport,
			"resizeCanvas":		resizeCanvas,
			"updateRowCount": 	updateRowCount,
			"scroll":			scroll,  // TODO
			"getCellFromPoint":	getCellFromPoint,
			"gotoCell":			gotoCell,
			"editCurrentCell":	makeSelectedCellEditable,
			"getSelectedRows":	getSelectedRows,
			"setSelectedRows":	setSelectedRows,
			
			// IEditor implementation
			"commitCurrentEdit":	commitCurrentEdit,
			"cancelCurrentEdit":	cancelCurrentEdit
		});	
	}
	
	// Slick.Grid
	$.extend(true, window, { Slick: { Grid: SlickGrid }});
})();