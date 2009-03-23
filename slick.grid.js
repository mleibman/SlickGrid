/***
 * 
 * (c) 2009 Michael Leibman (michael.leibman@gmail.com)
 * All rights reserved.
 * 
 * 
 * TODO:
 * 	- frozen columns
 * 	- built-in row reorder
 * 	- add custom editor options
 * 	- consistent events (EventHelper?  jQuery events?)
 * 	- break resizeCanvas() into two functions to handle container resize and data size changes
 * 	- improve rendering speed by merging column extra cssClass into dynamically-generated .c{x} rules
 * 	- expose row height in the API
 * 
 * KNOWN ISSUES:
 * 	- keyboard navigation doesn't "jump" over unselectable cells for now
 *  - main page must have at least one STYLE element for jQuery Rule to work
 * 
 * 
 * OPTIONS:
 * 	enableAddRow			-	If true, a blank row will be displayed at the bottom - typing values in that row will add a new one.
 * 	manualScrolling			-	Disable automatic rerender on scroll.  Client will take care of calling Grid.onScroll().
 * 	editable				-	If false, no cells will be switched into edit mode.
 * 	editOnDoubleClick		-	Cell will not automatically go into edit mode without being double-clicked.
 * 	enableCellNavigation	-	If false, no cells will be selectable.
 * 	defaultColumnWidth		-	Default column width in pixels (if columns[cell].width is not specified).
 * 	enableColumnReorder		-	Allows the user to reorder columns.
 * 	asyncEditorLoading		-	Makes cell editors load asynchronously after a small delay.
 * 								This greatly increases keyboard navigation speed.
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
 * 	minWidth				-	Minimum allowed column width for resizing.
 * 	maxWidth				-	Maximum allowed column width for resizing.
 * 	cssClass				-	A CSS class to add to the cell.
 * 	rerenderOnResize		-	Rerender the column when it is resized (useful for columns relying on cell width or adaptive formatters).
 * 	
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
function SlickGrid($container,data,columns,options)
{
	// settings
	var defaults = {
		enableAddRow: true,
		manualScrolling: false,
		editable: true,
		editOnDoubleClick: false,
		enableCellNavigation: true,
		defaultColumnWidth: 80,
		enableColumnReorder: true,
		asyncEditorLoading: true
	};
	
	// consts
	var ROW_HEIGHT = 24;
	var CAPACITY = 50;
	var BUFFER = 5;  // will be set to equal one page
	
	// private
	var uid = "slickgrid_" + Math.round(1000000 * Math.random());
	var self = this;
	var $divHeadersScroller;
	var $divHeaders;
	var $divMainScroller;
	var $divMain;
	var viewportH, viewportW;
		
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
	
	var selectedRows = [];
	var selectedRowsLookup = {};
	var columnsById = {};
	
	// async call handles
	var h_editorLoader = null;
	var h_render = null;	
	
	// perf counters
	var counter_rows_rendered = 0;
	var counter_rows_removed = 0;
	
	var fragment = document.createDocumentFragment();
	
	
	function init() {
		options = $.extend({},defaults,options);
		
		$container
			.empty()
			.attr("tabIndex",0)
			.attr("hideFocus",true)
			.css("overflow","hidden")
			.css("outline",0)
			.addClass(uid);
		
		$divHeadersScroller = $("<div class='grid-header' style='overflow:hidden;position:relative;' />").appendTo($container);
		$divHeaders = $("<div style='width:10000px' />").appendTo($divHeadersScroller);
		$divMainScroller = $("<div tabIndex='0' hideFocus style='width:100%;overflow:scroll;outline:0;position:relative;outline:0px;'>").appendTo($container);
		$divMain = $("<div class='grid-canvas' tabIndex='0' hideFocus />").appendTo($divMainScroller);
		
		$divMainScroller.height( $container.innerHeight() - $divHeadersScroller.outerHeight() );
		
		for (var i = 0; i < columns.length; i++) 
		{
			var m = columns[i];
			
			columnsById[m.id] = i;
			
			if (!m.width)
				m.width = options.defaultColumnWidth;
				
			if (!m.formatter)
				m.formatter = defaultFormatter;
			
			var header = $("<div class='h c" + i + "' cell=" + i + " id='" + m.id + "' />")
				.html(m.name)
				.width(m.width)
				.appendTo($divHeaders);
				
			// todo:  this is for demo purposes only
			if (m.rerenderOnResize)
				header.append(" <img src='images/help.png' align='absmiddle' title='This column has an adaptive formatter.  Resize to a smaller size to see alternative data representation.'>");
		}
		
		$divHeaders.find(".h").each(function() {
			var cell = parseInt($(this).attr("cell"));
			var m = columns[cell];
			
			if (m.resizable === false) return;
			
			$(this).resizable({
				handles: "e",
				minWidth: (m.minWidth) ? m.minWidth : null,
				maxWidth: (m.maxWidth) ? m.maxWidth : null,
				stop: function(e, ui) {
					var cellId = $(this).attr("id");
					var cell = columnsById[cellId];
					columns[cell].width = $(this).width();
					$.rule("." + uid + " .grid-canvas .c" + cell, "style").css("width", columns[cell].width + "px");
					resizeCanvas();
					
					// todo:  rerender single column instead of everything
					if (columns[cell].rerenderOnResize) {
						removeAllRows();
						renderViewport();
					}
				}
			});
		});
		
		
		// ignore .ui-resizable-handle to prevent sortable interfering with resizable
		if (options.enableColumnReorder)
			$divHeaders.sortable({
				axis:"x", 
				cancel:".ui-resizable-handle",
				update: function(e,ui) {
					console.time("column reorder");
					
					var newOrder = $divHeaders.sortable("toArray");
					
					var lookup = {};
					for (var i=0; i<columns.length; i++)
					{
						lookup[columns[i].id] = columns[i];
					}
					
					for (var i=0; i<newOrder.length; i++)
					{
						columnsById[newOrder[i]] = i;
						columns[i] = lookup[newOrder[i]];
					}
					
					removeAllRows();
					removeCssRules();
					createCssRules();
					renderViewport();
					
					if (self.onColumnsReordered)
						self.onColumnsReordered();
						
					e.stopPropagation();
						
					console.timeEnd("column reorder");				
				}
				});
			
	
		$divHeaders.bind("click", function(e) {
			if (!$(e.target).hasClass(".h")) return;
			
			var id = $(e.target).attr("id");
			
			if (self.onColumnHeaderClick)
				self.onColumnHeaderClick(columns[columnsById[id]]);
		});	
		
		
		createCssRules();
		resizeCanvas();
		render();
		
		

		if (!options.manualScrolling)
			$divMainScroller.bind("scroll", handleScroll);
		
		$divMain.bind("keydown", handleKeyDown);
		$divMain.bind("click", handleClick);
		$divMain.bind("dblclick", handleDblClick);

		if ($.browser.msie) 
			$divMainScroller[0].onselectstart = function() {
				if (event.srcElement.tagName != "INPUT" && event.srcElement.tagName != "TEXTAREA") 
					return false; 
				};
	}
	
	function createCssRules() {
		for (var i = 0; i < columns.length; i++) {
			$.rule("." + uid + " .grid-canvas .c" + i + " { width:" + columns[i].width + "px }").appendTo("style");
		}
	}
	
	function removeCssRules() {
		for (var i = 0; i < columns.length; i++) {
			$.rule("." + uid + " .grid-canvas .c" + i, "style").remove();
		}
	}
		
	function destroy() {
		if (currentEditor)
			cancelCurrentEdit();
		
		$divHeaders.sortable("destroy");
		$divHeaders.find(".h").resizable("destroy");
		
		removeCssRules();
		
		$container.empty().removeClass(uid);
	}
	
	//////////////////////////////////////////////////////////////////////////////////////////////
	// General
	
	function setColumnHeaderCssClass(id,classesToAdd,classesToRemove) {
		$divHeaders.find(".h[id=" + id + "]").removeClass(classesToRemove).addClass(classesToAdd);
	}
	
	function getColumnIndex(id) {
		return columnsById[id];	
	}

	function getSelectedRows() {
		return selectedRows.concat();
	}	

	function setSelectedRows(rows) {
		if (GlobalEditorLock.isEditing() && !GlobalEditorLock.hasLock(self))
			throw "Grid : setSelectedRows : cannot set selected rows when somebody else has an edit lock";
		
		var lookup = {};
		for (var i=0; i<rows.length; i++)
			lookup[rows[i]] = true;
		
		// unselect old rows
		for (var i=0; i<selectedRows.length; i++)
		{
			var row = selectedRows[i];
			if (rowsCache[row] && !lookup[row])
				$(rowsCache[row]).removeClass("selected");
		}

		// select new ones
		for (var i=0; i<rows.length; i++)
		{
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
		
		setSelectedCell(null);
		
		if (options.enableAddRow != args.enableAddRow)
			removeRow(data.length);
			
		options = $.extend(options,args);		
		
		renderViewport();
	}
	
	
	//////////////////////////////////////////////////////////////////////////////////////////////
	// Rendering / Scrolling

	function defaultFormatter(row, cell, value, columnDef, dataContext) { 
		return (value == null || value == undefined) ? "" : value;
	}

	function appendRowHtml(stringArray,row) {
		var d = data[row];
		var dataLoading = row < data.length && !d;
		var css = "r" + (dataLoading ? " loading" : "") + (selectedRowsLookup[row] ? " selected" : "");
		
		stringArray.push("<div class='" + css + "' row='" + row + "' style='top:" + (ROW_HEIGHT*row) + "px'>");
		
		for (var j=0; j<columns.length; j++) 
		{
			var m = columns[j];

			stringArray.push("<div " + (m.unselectable ? "" : "hideFocus tabIndex=0 ") + "class='c c" + j + (m.cssClass ? " " + m.cssClass : "") + "' cell=" + j + ">");

			// if there is a corresponding row (if not, this is the Add New row or this data hasn't been loaded yet)				
			if (row < data.length && d)
				stringArray.push(m.formatter(row, j, d[m.field], m, d));
			
			stringArray.push("</div>");
		}
		
		stringArray.push("</div>");			
	}
	
	function getRowHtml(row) {
		var html = [];
		
		appendRowHtml(html,row);
		
		return html.join("");
	}

	function removeRow(row) {
		var node = rowsCache[row];
		if (!node) return;
		
		if (currentEditor && currentRow == row)
			throw "Grid : removeRow : Cannot remove a row that is currently in edit mode";	
		
		// if we're removing rows, we're probably not scrolling
		scrollDir = 0;
		
		node.parentNode.removeChild(node);
		node = null;
				
		delete rowsCache[row];	
		renderedRows--;
		
		counter_rows_removed++;
	}
	
	function updateCell(row,cell) {
		if (!rowsCache[row]) return;
		var $cell = $(rowsCache[row]).find(".c[cell=" + cell + "]");
		if ($cell.length == 0) return;
		
		var m = columns[cell];	
		var d = data[row];	
		
		if (currentEditor && currentRow == row && currentCell == cell)
			currentEditor.setValue(d[m.field]);
		else 
			$cell[0].innerHTML = d ? m.formatter(row, cell, d[m.field], m, d) : ""
	}

	function updateRow(row) {
		if (!rowsCache[row]) return;
		
		// todo:  perf:  iterate over direct children?
		$(rowsCache[row]).find(".c").each(function(i) {
			var m = columns[i];
			
			if (row == currentRow && i == currentCell && currentEditor)
				currentEditor.setValue(data[currentRow][m.field]);
			else if (data[row])
				this.innerHTML = m.formatter(row, i, data[row][m.field], m, data[row]);
			else
				this.innerHTML = "";
		});
	}

	function resizeCanvas() {
		viewportW = $divMainScroller.innerWidth();
		viewportH = $divMainScroller.innerHeight();

	    BUFFER = numVisibleRows = Math.ceil(viewportH / ROW_HEIGHT);
		CAPACITY = Math.max(CAPACITY, numVisibleRows + 2*BUFFER > CAPACITY);

		$divMain.height(Math.max(ROW_HEIGHT * (data.length + numVisibleRows - 2), viewportH - $.getScrollbarWidth()));
		
				
		var totalWidth = 0;
		for (var i=0; i<columns.length; i++)
		{
			totalWidth += (columns[i].width + 5);
		}
		$divMain.width(totalWidth);
	  
	  	// remove the rows that are now outside of the data range
		// this helps avoid redundant calls to .removeRow() when the size of the data decreased by thousands of rows
		var parentNode = $divMain[0];
		var l = options.enableAddRow ? data.length : data.length - 1;
		for (var i in rowsCache)
		{
			if (i >= l)
			{
				parentNode.removeChild(rowsCache[i]);
				delete rowsCache[i];
				renderedRows--;
				
				counter_rows_removed++;
			}
		}
		
	  
        // browsers sometimes do not adjust scrollTop/scrollHeight when the height of contained objects changes
	    if ($divMainScroller.scrollTop() > $divMain.height() - $divMainScroller.height())
	        $divMainScroller.scrollTop($divMain.height() - $divMainScroller.height());
	}
	
	function getViewport()
	{
		return {
			top:	Math.floor(currentScrollTop / ROW_HEIGHT),
			bottom:	Math.floor((currentScrollTop + viewportH) / ROW_HEIGHT)
		};	
	}
	
	function renderRows(from,to) {
		console.time("renderRows");
		
		var rowsBefore = renderedRows;
		
		var stringArray = [];
		
		for (var i = from; i <= to; i++) {
			if (rowsCache[i]) continue;
			renderedRows++;
			
			counter_rows_rendered++;
			
			var x = document.createElement("div");
			x.innerHTML = getRowHtml(i);
			x = x.firstChild;
			//rowsCache[i] = $divMain[0].appendChild(x);
			rowsCache[i] = fragment.appendChild(x);
		}
		
		$divMain[0].appendChild(fragment);
		
		console.log("rendered " + (renderedRows - rowsBefore) + " rows");
		console.timeEnd("renderRows");		
	}
	
	function renderViewport() {
		var vp = getViewport();
		var from = Math.max(0, vp.top - (scrollDir >= 0 ? 5 : BUFFER));
		var to = Math.min(options.enableAddRow ? data.length : data.length - 1, vp.bottom + (scrollDir > 0 ? BUFFER : 5));

		renderRows(from,to);
	}	
	
	function removeAllRows() {
		console.time("removeAllRows");
		
		$divMain[0].innerHTML = "";
		rowsCache= {};
		renderedRows = 0;
		
		console.timeEnd("removeAllRows");
	}	
	
	function cleanupRows() {
		console.time("cleanupRows");

		var rowsBefore = renderedRows;
		var vp = getViewport();
		var from = vp.top - BUFFER, to = vp.bottom + BUFFER;
		
		// todo:  bias based on the direction of scroll
		// todo:  remove rows in correct order (farthest first)
		
		var parentNode = $divMain[0];
		
		for (var i in rowsCache)
		{
			if (renderedRows <= CAPACITY) break;
			
			if (i != currentRow &&  (i < from || i > to))
			{
				parentNode.removeChild(rowsCache[i]);
				
				delete rowsCache[i];
				renderedRows--;		
				
				counter_rows_removed++;	
			}
		}
		
		console.log("removed " + (rowsBefore - renderedRows) + " rows");
		console.timeEnd("cleanupRows");
	}
	
	function render() {
		if (renderedRows >= CAPACITY)
			cleanupRows();
	
		renderViewport();
		
		if (renderedRows >= CAPACITY)
			cleanupRows();
					
		lastRenderedScrollTop = parseInt(currentScrollTop);
		h_render = null;
	}

	function handleScroll() {
		var scrollLeft = parseInt($divMainScroller[0].scrollLeft);
		
		if (scrollLeft != currentScrollLeft)
			$divMainScroller[0].scrollLeft = currentScrollLeft = scrollLeft;
		
		currentScrollTop = parseInt($divMainScroller[0].scrollTop);
		var scrollDistance = Math.abs(lastRenderedScrollTop - currentScrollTop);

		if (scrollDistance < 5*ROW_HEIGHT) return;
		
		if (lastRenderedScrollTop == currentScrollTop)
			scrollDir = 0;
		else if (lastRenderedScrollTop < currentScrollTop)
			scrollDir = 1;
		else	
			scrollDir = -1;
		

		window.clearTimeout(h_render);
		
		window.status = "async scroll = " + (scrollDistance > 2*numVisibleRows*ROW_HEIGHT);
		
		if (scrollDistance > 2*numVisibleRows*ROW_HEIGHT) 
			h_render = window.setTimeout(render, 50);
		else
			render();
			
		if (self.onViewportChanged)
			self.onViewportChanged();
	}


	//////////////////////////////////////////////////////////////////////////////////////////////
	// Interactivity

	function handleKeyDown(e) {
		switch (e.which) {
			case 27:  // esc
				if (GlobalEditorLock.isEditing() && GlobalEditorLock.hasLock(self))
					cancelCurrentEdit(self);
				
				if (currentCellNode)
					currentCellNode.focus();
				
				break;
			
			case 9:  // tab
				if (e.shiftKey)
					gotoDir(0,-1,true);	//gotoPrev();
				else
					gotoDir(0,1,true);	//gotoNext();
					
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

				// do we have any registered handlers?
				if (self.onKeyDown && data[currentRow])
				{
					// grid must not be in edit mode
					if (!currentEditor) 
					{
						// handler will return true if the event was handled
						if (self.onKeyDown(e, currentRow, currentCell)) 
						{
							e.stopPropagation();
							e.preventDefault();
							return false;
						}
					}
				}			
			
				// exit without cancelling the event
				return;
		}
		
		e.stopPropagation();
		e.preventDefault();
		return false;		
	}	
	
	function handleClick(e)
	{
		var $cell = $(e.target).closest(".c");
		
		if ($cell.length == 0) return;
		
		// are we editing this cell?
		if (currentCellNode == $cell[0] && currentEditor != null) return;
		
		var row = parseInt($cell.parent().attr("row"));
		var cell = parseInt($cell.attr("cell"));		
	
		var validated = null;
	
		// do we have any registered handlers?
		if (data[row] && self.onClick)
		{
			// grid must not be in edit mode
			if (!currentEditor || (validated = commitCurrentEdit())) 
			{
				// handler will return true if the event was handled
				if (self.onClick(e, row, cell)) 
				{
					e.stopPropagation();
					e.preventDefault();
					return false;
				}
			}
		}


		if (options.enableCellNavigation && !columns[cell].unselectable) 
		{
			// commit current edit before proceeding
			if (validated == true || (validated == null && commitCurrentEdit())) 
				setSelectedCellAndRow($cell[0]);
		}
	}
	
	function handleDblClick(e)
	{
		var $cell = $(e.target).closest(".c");
		
		if ($cell.length == 0) return;
		
		// are we editing this cell?
		if (currentCellNode == $cell[0] && currentEditor != null) return;
				
		if (options.editOnDoubleClick)
			makeSelectedCellEditable();
	}

	function getCellFromPoint(x,y) {
		var row = Math.floor(y/ROW_HEIGHT);
		var cell = 0;
		
		var w = 0;		
		for (var i=0; i<columns.length && w<y; i++)
		{
			w += columns[i].width;
			cell++;
		}
		
		return {row:row,cell:cell-1};
	}


	//////////////////////////////////////////////////////////////////////////////////////////////
	// Cell switching
	
	function setSelectedCell(newCell,async)
	{
		
		if (currentCellNode != null) 
		{
			makeSelectedCellNormal();			
			
			$(currentCellNode).removeClass("selected");
		}
		
		currentCellNode = newCell;
		
		if (currentCellNode != null) 
		{
			currentRow = parseInt($(currentCellNode).parent().attr("row"));
			currentCell = parseInt($(currentCellNode).attr("cell"));
			
			$(currentCellNode).addClass("selected");
			
			scrollSelectedCellIntoView();
			
			if (options.editable && !options.editOnDoubleClick && (data[currentRow] || currentRow == data.length)) 
			{
				window.clearTimeout(h_editorLoader);
				
				if (async) 
					h_editorLoader = window.setTimeout(makeSelectedCellEditable, 100);
				else 
					makeSelectedCellEditable();
			}
		}
		else
		{
			currentRow = null;
			currentCell = null;	
		}
	}
	
	function setSelectedCellAndRow(newCell,async) {
		setSelectedCell(newCell,async);
		
		if (newCell) 
			setSelectedRows([currentRow]);
		else
			setSelectedRows([]);
			
		if (self.onSelectedRowsChanged)
			self.onSelectedRowsChanged();			
	}
	
	function clearTextSelection()
	{
		if (document.selection && document.selection.empty) 
			document.selection.empty();
		else if (window.getSelection) 
		{
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
		
		
		if (data[currentRow]) 
			currentCellNode.innerHTML = columns[currentCell].formatter(currentRow, currentCell, data[currentRow][columns[currentCell].field], columns[currentCell], data[currentRow]);
		
		currentEditor = null;
		
		// if there previously was text selected on a page (such as selected text in the edit cell just removed),
		// IE can't set focus to anything else correctly
		if ($.browser.msie) clearTextSelection();

		GlobalEditorLock.leaveEditMode(self);		
	}

	function makeSelectedCellEditable()
	{
		if (!currentCellNode) return;
		
		if (!options.editable)
			throw "Grid : makeSelectedCellEditable : should never get called when options.editable is false";
		
		// cancel pending async call if there is one
		window.clearTimeout(h_editorLoader);
		
		if (!isCellPotentiallyEditable(currentRow,currentCell))
			return;

		GlobalEditorLock.enterEditMode(self);

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
		if ((currentRow + 2) * ROW_HEIGHT > scrollTop + viewportH) 
		{
			$divMainScroller[0].scrollTop = (currentRow ) * ROW_HEIGHT;
			
			handleScroll();
		}
		// or page up?
		else if (currentRow * ROW_HEIGHT < scrollTop)
		{
			$divMainScroller[0].scrollTop = (currentRow + 2) * ROW_HEIGHT - viewportH;
			
			handleScroll();			
		}	
	}

	function gotoDir(dy, dx, rollover)
	{
		if (!currentCellNode) return;
		if (!options.enableCellNavigation) return;		
		if (!GlobalEditorLock.commitCurrentEdit()) return;
		
		var nextRow = rowsCache[currentRow + dy];
		var nextCell = nextRow ? $(nextRow).find(".c[cell=" + (currentCell + dx) + "][tabIndex=0]") : null;
		
		if (rollover && dy == 0 && !(nextRow && nextCell && nextCell.length))
		{
			if (!nextCell || !nextCell.length)
			{
				if (dx > 0) 
				{
					nextRow = rowsCache[currentRow + dy + 1];
					nextCell = nextRow ? $(nextRow).find(".c[cell][tabIndex=0]:first") : null;						
				}
				else
				{
					nextRow = rowsCache[currentRow + dy - 1];
					nextCell = nextRow ? $(nextRow).find(".c[cell][tabIndex=0]:last") : null;		
				}
			}
		}
		
		
		if (nextRow && nextCell && nextCell.length) 
		{
			setSelectedCellAndRow(nextCell[0],options.asyncEditorLoading);
			
			// if no editor was created, set the focus back on the cell
			if (!currentEditor) 
				currentCellNode.focus();
				
		}
		else 
			currentCellNode.focus();
	}

	function gotoCell(row,cell)
	{
		if (row > data.length || row < 0 || cell >= columns.length || cell < 0) return;
		if (!options.enableCellNavigation || columns[cell].unselectable) return;
		
		if (!GlobalEditorLock.commitCurrentEdit()) return;
		
		if (!rowsCache[row])
			renderRows(row,row);
		
		var cell = $(rowsCache[row]).find(".c[cell=" + cell + "][tabIndex=0]")[0];
		
		setSelectedCellAndRow(cell);
		
		// if no editor was created, set the focus back on the cell
		if (!currentEditor) 
			currentCellNode.focus();
	}


	//////////////////////////////////////////////////////////////////////////////////////////////
	// IEditor implementation for GlobalEditorLock	
	
	function commitCurrentEdit() {
		if (currentEditor)
		{
			if (currentEditor.isValueChanged())
			{
				var validationResults = currentEditor.validate();
				
				if (validationResults.valid) 
				{
					var value = currentEditor.getValue();
					
					makeSelectedCellNormal();
					
					if (currentRow < data.length) 
					{
						if (columns[currentCell].setValueHandler)
							columns[currentCell].setValueHandler(value, columns[currentCell], data[currentRow]);
						else
							data[currentRow][columns[currentCell].field] = value;
					}
					else if (self.onAddNewRow)
						self.onAddNewRow(columns[currentCell], value);
					
					return true;
				}
				else 
				{
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
	};
	
	function cancelCurrentEdit() {
		makeSelectedCellNormal();
	};
	
	
	
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
		
		window.setTimeout(self.stressTest, 50);
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
		"onColumnHeaderClick":	null,
		"onClick":			null,
		"onKeyDown":		null,
		"onAddNewRow":		null,
		"onValidationError":	null,
		"onViewportChanged":	null,
		"onSelectedRowsChanged":	null,
		"onColumnsReordered":	null,
		
		// Methods
		"destroy":			destroy,
		"getColumnIndex":	getColumnIndex,
		"updateCell":		updateCell,
		"updateRow":		updateRow,
		"removeRow":		removeRow,
		"removeAllRows":	removeAllRows,
		"render":			render,
		"getViewport":		getViewport,
		"resizeCanvas":		resizeCanvas,
		"scroll":			scroll,
		"getCellFromPoint":	getCellFromPoint,
		"gotoCell":			gotoCell,
		"editCurrentCell":	makeSelectedCellEditable,
		"getSelectedRows":	getSelectedRows,
		"setSelectedRows":	setSelectedRows,
		"setColumnHeaderCssClass":	setColumnHeaderCssClass,
		
		// IEditor implementation
		"commitCurrentEdit":	commitCurrentEdit,
		"cancelCurrentEdit":	cancelCurrentEdit
	});	
}
