/*jslint white: false, onevar: false, undef: true, nomen: true, eqeqeq: true, plusplus: false, bitwise: true, regexp: true, strict: true, newcap: true, immed: true */// Force JSLinq (http://jslint.com/) "Good Parts" flags - (strict whitespace, one var per function, disallow ++/--)
/*global $: false, jQuery: false, window: false, console: false, document: false, alert: false, setTimeout: false, clearTimeout: false, Slick: false */// Define recognized globals for JSLint
"use strict";


(function() {
	/***
	 * A lock for controlling access to the editing functionality for multiple components capable of editing the same data.
	 */
	function EditorLock()
	{
	    var currentEditor = null;

	    this.isEditing = function() {
            return (currentEditor != null);
        };

	    this.hasLock = function(editor){
            return (currentEditor == editor);
        };

	    this.enterEditMode = function(editor) {
            if (currentEditor != null)
                throw "EditorLock : enterEditMode : currentEditor == null";

            if (!editor.commitCurrentEdit)
                throw "EditorLock : enterEditMode : editor must implement .commitCurrentEdit()";

            if (!editor.cancelCurrentEdit)
                throw "EditorLock : enterEditMode : editor must implement .cancelCurrentEdit()";

            currentEditor = editor;
        };

	    this.leaveEditMode = function(editor) {
            if (currentEditor != editor)
                throw "EditorLock : leaveEditMode() : currentEditor != editor";

            currentEditor = null;
        };

	    this.commitCurrentEdit = function() {
            if (currentEditor)
                return currentEditor.commitCurrentEdit();

            return true;
        };

	    this.cancelCurrentEdit = function() {
	        if (currentEditor)
	            currentEditor.cancelCurrentEdit();
	    }

        return this;
	};

	// Slick.EditorLock, Slick.GlobalEditorLock
	$.extend(true, window, { Slick: { EditorLock: EditorLock, GlobalEditorLock: new EditorLock() }});
})();



/***
 *
 * (c) 2009-2010 Michael Leibman (michael.leibman@gmail.com)
 * All rights reserved.
 *
 *
 * TODO:
 * - frozen columns
 * - consistent events (EventHelper?  jQuery events?)
 *
 *
 * OPTIONS:
 *     rowHeight             - (default 25px) Row height in pixels.
 *     enableAddRow          - (default false) If true, a blank row will be displayed at the bottom - typing values in that row will add a new one.
 *     leaveSpaceForNewRows  - (default false)
 *     editable              - (default false) If false, no cells will be switched into edit mode.
 *     editOnDoubleClick     - (default false) Cell will not automatically go into edit mode without being double-clicked.
 *     enableCellNavigation  - (default true) If false, no cells will be selectable.
 *     defaultColumnWidth    - (default 80px) Default column width in pixels (if columns[cell].width is not specified).
 *     enableColumnReorder   - (default true) Allows the user to reorder columns.
 *     asyncEditorLoading    - (default false) Makes cell editors load asynchronously after a small delay.
 *                             This greatly increases keyboard navigation speed.
 *     asyncEditorLoadDelay  - (default 100msec) Delay after which cell editor is loaded. Ignored unless asyncEditorLoading is true.
 *     forceFitColumns       - (default false) Force column sizes to fit into the viewport (avoid horizontal scrolling).
 *     enableAsyncPostRender - (default false) If true, async post rendering will occur and asyncPostRender delegates on columns will be called.
 *     asyncPostRenderDelay  - (default 60msec) Delay after which async post renderer delegate is called.
 *     autoHeight            - (default false) If true, vertically resizes to fit all rows.
 *     editorLock            - (default Slick.GlobalEditorLock) A Slick.EditorLock instance to use for controlling concurrent data edits.
 *     showSecondaryHeaderRow   - (default false) If true, an extra blank (to be populated externally) row will be displayed just below the header columns.
 *     secondaryHeaderRowHeight - (default 25px) The height of the secondary header row.
 *
 * COLUMN DEFINITION (columns) OPTIONS:
 *     id                  - Column ID.
 *     name                - Column name to put in the header.
 *     field               - Property of the data context to bind to.
 *     formatter           - (default 'return value || ""') Function responsible for rendering the contents of a cell. Signature: function formatter(row, cell, value, columnDef, dataContext) { ... return "..."; }
 *     editor              - An Editor class.
 *     validator           - An extra validation function to be passed to the editor.
 *     unselectable        - If true, the cell cannot be selected (and therefore edited).
 *     cannotTriggerInsert - If true, a new row cannot be created from just the value of this cell.
 *     setValueHandler     - If true, this handler will be called to set field value instead of context[field].
 *     width               - Width of the column in pixels.
 *     resizable           - (default true) If false, the column cannot be resized.
 *     sortable            - (default false) If true, the column can be sorted (onSort will be called).
 *     minWidth            - Minimum allowed column width for resizing.
 *     maxWidth            - Maximum allowed column width for resizing.
 *     cssClass            - A CSS class to add to the cell.
 *     rerenderOnResize    - Rerender the column when it is resized (useful for columns relying on cell width or adaptive formatters).
 *     asyncPostRender     - Function responsible for manipulating the cell DOM node after it has been rendered (called in the background).
 *
 *
 * EVENTS:
 *     onSort                -
 *     onHeaderContextMenu   -
 *     onClick               -
 *     onDblClick            -
 *     onContextMenu         -
 *     onKeyDown             -
 *     onAddNewRow           -
 *     onValidationError     -
 *     onViewportChanged     -
 *     onSelectedRowsChanged -
 *     onColumnsReordered    -
 *     onBeforeMoveRows      -
 *     onMoveRows            -
 *     onCellChange          -  Raised when cell has been edited.   Args: row,cell,dataContext.
 *     onBeforeEditCell      -  Raised before a cell goes into edit mode.  Return false to cancel.  Args: row,cell,dataContext.
 *     onBeforeDestroy       -  Raised just before the grid control is destroyed (part of the destroy() method).
 *
 * NOTES:
 *     Cell/row DOM manipulations are done directly bypassing jQuery's DOM manipulation methods.
 *     This increases the speed dramatically, but can only be done safely because there are no event handlers
 *     or data associated with any cell/row DOM nodes.  Cell editors must make sure they implement .destroy()
 *     and do proper cleanup.
 *
 *
 * @param {jQuery} $container  Container object to create the grid in.
 * @param {Array} data         An array of objects for databinding.
 * @param {Array} columns      An array of column definitions.
 * @param {Object} options     Grid options.
 *
 */

// make sure required JavaScript modules are loaded
if (typeof jQuery === "undefined") {
    throw new Error("SlickGrid requires jquery module to be loaded");
}
if (!jQuery.rule) {
    throw new Error("SlickGrid requires jquery.rule module to be loaded");
}
if (!jQuery.fn.drag) {
    throw new Error("SlickGrid requires jquery.event.drag module to be loaded");
}

