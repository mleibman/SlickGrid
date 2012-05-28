/**
 * @license (c) 2009-2012 Michael Leibman michael{dot}leibman{at}gmail{dot}com
 *          http://github.com/mleibman/slickgrid
 *
 * Distributed under MIT license. All rights reserved.
 *
 * SlickGrid v2.0
 *
 * NOTES: Cell/row DOM manipulations are done directly bypassing jQuery's DOM
 * manipulation methods. This increases the speed dramatically, but can only be
 * done safely because there are no event handlers or data associated with any
 * cell/row DOM nodes. Cell editors must make sure they implement .destroy() and
 * do proper cleanup.
 *
 * TODO: Fix column resizing with frozen columns (resizing the columns on either
 * side of the frozen column doesn't look right)
 *
 */

// make sure required JavaScript modules are loaded
if (typeof jQuery === "undefined") {
    throw "SlickGrid requires jquery module to be loaded";
}
if (!jQuery.fn.drag) {
    throw "SlickGrid requires jquery.event.drag module to be loaded";
}
if (typeof Slick === "undefined") {
    throw "slick.core.js not loaded";
}

(function($) {
    // Slick.Grid
    $.extend(true, window, {
        Slick: {
            Grid: SlickGrid
        }
    });

    // shared across all grids on the page
    var scrollbarDimensions;
    var maxSupportedCssHeight; // browser's breaking point

    // ////////////////////////////////////////////////////////////////////////////////////////////
    // SlickGrid class implementation (available as Slick.Grid)

    /**
     * Creates a new instance of the grid.
     *
     * @class SlickGrid
     * @constructor
     * @param {Node}
     *            container Container node to create the grid in.
     * @param {Array,Object}
     *            data An array of objects for databinding.
     * @param {Array}
     *            columns An array of column definitions.
     * @param {Object}
     *            options Grid options.
     */

    function SlickGrid(container, data, columns, options) {
        // settings
        var defaults = {
            explicitInitialization: false,
            rowHeight: 25,
            defaultColumnWidth: 80,
            enableAddRow: false,
            leaveSpaceForNewRows: false,
            editable: false,
            autoEdit: true,
            enableCellNavigation: true,
            enableColumnReorder: true,
            asyncEditorLoading: false,
            asyncEditorLoadDelay: 100,
            forceFitColumns: false,
            enableAsyncPostRender: false,
            asyncPostRenderDelay: 60,
            autoHeight: false,
            editorLock: Slick.GlobalEditorLock,
            showHeaderRow: false,
            headerRowHeight: 25,
            showTopPanel: false,
            topPanelHeight: 25,
            formatterFactory: null,
            editorFactory: null,
            cellFlashingCssClass: "flashing",
            selectedCellCssClass: "selected",
            multiSelect: true,
            enableTextSelectionOnCells: false,
            dataItemColumnValueExtractor: null,
            frozenColumn: -1,
            frozenRow: -1,
            dataItemColumnValueExtractor: null,
            fullWidthRows: false,
            multiColumnSort: false,
            defaultFormatter: defaultFormatter
        };

        var columnDefaults = {
            name: "",
            resizable: true,
            sortable: false,
            minWidth: 30,
            rerenderOnResize: false,
            headerCssClass: null
        };

        // scroller
        var th; // virtual height
        var h; // real scrollable height
        var ph; // page height
        var n; // number of pages
        var cj; // "jumpiness" coefficient

        var page = 0; // current page
        var offset = 0; // current page offset
        var scrollDir = 1;

        // private
        var initialized = false;
        var $container;
        var uid = "slickgrid_" + Math.round(1000000 * Math.random());
        var self = this;
        var $focusSink;
        var $headerScroller;
        var $headers;
        var $headerRow, $headerRowScroller;
        var $topPanelScroller;
        var $topPanel;
        var $viewport;
        var $canvas;
        var $style;
        var stylesheet, columnCssRulesL, columnCssRulesR;
        var viewportH, viewportW;
        var canvasWidth;
        var canvasWidthL, canvasWidthR;
        var viewportHasHScroll, viewportHasVScroll;
        var headerColumnWidthDiff = 0,
            headerColumnHeightDiff = 0,
            // border+padding
            cellWidthDiff = 0,
            cellHeightDiff = 0;
        var absoluteColumnMinWidth;
        var numberOfRows = 0;

        var activePosX;
        var activeRow, activeCell;
        var activeCellNode = null;
        var currentEditor = null;
        var serializedEditorValue;
        var editController;

        var rowsCache = {};
        var renderedRows = 0;
        var numVisibleRows;
        var prevScrollTop = 0;
        var scrollTop = 0;
        var lastRenderedScrollTop = 0;
        var prevScrollLeft = 0;
        var avgRowRenderTime = 10;

        var selectionModel;
        var selectedRows = [];

        var plugins = [];
        var cellCssClasses = {};

        var columnsById = {};
        var sortColumns = [];

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

        var $paneTopL;
        var $paneTopR;
        var $paneBottomL;
        var $paneBottomR;

        var $headerScrollerL;
        var $headerScrollerR;

        var $headerL;
        var $headerR;

        var $headerRowScrollerL;
        var $headerRowScrollerR;

        var $headerRowL;
        var $headerRowR;

        var $topPanelScrollerL;
        var $topPanelScrollerR;

        var $topPanelL;
        var $topPanelR;

        var $viewportTopL;
        var $viewportTopR;
        var $viewportBottomL;
        var $viewportBottomR;

        var $canvasTopL;
        var $canvasTopR;
        var $canvasBottomL;
        var $canvasBottomR;

        var $viewportScrollContainer;

        // ////////////////////////////////////////////////////////////////////////////////////////////
        // Initialization

        function init() {
            $container = $(container);
            if ($container.length < 1) {
                throw new Error("SlickGrid requires a valid container, " + container + " does not exist in the DOM.");
            }

            // calculate these only once and share between grid instances
            maxSupportedCssHeight = maxSupportedCssHeight || getMaxSupportedCssHeight();
            scrollbarDimensions = scrollbarDimensions || measureScrollbar();

            options = $.extend({}, defaults, options);
            columnDefaults.width = options.defaultColumnWidth;

            options.frozenColumn = (options.frozenColumn >= 0 && options.frozenColumn < columns.length) ? parseInt(options.frozenColumn) : -1;
            options.frozenRow = (options.frozenRow >= 0 && options.frozenRow < columns.length) ? parseInt(options.frozenRow) : -1;

            // validate loaded JavaScript modules against requested options
            if (options.enableColumnReorder && !$.fn.sortable) {
                throw new Error("SlickGrid's 'enableColumnReorder = true' option requires jquery-ui.sortable module to be loaded");
            }

            editController = {
                "commitCurrentEdit": commitCurrentEdit,
                "cancelCurrentEdit": cancelCurrentEdit
            };

            $container.empty().attr("tabIndex", 0).attr("hideFocus", true).css("overflow", "hidden").css("outline", 0).addClass(uid).addClass("ui-widget");

            // set up a positioning container if needed
            if (!/relative|absolute|fixed/.test($container.css("position"))) {
                $container.css("position", "relative");
            }

            $focusSink = $("<div tabIndex='0' hideFocus style='position:fixed;width:0;height:0;top:0;left:0;outline:0;'></div>").appendTo($container);

            // Containers used for scrolling frozen columns and rows
            $paneTopL = $("<div class='slick-pane slick-pane-top slick-pane-left' tabIndex='0' />").appendTo($container);
            $paneTopR = $("<div class='slick-pane slick-pane-top slick-pane-right' tabIndex='0' />").appendTo($container);
            $paneBottomL = $("<div class='slick-pane slick-pane-bottom slick-pane-left' tabIndex='0' />").appendTo($container);
            $paneBottomR = $("<div class='slick-pane slick-pane-bottom slick-pane-right' tabIndex='0' />").appendTo($container);

            setPaneVisibility();

            // Append the header scroller containers
            $headerScrollerL = $("<div class='ui-state-default slick-header slick-header-left' />").appendTo($paneTopL);
            $headerScrollerR = $("<div class='ui-state-default slick-header slick-header-right' />").appendTo($paneTopR);

            // Cache the header scroller containers
            $headerScroller = $().add($headerScrollerL).add($headerScrollerR);

            // Append the columnn containers to the headers
            $headerL = $("<div class='slick-header-columns slick-header-columns-left' style='width:10000px; left:-1000px' />").appendTo($headerScrollerL);
            $headerR = $("<div class='slick-header-columns slick-header-columns-right' style='width:10000px; left:-1000px' />").appendTo($headerScrollerR);

            // Cache the header columns
            $headers = $().add($headerL).add($headerR);

            $headerRowScrollerL = $("<div class='ui-state-default slick-headerrow' />").appendTo($paneTopL);
            $headerRowScrollerR = $("<div class='ui-state-default slick-headerrow' />").appendTo($paneTopR);

            $headerRowScroller = $().add($headerRowScrollerL).add(
            $headerRowScrollerR)

            $headerRowL = $("<div class='slick-headerrow-columns slick-headerrow-columns-left' />").appendTo($headerRowScrollerL);
            $headerRowR = $("<div class='slick-headerrow-columns slick-headerrow-columns-right' />").appendTo($headerRowScrollerR);

            $headerRow = $().add($headerRowL).add($headerRowR);

            // Append the top panel scroller
            $topPanelScrollerL = $("<div class='ui-state-default slick-top-panel-scroller' />").appendTo($paneTopL);
            $topPanelScrollerR = $("<div class='ui-state-default slick-top-panel-scroller' />").appendTo($paneTopR);

            $topPanelScroller = $().add($topPanelScrollerL).add(
            $topPanelScrollerR);

            // Append the top panel
            $topPanelL = $("<div class='slick-top-panel' style='width:10000px' />").appendTo($topPanelScrollerL);
            $topPanelR = $("<div class='slick-top-panel' style='width:10000px' />").appendTo($topPanelScrollerR);

            $topPanel = $().add($topPanelL).add($topPanelR);

            if (!options.showTopPanel) {
                $topPanelScroller.hide();
            }

            if (!options.showHeaderRow) {
                $headerRowScroller.hide();
            }

            // Append the viewport containers
            $viewportTopL = $("<div class='slick-viewport slick-viewport-top slick-viewport-left' tabIndex='0' hideFocus />").appendTo($paneTopL);
            $viewportTopR = $("<div class='slick-viewport slick-viewport-top slick-viewport-right' tabIndex='0' hideFocus />").appendTo($paneTopR);
            $viewportBottomL = $("<div class='slick-viewport slick-viewport-bottom slick-viewport-left' tabIndex='0' hideFocus />").appendTo($paneBottomL);
            $viewportBottomR = $("<div class='slick-viewport slick-viewport-bottom slick-viewport-right' tabIndex='0' hideFocus />").appendTo($paneBottomR);

            // Cache the viewports
            $viewport = $().add($viewportTopL).add($viewportTopR).add(
            $viewportBottomL).add($viewportBottomR);

            setOverflow();

            // Append the canvas containers
            $canvasTopL = $("<div class='grid-canvas grid-canvas-top grid-canvas-left' tabIndex='0' hideFocus />").appendTo($viewportTopL);
            $canvasTopR = $("<div class='grid-canvas grid-canvas-top grid-canvas-right' tabIndex='0' hideFocus />").appendTo($viewportTopR);
            $canvasBottomL = $("<div class='grid-canvas grid-canvas-bottom grid-canvas-left' tabIndex='0' hideFocus />").appendTo($viewportBottomL);
            $canvasBottomR = $("<div class='grid-canvas grid-canvas-bottom grid-canvas-right' tabIndex='0' hideFocus />").appendTo($viewportBottomR);

            // Cache the canvases
            $canvas = $().add($canvasTopL).add($canvasTopR).add($canvasBottomL).add($canvasBottomR);

            setScroller();

            if (!options.explicitInitialization) {
                finishInitialization();
            }
        }

        function finishInitialization() {
            if (!initialized) {
                initialized = true;

                viewportW = parseFloat($.css($container[0], "width", true));

                // header columns and cells may have different padding/border
                // skewing width calculations (box-sizing, hello?)
                // calculate the diff so we can set consistent sizes
                measureCellPaddingAndBorder();

                // for usability reasons, all text selection in SlickGrid is
                // disabled with the exception of input and textarea elements (selection
                // must be enabled there so that editors work as expected); note that
                // selection in grid cells (grid body) is already unavailable in
                // all browsers except IE
                disableSelection($headers); // disable all text selection in header (including input and textarea)

                if (!options.enableTextSelectionOnCells) {
                    // disable text selection in grid cells except in input and textarea elements
                    // (this is IE-specific, because selectstart event will only fire in IE)
                    $viewport.bind("selectstart.ui", function(event) {
                        return $(event.target).is("input,textarea");
                    });
                }

                createColumnHeaders();
                setupColumnSort();
                createCssRules();
                updateCanvasWidth();
                resizeCanvas();
                bindAncestorScrollEvents();

                if (options.frozenColumn > -1) {
                    if (options.frozenRow > -1) {
                        $viewportBottomL.mousewheel(handleMouseWheel);
                    } else {
                        $viewportTopL.mousewheel(handleMouseWheel);
                    }
                }

                $container.bind("resize.slickgrid", resizeCanvas);
                $focusSink.bind("keydown.slickgrid", handleKeyDown);
                $viewport.bind("scroll.slickgrid", handleScroll);
                $headerScroller.bind("contextmenu.slickgrid", handleHeaderContextMenu).bind("click.slickgrid", handleHeaderClick);
                $canvas.bind("keydown.slickgrid", handleKeyDown).bind("click.slickgrid", handleClick).bind("dblclick.slickgrid", handleDblClick).bind("contextmenu.slickgrid", handleContextMenu).bind("draginit", handleDragInit).bind("dragstart", handleDragStart).bind("drag", handleDrag).bind("dragend", handleDragEnd).delegate(".slick-cell", "mouseenter", handleMouseEnter).delegate(".slick-cell", "mouseleave", handleMouseLeave);
            }
        }

        function registerPlugin(plugin) {
            plugins.unshift(plugin);
            plugin.init(self);
        }

        function unregisterPlugin(plugin) {
            for (var i = plugins.length; i >= 0; i--) {
                if (plugins[i] === plugin) {
                    if (plugins[i].destroy) {
                        plugins[i].destroy();
                    }
                    plugins.splice(i, 1);
                    break;
                }
            }
        }

        function setSelectionModel(model) {
            if (selectionModel) {
                selectionModel.onSelectedRangesChanged.unsubscribe(handleSelectedRangesChanged);
                if (selectionModel.destroy) {
                    selectionModel.destroy();
                }
            }

            selectionModel = model;
            if (selectionModel) {
                selectionModel.init(self);
                selectionModel.onSelectedRangesChanged.subscribe(handleSelectedRangesChanged);
            }
        }

        function getSelectionModel() {
            return selectionModel;
        }

        function getCanvasNode() {
            return $canvas[0];
        }

        function getViewportNode() {
        	return $viewport[0];
        }

        function measureScrollbar() {
            var $c = $("<div style='position:absolute; top:-10000px; left:-10000px; width:100px; height:100px; overflow:scroll;'></div>").appendTo("body");
            var dim = {
                width: $c.width() - $c[0].clientWidth,
                height: $c.height() - $c[0].clientHeight
            };
            $c.remove();
            return dim;
        }

        function getCanvasWidth() {
            var availableWidth = viewportHasVScroll ? viewportW - scrollbarDimensions.width : viewportW;

            var rowWidthL = 0,
                rowWidthR = 0,
                i = columns.length;

            while (i--) {
                if ((options.frozenColumn > -1) && (i > options.frozenColumn)) {
                    rowWidthR += (columns[i].width || columnDefaults.width);
                } else {
                    rowWidthL += (columns[i].width || columnDefaults.width);
                }
            }

            canvasWidthL = rowWidthL;
            canvasWidthR = rowWidthR;

            return options.fullWidthRows ? Math.max(rowWidth, availableWidth) : rowWidthL;
        }

        function updateCanvasWidth(forceColumnWidthsUpdate) {
            var oldCanvasWidth = canvasWidth;
            canvasWidth = getCanvasWidth();

            if (canvasWidth != oldCanvasWidth) {
                $canvasTopL.width(canvasWidthL);
                $headerScrollerL.width(canvasWidthL);
                $headerRowScrollerL.width(canvasWidthL);
                $headerRowL.width(canvasWidthL);

                if (options.frozenColumn > -1) {
                    $canvasTopR.width(canvasWidthR);
                    $headerScrollerR.width(canvasWidthR);
                    $headerRowScrollerR.width(canvasWidthR);
                    $headerRowR.width(canvasWidthR);
                }

                if (options.frozenRow > -1) {
                    $canvasBottomL.width(canvasWidthL);
                }

                if (options.frozenColumn > -1) {
                    $canvasBottomR.width(canvasWidthR);
                }

                viewportHasHScroll = (canvasWidth > viewportW - scrollbarDimensions.width);
            }

            if (canvasWidth != oldCanvasWidth || forceColumnWidthsUpdate) {
                applyColumnWidths();
            }
        }

        function disableSelection($target) {
            if ($target && $target.jquery) {
                $target.attr("unselectable", "on").css("MozUserSelect", "none").bind("selectstart.ui", function() {
                    return false;
                }); // from jquery:ui.core.js 1.7.2
            }
        }

        function getMaxSupportedCssHeight() {
            var increment = 1000000;
            var supportedHeight = increment;
            // FF reports the height back but still renders blank after ~6M px
            var testUpTo = ($.browser.mozilla) ? 5000000 : 1000000000;
            var div = $("<div style='display:none' />").appendTo(document.body);

            while (supportedHeight <= testUpTo) {
                div.css("height", supportedHeight + increment);
                if (div.height() !== supportedHeight + increment) {
                    break;
                } else {
                    supportedHeight += increment;
                }
            }

            div.remove();
            return supportedHeight;
        }

        // TODO: this is static. need to handle page mutation.
        function bindAncestorScrollEvents() {
            var elem = (options.frozenRow > -1) ? $canvasBottomL[0] : $canvasTopL[0];

            // bind to scroll containers only
            while ((elem = elem.parentNode) != document.body) {
                // bind to scroll containers only
                if (elem == $viewportTopL[0] || elem.scrollWidth != elem.clientWidth || elem.scrollHeight != elem.clientHeight) $(elem).bind("scroll.slickgrid", handleActiveCellPositionChange);
            }
        }

        function unbindAncestorScrollEvents() {
            var $tmp = (options.frozenRow > -1) ? $canvasBottomL : $canvasTopL;

            $tmp.parents().unbind("scroll.slickgrid");
        }

        function updateColumnHeader(columnId, title, toolTip) {
            if (!initialized) {
                return;
            }
            var idx = getColumnIndex(columnId);
            var $header = $headers.children().eq(idx);
            if ($header) {
                columns[idx].name = title;
                columns[idx].toolTip = toolTip;
                $header.attr("title", toolTip || title || "").children().eq(0).html(title);
            }
        }

        function getHeaderRow() {
            return (options.frozenColumn > -1) ? $headerRow : $headerRow[0];
        }

        function getHeaderRowColumn(columnId) {
            var idx = getColumnIndex(columnId);

            var $headerRowTarget;

            if (options.frozenColumn > -1) {
                if (idx <= options.frozenColumn) {
                    $headerRowTarget = $headerRowL;
                } else {
                    $headerRowTarget = $headerRowR;

                    idx -= options.frozenColumn + 1;
                }
            } else {
                $headerRowTarget = $headerRowL;
            }

            var $header = $headerRowTarget.children().eq(idx);
            return $header && $header[0];
        }

        function createColumnHeaders() {
            function hoverBegin() {
                $(this).addClass("ui-state-hover");
            }

            function hoverEnd() {
                $(this).removeClass("ui-state-hover");
            }

            $headerL.empty();
            $headerR.empty();
            $headerRowL.empty();
            $headerRowR.empty();
            columnsById = {};

            for (var i = 0; i < columns.length; i++) {
                var m = columns[i] = $.extend({}, columnDefaults, columns[i]);
                columnsById[m.id] = i;

                var $headerTarget = (options.frozenColumn > -1) ? ((i <= options.frozenColumn) ? $headerL : $headerR) : $headerL;
                var $headerRowTarget = (options.frozenColumn > -1) ? ((i <= options.frozenColumn) ? $headerRowL : $headerRowR) : $headerRowL;

                var header = $("<div class='ui-state-default slick-header-column' id='" + uid + m.id + "' />").html("<span class='slick-column-name'>" + m.name + "</span>").width(m.width - headerColumnWidthDiff).attr("title", m.toolTip || m.name || "").data("fieldId", m.id).addClass(m.headerCssClass || "").appendTo($headerTarget);

                if (options.enableColumnReorder || m.sortable) {
                    header.hover(hoverBegin, hoverEnd);
                }

                if (m.sortable) {
                    header.append("<span class='slick-sort-indicator' />");
                }

                if (options.showHeaderRow) {
                    $("<div class='ui-state-default slick-headerrow-column l" + i + " r" + i + "'></div>").appendTo($headerRowTarget);
                }
            }

            if (options.showHeaderRow) {
                // add a spacer to let the container scroll beyond the header row columns width
                $("<div style='display:block;height:1px;width:10000px;position:absolute;top:0;left:0;'></div>").appendTo($headerRowScroller);
            }

            setSortColumns(sortColumns);
            setupColumnResize();
            if (options.enableColumnReorder) {
                setupColumnReorder();
            }
        }

        function setupColumnSort() {
            $headers.click(function(e) {
                // temporary workaround for a bug in jQuery 1.7.1
                // (http://bugs.jquery.com/ticket/11328)
                e.metaKey = e.metaKey || e.ctrlKey;

                if ($(e.target).hasClass("slick-resizable-handle")) {
                    return;
                }

                var $col = $(e.target).closest(".slick-header-column");
                if (!$col.length) {
                    return;
                }

                var column = columns[getColumnIndex($col.data("fieldId"))];
                if (column.sortable) {
                    if (!getEditorLock().commitCurrentEdit()) {
                        return;
                    }

                    var sortOpts = null;
                    var i = 0;
                    for (; i < sortColumns.length; i++) {
                        if (sortColumns[i].columnId == column.id) {
                            sortOpts = sortColumns[i];
                            sortOpts.sortAsc = !sortOpts.sortAsc;
                            break;
                        }
                    }

                    if (e.metaKey && options.multiColumnSort) {
                        if (sortOpts) {
                            sortColumns.splice(i, 1);
                        }
                    } else {
                        if ((!e.shiftKey && !e.metaKey) || !options.multiColumnSort) {
                            sortColumns = [];
                        }

                        if (!sortOpts) {
                            sortOpts = {
                                columnId: column.id,
                                sortAsc: true
                            };
                            sortColumns.push(sortOpts);
                        } else if (sortColumns.length == 0) {
                            sortColumns.push(sortOpts);
                        }
                    }

                    setSortColumns(sortColumns);

                    if (!options.multiColumnSort) {
                        trigger(self.onSort, {
                            multiColumnSort: false,
                            sortCol: column,
                            sortAsc: sortOpts.sortAsc
                        }, e);
                    } else {
                        trigger(
                        self.onSort, {
                            multiColumnSort: true,
                            sortCols: $.map(
                            sortColumns, function(col) {
                                return {
                                    sortCol: columns[getColumnIndex(col.columnId)],
                                    sortAsc: col.sortAsc
                                };
                            })
                        }, e);
                    }
                }
            });
        }

        function setupColumnReorder() {
            var columnScrollTimer = null;

            function scrollColumnsRight() {
                $viewportScrollContainer[0].scrollLeft = $viewportScrollContainer[0].scrollLeft + 10;
            }

            function scrollColumnsLeft() {
                $viewportScrollContainer[0].scrollLeft = $viewportScrollContainer[0].scrollLeft - 10;
            }

            $headers.sortable({
                containment: "parent",
                axis: "x",
                cursor: "default",
                tolerance: "intersection",
                helper: "clone",
                placeholder: "slick-sortable-placeholder ui-state-default slick-header-column",
                forcePlaceholderSize: true,
                start: function(e, ui) {
                    $(ui.helper).addClass("slick-header-column-active");
                },
                beforeStop: function(e, ui) {
                    $(ui.helper).removeClass("slick-header-column-active");
                },
                sort: function(e, ui) {
                    if (e.originalEvent.pageX > $container[0].clientWidth) {
                        if (!(columnScrollTimer)) {
                            columnScrollTimer = setInterval(
                            scrollColumnsRight, 100);
                        }
                    } else if (e.originalEvent.pageX < $viewportScrollContainer.offset().left) {
                        if (!(columnScrollTimer)) {
                            columnScrollTimer = setInterval(
                            scrollColumnsLeft, 100);
                        }
                    } else {
                        clearInterval(columnScrollTimer);
                        columnScrollTimer = null;
                    }
                },
                stop: function(e) {
                    clearInterval(columnScrollTimer);
                    columnScrollTimer = null;

                    if (!getEditorLock().commitCurrentEdit()) {
                        $(this).sortable("cancel");
                        return;
                    }

                    var reorderedIds = $headerL.sortable("toArray");
                    reorderedIds = reorderedIds.concat($headerR.sortable("toArray"));

                    var reorderedColumns = [];
                    for (var i = 0; i < reorderedIds.length; i++) {
                        reorderedColumns.push(columns[getColumnIndex(reorderedIds[i].replace(uid, ""))]);
                    }
                    setColumns(reorderedColumns);

                    trigger(self.onColumnsReordered, {});
                    e.stopPropagation();
                    setupColumnResize();
                }
            });
        }

        function setupColumnResize() {
            var $col, j, c, pageX, columnElements, minPageX, maxPageX, firstResizable, lastResizable, originalCanvasWidth;
            columnElements = $headers.children();
            columnElements.find(".slick-resizable-handle").remove();
            columnElements.each(function(i,e) {
                if (columns[i].resizable) {
                    if (firstResizable === undefined) { firstResizable = i; }
                    lastResizable = i;
                }
            });
            if (firstResizable === undefined) {
                return;
            }
            columnElements.each(function(i,e) {
                if (i < firstResizable || (options.forceFitColumns && i >= lastResizable)) { return; }
                $col = $(e);
                $("<div class='slick-resizable-handle' />")
                    .appendTo(e)
                    .hover(
                        function() {
                            $(this).toggleClass( 'slick-resizable-handle-hover' );
                        },
                        function() {
                            $(this).toggleClass( 'slick-resizable-handle-hover' );
                        }
                    )
                    .on("dragstart", function(e,dd) {
                        if (!getEditorLock().commitCurrentEdit()) { return false; }
                        pageX = e.pageX;
                        $(this).parent().addClass("slick-header-column-active");
                        var shrinkLeewayOnRight = null, stretchLeewayOnRight = null;
                        // lock each column's width option to current width
                        columnElements.each(function(i,e) { columns[i].previousWidth = $(e).outerWidth(); });
                        if (options.forceFitColumns) {
                            shrinkLeewayOnRight = 0;
                            stretchLeewayOnRight = 0;
                            // colums on right affect maxPageX/minPageX
                            for (j = i + 1; j < columnElements.length; j++) {
                                c = columns[j];
                                if (c.resizable) {
                                    if (stretchLeewayOnRight !== null) {
                                        if (c.maxWidth) {
                                            stretchLeewayOnRight += c.maxWidth - c.previousWidth;
                                        }
                                        else {
                                            stretchLeewayOnRight = null;
                                        }
                                    }
                                    shrinkLeewayOnRight += c.previousWidth - Math.max(c.minWidth || 0, absoluteColumnMinWidth);
                                }
                            }
                        }
                        var shrinkLeewayOnLeft = 0, stretchLeewayOnLeft = 0;
                        for (j = 0; j <= i; j++) {
                            // columns on left only affect minPageX
                            c = columns[j];
                            if (c.resizable) {
                                if (stretchLeewayOnLeft !== null) {
                                    if (c.maxWidth) {
                                        stretchLeewayOnLeft += c.maxWidth - c.previousWidth;
                                    }
                                    else {
                                        stretchLeewayOnLeft = null;
                                    }
                                }
                                shrinkLeewayOnLeft += c.previousWidth - Math.max(c.minWidth || 0, absoluteColumnMinWidth);
                            }
                        }

                        if (shrinkLeewayOnRight === null) { shrinkLeewayOnRight = 100000; }
                        if (shrinkLeewayOnLeft === null) { shrinkLeewayOnLeft = 100000; }
                        if (stretchLeewayOnRight === null) { stretchLeewayOnRight = 100000; }
                        if (stretchLeewayOnLeft === null) { stretchLeewayOnLeft = 100000; }
                        maxPageX = pageX + Math.min(shrinkLeewayOnRight, stretchLeewayOnLeft);
                        minPageX = pageX - Math.min(shrinkLeewayOnLeft, stretchLeewayOnRight);
                        originalCanvasWidth = $canvas.width();
                    })
                    .on("drag", function(e,dd) {
                        var actualMinWidth, d = Math.min(maxPageX, Math.max(minPageX, e.pageX)) - pageX, x, ci;
                        if (d < 0) { // shrink column
                            x = d;
                            for (j = i; j >= 0; j--) {
                                c = columns[j];
                                if (c.resizable) {
                                    actualMinWidth = Math.max(c.minWidth || 0, absoluteColumnMinWidth);
                                    if (x && c.previousWidth + x < actualMinWidth) {
                                        x += c.previousWidth - actualMinWidth;
                                        c.width = actualMinWidth;
                                    } else {
                                        c.width = c.previousWidth + x;
                                        x = 0;
                                    }
                                }
                            }

                            if (options.forceFitColumns) {
                                x = -d;
                                for (j = i + 1; j < columnElements.length; j++) {
                                    c = columns[j];
                                    if (c.resizable) {
                                        if (x && c.maxWidth && (c.maxWidth - c.previousWidth < x)) {
                                            x -= c.maxWidth - c.previousWidth;
                                            c.width = c.maxWidth;
                                        } else {
                                            c.width =  c.previousWidth + x;
                                            x = 0;
                                        }
                                    }
                                }
                            } else if (options.syncColumnCellResize) {
                                setCanvasWidth(originalCanvasWidth + d);
                            }
                        } else { // stretch column
                            x = d;
                            for (j = i; j >= 0; j--) {
                                c = columns[j];
                                if (c.resizable) {
                                    if (x && c.maxWidth && (c.maxWidth - c.previousWidth < x)) {
                                        x -= c.maxWidth - c.previousWidth;
                                        c.width = c.maxWidth;
                                    } else {
                                        c.width = c.previousWidth + x;
                                        x = 0;
                                    }
                                }
                            }

                            if (options.forceFitColumns) {
                                x = -d;
                                for (j = i + 1; j < columnElements.length; j++) {
                                    c = columns[j];
                                    if (c.resizable) {
                                        actualMinWidth = Math.max(c.minWidth || 0, absoluteColumnMinWidth);
                                        if (x && c.previousWidth + x < actualMinWidth) {
                                            x += c.previousWidth - actualMinWidth;
                                            c.width = actualMinWidth;
                                        } else {
                                            c.width = c.previousWidth + x;
                                            x = 0;
                                        }
                                    }
                                }
                            } else if (options.syncColumnCellResize) {
                                setCanvasWidth(originalCanvasWidth + d);
                            }
                        }
                        applyColumnHeaderWidths();
                        if (options.syncColumnCellResize) {
                            applyColumnWidths();
                        }
                    })
                    .on("dragend", function(e,dd) {
                        var newWidth;
                        $(this).parent().removeClass("slick-header-column-active");
                        for (j = 0; j < columnElements.length; j++) {
                            c = columns[j];
                            newWidth = $(columnElements[j]).outerWidth();

                            if (c.previousWidth !== newWidth && c.rerenderOnResize) {
                                invalidateAllRows();
                            }
                        }
                        applyColumnWidths();
                        resizeCanvas();
                        trigger(self.onColumnsResized, {});
                    });
                });
        }

        function getVBoxDelta($el) {
            var p = ["borderTopWidth", "borderBottomWidth", "paddingTop", "paddingBottom"];
            var delta = 0;
            $.each(p, function(n, val) {
                delta += parseFloat($el.css(val)) || 0;
            });
            return delta;
        }

        function setPaneVisibility() {
            if (options.frozenColumn > -1) {
                $paneTopR.show();

                if (options.frozenRow > -1) {
                    $paneBottomL.show();
                    $paneBottomR.show();
                } else {
                    $paneBottomR.hide();
                    $paneBottomL.hide();
                }
            } else {
                $paneTopR.hide();
                $paneBottomR.hide();

                if (options.frozenRow > -1) {
                    $paneBottomL.show();
                } else {
                    $paneBottomR.hide();
                    $paneBottomL.hide();
                }
            }
        }

        function setOverflow() {
            $viewportTopL.css({
                'overflow-x': (options.frozenColumn > -1) ? (options.frozenRow > -1) ? 'hidden' : 'scroll' : (options.frozenRow > -1) ? 'hidden' : 'auto',
                'overflow-y': (options.frozenColumn > -1) ? (options.frozenRow > -1) ? 'hidden' : 'hidden' : (options.frozenRow > -1) ? 'scroll' : 'auto'
            });

            $viewportTopR.css({
                'overflow-x': (options.frozenColumn > -1) ? (options.frozenRow > -1) ? 'hidden' : 'scroll' : (options.frozenRow > -1) ? 'hidden' : 'auto',
                'overflow-y': (options.frozenColumn > -1) ? (options.frozenRow > -1) ? 'scroll' : 'scroll' : (options.frozenRow > -1) ? 'scroll' : 'auto'
            });

            $viewportBottomL.css({
                'overflow-x': (options.frozenColumn > -1) ? (options.frozenRow > -1) ? 'scroll' : 'auto' : (options.frozenRow > -1) ? 'auto' : 'auto',
                'overflow-y': (options.frozenColumn > -1) ? (options.frozenRow > -1) ? 'hidden' : 'hidden' : (options.frozenRow > -1) ? 'scroll' : 'auto'
            });

            $viewportBottomR.css({
                'overflow-x': (options.frozenColumn > -1) ? (options.frozenRow > -1) ? 'auto' : 'auto' : (options.frozenRow > -1) ? 'auto' : 'auto',
                'overflow-y': (options.frozenColumn > -1) ? (options.frozenRow > -1) ? 'auto' : 'auto' : (options.frozenRow > -1) ? 'auto' : 'auto'
            });
        }

        function setScroller() {
            if (options.frozenColumn > -1) {
                if (options.frozenRow > -1) {
                    $viewportScrollContainer = $viewportBottomR;
                } else {
                    $viewportScrollContainer = $viewportTopR;
                }
            } else {
                if (options.frozenRow > -1) {
                    $viewportScrollContainer = $viewportBottomL;
                } else {
                    $viewportScrollContainer = $viewportTopL;
                }
            }
        }

        function measureCellPaddingAndBorder() {
            var el;
            var h = ["borderLeftWidth", "borderRightWidth", "paddingLeft", "paddingRight"];
            var v = ["borderTopWidth", "borderBottomWidth", "paddingTop", "paddingBottom"];

            el = $("<div class='ui-state-default slick-header-column' style='visibility:hidden'>-</div>").appendTo($headers);
            headerColumnWidthDiff = headerColumnHeightDiff = 0;
            $.each(h, function(n, val) {
                headerColumnWidthDiff += parseFloat(el.css(val)) || 0;
            });
            $.each(v, function(n, val) {
                headerColumnHeightDiff += parseFloat(el.css(val)) || 0;
            });
            el.remove();

            var r = $("<div class='slick-row' />").appendTo($canvas);
            el = $("<div class='slick-cell' id='' style='visibility:hidden'>-</div>").appendTo(r);
            cellWidthDiff = cellHeightDiff = 0;
            $.each(h, function(n, val) {
                cellWidthDiff += parseFloat(el.css(val)) || 0;
            });
            $.each(v, function(n, val) {
                cellHeightDiff += parseFloat(el.css(val)) || 0;
            });
            r.remove();

            absoluteColumnMinWidth = Math.max(headerColumnWidthDiff, cellWidthDiff);
        }

        function createCssRules() {
            $style = $("<style type='text/css' rel='stylesheet' />").appendTo($("head"));
            var rowHeight = (options.rowHeight - cellHeightDiff);
            var rules = ["." + uid + " .slick-header-column { left: 1000px; }", "." + uid + " .slick-top-panel { height:" + options.topPanelHeight + "px; }", "." + uid + " .slick-headerrow-columns { height:" + options.headerRowHeight + "px; }", "." + uid + " .slick-cell { height:" + rowHeight + "px; }", "." + uid + " .slick-row { height:" + options.rowHeight + "px; }"];

            for (var i = 0; i < columns.length; i++) {
                rules.push("." + uid + " .l" + i + " { }");
                rules.push("." + uid + " .r" + i + " { }");
            }

            if ($style[0].styleSheet) { // IE
                $style[0].styleSheet.cssText = rules.join(" ");
            } else {
                $style[0].appendChild(document.createTextNode(rules.join(" ")));
            }
        }

        function getColumnCssRules(idx) {
            if (!stylesheet) {
                var sheets = document.styleSheets;
                for (var i = 0; i < sheets.length; i++) {
                    if ((sheets[i].ownerNode || sheets[i].owningElement) == $style[0]) {
                        stylesheet = sheets[i];
                        break;
                    }
                }

                if (!stylesheet) {
                    throw new Error("Cannot find stylesheet.");
                }

                // find and cache column CSS rules
                columnCssRulesL = [];
                columnCssRulesR = [];
                var cssRules = (stylesheet.cssRules || stylesheet.rules);
                var matches, columnIdx;
                for (var i = 0; i < cssRules.length; i++) {
                    var selector = cssRules[i].selectorText;
                    if (matches = /\.l\d+/.exec(selector)) {
                        columnIdx = parseInt(matches[0].substr(2, matches[0].length - 2), 10);
                        columnCssRulesL[columnIdx] = cssRules[i];
                    } else if (matches = /\.r\d+/.exec(selector)) {
                        columnIdx = parseInt(matches[0].substr(2, matches[0].length - 2), 10);
                        columnCssRulesR[columnIdx] = cssRules[i];
                    }
                }
            }

            return {
                "left": columnCssRulesL[idx],
                "right": columnCssRulesR[idx]
            };
        }

        function removeCssRules() {
            $style.remove();
            stylesheet = null;
        }

        function destroy() {
            getEditorLock().cancelCurrentEdit();

            trigger(self.onBeforeDestroy, {});

            for (var i = 0; i < plugins.length; i++) {
                unregisterPlugin(plugins[i]);
            }

            if (options.enableColumnReorder && $headers.sortable) {
                $headers.sortable("destroy");
            }

            unbindAncestorScrollEvents();
            $container.unbind(".slickgrid");
            removeCssRules();

            $canvas.unbind("draginit dragstart dragend drag");
            $container.empty().removeClass(uid);
        }

        // ////////////////////////////////////////////////////////////////////////////////////////////
        // General

        function trigger(evt, args, e) {
            e = e || new Slick.EventData();
            args = args || {};
            args.grid = self;
            return evt.notify(args, e, self);
        }

        function getEditorLock() {
            return options.editorLock;
        }

        function getEditController() {
            return editController;
        }

        function getColumnIndex(id) {
            return columnsById[id];
        }

        function autosizeColumns() {
            var i, c, widths = [],
                shrinkLeeway = 0,
                total = 0,
                prevTotal, availWidth = viewportHasVScroll ? viewportW - scrollbarDimensions.width : viewportW;

            for (i = 0; i < columns.length; i++) {
                c = columns[i];
                widths.push(c.width);
                total += c.width;
                if (c.resizable) {
                    shrinkLeeway += c.width - Math.max(c.minWidth, absoluteColumnMinWidth);
                }
            }

            // shrink
            prevTotal = total;
            while (total > availWidth && shrinkLeeway) {
                var shrinkProportion = (total - availWidth) / shrinkLeeway;
                for (i = 0; i < columns.length && total > availWidth; i++) {
                    c = columns[i];
                    var width = widths[i];
                    if (!c.resizable || width <= c.minWidth || width <= absoluteColumnMinWidth) {
                        continue;
                    }
                    var absMinWidth = Math.max(c.minWidth, absoluteColumnMinWidth);
                    var shrinkSize = Math.floor(shrinkProportion * (width - absMinWidth)) || 1;
                    shrinkSize = Math.min(shrinkSize, width - absMinWidth);
                    total -= shrinkSize;
                    shrinkLeeway -= shrinkSize;
                    widths[i] -= shrinkSize;
                }
                if (prevTotal == total) { // avoid infinite loop
                    break;
                }
                prevTotal = total;
            }

            // grow
            prevTotal = total;
            while (total < availWidth) {
                var growProportion = availWidth / total;
                for (i = 0; i < columns.length && total < availWidth; i++) {
                    c = columns[i];
                    if (!c.resizable || c.maxWidth <= c.width) {
                        continue;
                    }
                    var growSize = Math.min(Math.floor(growProportion * c.width) - c.width, (c.maxWidth - c.width) || 1000000) || 1;
                    total += growSize;
                    widths[i] += growSize;
                }
                if (prevTotal == total) { // avoid infinite loop
                    break;
                }
                prevTotal = total;
            }

            var reRender = false;
            for (i = 0; i < columns.length; i++) {
                if (columns[i].rerenderOnResize && columns[i].width != widths[i]) {
                    reRender = true;
                }
                columns[i].width = widths[i];
            }

            applyColumnHeaderWidths();
            updateCanvasWidth(true);
            if (reRender) {
                invalidateAllRows();
                render();
            }
        }

        function applyColumnHeaderWidths() {
            if (!initialized) {
                return;
            }
            var h;
            for (var i = 0, headers = $headers.children(), ii = headers.length; i < ii; i++) {
                h = $(headers[i]);
                if (h.width() !== columns[i].width - headerColumnWidthDiff) {
                    h.width(columns[i].width - headerColumnWidthDiff);
                }
            }
        }

        function applyColumnWidths() {
            var x = 0,
                w, rule;
            for (var i = 0; i < columns.length; i++) {
                w = columns[i].width;

                rule = getColumnCssRules(i);
                rule.left.style.left = x + "px";
                rule.right.style.right = (((options.frozenColumn != -1 && i > options.frozenColumn) ? canvasWidthR : canvasWidthL) - x - w) + "px";

                // If this column is frozen, reset the css left value since the
                // column starts in a new viewport.
                if (options.frozenColumn == i) {
                    x = 0;
                } else {
                    x += columns[i].width;
                }
            }
        }

        function setSortColumn(columnId, ascending) {
            setSortColumns([{
                columnId: columnId,
                sortAsc: ascending
            }]);
        }

        function setSortColumns(cols) {
            sortColumns = cols;

            var headerColumnEls = $headers.children();
            headerColumnEls.removeClass("slick-header-column-sorted").find(".slick-sort-indicator").removeClass("slick-sort-indicator-asc slick-sort-indicator-desc");

            $.each(sortColumns, function(i, col) {
                if (col.sortAsc == null) {
                    col.sortAsc = true;
                }
                var columnIndex = getColumnIndex(col.columnId);
                if (columnIndex != null) {
                    headerColumnEls.eq(columnIndex).addClass("slick-header-column-sorted").find(".slick-sort-indicator").addClass(
                    col.sortAsc ? "slick-sort-indicator-asc" : "slick-sort-indicator-desc");
                }
            });
        }

        function getSortColumns() {
            return sortColumns;
        }

        function handleSelectedRangesChanged(e, ranges) {
            selectedRows = [];
            var hash = {};
            for (var i = 0; i < ranges.length; i++) {
                for (var j = ranges[i].fromRow; j <= ranges[i].toRow; j++) {
                    if (!hash[j]) { // prevent duplicates
                        selectedRows.push(j);
                    }
                    hash[j] = {};
                    for (var k = ranges[i].fromCell; k <= ranges[i].toCell; k++) {
                        if (canCellBeSelected(j, k)) {
                            hash[j][columns[k].id] = options.selectedCellCssClass;
                        }
                    }
                }
            }

            setCellCssStyles(options.selectedCellCssClass, hash);

            trigger(self.onSelectedRowsChanged, {
                rows: getSelectedRows()
            }, e);
        }

        function getColumns() {
            return columns;
        }

        function setColumns(columnDefinitions) {
            columns = columnDefinitions;
            if (initialized) {
                setPaneVisibility();
                setOverflow();

                invalidateAllRows();
                createColumnHeaders();
                removeCssRules();
                createCssRules();
                updateCanvasWidth();
                resizeCanvas();
                applyColumnWidths();
                handleScroll();
            }
        }

        function getOptions() {
            return options;
        }

        function setOptions(args) {
            if (!getEditorLock().commitCurrentEdit()) {
                return;
            }

            makeActiveCellNormal();

            if (options.enableAddRow !== args.enableAddRow) {
                invalidateRow(getDataLength());
            }

            options = $.extend(options, args);

            setScroller();

            setColumns(columns); // TODO: Is this necessary?
            render(); // TODO: Is this necessary?
        }

        function setData(newData, scrollToTop) {
            data = newData;
            invalidateAllRows();
            updateRowCount();

            if (scrollToTop) {
                scrollTo(0);
            }
        }

        function getData() {
            return data;
        }

        function getDataLength() {
            if (data.getLength) {
                return data.getLength();
            } else {
                return data.length;
            }
        }

        function getDataItem(i) {
            if (data.getItem) {
                return data.getItem(i);
            } else {
                return data[i];
            }
        }

        function getTopPanel() {
            return $topPanel[0];
        }

        function showTopPanel() {
            options.showTopPanel = true;
            $topPanelScroller.slideDown("fast", resizeCanvas);
        }

        function hideTopPanel() {
            options.showTopPanel = false;
            $topPanelScroller.slideUp("fast", resizeCanvas);
        }

        function showHeaderRowColumns() {
            options.showHeaderRow = true;
            $headerRowScroller.slideDown("fast", resizeCanvas);
        }

        function hideHeaderRowColumns() {
            options.showHeaderRow = false;
            $headerRowScroller.slideUp("fast", resizeCanvas);
        }

        // ////////////////////////////////////////////////////////////////////////////////////////////
        // Rendering / Scrolling

        function scrollTo(y) {
            var oldOffset = offset;

            page = Math.min(n - 1, Math.floor(y / ph));
            offset = Math.round(page * cj);
            var newScrollTop = y - offset;

            if (offset != oldOffset) {
                var range = getVisibleRange(newScrollTop);
                cleanupRows(range.top, range.bottom);
                updateRowPositions();
            }

            var currentRow = Math.ceil(Math.abs(y / options.rowHeight));

            if (prevScrollTop != newScrollTop) {
                scrollDir = (prevScrollTop + oldOffset < newScrollTop + offset) ? 1 : -1;

                lastRenderedScrollTop = scrollTop = prevScrollTop = newScrollTop;

                var newTop = options.rowHeight * currentRow;

                if (options.frozenColumn > -1) {
                    $viewportTopR[0].scrollTop = newTop;
                }

                if (options.frozenRow > -1) {
                    $viewportBottomL[0].scrollTop = $viewportBottomR[0].scrollTop = newTop;
                }

                $viewportTopL[0].scrollTop = newTop;

                trigger(self.onViewportChanged, {});
            }
        }

        function defaultFormatter(row, cell, value, columnDef, dataContext) {
            if (value == null) {
                return "";
            } else {
                return value.toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
            }
        }

        function getFormatter(row, column) {
            var rowMetadata = data.getItemMetadata && data.getItemMetadata(row);

            // look up by id, then index
            var columnOverrides = rowMetadata && rowMetadata.columns && (rowMetadata.columns[column.id] || rowMetadata.columns[getColumnIndex(column.id)]);

            return (columnOverrides && columnOverrides.formatter) || (rowMetadata && rowMetadata.formatter) || column.formatter || (options.formatterFactory && options.formatterFactory.getFormatter(column)) || options.defaultFormatter;
        }

        function getEditor(row, cell) {
            var column = columns[cell];
            var rowMetadata = data.getItemMetadata && data.getItemMetadata(row);
            var columnMetadata = rowMetadata && rowMetadata.columns;

            if (columnMetadata && columnMetadata[column.id] && columnMetadata[column.id].editor !== undefined) {
                return columnMetadata[column.id].editor;
            }
            if (columnMetadata && columnMetadata[cell] && columnMetadata[cell].editor !== undefined) {
                return columnMetadata[cell].editor;
            }

            return column.editor || (options.editorFactory && options.editorFactory.getEditor(column));
        }

        function getDataItemValueForColumn(item, columnDef) {
            if (options.dataItemColumnValueExtractor) {
                return options.dataItemColumnValueExtractor(item, columnDef);
            }
            return item[columnDef.field];
        }

        function appendRowHtml(stringArrayL, stringArrayR, row) {
            var d = getDataItem(row);
            var dataLoading = row < getDataLength() && !d;
            var cellCss;
            var rowCss = "slick-row " + (dataLoading ? " loading" : "") + (row % 2 == 1 ? " odd" : " even");

            var metadata = data.getItemMetadata && data.getItemMetadata(row);

            if (metadata && metadata.cssClasses) {
                rowCss += " " + metadata.cssClasses;
            }

            var frozenRowOffset = (options.frozenRow > -1 && row >= options.frozenRow) ? options.rowHeight * options.frozenRow : 0;

            var rowHtml = "<div class='ui-widget-content " + rowCss + "' row='" + row + "' style='top:" + (options.rowHeight * row - offset - frozenRowOffset) + "px'>";

            stringArrayL.push(rowHtml);

            if (options.frozenColumn > -1) {
                stringArrayR.push(rowHtml);
            }

            var colspan, m;
            for (var i = 0, cols = columns.length; i < cols; i++) {
                m = columns[i];
                colspan = getColspan(row, i); // TODO: don't calc unless we have to
                cellCss = "slick-cell l" + i + " r" + Math.min(columns.length - 1, i + colspan - 1) + (m.cssClass ? " " + m.cssClass : "");
                if (row === activeRow && i === activeCell) {
                    cellCss += (" active");
                }

                // TODO: merge them together in the setter
                for (var key in cellCssClasses) {
                    if (cellCssClasses[key][row] && cellCssClasses[key][row][m.id]) {
                        cellCss += (" " + cellCssClasses[key][row][m.id]);
                    }
                }

                if ((options.frozenColumn > -1) && (i > options.frozenColumn)) {
                    stringArrayR.push("<div class='" + cellCss + "'>");
                } else {
                    stringArrayL.push("<div class='" + cellCss + "'>");
                }

                // if there is a corresponding row (if not, this is the Add New
                // row or this data hasn't been loaded yet)
                if (d) {
                    if ((options.frozenColumn > -1) && (i > options.frozenColumn)) {
                        stringArrayR.push(getFormatter(row, m)(row, i, getDataItemValueForColumn(d, m), m, d));
                    } else {
                        stringArrayL.push(getFormatter(row, m)(row, i, getDataItemValueForColumn(d, m), m, d));
                    }
                }

                if ((options.frozenColumn > -1) && (i > options.frozenColumn)) {
                    stringArrayR.push("</div>");
                } else {
                    stringArrayL.push("</div>");
                }

                if (colspan) {
                    i += (colspan - 1);
                }
            }

            stringArrayL.push("</div>");

            if (options.frozenColumn > -1) {
                stringArrayR.push("</div>");
            }
        }

        function cleanupRows(rangeToKeep) {
            for (var i in rowsCache) {
                if (((i = parseInt(i, 10)) !== activeRow) && (i < rangeToKeep.top || i > rangeToKeep.bottom) && (options.frozenRow > -1 && i >= options.frozenRow)) {
                    removeRowFromCache(i);
                }
            }
        }

        function invalidate() {
            updateRowCount();
            invalidateAllRows();
            render();
        }

        function invalidateAllRows() {
            if (currentEditor) {
                makeActiveCellNormal();
            }
            for (var row in rowsCache) {
                removeRowFromCache(row);
            }
        }

        function removeRowFromCache(row) {
            var node = rowsCache[row];
            if (!node) {
                return;
            }

            $canvas.find(".slick-row[row=" + row + "]").remove();

            delete rowsCache[row];
            delete postProcessedRows[row];
            renderedRows--;
            counter_rows_removed++;
        }

        function invalidateRows(rows) {
            var i, rl;
            if (!rows || !rows.length) {
                return;
            }
            scrollDir = 0;
            for (i = 0, rl = rows.length; i < rl; i++) {
                if (currentEditor && activeRow === rows[i]) {
                    makeActiveCellNormal();
                }
                if (rowsCache[rows[i]]) {
                    removeRowFromCache(rows[i]);
                }
            }
        }

        function invalidateRow(row) {
            invalidateRows([row]);
        }

        function updateCell(row, cell) {
            var cellNode = getCellNode(row, cell);
            if (!cellNode) {
                return;
            }

            var m = columns[cell],
                d = getDataItem(row);
            if (currentEditor && activeRow === row && activeCell === cell) {
                currentEditor.loadValue(d);
            } else {
                cellNode.innerHTML = d ? getFormatter(row, m)(row, cell, getDataItemValueForColumn(d, m), m, d) : "";
                invalidatePostProcessingResults(row);
            }
        }

        function updateRow(row) {
            if (!rowsCache[row]) {
                return;
            }

            var columnIndex = 0
            $(rowsCache[row]).children().each(

            function(i) {
                var m = columns[columnIndex],
                    d = getDataItem(row);
                if (row === activeRow && i === activeCell && currentEditor) {
                    currentEditor.loadValue(getDataItem(activeRow));
                } else if (d) {
                    this.innerHTML = getFormatter(row, m)(row, columnIndex, getDataItemValueForColumn(d, m), m, getDataItem(row));
                } else {
                    this.innerHTML = "";
                }

                columnIndex += getColspan(row, i);
            });

            invalidatePostProcessingResults(row);
        }

        function getViewportHeight() {
            return parseFloat($.css($container[0], "height", true)) - parseFloat($.css($headerScroller[0], "height")) - getVBoxDelta($headerScroller) - (options.showTopPanel ? options.topPanelHeight + getVBoxDelta($topPanelScroller) : 0) - (options.showHeaderRow ? options.headerRowHeight + getVBoxDelta($headerRowScroller) : 0);
        }

        function resizeCanvas() {
            if (!initialized) {
                return;
            }

            if (options.autoHeight) {
                viewportH = options.rowHeight * (getDataLength() + (options.enableAddRow ? 1 : 0) + (options.leaveSpaceForNewRows ? numVisibleRows - 1 : 0));
            } else {
                viewportH = getViewportHeight();
            }

            numVisibleRows = Math.ceil(viewportH / options.rowHeight);
            viewportW = parseFloat($.css($container[0], "width", true));

            $viewportTopL.width(viewportW);

            var paneTopH = (options.frozenRow > -1) ? (options.rowHeight * options.frozenRow) + parseFloat($.css($headerScrollerL[0], "height")) + getVBoxDelta($headerScrollerL) + (options.showTopPanel ? options.topPanelHeight + getVBoxDelta($topPanelScroller) : 0) + (options.showHeaderRow ? options.headerRowHeight + getVBoxDelta($headerRowScroller) : 0) : parseFloat($.css($container[0], "height", true));

            $paneTopL.height(paneTopH);

            var viewportTopH = (options.frozenRow > -1) ? (options.rowHeight * options.frozenRow) : viewportH;

            $viewportTopL.height(viewportTopH);

            var paneBottomH = viewportH - viewportTopH + parseFloat($.css($headerScrollerL[0], "height")) + getVBoxDelta($headerScrollerL) + (options.showTopPanel ? options.topPanelHeight + getVBoxDelta($topPanelScroller) : 0) + (options.showHeaderRow ? options.headerRowHeight + getVBoxDelta($headerRowScroller) : 0);

            var viewportBottomH = viewportH - viewportTopH;

            if (options.frozenColumn > -1) {
                $paneTopR.css("left", canvasWidthL);
                $viewportTopL.width(canvasWidthL);
                $paneTopR.height(paneTopH);

                $viewportTopR.height(viewportTopH);
                $viewportTopR.width(viewportW - canvasWidthL);

                if (options.frozenRow > -1) {
                    $paneBottomL.css({
                        "top": paneTopH
                    });

                    $paneTopR.height(paneTopH);

                    $paneBottomR.css({
                        "top": paneTopH,
                        "left": canvasWidthL
                    });

                    $viewportBottomR.width(viewportW - canvasWidthL);
                    $viewportBottomR.height(viewportBottomH);
                }
            } else {
                $paneTopL.css({
                    'width': '100%'
                });

                $headerScrollerL.css({
                    'width': '100%'
                });

                $headerRowScrollerL.css({
                    'width': '100%'
                })

                if (options.frozenRow > -1) {
                    $paneBottomL.css({
                        "top": paneTopH,
                        'width': '100%'
                    });
                }
            }

            if (options.frozenRow > -1) {
                $paneTopR.height(paneTopH);
                $viewportBottomL.height(viewportBottomH);

                $canvasTopL.height(options.frozenRow * options.rowHeight);
                $canvasTopR.height(options.frozenRow * options.rowHeight);
            } else {
                $paneTopR.height(paneTopH);
                $viewportTopR.height(viewportTopH);
            }

            if (options.forceFitColumns) {
                autosizeColumns();
            }

            updateRowCount();
            render();
        }

        function updateRowCount() {
            if (!initialized) {
                return;
            }
            var oldH = (options.frozenRow > -1) ? $canvasBottomL.height() : $canvasTopL.height();
            numberOfRows = getDataLength() + (options.enableAddRow ? 1 : 0) + (options.leaveSpaceForNewRows ? numVisibleRows - 1 : 0);

            var oldViewportHasVScroll = viewportHasVScroll;
            // with autoHeight, we do not need to accommodate the vertical scroll bar
            viewportHasVScroll = !options.autoHeight && (numberOfRows * options.rowHeight > viewportH);

            // remove the rows that are now outside of the data range
            // this helps avoid redundant calls to .removeRow() when the size of
            // the data decreased by thousands of rows
            var l = options.enableAddRow ? getDataLength() : getDataLength() - 1;
            for (var i in rowsCache) {
                if (i >= l) {
                    removeRowFromCache(i);
                }
            }

            th = Math.max(options.rowHeight * numberOfRows, viewportH - scrollbarDimensions.height);
            if (th < maxSupportedCssHeight) {
                // just one page
                h = ph = th;
                n = 1;
                cj = 0;
            } else {
                // break into pages
                h = maxSupportedCssHeight;
                ph = h / 100;
                n = Math.floor(th / ph);
                cj = (th - h) / (n - 1);
            }

            if (h !== oldH) {
                if (options.frozenRow > -1) {
                    $canvasBottomL.css("height", h);
                    $canvasBottomR.css("height", h);
                } else {
                    $canvasTopL.css("height", h);
                    $canvasTopR.css("height", h);
                }

                scrollTop = $viewportScrollContainer[0].scrollTop;
            }

            var oldScrollTopInRange = (scrollTop + offset <= th - viewportH);

            if (th == 0 || scrollTop == 0) {
                page = offset = 0;
            } else if (oldScrollTopInRange) {
                // maintain virtual position
                scrollTo(scrollTop + offset);
            } else {
                // scroll to bottom
                scrollTo(th - viewportH);
            }

            if (h != oldH && options.autoHeight) {
                resizeCanvas();
            }

            if (options.forceFitColumns && oldViewportHasVScroll != viewportHasVScroll) {
                autosizeColumns();
            }
            updateCanvasWidth(false);
        }

        function getVisibleRange(viewportTop) {
            if (viewportTop == null) {
                viewportTop = scrollTop;
            }

            return {
                top: Math.floor((viewportTop + offset) / options.rowHeight),
                bottom: Math.ceil((viewportTop + offset + viewportH) / options.rowHeight)
            };
        }

        function getRenderedRange(viewportTop) {
            var range = getVisibleRange(viewportTop);
            var buffer = Math.round(viewportH / options.rowHeight);
            var minBuffer = 3;

            if (scrollDir == -1) {
                range.top -= buffer;
                range.bottom += minBuffer;
            } else if (scrollDir == 1) {
                range.top -= minBuffer;
                range.bottom += buffer;
            } else {
                range.top -= minBuffer;
                range.bottom += minBuffer;
            }

            range.top = Math.max(0, range.top);
            range.bottom = Math.min(options.enableAddRow ? getDataLength() : getDataLength() - 1, range.bottom);

            return range;
        }

        function renderRows(range) {
            var i, l, parentNode = $canvas[0],
                rowsBefore = renderedRows,
                stringArrayL = [],
                stringArrayR = [],
                rows = [],
                startTimestamp = new Date(),
                needToReselectCell = false;

            for (i = range.top; i <= range.bottom; i++) {
                if (rowsCache[i]) {
                    continue;
                }
                renderedRows++;
                rows.push(i);
                appendRowHtml(stringArrayL, stringArrayR, i);
                if (activeCellNode && activeRow === i) {
                    needToReselectCell = true;
                }
                counter_rows_rendered++;
            }

            if (!rows.length) {
                return;
            }

            var x = document.createElement("div"),
                xRight = document.createElement("div");

            x.innerHTML = stringArrayL.join("");
            xRight.innerHTML = stringArrayR.join("");

            for (i = 0, l = x.childNodes.length; i < l; i++) {
                if ((options.frozenRow > -1) && (rows[i] >= options.frozenRow)) {
                    if (options.frozenColumn > -1) {
                        rowsCache[rows[i]] = $().add(
                        $(x.firstChild).appendTo($canvasBottomL)).add(
                        $(xRight.firstChild).appendTo($canvasBottomR));
                    } else {
                        rowsCache[rows[i]] = $().add(
                        $(x.firstChild).appendTo($canvasBottomL));
                    }
                } else if (options.frozenColumn > -1) {
                    rowsCache[rows[i]] = $().add(
                    $(x.firstChild).appendTo($canvasTopL)).add(
                    $(xRight.firstChild).appendTo($canvasTopR));
                } else {
                    rowsCache[rows[i]] = $().add(
                    $(x.firstChild).appendTo($canvasTopL));
                }
            }

            if (needToReselectCell) {
                activeCellNode = getCellNode(activeRow, activeCell);
            }

            if (renderedRows - rowsBefore > 5) {
                avgRowRenderTime = (new Date() - startTimestamp) / (renderedRows - rowsBefore);
            }
        }

        function startPostProcessing() {
            if (!options.enableAsyncPostRender) {
                return;
            }
            clearTimeout(h_postrender);
            h_postrender = setTimeout(asyncPostProcessRows, options.asyncPostRenderDelay);
        }

        function invalidatePostProcessingResults(row) {
            delete postProcessedRows[row];
            postProcessFromRow = Math.min(postProcessFromRow, row);
            postProcessToRow = Math.max(postProcessToRow, row);
            startPostProcessing();
        }

        function updateRowPositions() {
            for (var row in rowsCache) {
                rowsCache[row].style.top = (row * options.rowHeight - offset) + "px";
            }
        }

        function render() {
            if (!initialized) {
                return;
            }
            var visible = getVisibleRange();
            var rendered = getRenderedRange();

            // remove rows no longer in the viewport
            cleanupRows(rendered);

            // add new rows
            renderRows(rendered);

            postProcessFromRow = visible.top;
            postProcessToRow = Math.min(options.enableAddRow ? getDataLength() : getDataLength() - 1, visible.bottom);
            startPostProcessing();

            lastRenderedScrollTop = scrollTop;
            h_render = null;
        }

        function handleScroll() {
            var $headerScrollContainer = (options.frozenColumn > -1) ? $headerScrollerR : $headerScrollerL;
            var $headerRowScrollContainer = (options.frozenColumn > -1) ? $headerRowScrollerR : $headerRowScrollerL;

            scrollTop = $viewportScrollContainer[0].scrollTop;

            var scrollLeft = $viewportScrollContainer[0].scrollLeft;

            var scrollDist = Math.abs(scrollTop - prevScrollTop);

            if (scrollLeft !== prevScrollLeft) {
                prevScrollLeft = scrollLeft;

                $headerScrollContainer[0].scrollLeft = scrollLeft;
                $topPanelScroller[0].scrollLeft = scrollLeft;
                $headerRowScrollContainer[0].scrollLeft = scrollLeft;

                if (options.frozenColumn > -1) {
                    if (options.frozenRow > -1) {
                        $viewportTopR[0].scrollLeft = scrollLeft;
                    }
                } else {
                    if (options.frozenRow > -1) {
                        $viewportTopL[0].scrollLeft = scrollLeft;
                    }
                }
            }

            if (scrollDist) {
                scrollDir = prevScrollTop < scrollTop ? 1 : -1;
                prevScrollTop = scrollTop;

                // switch virtual pages if needed
                if (scrollDist < viewportH) {
                    scrollTo(scrollTop + offset);
                } else {
                    var oldOffset = offset;
                    page = Math.min(n - 1, Math.floor(scrollTop * ((th - viewportH) / (h - viewportH)) * (1 / ph)));
                    offset = Math.round(page * cj);
                    if (oldOffset != offset) {
                        invalidateAllRows();
                    }
                }

                if ((options.frozenColumn > -1) && (options.frozenRow == -1)) {
                    $viewportTopL[0].scrollTop = scrollTop;
                } else if (options.frozenRow > -1) {
                    $viewportBottomL[0].scrollTop = scrollTop;
                }

                if (h_render) {

                    clearTimeout(h_render);
                }

                if (Math.abs(lastRenderedScrollTop - scrollTop) < viewportH) {
                    render();
                } else {
                    h_render = setTimeout(render, 50);
                }

                trigger(self.onViewportChanged, {});
            }

            trigger(self.onScroll, {
                scrollLeft: scrollLeft,
                scrollTop: scrollTop
            });
        }

        function handleMouseWheel(event, delta, deltaX, deltaY) {
            var range = getVisibleRange();

            if (delta > 0) {
                if (range.top == 0) {
                    return;
                }

                // Scroll up
                scrollRowIntoView(range.top - delta, false);
            } else {
                // Scroll down
                // TODO: Eliminate the -2 hack
                scrollRowIntoView(range.bottom - 2 + Math.abs(delta), false);
            }

            event.preventDefault();
        }

        function asyncPostProcessRows() {
            while (postProcessFromRow <= postProcessToRow) {
                var row = (scrollDir >= 0) ? postProcessFromRow++ : postProcessToRow--;
                var rowNode = rowsCache[row];
                if (!rowNode || postProcessedRows[row] || row >= getDataLength()) {
                    continue;
                }

                var d = getDataItem(row),
                    cellNodes = rowNode.childNodes;
                for (var i = 0, j = 0, l = columns.length; i < l; ++i) {
                    var m = columns[i];
                    if (m.asyncPostRender) {
                        m.asyncPostRender(cellNodes[j], postProcessFromRow, d, m);
                    }++j;
                }

                postProcessedRows[row] = true;
                h_postrender = setTimeout(asyncPostProcessRows, options.asyncPostRenderDelay);
                return;
            }
        }

        function updateCellCssStylesOnRenderedRows(addedHash, removedHash) {
            var node, columnId, addedRowHash, removedRowHash;
            for (var row in rowsCache) {
                removedRowHash = removedHash && removedHash[row];
                addedRowHash = addedHash && addedHash[row];

                if (removedRowHash) {
                    for (columnId in removedRowHash) {
                        if (!addedRowHash || removedRowHash[columnId] != addedRowHash[columnId]) {
                            node = getCellNode(row, getColumnIndex(columnId));
                            if (node) {
                                $(node).removeClass(removedRowHash[columnId]);
                            }
                        }
                    }
                }

                if (addedRowHash) {
                    for (columnId in addedRowHash) {
                        if (!removedRowHash || removedRowHash[columnId] != addedRowHash[columnId]) {
                            node = getCellNode(row, getColumnIndex(columnId));
                            if (node) {
                                $(node).addClass(addedRowHash[columnId]);
                            }
                        }
                    }
                }
            }
        }

        function addCellCssStyles(key, hash) {
            if (cellCssClasses[key]) {
                throw "addCellCssStyles: cell CSS hash with key '" + key + "' already exists.";
            }

            cellCssClasses[key] = hash;
            updateCellCssStylesOnRenderedRows(hash, null);

            trigger(self.onCellCssStylesChanged, {
                "key": key,
                "hash": hash
            });
        }

        function removeCellCssStyles(key) {
            if (!cellCssClasses[key]) {
                return;
            }

            updateCellCssStylesOnRenderedRows(null, cellCssClasses[key]);
            delete cellCssClasses[key];

            trigger(self.onCellCssStylesChanged, {
                "key": key,
                "hash": null
            });
        }

        function setCellCssStyles(key, hash) {
            var prevHash = cellCssClasses[key];

            cellCssClasses[key] = hash;
            updateCellCssStylesOnRenderedRows(hash, prevHash);

            trigger(self.onCellCssStylesChanged, {
                "key": key,
                "hash": hash
            });
        }

        function getCellCssStyles(key) {
            return cellCssClasses[key];
        }

        function flashCell(row, cell, speed) {
            speed = speed || 100;
            if (rowsCache[row]) {
                var $cell = $(getCellNode(row, cell));

                function toggleCellClass(times) {
                    if (!times) {
                        return;
                    }
                    setTimeout(function() {
                        $cell.queue(function() {
                            $cell.toggleClass(options.cellFlashingCssClass).dequeue();
                            toggleCellClass(times - 1);
                        });
                    }, speed);
                }

                toggleCellClass(4);
            }
        }

        // ////////////////////////////////////////////////////////////////////////////////////////////
        // Interactivity

        function handleDragInit(e, dd) {
            var cell = getCellFromEvent(e);
            if (!cell || !cellExists(cell.row, cell.cell)) {
                return false;
            }

            retval = trigger(self.onDragInit, dd, e);
            if (e.isImmediatePropagationStopped()) {
                return retval;
            }

            // if nobody claims to be handling drag'n'drop by stopping immediate
            // propagation, cancel out of it
            return false;
        }

        function handleDragStart(e, dd) {
            var cell = getCellFromEvent(e);
            if (!cell || !cellExists(cell.row, cell.cell)) {
                return false;
            }

            var retval = trigger(self.onDragStart, dd, e);
            if (e.isImmediatePropagationStopped()) {
                return retval;
            }

            return false;
        }

        function handleDrag(e, dd) {
            return trigger(self.onDrag, dd, e);
        }

        function handleDragEnd(e, dd) {
            trigger(self.onDragEnd, dd, e);
        }

        function handleKeyDown(e) {
            trigger(self.onKeyDown, {
                row: activeRow,
                cell: activeCell
            }, e);

            var handled = e.isImmediatePropagationStopped();

            if (!handled) {
                if (!e.shiftKey && !e.altKey && !e.ctrlKey) {
                    if (e.which == 27) {
                        if (!getEditorLock().isActive()) {
                            return; // no editing mode to cancel, allow bubbling and default processing (exit without cancelling the event)
                        }
                        cancelEditAndSetFocus();
                    } else if (e.which == 37) {
                        navigateLeft();
                    } else if (e.which == 39) {
                        navigateRight();
                    } else if (e.which == 38) {
                        navigateUp();
                    } else if (e.which == 40) {
                        navigateDown();
                    } else if (e.which == 9) {
                        navigateNext();
                    } else if (e.which == 13) {
                        if (options.editable) {
                            if (currentEditor) {
                                // adding new row
                                if (activeRow === getDataLength()) {
                                    navigateDown();
                                } else {
                                    commitEditAndSetFocus();
                                }
                            } else {
                                if (getEditorLock().commitCurrentEdit()) {
                                    makeActiveCellEditable();
                                }
                            }
                        }
                    } else {
                        return;
                    }
                } else if (e.which == 9 && e.shiftKey && !e.ctrlKey && !e.altKey) {
                    navigatePrev();
                } else {
                    return;
                }
            }

            // the event has been handled so don't let parent element
            // (bubbling/propagation) or browser (default) handle it
            e.stopPropagation();
            e.preventDefault();
            try {
                e.originalEvent.keyCode = 0; // prevent default behaviour for special keys in IE browsers (F3, F5, etc.)
            }
            // ignore exceptions - setting the original event's keycode throws
            // access denied exception for "Ctrl" (hitting control key only, nothing else), "Shift" (maybe others)
            catch (error) {}
        }

        function handleClick(e) {
            if (!currentEditor) {
              setFocus();
            }

            var cell = getCellFromEvent(e);
            if (!cell || (currentEditor !== null && activeRow == cell.row && activeCell == cell.cell)) {
                return;
            }

            trigger(self.onClick, {
                row: cell.row,
                cell: cell.cell
            }, e);
            if (e.isImmediatePropagationStopped()) {
                return;
            }

            if (canCellBeActive(cell.row, cell.cell)) {
                if (!getEditorLock().isActive() || getEditorLock().commitCurrentEdit()) {
                    if (options.frozenRow > -1) {
                        if (cell.row >= options.frozenRow) {
                            scrollRowIntoView(cell.row, false);
                        }
                    }

                    setActiveCellInternal(getCellNode(cell.row, cell.cell), (cell.row === getDataLength()) || options.autoEdit);
                }
            }
        }

        function handleContextMenu(e) {
            var $cell = $(e.target).closest(".slick-cell", $canvas);
            if ($cell.length === 0) {
                return;
            }

            // are we editing this cell?
            if (activeCellNode === $cell[0] && currentEditor !== null) {
                return;
            }

            trigger(self.onContextMenu, {}, e);
        }

        function handleDblClick(e) {
            var cell = getCellFromEvent(e);
            if (!cell || (currentEditor !== null && activeRow == cell.row && activeCell == cell.cell)) {
                return;
            }

            trigger(self.onDblClick, {
                row: cell.row,
                cell: cell.cell
            }, e);
            if (e.isImmediatePropagationStopped()) {
                return;
            }

            if (options.editable) {
                gotoCell(cell.row, cell.cell, true);
            }
        }

        function handleHeaderContextMenu(e) {
            var $header = $(e.target).closest(".slick-header-column", ".slick-header-columns");
            var column = $header && columns[self.getColumnIndex($header.data("fieldId"))];
            trigger(self.onHeaderContextMenu, {
                column: column
            }, e);
        }

        function handleHeaderClick(e) {
            var $header = $(e.target).closest(".slick-header-column", ".slick-header-columns");
            var column = $header && columns[self.getColumnIndex($header.data("fieldId"))];
      if (column) {
        trigger(self.onHeaderClick, {column: column}, e);
      }
    }

        function handleMouseEnter(e) {
            trigger(self.onMouseEnter, {}, e);
        }

        function handleMouseLeave(e) {
            trigger(self.onMouseLeave, {}, e);
        }

        function cellExists(row, cell) {
            return !(row < 0 || row >= getDataLength() || cell < 0 || cell >= columns.length);
        }

        function getCellFromPoint(x, y) {
            var row = Math.floor((y + offset) / options.rowHeight);
            var cell = 0;

            var w = 0;
            for (var i = 0; i < columns.length && w < x; i++) {
                w += columns[i].width;
                cell++;
            }

            if (cell < 0) {
                cell = 0;
            }

            return {
                row: row,
                cell: cell - 1
            };
        }

        function getCellFromNode(node) {
            // read column number from .l<columnNumber> CSS class
            var cls = /l\d+/.exec(node.className);
            if (!cls) {
                throw "getCellFromNode: cannot get cell - " + node.className;
            }
            return parseInt(cls[0].substr(1, cls[0].length - 1), 10);
        }

        function getCellFromEvent(e) {
            var $cell = $(e.target).closest(".slick-cell", $canvas);
            if (!$cell.length) {
                return null;
            }

            return {
                row: $cell.parent().attr("row") | 0,
                cell: getCellFromNode($cell[0])
            };
        }

        function getCellNodeBox(row, cell) {
            if (!cellExists(row, cell)) {
                return null;
            }

            var y1 = row * options.rowHeight - offset;
            var y2 = y1 + options.rowHeight - 1;
            var x1 = 0;
            for (var i = 0; i < cell; i++) {
                x1 += columns[i].width;
            }
            var x2 = x1 + columns[cell].width;

            return {
                top: y1,
                left: x1,
                bottom: y2,
                right: x2
            };
        }

        // ////////////////////////////////////////////////////////////////////////////////////////////
        // Cell switching

        function resetActiveCell() {
            setActiveCellInternal(null, false);
        }

        function setFocus() {
      $focusSink[0].focus();
            // aligned to the left border
        }

        function scrollActiveCellIntoView() {
            if (activeCellNode) {
                if (options.frozenRow > -1 && activeRow >= options.frozenRow) {
                    var tmpScrollTop = $viewportScrollContainer[0].scrollTop;

                    var top = (activeRow - options.frozenRow) * options.rowHeight;

                    if (top < tmpScrollTop) {
                        $viewportScrollContainer[0].scrollTop = top;
                    }
                }

                // Don't scroll the right viewport if the current cell is in the
                // left viewport
                if (options.frozenColumn > -1) {
                    if ($(activeCellNode).parents('.slick-viewport-right').length == 0) {
                        return;
                    }
                }

                var scrollLeft = $viewportScrollContainer[0].scrollLeft;

                var left = $(activeCellNode).position().left,
                    right = left + $(activeCellNode).outerWidth(),
                    scrollRight = scrollLeft + $viewportScrollContainer.width();

                if (left < scrollLeft) $viewportScrollContainer[0].scrollLeft = left;
                else if (right > scrollRight) {
                    $viewportScrollContainer[0].scrollLeft = Math.min(left, right - $viewportTopR[0].clientWidth);
                }
            }
        }

        function setActiveCellInternal(newCell, editMode) {
            if (activeCellNode !== null) {
                makeActiveCellNormal();
                $(activeCellNode).removeClass("active");
            }

            var activeCellChanged = (activeCellNode !== newCell);
            activeCellNode = newCell;

            if (activeCellNode != null) {
                activeRow = parseInt($(activeCellNode).parent().attr("row"));
                activeCell = activePosX = getCellFromNode(activeCellNode);

                $(activeCellNode).addClass("active");

                if (options.editable && editMode && isCellPotentiallyEditable(activeRow, activeCell)) {
                    clearTimeout(h_editorLoader);

                    if (options.asyncEditorLoading) {
                        h_editorLoader = setTimeout(function() {
                            makeActiveCellEditable();
                        }, options.asyncEditorLoadDelay);
                    } else {
                        makeActiveCellEditable();
                    }
                } else {
                    setFocus();
                }
            } else {
                activeRow = activeCell = null;
            }

            if (activeCellChanged) {
                setTimeout(scrollActiveCellIntoView, 50);
                trigger(self.onActiveCellChanged, getActiveCell());
            }
        }

        function clearTextSelection() {
            if (document.selection && document.selection.empty) {
                document.selection.empty();
            } else if (window.getSelection) {
                var sel = window.getSelection();
                if (sel && sel.removeAllRanges) {
                    sel.removeAllRanges();
                }
            }
        }

        function isCellPotentiallyEditable(row, cell) {
            // is the data for this row loaded?
            if (row < getDataLength() && !getDataItem(row)) {
                return false;
            }

            // are we in the Add New row? can we create new from this cell?
            if (columns[cell].cannotTriggerInsert && row >= getDataLength()) {
                return false;
            }

            // does this cell have an editor?
            if (!getEditor(row, cell)) {
                return false;
            }

            return true;
        }

        function makeActiveCellNormal() {
            if (!currentEditor) {
                return;
            }
            trigger(self.onBeforeCellEditorDestroy, {
                editor: currentEditor
            });
            currentEditor.destroy();
            currentEditor = null;

            if (activeCellNode) {
                var d = getDataItem(activeRow);
                $(activeCellNode).removeClass("editable invalid");
                if (d) {
                    var column = columns[activeCell];
                    var formatter = getFormatter(activeRow, column);
                    activeCellNode.innerHTML = formatter(activeRow, activeCell, getDataItemValueForColumn(d, column), column, getDataItem(activeRow));
                    invalidatePostProcessingResults(activeRow);
                }
            }

            // if there previously was text selected on a page (such as selected
            // text in the edit cell just removed),
            // IE can't set focus to anything else correctly
            if ($.browser.msie) {
                clearTextSelection();
            }

            getEditorLock().deactivate(editController);
        }

        function makeActiveCellEditable(editor) {
            if (!activeCellNode) {
                return;
            }
            if (!options.editable) {
                throw "Grid : makeActiveCellEditable : should never get called when options.editable is false";
            }

            // cancel pending async call if there is one
            clearTimeout(h_editorLoader);

            if (!isCellPotentiallyEditable(activeRow, activeCell)) {
                return;
            }

            var columnDef = columns[activeCell];
            var item = getDataItem(activeRow);

            if (trigger(self.onBeforeEditCell, {
                row: activeRow,
                cell: activeCell,
                item: item,
                column: columnDef
            }) === false) {
                setFocus();
                return;
            }

            getEditorLock().activate(editController);
            $(activeCellNode).addClass("editable");

            // don't clear the cell if a custom editor is passed through
            if (!editor) {
                activeCellNode.innerHTML = "";
            }

            currentEditor = new(editor || getEditor(activeRow, activeCell))({
                grid: self,
                gridPosition: absBox($container[0]),
                position: absBox(activeCellNode),
                container: activeCellNode,
                column: columnDef,
                item: item || {},
                commitChanges: commitEditAndSetFocus,
                cancelChanges: cancelEditAndSetFocus
            });

            if (item) {
                currentEditor.loadValue(item);
            }

            serializedEditorValue = currentEditor.serializeValue();

            if (currentEditor.position) {
                handleActiveCellPositionChange();
            }
        }

        function commitEditAndSetFocus() {
            // if the commit fails, it would do so due to a validation error
            // if so, do not steal the focus from the editor
            if (getEditorLock().commitCurrentEdit()) {
                setFocus();
                if (options.autoEdit) {
                    navigateDown();
                }
            }
        }

        function cancelEditAndSetFocus() {
            if (getEditorLock().cancelCurrentEdit()) {
                setFocus();
            }
        }

        function absBox(elem) {
            var box = {
                top: elem.offsetTop,
                left: elem.offsetLeft,
                bottom: 0,
                right: 0,
                width: $(elem).outerWidth(),
                height: $(elem).outerHeight(),
                visible: true
            };
            box.bottom = box.top + box.height;
            box.right = box.left + box.width;

            // walk up the tree
            var offsetParent = elem.offsetParent;
            while ((elem = elem.parentNode) != document.body) {
                if (box.visible && elem.scrollHeight != elem.offsetHeight && $(elem).css("overflowY") != "visible") {
                    box.visible = box.bottom > elem.scrollTop && box.top < elem.scrollTop + elem.clientHeight;
                }

                if (box.visible && elem.scrollWidth != elem.offsetWidth && $(elem).css("overflowX") != "visible") {
                    box.visible = box.right > elem.scrollLeft && box.left < elem.scrollLeft + elem.clientWidth;
                }

                box.left -= elem.scrollLeft;
                box.top -= elem.scrollTop;

                if (elem === offsetParent) {
                    box.left += elem.offsetLeft;
                    box.top += elem.offsetTop;
                    offsetParent = elem.offsetParent;
                }

                box.bottom = box.top + box.height;
                box.right = box.left + box.width;
            }

            return box;
        }

        function getActiveCellPosition() {
            return absBox(activeCellNode);
        }

        function getGridPosition() {
            return absBox($container[0])
        }

        function handleActiveCellPositionChange() {
            if (!activeCellNode) {
                return;
            }

            trigger(self.onActiveCellPositionChanged, {});

            if (currentEditor) {
                var cellBox = getActiveCellPosition();
                if (currentEditor.show && currentEditor.hide) {
                    if (!cellBox.visible) {
                        currentEditor.hide();
                    } else {
                        currentEditor.show();
                    }
                }

                if (currentEditor.position) {
                    currentEditor.position(cellBox);
                }
            }
        }

        function getCellEditor() {
            return currentEditor;
        }

        function getActiveCell() {
            if (!activeCellNode) {
                return null;
            } else {
                return {
                    row: activeRow,
                    cell: activeCell
                };
            }
        }

        function getActiveCellNode() {
            return activeCellNode;
        }

        function scrollRowIntoView(row, doPaging) {
            var rowAtTop = row * options.rowHeight;
            var rowAtBottom = (row + 1) * options.rowHeight - viewportH + (viewportHasHScroll ? scrollbarDimensions.height : 0);

            // need to page down?
            if ((row + 1) * options.rowHeight > scrollTop + viewportH + offset) {
                scrollTo(doPaging ? rowAtTop : rowAtBottom);
                render();
            }
            // or page up?
            else if (row * options.rowHeight < scrollTop + offset) {
                scrollTo(doPaging ? rowAtBottom : rowAtTop);
                render();
            }
        }

        function getColspan(row, cell) {
            var metadata = data.getItemMetadata && data.getItemMetadata(row);
            if (!metadata || !metadata.columns) {
                return 1;
            }

            var columnData = metadata.columns[columns[cell].id] || metadata.columns[cell];
            var colspan = (columnData && columnData.colspan);
            if (colspan === "*") {
                colspan = columns.length - cell;
            }
            return (colspan || 1);
        }

        function findFirstFocusableCell(row) {
            var cell = 0;
            while (cell < columns.length) {
                if (canCellBeActive(row, cell)) {
                    return cell;
                }
                cell += getColspan(row, cell);
            }
            return null;
        }

        function findLastFocusableCell(row) {
            var cell = 0;
            var lastFocusableCell = null;
            while (cell < columns.length) {
                if (canCellBeActive(row, cell)) {
                    lastFocusableCell = cell;
                }
                cell += getColspan(row, cell);
            }
            return lastFocusableCell;
        }

        function gotoRight(row, cell, posX) {
            if (cell >= columns.length) {
                return null;
            }

            do {
                cell += getColspan(row, cell);
            } while (cell < columns.length && !canCellBeActive(row, cell));

            if (cell < columns.length) {
                return {
                    "row": row,
                    "cell": cell,
                    "posX": cell
                };
            }
            return null;
        }

        function gotoLeft(row, cell, posX) {
            if (cell <= 0) {
                return null;
            }

            var firstFocusableCell = findFirstFocusableCell(row);
            if (firstFocusableCell === null || firstFocusableCell >= cell) {
                return null;
            }

            var prev = {
                "row": row,
                "cell": firstFocusableCell,
                "posX": firstFocusableCell
            };
            var pos;
            while (true) {
                pos = gotoRight(prev.row, prev.cell, prev.posX);
                if (!pos) {
                    return null;
                }
                if (pos.cell >= cell) {
                    return prev;
                }
                prev = pos;
            }
        }

        function gotoDown(row, cell, posX) {
            var prevCell;
            while (true) {
                if (++row >= getDataLength() + (options.enableAddRow ? 1 : 0)) {
                    return null;
                }

                prevCell = cell = 0;
                while (cell <= posX) {
                    prevCell = cell;
                    cell += getColspan(row, cell);
                }

                if (canCellBeActive(row, prevCell)) {
                    return {
                        "row": row,
                        "cell": prevCell,
                        "posX": posX
                    };
                }
            }
        }

        function gotoUp(row, cell, posX) {
            var prevCell;
            while (true) {
                if (--row < 0) {
                    return null;
                }

                prevCell = cell = 0;
                while (cell <= posX) {
                    prevCell = cell;
                    cell += getColspan(row, cell);
                }

                if (canCellBeActive(row, prevCell)) {
                    return {
                        "row": row,
                        "cell": prevCell,
                        "posX": posX
                    };
                }
            }
        }

        function gotoNext(row, cell, posX) {
            var pos = gotoRight(row, cell, posX);
            if (pos) {
                return pos;
            }

            var firstFocusableCell = null;
            while (++row < getDataLength() + (options.enableAddRow ? 1 : 0)) {
                firstFocusableCell = findFirstFocusableCell(row);
                if (firstFocusableCell !== null) {
                    return {
                        "row": row,
                        "cell": firstFocusableCell,
                        "posX": firstFocusableCell
                    };
                }
            }
            return null;
        }

        function gotoPrev(row, cell, posX) {
            var pos;
            var lastSelectableCell;
            while (!pos) {
                pos = gotoLeft(row, cell, posX);
                if (pos) {
                    break;
                }
                if (--row < 0) {
                    return null;
                }

                cell = 0;
                lastSelectableCell = findLastFocusableCell(row);
                if (lastSelectableCell !== null) {
                    pos = {
                        "row": row,
                        "cell": lastSelectableCell,
                        "posX": lastSelectableCell
                    };
                }
            }
            return pos;
        }

        function navigateRight() {
            navigate("right");
        }

        function navigateLeft() {
            navigate("left");
        }

        function navigateDown() {
            navigate("down");
        }

        function navigateUp() {
            navigate("up");
        }

        function navigateNext() {
            navigate("next");
        }

        function navigatePrev() {
            navigate("prev");
        }

        function navigate(dir) {
            if (!activeCellNode || !options.enableCellNavigation) {
                return;
            }
            if (!getEditorLock().commitCurrentEdit()) {
                return;
            }

            setFocus();

            var stepFunctions = {
                "up": gotoUp,
                "down": gotoDown,
                "left": gotoLeft,
                "right": gotoRight,
                "prev": gotoPrev,
                "next": gotoNext
            };
            var stepFn = stepFunctions[dir];
            var pos = stepFn(activeRow, activeCell, activePosX);

            if (pos) {
                var isAddNewRow = (pos.row == getDataLength());
                if (options.frozenRow > -1) {
                    if (pos.row >= options.frozenRow) {
                        scrollRowIntoView(pos.row, !isAddNewRow);
                    }
                } else {
                    scrollRowIntoView(pos.row, !isAddNewRow);
                }

                setActiveCellInternal(getCellNode(pos.row, pos.cell), isAddNewRow || options.autoEdit);
                activePosX = pos.posX;
            } else {
                setActiveCellInternal(getCellNode(activeRow, activeCell), (activeRow == getDataLength()) || options.autoEdit);
            }
        }

        function getCellNode(row, cell) {
            if (rowsCache[row]) {
                var cells = $(rowsCache[row]).children();
                var nodeCell;
                for (var i = 0; i < cells.length; i++) {
                    nodeCell = getCellFromNode(cells[i]);
                    if (nodeCell === cell) {
                        return cells[i];
                    } else if (nodeCell > cell) {
                        return null;
                    }

                }
            }
            return null;
        }

        function setActiveCell(row, cell) {
            if (!initialized) {
                return;
            }
            if (row > getDataLength() || row < 0 || cell >= columns.length || cell < 0) {
                return;
            }

            if (!options.enableCellNavigation) {
                return;
            }

            if (options.frozenRow > -1) {
                if (row > options.frozenRow) {
                    scrollRowIntoView(row, false);
                }
            }

            setActiveCellInternal(getCellNode(row, cell), false);
        }

        function canCellBeActive(row, cell) {
            if (!options.enableCellNavigation || row >= getDataLength() + (options.enableAddRow ? 1 : 0) || row < 0 || cell >= columns.length || cell < 0) {
                return false;
            }

            var rowMetadata = data.getItemMetadata && data.getItemMetadata(row);
            if (rowMetadata && typeof rowMetadata.focusable === "boolean") {
                return rowMetadata.focusable;
            }

            var columnMetadata = rowMetadata && rowMetadata.columns;
            if (columnMetadata && columnMetadata[columns[cell].id] && typeof columnMetadata[columns[cell].id].focusable === "boolean") {
                return columnMetadata[columns[cell].id].focusable;
            }
            if (columnMetadata && columnMetadata[cell] && typeof columnMetadata[cell].focusable === "boolean") {
                return columnMetadata[cell].focusable;
            }

            if (typeof columns[cell].focusable === "boolean") {
                return columns[cell].focusable;
            }

            return true;
        }

        function canCellBeSelected(row, cell) {
            if (row >= getDataLength() || row < 0 || cell >= columns.length || cell < 0) {
                return false;
            }

            var rowMetadata = data.getItemMetadata && data.getItemMetadata(row);
            if (rowMetadata && typeof rowMetadata.selectable === "boolean") {
                return rowMetadata.selectable;
            }

            var columnMetadata = rowMetadata && rowMetadata.columns && (rowMetadata.columns[columns[cell].id] || rowMetadata.columns[cell]);
            if (columnMetadata && typeof columnMetadata.selectable === "boolean") {
                return columnMetadata.selectable;
            }

            if (typeof columns[cell].selectable === "boolean") {
                return columns[cell].selectable;
            }

            return true;
        }

        function gotoCell(row, cell, forceEdit) {
            if (!initialized) {
                return;
            }
            if (!canCellBeActive(row, cell)) {
                return;
            }

            if (!getEditorLock().commitCurrentEdit()) {
                return;
            }

            if (options.frozenRow > -1) {
                if (row > options.frozenRow) {
                    scrollRowIntoView(row, false);
                }
            }

            var newCell = getCellNode(row, cell);

            // if selecting the 'add new' row, start editing right away
            setActiveCellInternal(newCell, forceEdit || (row === getDataLength()) || options.autoEdit);

            // if no editor was created, set the focus back on the grid
            if (!currentEditor) {
                setFocus();
            }
        }

        // ////////////////////////////////////////////////////////////////////////////////////////////
        // IEditor implementation for the editor lock

        function commitCurrentEdit() {
            var item = getDataItem(activeRow);
            var column = columns[activeCell];

            if (currentEditor) {
                if (currentEditor.isValueChanged()) {
                    var validationResults = currentEditor.validate();

                    if (validationResults.valid) {
                        if (activeRow < getDataLength()) {
                            var editCommand = {
                                row: activeRow,
                                cell: activeCell,
                                editor: currentEditor,
                                serializedValue: currentEditor.serializeValue(),
                                prevSerializedValue: serializedEditorValue,
                                execute: function() {
                                    this.editor.applyValue(item, this.serializedValue);
                                    updateRow(this.row);
                                },
                                undo: function() {
                                    this.editor.applyValue(item, this.prevSerializedValue);
                                    updateRow(this.row);
                                }
                            };

                            if (options.editCommandHandler) {
                                makeActiveCellNormal();
                                options.editCommandHandler(item, column, editCommand);
                            } else {
                                editCommand.execute();
                                makeActiveCellNormal();
                            }

                            trigger(self.onCellChange, {
                                row: activeRow,
                                cell: activeCell,
                                item: item
                            });
                        } else {
                            var newItem = {};
                            currentEditor.applyValue(newItem, currentEditor.serializeValue());
                            makeActiveCellNormal();
                            trigger(self.onAddNewRow, {
                                item: newItem,
                                column: column
                            });
                        }

                        // check whether the lock has been re-acquired by event handlers
                        return !getEditorLock().isActive();
                    } else {
                        // TODO: remove and put in onValidationError handlers in examples
                        $(activeCellNode).addClass("invalid");
                        $(activeCellNode).stop(true, true).effect("highlight", {
                            color: "red"
                        }, 300);

                        trigger(self.onValidationError, {
                            editor: currentEditor,
                            cellNode: activeCellNode,
                            validationResults: validationResults,
                            row: activeRow,
                            cell: activeCell,
                            column: column
                        });

                        currentEditor.focus();
                        return false;
                    }
                }

                makeActiveCellNormal();
            }
            return true;
        }

        function cancelCurrentEdit() {
            makeActiveCellNormal();
            return true;
        }

        function rowsToRanges(rows) {
            var ranges = [];
            var lastCell = columns.length - 1;
            for (var i = 0; i < rows.length; i++) {
                ranges.push(new Slick.Range(rows[i], 0, rows[i], lastCell));
            }
            return ranges;
        }

        function getSelectedRows() {
            if (!selectionModel) {
                throw "Selection model is not set";
            }
            return selectedRows;
        }

        function setSelectedRows(rows) {
            if (!selectionModel) {
                throw "Selection model is not set";
            }
            selectionModel.setSelectedRanges(rowsToRanges(rows));
        }

        // ////////////////////////////////////////////////////////////////////////////////////////////
        // Debug

        this.debug = function() {
            var s = "";

            s += ("\n" + "counter_rows_rendered:  " + counter_rows_rendered);
            s += ("\n" + "counter_rows_removed:  " + counter_rows_removed);
            s += ("\n" + "renderedRows:  " + renderedRows);
            s += ("\n" + "numVisibleRows:  " + numVisibleRows);
            s += ("\n" + "maxSupportedCssHeight:  " + maxSupportedCssHeight);
            s += ("\n" + "n(umber of pages):  " + n);
            s += ("\n" + "(current) page:  " + page);
            s += ("\n" + "page height (ph):  " + ph);
            s += ("\n" + "scrollDir:  " + scrollDir);

            alert(s);
        };

        // a debug helper to be able to access private members
        this.eval = function(expr) {
            return eval(expr);
        };

        // ////////////////////////////////////////////////////////////////////////////////////////////
        // Public API

        $.extend(this, {
            "slickGridVersion": "2.0",

            // Events
            "onScroll": new Slick.Event(),
            "onSort": new Slick.Event(),
            "onHeaderContextMenu": new Slick.Event(),
            "onHeaderClick": new Slick.Event(),
            "onMouseEnter": new Slick.Event(),
            "onMouseLeave": new Slick.Event(),
            "onClick": new Slick.Event(),
            "onDblClick": new Slick.Event(),
            "onContextMenu": new Slick.Event(),
            "onKeyDown": new Slick.Event(),
            "onAddNewRow": new Slick.Event(),
            "onValidationError": new Slick.Event(),
            "onViewportChanged": new Slick.Event(),
            "onColumnsReordered": new Slick.Event(),
            "onColumnsResized": new Slick.Event(),
            "onCellChange": new Slick.Event(),
            "onBeforeEditCell": new Slick.Event(),
            "onBeforeCellEditorDestroy": new Slick.Event(),
            "onBeforeDestroy": new Slick.Event(),
            "onActiveCellChanged": new Slick.Event(),
            "onActiveCellPositionChanged": new Slick.Event(),
            "onDragInit": new Slick.Event(),
            "onDragStart": new Slick.Event(),
            "onDrag": new Slick.Event(),
            "onDragEnd": new Slick.Event(),
            "onSelectedRowsChanged": new Slick.Event(),
            "onCellCssStylesChanged": new Slick.Event(),

            // Methods
            "registerPlugin": registerPlugin,
            "unregisterPlugin": unregisterPlugin,
            "getColumns": getColumns,
            "setColumns": setColumns,
            "getColumnIndex": getColumnIndex,
            "updateColumnHeader": updateColumnHeader,
            "setSortColumn": setSortColumn,
            "setSortColumns": setSortColumns,
            "getSortColumns": getSortColumns,
            "autosizeColumns": autosizeColumns,
            "getOptions": getOptions,
            "setOptions": setOptions,
            "getData": getData,
            "getDataLength": getDataLength,
            "getDataItem": getDataItem,
            "setData": setData,
            "getSelectionModel": getSelectionModel,
            "setSelectionModel": setSelectionModel,
            "getSelectedRows": getSelectedRows,
            "setSelectedRows": setSelectedRows,

            "render": render,
            "invalidate": invalidate,
            "invalidateRow": invalidateRow,
            "invalidateRows": invalidateRows,
            "invalidateAllRows": invalidateAllRows,
            "updateCell": updateCell,
            "updateRow": updateRow,
            "getViewport": getVisibleRange,
            "getRenderedRange": getRenderedRange,
            "resizeCanvas": resizeCanvas,
            "updateRowCount": updateRowCount,
            "scrollRowIntoView": scrollRowIntoView,
            "getCanvasNode": getCanvasNode,
            "getViewportNode": getViewportNode,
            "focus": setFocus,
            "getCellFromPoint": getCellFromPoint,
            "getCellFromEvent": getCellFromEvent,
            "getActiveCell": getActiveCell,
            "setActiveCell": setActiveCell,
            "getActiveCellNode": getActiveCellNode,
            "getActiveCellPosition": getActiveCellPosition,
            "resetActiveCell": resetActiveCell,
            "editActiveCell": makeActiveCellEditable,
            "getCellEditor": getCellEditor,
            "getCellNode": getCellNode,
            "getCellNodeBox": getCellNodeBox,
            "canCellBeSelected": canCellBeSelected,
            "canCellBeActive": canCellBeActive,
            "navigatePrev": navigatePrev,
            "navigateNext": navigateNext,
            "navigateUp": navigateUp,
            "navigateDown": navigateDown,
            "navigateLeft": navigateLeft,
            "navigateRight": navigateRight,
            "gotoCell": gotoCell,
            "getTopPanel": getTopPanel,
            "showTopPanel": showTopPanel,
            "hideTopPanel": hideTopPanel,
            "showHeaderRowColumns": showHeaderRowColumns,
            "hideHeaderRowColumns": hideHeaderRowColumns,
            "getHeaderRow": getHeaderRow,
            "getHeaderRowColumn": getHeaderRowColumn,
            "getGridPosition": getGridPosition,
            "flashCell": flashCell,
            "addCellCssStyles": addCellCssStyles,
            "setCellCssStyles": setCellCssStyles,
            "removeCellCssStyles": removeCellCssStyles,
            "getCellCssStyles": getCellCssStyles,

            "init": finishInitialization,
            "destroy": destroy,

            // IEditor implementation
            "getEditorLock": getEditorLock,
            "getEditController": getEditController
        });

        init();
    }
}(jQuery));