(function() {
    var scrollbarDimensions; // shared across all grids on this page

    function SlickGrid($container,data,columns,options) {
        // settings
        var defaults = {
            rowHeight: 25,
            defaultColumnWidth: 80,
            enableAddRow: false,
            leaveSpaceForNewRows: false,
            editable: false,
            editOnDoubleClick: false,
            enableCellNavigation: true,
            enableColumnReorder: true,
            asyncEditorLoading: false,
            asyncEditorLoadDelay: 100,
            forceFitColumns: false,
            enableAsyncPostRender: false,
            asyncPostRenderDelay: 60,
            autoHeight: false,
            editorLock: Slick.GlobalEditorLock,
            showSecondaryHeaderRow: false,
            secondaryHeaderRowHeight: 25
        };

        var columnDefaults = {
            resizable: true,
            sortable: false,
            minWidth: 30,
            formatter: function defaultFormatter(row, cell, value, columnDef, dataContext) {
                return (value === null || value === undefined) ? "" : value;
            }
        };

        // consts
        var CAPACITY = 50;
        var MIN_BUFFER = 5;
        var BUFFER = MIN_BUFFER;  // will be set to equal one page

        // private
        var uid = "slickgrid_" + Math.round(1000000 * Math.random());
        var self = this;
        var $divHeadersScroller;
        var $divHeaders;
        var $divSecondaryHeadersScroller;
        var $divSecondaryHeaders;
        var $divMainScroller;
        var $divMain;
        var viewportH, viewportW;
        var headerColumnWidthDiff, headerColumnHeightDiff, cellWidthDiff, cellHeightDiff;  // padding+border
        var absoluteColumnMinWidth;

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

        // forward declarations (declare names of functions that are called before being defined;
        // this will prevent browser from assuming they are global functions)
        var measureCellPaddingAndBorder, createColumnHeaders, setupRowReordering,
            createCssRules, resizeCanvas, autosizeColumns, render, handleScroll,
            handleKeyDown, handleClick, handleDblClick, handleContextMenu,
            handleHeaderContextMenu, setupColumnSort, setupColumnResize,
            setupColumnReorderEvents, commitCurrentEdit, removeAllRows, removeCssRules,
            updateColumnWidth, setSelectedRows, getSelectedRows, cancelCurrentEdit,
            makeSelectedCellNormal, removeRow, removeRowFromCache, invalidatePostProcessingResults,
            asyncPostProcessRows, gotoDir, setSelectedCellAndRow, makeSelectedCellEditable,
            scrollSelectedCellIntoView, isCellPotentiallyEditable;


        //////////////////////////////////////////////////////////////////////////////////////////////
        // Initialization

        function measureScrollbar() {
            /// <summary>
            /// Measure width of a vertical scrollbar
            /// and height of a horizontal scrollbar.
            /// </summary
            /// <returns>
            /// { width: pixelWidth, height: pixelHeight }
            /// </returns>
            var $c = $("<div style='position:absolute; top:-10000px; left:-10000px; width:100px; height:100px; overflow:scroll;'></div>").appendTo("body");
            var dim = { width: $c.width() - $c[0].clientWidth, height: $c.height() - $c[0].clientHeight };
            $c.remove();
            return dim;
        }

        function disableSelection($target) {
            /// <summary>
            /// Disable text selection (using mouse) in
            /// the specified target.
            /// </summary
            if ($target && $target.jquery) {
                if ($target.disableSelection) { // if jquery:ui.core has been loaded, use it
                    $target.disableSelection();
                }
                else { // otherwise, use "stolen" implementation :)
                    $target.attr('unselectable', 'on').css('MozUserSelect', 'none').bind('selectstart.ui', function() { return false; }); // from jquery:ui.core.js 1.7.2
                }
            }
        }

        function init() {
            /// <summary>
            /// Initialize 'this' (self) instance of a SlickGrid.
            /// This function is called by the constructor.
            /// </summary>
            scrollbarDimensions = scrollbarDimensions || measureScrollbar(); // skip measurement if already have dimensions
            options = $.extend({},defaults,options);
            columnDefaults.width = options.defaultColumnWidth;

            // validate loaded JavaScript modules against requested options
            if (options.enableColumnReorder && !jQuery.fn.sortable) {
                throw new Error("SlickGrid's \"enableColumnReorder = true\" option requires jquery-ui.sortable module to be loaded");
            }

            $container
                .empty()
                .attr("tabIndex",0)
                .attr("hideFocus",true)
                .css("overflow","hidden")
                .css("outline",0)
                .addClass(uid)
                .addClass("ui-widget");

            switch ($container.css("position")) {
            case "absolute": // if the container is already positioning origin, keep it as it is
            case "relative":
            case "fixed":
                break;
            default: // container is not a positioning origin, convert it to one
                $container.css("position","relative");
                break;
            }

            $divHeadersScroller = $("<div class='slick-header ui-state-default' style='overflow:hidden;position:relative;' />").appendTo($container);
            $divHeaders = $("<div class='slick-header-columns' style='width:100000px' />").appendTo($divHeadersScroller);

            $divSecondaryHeadersScroller = $("<div class='slick-header-secondary ui-state-default' style='overflow:hidden;position:relative;' />").appendTo($container);
            $divSecondaryHeaders = $("<div class='slick-header-columns-secondary' style='width:100000px' />").appendTo($divSecondaryHeadersScroller);

            if (!options.showSecondaryHeaderRow) {
                $divSecondaryHeadersScroller.hide();
            }

            // with autoHeight, we can set the mainscroller's y-overflow to auto, since the scroll bar will not appear
            var msStyle = "width:100%;overflow-x:auto;outline:0;position:relative;overflow-y:" + (options.autoHeight ? "auto;" : "scroll;");
            $divMainScroller = $("<div tabIndex='0' hideFocus style='" + msStyle + "'>").appendTo($container);
            $divMain = $("<div class='grid-canvas' tabIndex='0' hideFocus style='overflow:hidden' />").appendTo($divMainScroller);

            // header columns and cells may have different padding/border skewing width calculations (box-sizing, hello?)
            // calculate the diff so we can set consistent sizes
            measureCellPaddingAndBorder();

            $divMainScroller.height(
                    $container.innerHeight() -
                    $divHeadersScroller.outerHeight() -
                    (options.showSecondaryHeaderRow ? $divSecondaryHeadersScroller.outerHeight() : 0));

            // for usability reasons, all text selection in SlickGrid is disabled
            // with the exception of input and textarea elements (selection must
            // be enabled there so that editors work as expected); note that
            // selection in grid cells (grid body) is already unavailable in
            // all browsers except IE
            disableSelection($divHeaders); // disable all text selection in header (including input and textarea)
            $divMainScroller.bind("selectstart.ui", function (event) { return $(event.target).is("input,textarea"); }); // disable text selection in grid cells except in input and textarea elements (this is IE-specific, because selectstart event will only fire in IE)

            createColumnHeaders();
            setupRowReordering();
            createCssRules();
            resizeCanvas();
            if (options.forceFitColumns) {
                autosizeColumns();
            }
            render();

            $divMainScroller.bind("scroll", handleScroll);

            $container.bind("resize", resizeCanvas);

            $divMain.bind("keydown", handleKeyDown);
            $divMain.bind("click", handleClick);
            $divMain.bind("dblclick", handleDblClick);
            $divMain.bind("contextmenu", handleContextMenu);
            $divHeadersScroller.bind("contextmenu", handleHeaderContextMenu);
        }

        function hoverBegin() {
            $(this).addClass('ui-state-hover');
        }

        function hoverEnd() {
            $(this).removeClass('ui-state-hover');
        }

        createColumnHeaders = function createColumnHeadersFn() {
            var i;
            for (i = 0; i < columns.length; i++) {
                var m = columns[i] = $.extend({},columnDefaults,columns[i]);
                columnsById[m.id] = i;

                var header = $("<div class='ui-state-default slick-header-column' cell=" + i + " id='" + m.id + "' />")
                    .html(m.name)
                    .width(m.width - headerColumnWidthDiff)
                    .appendTo($divHeaders);

                if (m.hidden) {
                    header.css("display","none");
                }

                if (options.enableColumnReorder || m.sortable) {
                    header.hover(hoverBegin, hoverEnd);
                }

                if (m.sortable) {
                    header.append("<span class='slick-sort-indicator' />");
                }
            }

            setupColumnSort();
            setupColumnResize();
            if (options.enableColumnReorder) {
                setupColumnReorderEvents();
            }
        };

        setupColumnSort = function setupColumnSortFn() {
            $divHeaders.click(function(e) {
                if ($(e.target).hasClass("slick-resizable-handle")) {
                    return;
                }
                var $col = $(e.target).closest(".slick-header-column");
                if (!$col.length || !columns[columnsById[$col.attr("id")]].sortable) {
                    return;
                }

                if (currentEditor && !commitCurrentEdit()) { return; }

                if ($col.is(".slick-header-column-sorted")) {
                    $col.find(".slick-sort-indicator").toggleClass("slick-sort-indicator-asc").toggleClass("slick-sort-indicator-desc");
                }
                else {
                    $divHeaders.children().removeClass("slick-header-column-sorted");
                    $divHeaders.find(".slick-sort-indicator").removeClass("slick-sort-indicator-asc slick-sort-indicator-desc");
                    $col.addClass("slick-header-column-sorted");
                    $col.find(".slick-sort-indicator").addClass("slick-sort-indicator-asc");
                }

                if (self.onSort) {
                    self.onSort(columns[columnsById[$col.attr("id")]], $col.find(".slick-sort-indicator").hasClass("slick-sort-indicator-asc"));
                }
            });
        };

        setupColumnReorderEvents = function setupColumnReorderEventsFn() {
            $divHeaders.sortable({
                containment: 'parent',
                axis: "x",
                cursor: "default",
                cursorAt: "left",
                tolerance: "intersection",
                helper: "clone",
                placeholder: "slick-sortable-placeholder ui-state-default slick-header-column",
                forcePlaceholderSize: true,
                start: function(e, ui) { $(ui.helper).addClass("slick-header-column-active"); },
                beforeStop: function(e, ui) { $(ui.helper).removeClass("slick-header-column-active"); },
                stop: function(e, ui) {
                    var i;

                    if (currentEditor && !commitCurrentEdit()) {
                        $(this).sortable("cancel");
                        return;
                    }

                    var newOrder = $divHeaders.sortable("toArray"), lookup = {};
                    for (i=0; i<columns.length; i++) {
                        lookup[columns[i].id] = columns[i];
                    }

                    for (i=0; i<newOrder.length; i++) {
                        columnsById[newOrder[i]] = i;
                        columns[i] = lookup[newOrder[i]];
                    }

                    removeAllRows();
                    removeCssRules();
                    createCssRules();
                    render();

                    if (self.onColumnsReordered) {
                        self.onColumnsReordered();
                    }

                    e.stopPropagation();

                    setupColumnResize();
                }
            });
        };

        setupColumnResize = function setupColumnResizeEventsFn() {
            var $col, j, c, width, pageX, columnElements, minPageX, maxPageX, firstResizable, lastResizable;
            columnElements = $divHeaders.find(".slick-header-column:visible");
            columnElements.find('.slick-resizable-handle').remove();
            columnElements.each(function(i,e) {
                c = columns[i];
                if (c.resizable) {
                    if (firstResizable === undefined) { firstResizable = i; }
                    lastResizable = i;
                }
            });
            columnElements.each(function(i,e) {
                if ((firstResizable !== undefined && i < firstResizable) || (options.forceFitColumns && i >= lastResizable)) { return; }
                $col = $(e);
                $("<div class='slick-resizable-handle' />")
                    .appendTo(e)
                    .bind("dragstart", function(e) {
                        if (currentEditor && !commitCurrentEdit()) { return false; }
                        width = $col.width();
                        pageX = e.pageX;
                        $col.addClass("slick-header-column-active");
                        columnElements = $col.parent().find('.slick-header-column').get();
                        var shrinkLeewayOnRight = null, stretchLeewayOnRight = null;
                        if (options.forceFitColumns) {
                            shrinkLeewayOnRight = 0;
                            stretchLeewayOnRight = 0;
                            // colums on right affect maxPageX/minPageX
                            for (j = i + 1; j < columns.length; j++) {
                                c = columns[j];
                                if (c.resizable && !c.hidden) {
                                    if (stretchLeewayOnRight !== null) {
                                        if (c.maxWidth) {
                                            stretchLeewayOnRight += c.maxWidth - c.width;
                                        }
                                        else {
                                            stretchLeewayOnRight = null;
                                        }
                                    }
                                    shrinkLeewayOnRight += c.width - Math.max(c.minWidth || 0, absoluteColumnMinWidth);
                                }
                            }
                        }
                        var shrinkLeewayOnLeft = 0, stretchLeewayOnLeft = 0;
                        for (j = 0; j <= i; j++) {
                            // columns on left only affect minPageX
                            c = columns[j];
                            if (c.resizable && !c.hidden) {
                                if (stretchLeewayOnLeft !== null) {
                                    if (c.maxWidth) {
                                        stretchLeewayOnLeft += c.maxWidth - c.width;
                                    }
                                    else {
                                        stretchLeewayOnLeft = null;
                                    }
                                }
                                shrinkLeewayOnLeft += c.width - Math.max(c.minWidth || 0, absoluteColumnMinWidth);
                            }
                        }
                        if (shrinkLeewayOnRight === null) { shrinkLeewayOnRight = 100000; }
                        if (shrinkLeewayOnLeft === null) { shrinkLeewayOnLeft = 100000; }
                        if (stretchLeewayOnRight === null) { stretchLeewayOnRight = 100000; }
                        if (stretchLeewayOnLeft === null) { stretchLeewayOnLeft = 100000; }
                        maxPageX = pageX + Math.min(shrinkLeewayOnRight, stretchLeewayOnLeft);
                        minPageX = pageX - Math.min(shrinkLeewayOnLeft, stretchLeewayOnRight);
                    })
                    .bind("drag", function(e) {
                        var actualMinWidth, d = Math.min(maxPageX, Math.max(minPageX, e.pageX)) - pageX, x;
                        if (d < 0) { // shrink column
                            x = d;
                            for (j = i; j >= 0; j--) {
                                c = columns[j];
                                if (c.resizable && !c.hidden) {
                                    actualMinWidth = Math.max(c.minWidth || 0, absoluteColumnMinWidth);
                                    if (x && c.width + x < actualMinWidth) {
                                        x += c.width - actualMinWidth;
                                        $(columnElements[j]).css({width: actualMinWidth - headerColumnWidthDiff});
                                    } else {
                                        $(columnElements[j]).css({width: c.width + x - headerColumnWidthDiff});
                                        x = 0;
                                    }
                                }
                            }

                            if (options.forceFitColumns) {
                                x = -d;
                                for (j = i + 1; j < columns.length; j++) {
                                    c = columns[j];
                                    if (c.resizable && !c.hidden) {
                                        if (x && c.maxWidth && (c.maxWidth - c.width < x)) {
                                            x -= c.maxWidth - c.width;
                                            $(columnElements[j]).css({width: c.maxWidth - headerColumnWidthDiff});
                                        } else {
                                            $(columnElements[j]).css({width: c.width + x - headerColumnWidthDiff});
                                            x = 0;
                                        }
                                    }
                                }
                            }
                        } else { // stretch column
                            x = d;
                            for (j = i; j >= 0; j--) {
                                c = columns[j];
                                if (c.resizable && !c.hidden) {
                                    if (x && c.maxWidth && (c.maxWidth - c.width < x)) {
                                        x -= c.maxWidth - c.width;
                                        $(columnElements[j]).css({width: c.maxWidth - headerColumnWidthDiff});
                                    } else {
                                        $(columnElements[j]).css({width: c.width + x - headerColumnWidthDiff});
                                        x = 0;
                                    }
                                }
                            }

                            if (options.forceFitColumns) {
                                x = -d;
                                for (j = i + 1; j < columns.length; j++) {
                                    c = columns[j];
                                    if (c.resizable && !c.hidden) {
                                        actualMinWidth = Math.max(c.minWidth || 0, absoluteColumnMinWidth);
                                        if (x && c.width + x < actualMinWidth) {
                                            x += c.width - actualMinWidth;
                                            $(columnElements[j]).css({width: actualMinWidth - headerColumnWidthDiff});
                                        } else {
                                            $(columnElements[j]).css({width: c.width + x - headerColumnWidthDiff});
                                            x = 0;
                                        }
                                    }
                                }
                            }
                        }
                    })
                    .bind("dragend", function(e) {
                        var newWidth;
                        $col.removeClass("slick-header-column-active");
                        for (j = 0; j < columns.length; j++) {
                            c = columns[j];
                            newWidth = $(columnElements[j]).outerWidth();
                            if (c.width !== newWidth && c.rerenderOnResize) {
                                removeAllRows();
                            }
                            updateColumnWidth(j, newWidth);
                        }
                        resizeCanvas();
                    });
                });
        };

        setupRowReordering = function setupRowReorderingFn() {
            $divMain
                .bind("beforedragstart", function(e) {
                    var $cell = $(e.target).closest(".slick-cell");
                    if ($cell.length === 0) { return false; }
                    if (parseInt($cell.parent().attr("row"), 10) >= data.length) { return false; }
                    var colDef = columns[$cell.attr("cell")];
                    if (colDef.behavior !== "move") { return false; }
                })
                .bind("dragstart", function(e) {
                    if (currentEditor && !commitCurrentEdit()) { return false; }

                    var row = parseInt($(e.target).closest(".slick-row").attr("row"), 10);

                    if (!selectedRowsLookup[row]) {
                        setSelectedRows([row]);
                    }

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
                    if (insertBefore !== $(this).data("insertBefore")) {
                        if (self.onBeforeMoveRows && self.onBeforeMoveRows(getSelectedRows(),insertBefore) === false) {
                            $(e.dragProxy).css("top", -1000).data("canMove",false);
                        }
                        else {
                            $(e.dragProxy).css("top",insertBefore*options.rowHeight).data("canMove",true);
                        }
                        $(this).data("insertBefore", insertBefore);
                    }
                })
                .bind("dragend", function(e) {
                    var canMove = $(e.dragProxy).data("canMove");
                    $(e.dragProxy).remove();
                    $(this).data("selectionProxy").remove();
                    var insertBefore = $(this).data("insertBefore");
                    $(this).removeData("selectionProxy").removeData("insertBefore");
                    if (self.onMoveRows && canMove) { self.onMoveRows(getSelectedRows(),insertBefore); }
                });
        };

        measureCellPaddingAndBorder = function measureCellPaddingAndBorderFn() {
            var tmp = $("<div class='ui-state-default slick-header-column' cell='' id='' style='visibility:hidden'>-</div>").appendTo($divHeaders);
            headerColumnWidthDiff = tmp.outerWidth() - tmp.width();
            headerColumnHeightDiff = tmp.outerHeight() - tmp.height();
            tmp.remove();

            var r = $("<div class='slick-row' />").appendTo($divMain);
            tmp = $("<div class='slick-cell' cell='' id='' style='visibility:hidden'>-</div>").appendTo(r);
            cellWidthDiff = tmp.outerWidth() - tmp.width();
            cellHeightDiff = tmp.outerHeight() - tmp.height();
            r.remove();

            absoluteColumnMinWidth = Math.max(headerColumnWidthDiff,cellWidthDiff);
        };

        createCssRules = function createCssRulesFn() {
            var $style = $("<style type='text/css' rel='stylesheet' lib='slickgrid" + uid + "' />").appendTo($("head"));
            var rowHeight = (options.rowHeight - cellHeightDiff);
            $.rule("." + uid + " .slick-header-columns-secondary {  height:" + options.secondaryHeaderRowHeight + "px; }").appendTo($style);
            $.rule("." + uid + " .slick-cell { height:" + rowHeight + "px; line-height:" + rowHeight + "px; }").appendTo($style);

            for (var i = 0; i < columns.length; i++) {
                $.rule(
                    "." + uid + " .c" + i + " { " +
                    "width:" + (columns[i].width - cellWidthDiff) + "px; " +
                    "display: " + (columns[i].hidden ? "none" : "block") +
                    " }").appendTo($style);
            }
        };

        removeCssRules = function removeCssRulesFn() {
            $("style[lib=slickgrid" + uid + "]").remove();
        };

        function destroy() {
            if (currentEditor) {
                cancelCurrentEdit();
            }

            if (self.onBeforeDestroy) { self.onBeforeDestroy(); }
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

        autosizeColumns = function autosizeColumnsFn(columnToHold) {
            var i, c,
                availWidth = (options.autoHeight ? viewportW : viewportW - scrollbarDimensions.width), // with AutoHeight, we do not need to accomodate the vertical scroll bar
                total = 0,
                existingTotal = 0;

            for (i = 0; i < columns.length; i++) {
                if (!columns[i].hidden) {
                    existingTotal += columns[i].width;
                }
            }

            total = existingTotal;

            removeAllRows();

            // shrink
            var workdone = true;
            while (total > availWidth && workdone) {
                workdone = false;
                for (i = 0; i < columns.length && total > availWidth; i++) {
                    c = columns[i];
                    if (c.hidden || !c.resizable || c.minWidth === c.width || c.width === absoluteColumnMinWidth || (columnToHold && columnToHold.id === c.id)) { continue; }
                    total -= 1;
                    c.width -= 1;
                    workdone = true;
                }
            }

            // shrink the column being "held" as a last resort
            if (total > availWidth && columnToHold && columnToHold.resizable && !columnToHold.hidden) {
                while (total > availWidth) {
                    if (columnToHold.minWidth === columnToHold.width || columnToHold.width === absoluteColumnMinWidth) { break; }
                    total -= 1;
                    columnToHold.width -= 1;
                }
            }

            // grow
            workdone = true;
            while (total < availWidth && workdone) {
                workdone = false;
                for (i = 0; i < columns.length && total < availWidth; i++) {
                    c = columns[i];
                    if (c.hidden || !c.resizable || c.maxWidth === c.width || (columnToHold && columnToHold.id === c.id)) { continue; }
                    total += 1;
                    c.width += 1;
                    workdone = true;
                }
            }

            // grow the column being "held" as a last resort
            if (total < availWidth && columnToHold && columnToHold.resizable && !columnToHold.hidden) {
                while (total < availWidth) {
                    if (columnToHold.maxWidth === columnToHold.width) { break; }
                    total += 1;
                    columnToHold.width += 1;
                }
            }

            for (i=0; i<columns.length; i++) {
                updateColumnWidth(i, columns[i].width);
            }

            resizeCanvas();
        };

        updateColumnWidth = function updateColumnWidth(index,width) {
            columns[index].width = width;
            $divHeaders.find(".slick-header-column[id=" + columns[index].id + "]").css("width",width - headerColumnWidthDiff);
            $.rule("." + uid + " .c" + index, "style[lib=slickgrid" + uid + "]").css("width", (columns[index].width - cellWidthDiff) + "px");
        };

        function setColumnVisibility(column,visible) {
            var index = columnsById[column.id];
            columns[index].hidden = !visible;
            resizeCanvas();
            var header = $divHeaders.find("[id=" + columns[index].id + "]");
            header.css("display", visible?"block":"none");
            $.rule("." + uid + " .c" + index, "style[lib=slickgrid" + uid + "]").css("display", visible?"block":"none");

            if (options.forceFitColumns) {
                autosizeColumns(columns[index]);
            }

            setupColumnResize();
        }

        getSelectedRows = function getSelectedRowsFn() {
            return selectedRows.sort().concat();
        };

        setSelectedRows = function setSelectedRowsFn(rows) {
            var i, row;
            if (options.editorLock.isEditing() && !options.editorLock.hasLock(self)) {
                throw "Grid : setSelectedRows : cannot set selected rows when somebody else has an edit lock";
            }

            var lookup = {};
            for (i=0; i<rows.length; i++) {
                lookup[rows[i]] = true;
            }

            // unselect old rows
            for (i=0; i<selectedRows.length; i++) {
                row = selectedRows[i];
                if (rowsCache[row] && !lookup[row]) {
                    $(rowsCache[row]).removeClass("ui-state-active selected");
                }
            }

            // select new ones
            for (i=0; i<rows.length; i++) {
                row = rows[i];
                if (rowsCache[row] && !selectedRowsLookup[row]) {
                    $(rowsCache[row]).addClass("ui-state-active selected");
                }
            }

            selectedRows = rows.concat();
            selectedRowsLookup = lookup;
        };

        function setOptions(args) {
            if (currentEditor && !commitCurrentEdit()) {
                return;
            }

            makeSelectedCellNormal();

            if (options.enableAddRow !== args.enableAddRow) {
                removeRow(data.length);
            }

            options = $.extend(options,args);

            render();
        }

        function setData(newData,scrollToTop) {
            removeAllRows();
            data = newData;
            if (scrollToTop) {
                $divMainScroller.scrollTop(0);
            }
        }

        function getSecondaryHeaderRow() {
            return $divSecondaryHeaders[0];
        }

        function showSecondaryHeaderRow() {
            options.showSecondaryHeaderRow = true;
            $divSecondaryHeadersScroller.slideDown("fast", resizeCanvas);
        }

        function hideSecondaryHeaderRow() {
            options.showSecondaryHeaderRow = false;
            $divSecondaryHeadersScroller.slideUp("fast", resizeCanvas);
        }

        //////////////////////////////////////////////////////////////////////////////////////////////
        // Rendering / Scrolling

        function appendRowHtml(stringArray,row) {
            var d = data[row];
            var dataLoading = row < data.length && !d;
            var css = "slick-row " + (dataLoading ? " loading" : "") + (selectedRowsLookup[row] ? " selected ui-state-active" : "");

            stringArray.push("<div class='ui-widget-content " + css + "' row='" + row + "' style='top:" + (options.rowHeight*row) + "px'>");

            for (var i=0, cols=columns.length; i<cols; i++) {
                var m = columns[i];

                stringArray.push("<div " + (m.unselectable ? "" : "hideFocus tabIndex=0 ") + "class='slick-cell c" + i + (m.cssClass ? " " + m.cssClass : "") + "' cell=" + i + ">");

                // if there is a corresponding row (if not, this is the Add New row or this data hasn't been loaded yet)
                if (d && row < data.length) {
                    stringArray.push(m.formatter(row, i, d[m.field], m, d));
                }

                stringArray.push("</div>");
            }

            stringArray.push("</div>");
        }

        function cleanupRows(visibleFrom,visibleTo) {
            for (var i in rowsCache) {
                if ((i < visibleFrom || i > visibleTo) && i !== currentRow) {
                    removeRowFromCache(i);
                }
            }
        }

        removeAllRows = function removeAllRowsFn() {
            $divMain[0].innerHTML = "";
            rowsCache= {};
            postProcessedRows = {};
            counter_rows_removed += renderedRows;
            renderedRows = 0;
        };

        removeRowFromCache = function removeRowFromCacheFn(row) {
            var node = rowsCache[row];
            if (!node) { return; }
            node.parentNode.removeChild(node);
            delete rowsCache[row];
            delete postProcessedRows[row];
            renderedRows--;
            counter_rows_removed++;
        };

        function removeRows(rows) {
            var i, rl, nl;
            if (!rows || !rows.length) { return; }
            scrollDir = 0;
            var nodes = [];
            for (i=0, rl=rows.length; i<rl; i++) {
                if (currentEditor && currentRow === i) {
                    throw "Grid : removeRow : Cannot remove a row that is currently in edit mode";
                }

                if (rowsCache[rows[i]]) {
                    nodes.push(rows[i]);
                }
            }

            if (renderedRows > 10 && nodes.length === renderedRows) {
                removeAllRows();
            }
            else {
                for (i=0, nl=nodes.length; i<nl; i++) {
                    removeRowFromCache(nodes[i]);
                }
            }
        }

        removeRow = function removeRowFn(row) {
            removeRows([row]);
        };

        function updateCell(row,cell) {
            if (!rowsCache[row]) { return; }
            var $cell = $(rowsCache[row]).find(".c[cell=" + cell + "]");
            if ($cell.length === 0) { return; }

            var m = columns[cell], d = data[row];
            if (currentEditor && currentRow === row && currentCell === cell) {
                currentEditor.setValue(d[m.field]);
            }
            else {
                $cell[0].innerHTML = d ? m.formatter(row, cell, d[m.field], m, d) : "";
                invalidatePostProcessingResults(row);
            }
        }

        function updateRow(row) {
            if (!rowsCache[row]) { return; }

            // todo:  perf:  iterate over direct children?
            $(rowsCache[row]).find(".slick-cell").each(function(i) {
                var m = columns[i];
                if (row === currentRow && i === currentCell && currentEditor) {
                    currentEditor.setValue(data[currentRow][m.field]);
                }
                else if (data[row]) {
                    this.innerHTML = m.formatter(row, i, data[row][m.field], m, data[row]);
                }
                else {
                    this.innerHTML = "";
                }
            });

            invalidatePostProcessingResults(row);
        }

        resizeCanvas = function resizeCanvasFn() {
            var newHeight = options.rowHeight * (data.length + (options.enableAddRow ? 1 : 0) + (options.leaveSpaceForNewRows? numVisibleRows - 1 : 0));
            if (options.autoHeight) { // use computed height to set both canvas _and_ divMainScroller, effectively hiding scroll bars.
                $divMainScroller.height(newHeight);
            }
            else {
            $divMainScroller.height(
                    $container.innerHeight() -
                    $divHeadersScroller.outerHeight() -
                    (options.showSecondaryHeaderRow ? $divSecondaryHeadersScroller.outerHeight() : 0));            }

            viewportW = $divMainScroller.innerWidth();
            viewportH = $divMainScroller.innerHeight();
            BUFFER = numVisibleRows = Math.ceil(viewportH / options.rowHeight);
            CAPACITY = Math.max(50, numVisibleRows + 2*BUFFER);

            var totalWidth = 0;
            for (var i=0; i<columns.length; i++) {
                if (!columns[i].hidden) {
                    totalWidth += columns[i].width;
                }
            }
            $divMain.width(totalWidth);

            // browsers sometimes do not adjust scrollTop/scrollHeight when the height of contained objects changes
            newHeight = Math.max(newHeight, viewportH - scrollbarDimensions.height);
            if ($divMainScroller.scrollTop() > newHeight - $divMainScroller.height() + scrollbarDimensions.height) {
                $divMainScroller.scrollTop(newHeight - $divMainScroller.height() + scrollbarDimensions.height);
            }

            $divMain.height(newHeight);
            render();
        };

        function updateRowCount() {
            // remove the rows that are now outside of the data range
            // this helps avoid redundant calls to .removeRow() when the size of the data decreased by thousands of rows
            // var parentNode = $divMain[0];
            var l = options.enableAddRow ? data.length : data.length - 1;
            for (var i in rowsCache) {
                if (i >= l) {
                    removeRowFromCache(i);
                }
            }

            var newHeight = Math.max(options.rowHeight * (data.length + (options.enableAddRow?1:0) + (options.leaveSpaceForNewRows?numVisibleRows-1:0)), viewportH - scrollbarDimensions.height);

            // browsers sometimes do not adjust scrollTop/scrollHeight when the height of contained objects changes
            if ($divMainScroller.scrollTop() > newHeight - $divMainScroller.height() + scrollbarDimensions.height) {
                $divMainScroller.scrollTop(newHeight - $divMainScroller.height() + scrollbarDimensions.height);
            }
            $divMain.height(newHeight);
        }

        function getViewport() {
            return {
                top:    Math.floor(currentScrollTop / options.rowHeight),
                bottom: Math.floor((currentScrollTop + viewportH) / options.rowHeight)
            };
        }

        function renderRows(from,to) {
            var i, l,
                parentNode = $divMain[0],
                rowsBefore = renderedRows,
                stringArray = [],
                rows =[],
                startTimestamp = new Date();

            for (i = from; i <= to; i++) {
                if (rowsCache[i]) { continue; }
                renderedRows++;
                rows.push(i);
                appendRowHtml(stringArray,i);
                counter_rows_rendered++;
            }

            var x = document.createElement("div");
            x.innerHTML = stringArray.join("");

            for (i = 0, l = x.childNodes.length; i < l; i++) {
                rowsCache[rows[i]] = parentNode.appendChild(x.firstChild);
            }

            if (renderedRows - rowsBefore > MIN_BUFFER) {
                avgRowRenderTime = (new Date() - startTimestamp) / (renderedRows - rowsBefore);
            }
        }

        function startPostProcessing() {
            if (!options.enableAsyncPostRender) { return; }
            clearTimeout(h_postrender);
            h_postrender = setTimeout(asyncPostProcessRows, options.asyncPostRenderDelay);
        }

        invalidatePostProcessingResults = function invalidatePostProcessingResultsFn(row) {
            delete postProcessedRows[row];
            postProcessFromRow = Math.min(postProcessFromRow,row);
            postProcessToRow = Math.max(postProcessToRow,row);
            startPostProcessing();
        };

        render = function renderFn() {
            var vp = getViewport();
            var from = Math.max(0, vp.top - (scrollDir >= 0 ? MIN_BUFFER : BUFFER));
            var to = Math.min(options.enableAddRow ? data.length : data.length - 1, vp.bottom + (scrollDir > 0 ? BUFFER : MIN_BUFFER));

            if (renderedRows > 10 && Math.abs(lastRenderedScrollTop - currentScrollTop) > options.rowHeight*CAPACITY) {
                removeAllRows();
            }
            else {
                cleanupRows(from,to);
            }

            renderRows(from,to);

            postProcessFromRow = Math.max(0,vp.top-MIN_BUFFER);
            postProcessToRow = Math.min(options.enableAddRow ? data.length : data.length - 1, vp.bottom+MIN_BUFFER);
            startPostProcessing();

            lastRenderedScrollTop = currentScrollTop;
            h_render = null;
        };

        handleScroll = function handleScrollFn() {
            currentScrollTop = $divMainScroller[0].scrollTop;
            var scrollDistance = Math.abs(lastRenderedScrollTop - currentScrollTop);
            var scrollLeft = $divMainScroller[0].scrollLeft;

            if (scrollLeft !== currentScrollLeft) {
                $divHeadersScroller[0].scrollLeft = currentScrollLeft = scrollLeft;
                $divSecondaryHeadersScroller[0].scrollLeft = currentScrollLeft = scrollLeft;
            }

            // min scroll distance = 25% of the viewport or MIN_BUFFER rows (whichever is smaller)
            if (scrollDistance < Math.min(viewportH/4, MIN_BUFFER*options.rowHeight)) { return; }

            if (lastRenderedScrollTop === currentScrollTop) {
                scrollDir = 0;
            }
            else if (lastRenderedScrollTop < currentScrollTop) {
                scrollDir = 1;
            }
            else {
                scrollDir = -1;
            }

            if (h_render) {
                clearTimeout(h_render);
            }

            if (scrollDistance < numVisibleRows*options.rowHeight) {
                render();
            }
            else {
                h_render = setTimeout(render, 50);
            }

            if (self.onViewportChanged) {
                self.onViewportChanged();
            }
        };

        asyncPostProcessRows = function asyncPostProcessRowsFn() {
            while (postProcessFromRow <= postProcessToRow) {
                var row = (scrollDir >= 0) ? postProcessFromRow++ : postProcessToRow--;
                var rowNode = rowsCache[row];
                if (!rowNode || postProcessedRows[row] || row>=data.length) { continue; }

                var d = data[row], cellNodes = rowNode.childNodes;
                for (var i=0, l=columns.length; i<l; i++) {
                    var m = columns[i];
                    if (m.asyncPostRender && !m.hidden) {
                        m.asyncPostRender(cellNodes[i], postProcessFromRow, d, m);
                    }
                }

                postProcessedRows[row] = true;
                h_postrender = setTimeout(asyncPostProcessRows, options.asyncPostRenderDelay);
                return;
            }
        };


        //////////////////////////////////////////////////////////////////////////////////////////////
        // Interactivity

        handleKeyDown = function handleKeyDownFn(e) {
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
                if (options.editorLock.isEditing() && options.editorLock.hasLock(self)) {
                    cancelCurrentEdit(self);
                }
                if (currentCellNode) {
                    currentCellNode.focus();
                }
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
        };

        handleClick = function handleClickFn(e) {
            var $cell = $(e.target).closest(".slick-cell");
            if ($cell.length === 0) { return; }

            // are we editing this cell?
            if (currentCellNode === $cell[0] && currentEditor !== null) { return; }

            var row = parseInt($cell.parent().attr("row"), 10);
            var cell = parseInt($cell.attr("cell"), 10);
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
                if (validated === true || (validated === null && commitCurrentEdit())) {
                    setSelectedCellAndRow($cell[0],!options.editOnDoubleClick);
                }
            }
        };

        handleContextMenu = function handleContextMenuFn(e) {
            var $cell = $(e.target).closest(".slick-cell");
            if ($cell.length === 0) { return; }

            // are we editing this cell?
            if (currentCellNode === $cell[0] && currentEditor !== null) { return; }

            var row = parseInt($cell.parent().attr("row"), 10);
            var cell = parseInt($cell.attr("cell"), 10);
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
        };

        handleDblClick = function handleDblClickFn(e) {
            var $cell = $(e.target).closest(".slick-cell");
            if ($cell.length === 0) { return; }

            // are we editing this cell?
            if (currentCellNode === $cell[0] && currentEditor !== null) { return; }

            var row = parseInt($cell.parent().attr("row"), 10);
            var cell = parseInt($cell.attr("cell"), 10);
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

            if (options.editOnDoubleClick) {
                makeSelectedCellEditable();
            }
        };

        handleHeaderContextMenu = function handleHeaderContextMenuFn(e) {
            var validated = null;
            if (self.onHeaderContextMenu && (!currentEditor || (validated = commitCurrentEdit()))) {
                e.preventDefault();
                // TODO:  figure out which column was acted on and pass it as a param to the handler
                self.onHeaderContextMenu(e);
            }
        };

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
            if (currentCellNode !== null) {
                makeSelectedCellNormal();
                $(currentCellNode).removeClass("selected");
            }

            currentCellNode = newCell;

            if (currentCellNode !== null) {
                currentRow = parseInt($(currentCellNode).parent().attr("row"), 10);
                currentCell = parseInt($(currentCellNode).attr("cell"), 10);

                $(currentCellNode).addClass("selected");

                scrollSelectedCellIntoView();

                if (options.editable && editMode && isCellPotentiallyEditable(currentRow,currentCell)) {
                    clearTimeout(h_editorLoader);

                    if (options.asyncEditorLoading) {
                        h_editorLoader = setTimeout(makeSelectedCellEditable, options.asyncEditorLoadDelay);
                    }
                    else {
                        makeSelectedCellEditable();
                    }
                }
                else {
                    currentCellNode.focus();
                }
            }
            else {
                currentRow = null;
                currentCell = null;
            }
        }

        setSelectedCellAndRow = function setSelectedCellAndRowFn(newCell,editMode) {
            setSelectedCell(newCell,editMode);

            if (newCell) {
                setSelectedRows([currentRow]);
            }
            else {
                setSelectedRows([]);
            }

            if (self.onSelectedRowsChanged) {
                self.onSelectedRowsChanged();
            }
        };

        function clearTextSelection() {
            if (document.selection && document.selection.empty) {
                document.selection.empty();
            }
            else if (window.getSelection) {
                var sel = window.getSelection();
                if (sel && sel.removeAllRanges) {
                    sel.removeAllRanges();
                }
            }
        }

        isCellPotentiallyEditable = function isCellPotentiallyEditableFn(row,cell) {
            // is the data for this row loaded?
            if (row < data.length && !data[row]) {
                return false;
            }

            // are we in the Add New row?  can we create new from this cell?
            if (columns[cell].cannotTriggerInsert && row >= data.length) {
                return false;
            }

            // does this cell have an editor?
            if (!columns[cell].editor) {
                return false;
            }

            return true;
        };

        makeSelectedCellNormal = function makeSelectedCellNormalFn() {
            if (!currentEditor) { return; }

            currentEditor.destroy();
            $(currentCellNode).removeClass("editable invalid");

            if (data[currentRow]) {
                currentCellNode.innerHTML = columns[currentCell].formatter(currentRow, currentCell, data[currentRow][columns[currentCell].field], columns[currentCell], data[currentRow]);
                invalidatePostProcessingResults(currentRow);
            }

            currentEditor = null;

            // if there previously was text selected on a page (such as selected text in the edit cell just removed),
            // IE can't set focus to anything else correctly
            if ($.browser.msie) { clearTextSelection(); }

            options.editorLock.leaveEditMode(self);
        };

        makeSelectedCellEditable = function makeSelectedCellEditableFn() {
            if (!currentCellNode) { return; }
            if (!options.editable) {
                throw "Grid : makeSelectedCellEditable : should never get called when options.editable is false";
            }

            // cancel pending async call if there is one
            clearTimeout(h_editorLoader);

            if (!isCellPotentiallyEditable(currentRow,currentCell)) {
                return;
            }

            if (self.onBeforeEditCell && self.onBeforeEditCell(currentRow,currentCell,data[currentRow]) === false) {
                currentCellNode.focus();
                return;
            }

            options.editorLock.enterEditMode(self);

            $(currentCellNode).addClass("editable");

            var value = null;

            // if there is a corresponding row
            if (data[currentRow]) {
                value = data[currentRow][columns[currentCell].field];
            }

            currentCellNode.innerHTML = "";

            currentEditor = new columns[currentCell].editor($(currentCellNode), columns[currentCell], value, data[currentRow]);
        };

        scrollSelectedCellIntoView = function scrollSelectedCellIntoViewFn() {
            if (!currentCellNode) { return; }
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
        };

        gotoDir = function gotoDirFn(dy, dx, rollover) {
            if (!currentCellNode || !options.enableCellNavigation) { return; }
            if (!options.editorLock.commitCurrentEdit()) { return; }

            var nextRow = rowsCache[currentRow + dy];
            var nextCell = nextRow ? $(nextRow).find(".slick-cell[cell=" + (currentCell + dx) + "]") : null;
            if (nextCell && !nextCell.is("[tabIndex=0]:visible")) {
                nextCell = (dx>0)?nextCell.nextAll("[tabIndex=0]:visible:first"):nextCell.prevAll("[tabIndex=0]:visible:first");
            }

            if (rollover && dy === 0 && !(nextRow && nextCell && nextCell.length)) {
                if (!nextCell || !nextCell.length) {
                    if (dx > 0) {
                        nextRow = rowsCache[currentRow + dy + 1];
                        nextCell = nextRow ? $(nextRow).find(".slick-cell[cell]:first") : null;
                    }
                    else {
                        nextRow = rowsCache[currentRow + dy - 1];
                        nextCell = nextRow ? $(nextRow).find(".slick-cell[cell]:last") : null;
                    }
                    if (nextCell && !nextCell.is("[tabIndex=0]:visible")) {
                        nextCell = (dx>0)?nextCell.nextAll("[tabIndex=0]:visible:first"):nextCell.prevAll("[tabIndex=0]:visible:first");
                    }
                }
            }


            if (nextRow && nextCell && nextCell.length) {
                setSelectedCellAndRow(nextCell[0],true);

                // if no editor was created, set the focus back on the cell
                if (!currentEditor) {
                    currentCellNode.focus();
                }
            }
            else {
                currentCellNode.focus();
            }
        };

        function gotoCell(row,cell) {
            if (row > data.length || row < 0 || cell >= columns.length || cell < 0) { return; }
            if (!options.enableCellNavigation || columns[cell].unselectable) { return; }

            if (!options.editorLock.commitCurrentEdit()) { return; }

            if (!rowsCache[row]) {
                renderRows(row,row);
            }

            cell = $(rowsCache[row]).find(".slick-cell[cell=" + cell + "][tabIndex=0]:visible")[0];

            setSelectedCellAndRow(cell,!options.editOnDoubleClick);

            // if no editor was created, set the focus back on the cell
            if (!currentEditor) {
                currentCellNode.focus();
            }
        }


        //////////////////////////////////////////////////////////////////////////////////////////////
        // IEditor implementation for the editor lock

        commitCurrentEdit = function commitCurrentEditFn() {
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

                            if (self.onCellChange) {
                                self.onCellChange(currentRow,currentCell,data[currentRow]);
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

                        if (self.onValidationError) {
                            self.onValidationError(currentCellNode, validationResults, currentRow, currentCell, columns[currentCell]);
                        }

                        currentEditor.focus();
                        return false;
                    }
                }

                makeSelectedCellNormal();
            }
            return true;
        };

        cancelCurrentEdit = function cancelCurrentEditFn() {
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
            "onSort":                null,
            "onHeaderContextMenu":   null,
            "onClick":               null,
            "onDblClick":            null,
            "onContextMenu":         null,
            "onKeyDown":             null,
            "onAddNewRow":           null,
            "onValidationError":     null,
            "onViewportChanged":     null,
            "onSelectedRowsChanged": null,
            "onColumnsReordered":    null,
            "onBeforeMoveRows":      null,
            "onMoveRows":            null,
            "onCellChange":          null,
            "onBeforeEditCell":      null,
            "onBeforeDestroy":       null,

            // Methods
            "setOptions":          setOptions,
            "setData":             setData,
            "destroy":             destroy,
            "getColumnIndex":      getColumnIndex,
            "setColumnVisibility": setColumnVisibility,
            "autosizeColumns":     autosizeColumns,
            "updateCell":          updateCell,
            "updateRow":           updateRow,
            "removeRow":           removeRow,
            "removeRows":          removeRows,
            "removeAllRows":       removeAllRows,
            "render":              render,
            "getViewport":         getViewport,
            "resizeCanvas":        resizeCanvas,
            "updateRowCount":      updateRowCount,
            "getCellFromPoint":    getCellFromPoint,
            "gotoCell":            gotoCell,
            "editCurrentCell":     makeSelectedCellEditable,
            "getSelectedRows":     getSelectedRows,
            "setSelectedRows":     setSelectedRows,
            "getSecondaryHeaderRow":    getSecondaryHeaderRow,
            "showSecondaryHeaderRow":   showSecondaryHeaderRow,
            "hideSecondaryHeaderRow":   hideSecondaryHeaderRow,

            // IEditor implementation
            "commitCurrentEdit": commitCurrentEdit,
            "cancelCurrentEdit": cancelCurrentEdit
        });
    }

    // Slick.Grid
    $.extend(true, window, { Slick: { Grid: SlickGrid }});
}());