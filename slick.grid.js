/**
 * @license
 * (c) 2009-2013 Michael Leibman
 * michael{dot}leibman{at}gmail{dot}com
 * http://github.com/mleibman/slickgrid
 *
 * Distributed under MIT license.
 * All rights reserved.
 *
 * SlickGrid v2.2
 *
 * NOTES:
 *     Cell/row DOM manipulations are done directly bypassing jQuery's DOM manipulation methods.
 *     This increases the speed dramatically, but can only be done safely because there are no event handlers
 *     or data associated with any cell/row DOM nodes. Cell editors must make sure they implement .destroy()
 *     and do proper cleanup.
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

(function ($) {
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
   * @class SlickGrid
   * @constructor
   * @param {Node}              container   Container node to create the grid in.
   * @param {Array,Object}      data        An array of objects for databinding.
   * @param {Array}             columns     An array of column definitions.
   * @param {Object}            options     Grid options.
   **/
  function SlickGrid(container, data, columns, options) {
    // settings
    var defaults = {
      debug: false, // bool for debug mode. turns on some css styling and console logging.
      explicitInitialization: false,
      //rowHeight: 25,
      defaultColumnWidth: 80,
      absoluteColumnMinWidth: 20, // Don't let folks resize smaller than this, Should be the width of ellipsis. May need to take box-sizing into account
      enableAddRow: false,
      leaveSpaceForNewRows: false,
      editable: false,
      autoEdit: true,
      enableCellNavigation: true,
      enableColumnReorder: false, // Breaking change to default. Don't want to depend on jQuery UI by default
      asyncEditorLoading: false,
      asyncEditorLoadDelay: 100,
      forceFitColumns: false,
      enableAsyncPostRender: false,
      asyncPostRenderDelay: 50,
      autoHeight: false,
      editorLock: Slick.GlobalEditorLock,
      showSubHeader: false,
      addRowIndexToClassName: true,
//      showTopPanel: false,
//      topPanelHeight: 25,
      formatterFactory: null,
      editorFactory: null,
      cellFlashingCssClass: "flashing",
      selectedCellCssClass: "selected",
      multiSelect: true,
      enableTextSelectionOnCells: false,
      dataItemColumnValueExtractor: null,
      fullWidthRows: false,
      multiColumnSort: false,
      defaultFormatter: defaultFormatter,
      columnHeaderRenderer: columnHeaderRenderer,
      subHeaderRenderer: subHeaderRenderer,
      forceSyncScrolling: false,
      addNewRowCssClass: "new-row"
    };

    var columnDefaults = {
      name: "",
      resizable: true,
      sortable: false,
      minWidth: defaults.absoluteColumnMinWidth,
      rerenderOnResize: false,
      headerCssClass: null,
      defaultSortAsc: true,
      focusable: true,
      selectable: true
    };

    // scroller
    var th;   // virtual height
    var h;    // real scrollable height
    var ph;   // page height
    var n;    // number of pages
    var cj;   // "jumpiness" coefficient

    var page = 0;       // current page
    var offset = 0;     // current page offset
    var vScrollDir = 1;

    // private
    var initialized = false;
    var $container;
    var objectName = 'slickGrid';
    var uid = objectName + '_' + Math.round(1000000 * Math.random());
    var isPinned;
    var self = this;
    var $focusSink, $focusSink2;

//    var $topPanelScroller, $topPanel;

    var $style;
    var $boundAncestors;
    var stylesheet, columnCssRulesL, columnCssRulesR;

    var viewportHasHScroll, viewportHasVScroll;

    var tabbingDirection = 1;
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
    var lastRenderedScrollLeft = 0;
    var prevScrollLeft = 0;
    var scrollLeft = 0;

    var selectionModel;
    var selectedRows = [];

    var plugins = [];
    var cellCssClasses = {};

    var columnsById = {};
    var sortColumns = [];
    var columnPosLeft = [];
    var columnPosRight = [];


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

    var $activeCanvasNode;

    // This variable works around a bug with inertial scrolling in Webkit/Blink on Mac.
    // See http://crbug.com/312427.
    // The index of the row that started the latest bout of scrolling is temporarily protected from removal.
    var protectedRowIdx;



    /*
     ## Visual Grid Components

     To support pinned columns, we slice up the grid regions, and try to be very clear and consistent about the naming.
     All UI region info objects start as an array with a left [0] and right [1] side
     Dom elements are stored at the top level together (still in a left/right pair) because jquery deals with multiple elements nicely. (eg: el.empty(), el.children())
     topViewport.width     // combined width
     topViewport[0].width  // left width
     topViewport.el        // both els
     topViewport.el[0]     // left el
     */
                                    //      [0]       [1]
                                    //    ....................
    var topViewport     = [{},{}],  //    .     .            .   // The scrolling region
        topCanvas       = [{},{}],  //    .     .            .   // The full size of content (both off and on screen)
        header          = [{},{}],  //    .     .            .   // The column headers
        subHeader       = [{},{}],  //    .     .            .   // Optional row of cells below the column headers
                                    //    ....................
        contentViewport = [{},{}],  //    .     .            .   // The scrolling region for the grid rows
        contentCanvas   = [{},{}],  //    .     .            .   // Full size of row content, both width and height
        rows            = [{},{}];  //    .     .            .   // Container for information about rows
                                    //    .     .            .
                                    //    .     .            .
                                    //    .     .            .
                                    //    .     .            .
                                    //    .     .            .
                                    //    ....................

    // Renaming Objects / Variables
    // yep, an array objectk instance with properties. yay @js!
    // $viewport          > contentViewport.el
    // $canvas            > contentCanvas.el
    // canvasWidth        > contentCanvas.width
    // canvasWidthL       > contentCanvas[0].width
    // canvasWidthR       > contentCanvas[1].width
    // headersWidth       > header.width
    // headersWidthL      > header[0].width
    // headersWidthR      > header[1].width
    // all.viewportWidth  > contentViewport.width
    // c.viewportHeight   > contentViewport.height
    // c.paneHeight       > DEPRECIATED. difference from contentViewport.height?


    //////////////////////////////////////////////////////////////////////////////////////////////
    // Initialization

    function init() {
      $container = $(container);
      if ($container.length < 1) {
        throw new Error("SlickGrid requires a valid container, " + container + " does not exist in the DOM.");
      }

      // calculate these only once and share between grid instances
      maxSupportedCssHeight = maxSupportedCssHeight || getMaxSupportedCssHeight();
      scrollbarDimensions   = scrollbarDimensions   || measureScrollbar();

      options = $.extend({}, defaults, options);
      validateAndEnforceOptions();
      columnDefaults.width = options.defaultColumnWidth;

      enforceWidthLimits(columns);

      // validate loaded JavaScript modules against requested options
      if (options.enableColumnReorder && !$.fn.sortable) {
        throw new Error("SlickGrid's 'enableColumnReorder = true' option requires jquery-ui.sortable module to be loaded");
      }

      editController = {
        "commitCurrentEdit": commitCurrentEdit,
        "cancelCurrentEdit": cancelCurrentEdit
      };

      $container.empty().addClass(objectName +' '+ uid +' ui-widget');
      if (options.debug) { $container.addClass('debug') }

      // set up a positioning container if needed
      if (!/relative|absolute|fixed/.test($container.css("position"))) {
        $container.css("position", "relative");
      }

      $focusSink = $("<div tabIndex='0' hideFocus class='focus-sink'></div>").appendTo($container);

      /* SlickGrid Dom structure:
       .slickGrid
       .viewport.T.L > .canvas.T.L
       .header
       .subHeader
       .viewport.T.R > .canvas.T.R
       .header
       .subHeader
       .viewport.C.L > .canvas.C.L
       .row * N
       .viewport.C.R > .canvas.C.R
       .row * N
       */


      // ----------------------- Create the elements
      topViewport.el = $(
        "<div class='viewport T L' tabIndex='0' hideFocus />" +
        "<div class='viewport T R' tabIndex='0' hideFocus />"
      );
      topCanvas.el = $(
        "<div class='canvas T L' />" +
        "<div class='canvas T R' />"
      );
      header.el = $(
//        "<div class='header' style='left:-1000px' />" +
        "<div class='header' />" +
        "<div class='header' />"
      );

      // TODO: what are these spacers for?
//      cl.subHeaderSpacer = $("<div style='display:block;height:1px;position:absolute;top:0;left:0;'></div>")
//        .css("width", canvasWidth + scrollbarDimensions.width + "px")
//        .appendTo(cl.subHeaderViewport);
//      cr.subHeaderSpacer = $("<div style='display:block;height:1px;position:absolute;top:0;left:0;'></div>")
//        .css("width", canvasWidth + scrollbarDimensions.width + "px")
//        .appendTo(cr.subHeaderViewport);
//      subHeaderSpacer = $().add(cl.subHeaderSpacer).add(cr.subHeaderSpacer);
      subHeader.el = $(
        "<div class='subHeader' />" +
        "<div class='subHeader' />"
      );

      if (!options.showSubHeader) { subHeader.el.hide(); }

      // Top Panel
//      $topPanelScroller = $("<div class='slick-top-panel-scroller ui-state-default' style='overflow:hidden;position:relative;' />").appendTo($container);
//      $topPanel = $("<div class='slick-top-panel' style='width:10000px' />").appendTo($topPanelScroller);
//      if (!options.showTopPanel) {
//        $topPanelScroller.hide();
//      }

      contentViewport.el = $(
        "<div class='viewport C L' tabIndex='0' hideFocus />" +
        "<div class='viewport C R' tabIndex='0' hideFocus />"
      );
      contentCanvas.el = $(
        "<div class='canvas C L' tabIndex='0' hideFocus />" +
        "<div class='canvas C R' tabIndex='0' hideFocus />"
      );


      // ----------------------- Matryoshka the elements together
      topCanvas.el[0].appendChild(header.el[0]);
      topCanvas.el[1].appendChild(header.el[1]);
      topCanvas.el[0].appendChild(subHeader.el[0]);
      topCanvas.el[1].appendChild(subHeader.el[1]);
      topViewport.el[0].appendChild(topCanvas.el[0]);
      topViewport.el[1].appendChild(topCanvas.el[1]);
      contentViewport.el[0].appendChild(contentCanvas.el[0]);
      contentViewport.el[1].appendChild(contentCanvas.el[1]);
      $container.append( topViewport.el, contentViewport.el );

      measureCssSizes(); // Wins award for most 's'es in a row.


      // Default the active canvas to the top left
      $activeCanvasNode = contentCanvas.el.eq(0);

      $focusSink2 = $focusSink.clone().appendTo($container); // after the grid, in tab index order.

      if (!options.explicitInitialization) {
        finishInitialization();
      }
    }

    function finishInitialization() {
      if (!initialized) {
        initialized = true;

        calculateViewportWidth();

        // header columns and cells may have different padding/border skewing width calculations (box-sizing, hello?)
        // calculate the diff so we can set consistent sizes
//        measureCellPaddingAndBorder();

        // for usability reasons, all text selection in SlickGrid is disabled
        // with the exception of input and textarea elements (selection must
        // be enabled there so that editors work as expected); note that
        // selection in grid cells (grid body) is already unavailable in
        // all browsers except IE
        disableSelection(header.el); // disable all text selection in header (including input and textarea)

        if (!options.enableTextSelectionOnCells) {
          // disable text selection in grid cells except in input and textarea elements
          // (this is IE-specific, because selectstart event will only fire in IE)
          contentViewport.el.bind("selectstart.ui", function (event) {
            return $(event.target).is("input,textarea");
          });
        }

        updateColumnCaches();
        createCssRules();
        updatePinnedState();
        setupColumnSort();
        resizeCanvas();
        bindAncestorScrollEvents();

        $container
          .bind("resize.slickgrid", resizeCanvas);
        contentViewport.el
          .bind("scroll", handleScroll);
        //$headerScroller
        header.el
          .bind("contextmenu", handleHeaderContextMenu)
          .bind("click", handleHeaderClick)
          .delegate(".slick-header-column", "mouseenter", handleHeaderMouseEnter)
          .delegate(".slick-header-column", "mouseleave", handleHeaderMouseLeave);
        //$subHeaderScroller
        //  .bind("scroll", handleSubHeaderScroll);
        subHeader.el
          .bind('contextmenu', handleSubHeaderContextMenu);
        $focusSink.add($focusSink2)
          .bind("keydown", handleKeyDown);
        contentCanvas.el
          .bind("keydown", handleKeyDown)
          .bind("click", handleClick)
          .bind("dblclick", handleDblClick)
          .bind("contextmenu", handleContextMenu)
          .bind("draginit", handleDragInit)
          .bind("dragstart", {distance: 3}, handleDragStart)
          .bind("drag", handleDrag)
          .bind("dragend", handleDragEnd)
          .delegate(".cell", "mouseenter", handleMouseEnter)
          .delegate(".cell", "mouseleave", handleMouseLeave);

        // Work around http://crbug.com/312427.
        if (navigator.userAgent.toLowerCase().match(/webkit/) &&
          navigator.userAgent.toLowerCase().match(/macintosh/)) {
          contentCanvas.el.bind("mousewheel", function(evt){
            var scrolledRow = $(evt.target).closest(".row")[0];
            protectedRowIdx = getRowFromNode(scrolledRow);
            //      console.log('handleOsxMousewheel', {
            //        rowIdx: getRowFromPosition(scrolledRow.offsetTop + e.originalEvent.offsetY), // the row's offset plus the cursor's offset in the cell
            //        protectedRowIdx: protectedRowIdx
            //      });
          });
        }
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

    function getContentCanvasNode() {
      return contentCanvas.el; // could be one or two elements, depending on whether columns are pinned. Always a jquery element.
    }
    function getTopCanvasNode() {
      return topCanvas.el;
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

    function calculateCanvasWidth() {
      var availableWidth = viewportHasVScroll ? contentViewport.width - scrollbarDimensions.width : contentViewport.width;
      var i = columns.length;
      contentCanvas.width = contentCanvas[0].width = contentCanvas[1].width = 0;

      while (i--) {
        if (columns[i].width == null) {
          console.warn('width shouldn\'t be null/undefined', columns[i]);
          continue;
        }
        if (i > options.pinnedColumn) {
          contentCanvas[1].width += columns[i].width;
        } else {
          contentCanvas[0].width += columns[i].width;
        }
      }

      var totalRowWidth = contentCanvas[0].width + contentCanvas[1].width;
      contentCanvas.width = options.fullWidthRows ? Math.max(totalRowWidth, availableWidth) : totalRowWidth;

      //console.log('calculateCanvasWidth', {
      //  available: availableWidth,
      //  left:      contentCanvas[0].width,
      //  right:     contentCanvas[1].width,
      //  both:      contentCanvas.width,
      //  allCols:   columns.reduce(function(sum, col){ return sum += col.width }, 0)
      //});
    }

    function updateCanvasWidth(forceColumnWidthsUpdate) {
      var oldCanvasWidth  = contentCanvas.width,
        oldCanvasWidthL = contentCanvas[0].width,
        oldCanvasWidthR = contentCanvas[1].width,
        widthChanged;

      calculateCanvasWidth();

      var canvasWidth  = contentCanvas.width,
        canvasWidthL = contentCanvas[0].width,
        canvasWidthR = contentCanvas[1].width;

      widthChanged =  canvasWidth  !== oldCanvasWidth  ||
      canvasWidthL !== oldCanvasWidthL ||
      canvasWidthR !== oldCanvasWidthR;

      if (widthChanged || isPinned) { // TODO: why would it always do this work if there is a pinned column?
//        setHeadersWidth();
        topCanvas.el[0].style.width =
          contentCanvas.el[0].style.width =
            canvasWidthL + 'px';

        if (isPinned) {
          topCanvas.el[1].style.width =
            contentCanvas.el[1].style.width =
              canvasWidthR + 'px';

          // Set widths on the left side, and width+left offset on the right side
          topViewport.el[0].style.width =
            topViewport.el[1].style.left =
              contentViewport.el[0].style.width =
                contentViewport.el[1].style.left =
                  canvasWidthL + 'px';
          topViewport.el[1].style.width =
            contentViewport.el[1].style.width =
              (contentViewport.width - canvasWidthL) + 'px';

          // Viewport
          //cl.viewport.width(canvasWidthL);
          //cr.viewport.width(contentViewport.width - canvasWidthL);
        } else {
          topViewport.el[0].style.width =
            contentViewport.el[0].style.width =
              null;
        }
        viewportHasHScroll = (canvasWidth > contentViewport.width - scrollbarDimensions.width);
      }

//      cl.subHeaderSpacer.width(canvasWidth + (viewportHasVScroll ? scrollbarDimensions.width : 0));
//      cr.subHeaderSpacer.width(canvasWidth + (viewportHasVScroll ? scrollbarDimensions.width : 0));

      if (true || widthChanged || forceColumnWidthsUpdate) {
        applyColumnWidths();
      }
    }

    function disableSelection($target) {
      if ($target && $target.jquery) {
        $target
          .attr("unselectable", "on")
          .css("MozUserSelect", "none")
          .bind("selectstart.ui", function () {
            return false;
          }); // from jquery:ui.core.js 1.7.2
      }
    }

    function getMaxSupportedCssHeight() {
      var supportedHeight = 1000000;
      // FF reports the height back but still renders blank after ~6M px
      var testUpTo = navigator.userAgent.toLowerCase().match(/firefox/) ? 6000000 : 1000000000;
      var div = $("<div style='display:none' />").appendTo(document.body);

      while (true) {
        var test = supportedHeight * 2;
        div.css("height", test);
        if (test > testUpTo || div.height() !== test) {
          break;
        } else {
          supportedHeight = test;
        }
      }

      div.remove();
      return supportedHeight;
    }

    // TODO:  this is static.  need to handle page mutation.
    function bindAncestorScrollEvents() {
      var elem = contentCanvas.el[0];
      while ((elem = elem.parentNode) != document.body && elem != null) {
        // bind to scroll containers only
        if (elem == contentViewport.el[0] || elem.scrollWidth != elem.clientWidth || elem.scrollHeight != elem.clientHeight) {
          var $elem = $(elem);
          if (!$boundAncestors) {
            $boundAncestors = $elem;
          } else {
            $boundAncestors = $boundAncestors.add($elem);
          }
          $elem.bind("scroll." + uid, handleActiveCellPositionChange);
        }
      }
    }

    function unbindAncestorScrollEvents() {
      if (!$boundAncestors) {
        return;
      }
      $boundAncestors.unbind("scroll." + uid);
      $boundAncestors = null;
    }

    function updateColumnHeader(columnId, title, toolTip) {
      if (!initialized) { return; }
      var idx = getColumnIndex(columnId);
      if (idx == null) { return; }

      var columnDef = columns[idx];
      var $header = topCanvas.el.children().eq(idx);
      if ($header) {
        if (title !== undefined) {
          columns[idx].name = title;
        }
        if (toolTip !== undefined) {
          columns[idx].toolTip = toolTip;
        }

        trigger(self.onBeforeHeaderCellDestroy, {
          "node": $header[0],
          "column": columnDef
        });

        $header
          .attr("title", toolTip || "")
          .children().eq(0).html(title);

        trigger(self.onHeaderCellRendered, {
          "node": $header[0],
          "column": columnDef
        });
      }
    }

    function getSubHeader() { return subHeader.el; }

    // Use a columnId to return the related header dom element
    function getSubHeaderColumn(columnId) {
      var idx = getColumnIndex(columnId);
      return subHeader.el.children().eq(idx);
      //var $target;
      //if (isPinned) {
      //  if (idx <= options.pinnedColumn) {
      //    $target = cl.subHeaderCanvas;
      //  } else {
      //    $target = cr.subHeaderCanvas;
      //    idx -= options.pinnedColumn + 1;
      //  }
      //} else {
      //  $target = cl.subHeaderCanvas;
      //}
      //var $header = $target.children().eq(idx);
      //return $header && $header[0];

      //var idx = getColumnIndex(columnId);
      //var $header = subHeader.el.children().eq(idx);
      //return $header && $header[0];
    }

    function createColumnHeaders() {
      function onMouseEnter() { $(this).addClass("ui-state-hover"); }
      function onMouseLeave() { $(this).removeClass("ui-state-hover"); }

      // Broadcast destroy events and empty out any current headers
      //header.el.find(".slick-header-column")
      header.el.children()
        .each(function () {
          var columnDef = $(this).data("column");
          if (columnDef) {
            trigger(self.onBeforeHeaderCellDestroy, { "node": this, "column": columnDef });
          }
        });

      // Broadcast destroy events and empty out any current subHeaders
      //subHeader.el.find(".subHeader")
      subHeader.el.children()
        .each(function () {
          var columnDef = $(this).data("column");
          if (columnDef) {
            trigger(self.onBeforeSubHeaderCellDestroy, { "node": this, "column": columnDef });
          }
        });

      header.el.empty();
      subHeader.el.empty();

      // Build new headers based on column data.
      var $headerHolder, $subHeaderHolder, m, oneHeader, oneSubHeader;
      for (var i = 0; i < columns.length; i++) {
        // Select the right pane to draw into based on the column index.
        $headerHolder    = i > options.pinnedColumn ? header.el.eq(1) : header.el.eq(0);
        $subHeaderHolder = i > options.pinnedColumn ? subHeader.el.eq(1) : subHeader.el.eq(0);

        m = columns[i];
        oneHeader = options.columnHeaderRenderer(m);
        oneHeader
//          .width(m.width - headerColumnWidthDiff)
          .addClass("cell l" + i + " r" + i)
          .attr("id", "" + uid +'_'+ m.id)
          .attr("title", m.toolTip || "")
          .data("column", m)
          .addClass(m.headerCssClass || "")
          .appendTo($headerHolder);

        if (options.enableColumnReorder || m.sortable) {
          oneHeader
            .on('mouseenter', onMouseEnter)
            .on('mouseleave', onMouseLeave);
        }

        if (m.sortable) {
          oneHeader.addClass("slick-header-sortable");
          oneHeader.append("<span class='slick-sort-indicator' />");
        }

        trigger(self.onHeaderCellRendered, { "node": oneHeader[0], "column": m });
        oneSubHeader = options.subHeaderRenderer(m);
        if(oneSubHeader) {
          oneSubHeader
            .data("column", m)
            .addClass("cell l" + i + " r" + i)
            .appendTo($subHeaderHolder);
          trigger(self.onSubHeaderCellRendered, {
            "node": oneSubHeader[0],
            "column": m
          });
        }
      }
      setSortColumns(sortColumns);
      setupColumnResize();
      if (options.enableColumnReorder) {
        setupColumnReorder();
      }
      trigger(self.onHeadersCreated);
    }

    // Given a column object, return a jquery element with HTML for the column
    // Can be overridden by providing a function to options.columnHeaderRenderer
    function columnHeaderRenderer(column) {
      var $el = $("<div class='cell' />")
        .html("<span class='name'>" + column.name + "</span>")
        .attr("title", column.toolTip || "");
      return $el;
    }

    // Given a column object, return a jquery element with HTML for a single subHeader column cell
    // If you're using subHeaders, you should override this function
    function subHeaderRenderer (col) {
      return undefined; //$("<div />");
    }

    function setupColumnSort() {
      topCanvas.el.click(function (e) {
        // temporary workaround for a bug in jQuery 1.7.1 (http://bugs.jquery.com/ticket/11328)
        e.metaKey = e.metaKey || e.ctrlKey;

        if ($(e.target).hasClass("resizer")) {
          return;
        }

        var $col = $(e.target).closest(".cell");
        if (!$col.length) {
          return;
        }

        var column = $col.data("column");
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
          }
          else {
            if ((!e.shiftKey && !e.metaKey) || !options.multiColumnSort) {
              sortColumns = [];
            }

            if (!sortOpts) {
              sortOpts = { columnId: column.id, sortAsc: column.defaultSortAsc };
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
              sortAsc: sortOpts.sortAsc}, e);
          } else {
            trigger(self.onSort, {
              multiColumnSort: true,
              sortCols: $.map(sortColumns, function(col) {
                return {sortCol: columns[getColumnIndex(col.columnId)], sortAsc: col.sortAsc };
              })}, e);
          }
        }
      });
    }

    function setupColumnReorder() {
      topCanvas.el.filter(":ui-sortable").sortable("destroy");
      topCanvas.el.sortable({
        containment: "parent",
        distance: 3,
        axis: "x",
        cursor: "default",
        tolerance: "intersection",
        helper: "clone",
        placeholder: "slick-sortable-placeholder ui-state-default slick-header-column",
        start: function (e, ui) {
          ui.placeholder.width(ui.helper.outerWidth()); // - headerColumnWidthDiff);
          $(ui.helper).addClass("slick-header-column-active");
        },
        beforeStop: function (e, ui) {
          $(ui.helper).removeClass("slick-header-column-active");
        },
        stop: function (e) {
          if (!getEditorLock().commitCurrentEdit()) {
            $(this).sortable("cancel");
            return;
          }

          var reorderedIds = topCanvas.el.sortable("toArray");
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
      var j, c, pageX, columnElements, minPageX, maxPageX, firstResizable, lastResizable;
      if(!columns.length){ return; }
      columnElements = getHeaderEls();
      columnElements.find(".resizer").remove();
      // Get the first and last resizable column
      columnElements.each(function (i, e) {
        if (columns[i].resizable) {
          if (firstResizable === undefined) {
            firstResizable = i;
          }
          lastResizable = i;
        }
      });
      if (firstResizable === undefined) { return; }
      // Configure resizing on each column
      columnElements.each(function (i, e) {
        if (i < firstResizable || (options.forceFitColumns && i >= lastResizable)) {
          return;
        }
        $("<div class='resizer' />")
          .appendTo(e)
          .bind("dragstart", function (e, dd) {
            if (!getEditorLock().commitCurrentEdit()) {
              return false;
            }
            pageX = e.pageX;
            $(this).parent().addClass("active");

            // Get the dragged column object and set a flag on it
            var idx = getCellFromNode($(this).parent());
            if (idx > -1) { columns[idx].manuallySized = true; }

            var shrinkLeewayOnRight = null, stretchLeewayOnRight = null;
            // lock each column's width option to current width
            columnElements.each(function (i, e) {
              columns[i].previousWidth = $(e).outerWidth();
            });
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
                    } else {
                      stretchLeewayOnRight = null;
                    }
                  }
                  shrinkLeewayOnRight += c.previousWidth - Math.max(c.minWidth || 0, options.absoluteColumnMinWidth);
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
                  } else {
                    stretchLeewayOnLeft = null;
                  }
                }
                shrinkLeewayOnLeft += c.previousWidth - Math.max(c.minWidth || 0, options.absoluteColumnMinWidth);
              }
            }
            if (shrinkLeewayOnRight === null) {
              shrinkLeewayOnRight = 100000;
            }
            if (shrinkLeewayOnLeft === null) {
              shrinkLeewayOnLeft = 100000;
            }
            if (stretchLeewayOnRight === null) {
              stretchLeewayOnRight = 100000;
            }
            if (stretchLeewayOnLeft === null) {
              stretchLeewayOnLeft = 100000;
            }
            maxPageX = pageX + Math.min(shrinkLeewayOnRight, stretchLeewayOnLeft);
            minPageX = pageX - Math.min(shrinkLeewayOnLeft, stretchLeewayOnRight);
          })
          .bind("drag", function (e, dd) {
            var actualMinWidth, d = Math.min(maxPageX, Math.max(minPageX, e.pageX)) - pageX, x;
            if (d < 0) { // shrink column
              x = d;
              if (options.resizeOnlyDraggedColumn) {
                columns[i].width = Math.max(columns[i].previousWidth + x, (columns[i].minWidth || 0)); // apply shrinkage to this column only.
              } else {
                for (j = i; j >= 0; j--) {
                  c = columns[j];
                  if (c.resizable) {
                    actualMinWidth = Math.max(c.minWidth || 0, options.absoluteColumnMinWidth);
                    if (x && c.previousWidth + x < actualMinWidth) {
                      x += c.previousWidth - actualMinWidth;
                      c.width = actualMinWidth;
                    } else {
                      c.width = c.previousWidth + x;
                      x = 0;
                    }
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
                      c.width = c.previousWidth + x;
                      x = 0;
                    }
                  }
                }
              }
            } else { // stretch column
              x = d;
              if (options.resizeOnlyDraggedColumn) {
                columns[i].width = Math.min(columns[i].previousWidth + x, columns[i].maxWidth || maxPageX);
              } else {
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
              }

              if (options.forceFitColumns) {
                x = -d;
                for (j = i + 1; j < columnElements.length; j++) {
                  c = columns[j];
                  if (c.resizable) {
                    actualMinWidth = Math.max(c.minWidth || 0, options.absoluteColumnMinWidth);
                    if (x && c.previousWidth + x < actualMinWidth) {
                      x += c.previousWidth - actualMinWidth;
                      c.width = actualMinWidth;
                    } else {
                      c.width = c.previousWidth + x;
                      x = 0;
                    }
                  }
                }
              }
            }
            applyColumnHeaderWidths();
            if (options.syncColumnCellResize) {
              updateCanvasWidth(true); // If you're resizing one of the columns in the pinned section, we should update the size of that area as you drag
              applyColumnWidths();
            }
          })
          .bind("dragend", function (e, dd) {
            var newWidth;
            $(this).parent().removeClass("active");
            for (j = 0; j < columnElements.length; j++) {
              c = columns[j];
              newWidth = $(columnElements[j]).outerWidth();

              if (c.previousWidth !== newWidth && c.rerenderOnResize) {
                invalidateAllRows();
              }
            }
            updateCanvasWidth(true);
            render();
            trigger(self.onColumnsResized, {});
          });
      });
    }

    // Given an element, return the sum of vertical paddings and borders on that element.
    function getVBoxDelta($el) {
      var p = ["borderTopWidth", "borderBottomWidth", "paddingTop", "paddingBottom"];
      var delta = 0;
      $.each(p, function (n, val) {
        delta += parseFloat($el.css(val)) || 0;
      });
      return delta;
    }

    // Hide extra panes if they're not needed (eg: the grid is not using pinned columns)
    function updatePinnedState() {
      if (!isPinned) {
        topViewport.el.eq(1).hide();
        contentViewport.el.eq(1).hide();
      } else {
        topViewport.el.eq(1).show();
        contentViewport.el.eq(1).show();
      }
      setScroller();
      setOverflow();
      createColumnHeaders();
      updateCanvasWidth();
      invalidateAllRows();
    }

    // If columns are pinned, scrollers are in the right-side panes, otherwise they're in the left ones
    function setScroller() {
      if (options.pinnedColumn == undefined) {
        //$headerScrollContainer    = topViewport.el[0];
        topViewport.scroller = topViewport.el[0];
        //$vpScrollContainerX = $vpScrollContainerY = contentViewport.el[0];
        contentViewport.scroller = contentViewport.el[0];
      } else {
        //$headerScrollContainer    = topViewport.el[1];
        topViewport.scroller = topViewport.el[1];
        //$vpScrollContainerX = $vpScrollContainerY = contentViewport.el[1];
        contentViewport.scroller = contentViewport.el[1];
      }
    }

    function setOverflow() {
      if (isPinned) {
        contentViewport.el.eq(0).css({ 'overflow-y': 'hidden' });
      } else {
        contentViewport.el.eq(0).css({ 'overflow-y': '' });
      }
      //cl.viewport.css({
      //  'overflow-x': isPinned ? 'scroll' : 'auto',
      //  'overflow-y': isPinned ? 'hidden' : 'auto'
      //});
      //cr.viewport.css({
      //  'overflow-x': isPinned ? 'scroll' : 'auto',
      //  'overflow-y': isPinned ? 'auto'   : 'auto'
      //});
    }

    // Measures the computed sizes of important elements
    // With this method, folks can set whatever CSS size they'd like, and the grid's js can figure it out from there
    function measureCssSizes() {
      if (!options.rowHeight) {
        var el,
          markup = "<div class='cell' style='visibility:hidden'>-</div>";
        el = $('<div class="row">'+ markup +'</div>').appendTo(contentCanvas.el[0]);
        options.rowHeight = el.outerHeight();
        el.remove();
      }
      //console.log('measureCssSizes', {
      //  rowHeight: options.rowHeight
      //});
    }

    // For every type of cell we're interested in measuring, record the amount of border and paddings each has, in both vertical and horizontal directions.
    // Applies to header cells, subHeader cells, and row cells.
//    function measureCellPaddingAndBorder() {
//      var el;
//      var h = ["borderLeftWidth", "borderRightWidth", "paddingLeft", "paddingRight"];
//      var v = ["borderTopWidth", "borderBottomWidth", "paddingTop", "paddingBottom"];
//      var cellMarkup = "<div class='cell' style='visibility:hidden'>-</div>";
//
//      el = $(cellMarkup).appendTo(header.el[0]);
//      header.cellDiffW = header.cellDiffH = 0
//      if (el.css("box-sizing") != "border-box" && el.css("-moz-box-sizing") != "border-box" && el.css("-webkit-box-sizing") != "border-box") {
//        $.each(h, function (n, val) { header.cellDiffW += parseFloat(el.css(val)) || 0; });
//        $.each(v, function (n, val) { header.cellDiffH += parseFloat(el.css(val)) || 0; });
//      }
//      el.remove();
//
//      el = $(cellMarkup).appendTo(subHeader.el[0]);
//      subHeader.cellDiffW = subHeader.cellDiffH = 0;
//      if (el.css("box-sizing") != "border-box" && el.css("-moz-box-sizing") != "border-box" && el.css("-webkit-box-sizing") != "border-box") {
//        $.each(h, function (n, val) { subHeader.cellDiffW  += parseFloat(el.css(val)) || 0; });
//        $.each(v, function (n, val) { subHeader.cellDiffH += parseFloat(el.css(val)) || 0; });
//      }
//      el.remove();
//
//      var r = $("<div class='row' />").appendTo(contentCanvas.el[0]);
//      el = $(cellMarkup).appendTo(r);
//      rows.cellDiffW = rows.cellDiffH = 0;
//      if (el.css("box-sizing") != "border-box" && el.css("-moz-box-sizing") != "border-box" && el.css("-webkit-box-sizing") != "border-box") {
//        $.each(h, function (n, val) { rows.cellDiffW += parseFloat(el.css(val)) || 0; });
//        $.each(v, function (n, val) { rows.cellDiffH += parseFloat(el.css(val)) || 0; });
//      }
//      r.remove();
//
//      options.absoluteColumnMinWidth = Math.max(header.cellDiffW, subHeader.cellDiffW, rows.cellDiffW);
//
//      console.log('measureCellPaddingAndBorder',{
//        headerWH:    header.cellDiffW    +','+ header.cellDiffH,
//        subHeaderWH: subHeader.cellDiffW +','+ subHeader.cellDiffH,
//        cellWH:      rows.cellDiffW      +','+ rows.cellDiffH,
//        absoluteColumnMinWidth: options.absoluteColumnMinWidth
//      });
//    }

    function createCssRules() {
      $style = $("<style type='text/css' rel='stylesheet' />").appendTo($("head"));
//      var rowHeight = (rows.rowHeight - cellHeightDiff);
      var rules = [
//        "." + uid + " .header .cell { left: 1000px; }",
//        "." + uid + " .header { left: 1000px; }",
//        "." + uid + " .subHeader { left: 1000px; }",
//        "." + uid + " .slick-top-panel { height:" + options.topPanelHeight + "px; }",
//        "." + uid + " .cell { height:" + rowHeight + "px; }",
//        "." + uid + " .row { height:" + rows.rowHeight + "px; }"
      ];

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

      //console.log('getColumnCssRules('+ idx +')', {
      //  "left": columnCssRulesL[idx],
      //  "right": columnCssRulesR[idx]
      //});
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

      var i = plugins.length;
      while(i--) {
        unregisterPlugin(plugins[i]);
      }

      if (options.enableColumnReorder) {
        header.el.filter(":ui-sortable").sortable("destroy");
      }

      unbindAncestorScrollEvents();
      $container.unbind(".slickgrid");
      removeCssRules();

      contentCanvas.el.unbind("draginit dragstart dragend drag");
      $container.empty()
        .removeClass(uid)
        .removeClass(objectName);
    }


    //////////////////////////////////////////////////////////////////////////////////////////////
    // General

    // A simple way to expose the uid to consumers, who might care which slickgrid instance they're dealing with.
    function getId() {
      return uid;
    }

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

    function getColumnNodeById(id) {
      var idx = getColumnIndex(id);
      return getHeaderEls(idx);
    }

    // Return the header element(s) that wrap all column headers
    // There is one or two, depending on whether columns are pinned
    function getHeaderEl() {
      return header.el;
    }

    // Get all column header cell elements.
    // There should be as many elements as there are columns
    // It doesn't differentiate between pinned and unpinned columns
    // If you provide an index, it returns only that column
    function getHeaderEls(idx) {
      if (idx == null) {
        return header.el.children()
      } else {
        return header.el.children()[idx]
      }
    }

    // Given an x and a y coord, return the index of the column
    function getColumnIndexFromEvent(evt) {
      var nearestEl = document.elementFromPoint(evt.clientX, evt.clientY);
      var headerEl = $(nearestEl).closest('.cell');
      return getCellFromNode(headerEl[0]);
    }

    function getColumnFromEvent(evt) {
      return columns[getColumnIndexFromEvent(evt)];
    }

    function autosizeColumns() {
      var i, c,
        widths = [],
        shrinkLeeway = 0,
        total = 0,
        prevTotal,
        availWidth = viewportHasVScroll ? contentViewport.width - scrollbarDimensions.width : contentViewport.width;

      for (i = 0; i < columns.length; i++) {
        c = columns[i];
        widths.push(c.width);
        total += c.width;
        if (c.resizable) {
          shrinkLeeway += c.width - Math.max(c.minWidth, options.absoluteColumnMinWidth);
        }
      }

      // shrink
      prevTotal = total;
      while (total > availWidth && shrinkLeeway) {
        var shrinkProportion = (total - availWidth) / shrinkLeeway;
        for (i = 0; i < columns.length && total > availWidth; i++) {
          c = columns[i];
          var width = widths[i];
          if (!c.resizable || width <= c.minWidth || width <= options.absoluteColumnMinWidth) {
            continue;
          }
          var absMinWidth = Math.max(c.minWidth, options.absoluteColumnMinWidth);
          var shrinkSize = Math.floor(shrinkProportion * (width - absMinWidth)) || 1;
          shrinkSize = Math.min(shrinkSize, width - absMinWidth);
          total -= shrinkSize;
          shrinkLeeway -= shrinkSize;
          widths[i] -= shrinkSize;
        }
        if (prevTotal <= total) {  // avoid infinite loop
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
          var currentWidth = widths[i];
          var growSize;

          if (!c.resizable || c.maxWidth <= currentWidth) {
            growSize = 0;
          } else {
            growSize = Math.min(Math.floor(growProportion * currentWidth) - currentWidth, (c.maxWidth - currentWidth) || 1000000) || 1;
          }
          total += growSize;
          widths[i] += growSize;
        }
        if (prevTotal >= total) {  // avoid infinite loop
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
      if (!initialized) { return; }
      var h;
      for (var i = 0, headers = header.el.children(), ii = headers.length; i < ii; i++) {
        h = $(headers[i]);
        if (h.width() !== columns[i].width) {
          h.width(columns[i].width);
        }
      }
      updateColumnCaches();
    }

    function applyColumnWidths() {
      var x = 0, w, rule, canvas;
      for (var i = 0; i < columns.length; i++) {
        w = columns[i].width;
        rule = getColumnCssRules(i);
        rule.left.style.left = x + "px";
        canvas = i > options.pinnedColumn ? contentCanvas[1].width : contentCanvas[0].width;
        rule.right.style.right = (canvas - x - w) + "px";
        // If this column is frozen, reset the css left value since the column starts in a new viewport.
        if (options.pinnedColumn == i) {
          x = 0;
        } else {
          x += columns[i].width;
        }
        //console.log("applyColumnsWidths() ["+ i +"]: "+ x +", " + (canvas - x - w));
      }
    }

    function setSortColumn(columnId, ascending) {
      setSortColumns([{ columnId: columnId, sortAsc: ascending}]);
    }

    function setSortColumns(cols) {
      sortColumns = cols;

      var headerColumnEls = getHeaderEls();
      headerColumnEls
        .removeClass("slick-header-column-sorted")
        .find(".slick-sort-indicator")
        .removeClass("slick-sort-indicator-asc slick-sort-indicator-desc");

      $.each(sortColumns, function(i, col) {
        if (col.sortAsc == null) {
          col.sortAsc = true;
        }
        var columnIndex = getColumnIndex(col.columnId);
        if (columnIndex != null) {
          headerColumnEls.eq(columnIndex)
            .addClass("slick-header-column-sorted")
            .find(".slick-sort-indicator")
            .addClass(col.sortAsc ? "slick-sort-indicator-asc" : "slick-sort-indicator-desc");
        }
      });
    }

    function getSortColumns() {
      return sortColumns;
    }

    function handleSelectedRangesChanged(e, ranges) {
      selectedRows = [];
      var hash = {};
      var maxRow = getDataLength() - 1;
      var maxCell = columns.length - 1;
      for (var i = 0, len = ranges.length; i < len; i++) {
        for (var j = Math.max(0, ranges[i].fromRow), jlen = Math.min(ranges[i].toRow, maxRow); j <= jlen; j++) {
          if (!hash[j]) {  // prevent duplicates
            selectedRows.push(j);
            hash[j] = {};
          }
          for (var k = Math.max(0, ranges[i].fromCell), klen = Math.min(ranges[i].toCell, maxCell); k <= klen; k++) {
            if (canCellBeSelected(j, k)) {
              hash[j][columns[k].id] = options.selectedCellCssClass;
            }
          }
        }
      }

      setCellCssStyles(options.selectedCellCssClass, hash);

      trigger(self.onSelectedRowsChanged, {rows: getSelectedRows()}, e);
    }

    function getColumns() {
      return columns;
    }

    function updateColumnCaches() {
      // Pre-calculate cell boundaries.
      columnPosLeft = [];
      columnPosRight = [];
      var x = 0;
      for (var i = 0, ii = columns.length; i < ii; i++) {
        columnPosLeft[i] = x;
        columnPosRight[i] = x + columns[i].width;
        x += columns[i].width;
      }
    }

    // Given a set of columns, make sure `minWidth <= width <= maxWidth`
    function enforceWidthLimits(cols) {
      columnsById = {};
      for (var i = 0; i < cols.length; i++) {
        var m = cols[i];
        // Changing the object reference can cause problems for external consumers of that object, so we're careful to maintain it using this crazy double extend.
        tempCol = $.extend({}, columnDefaults, m);
        $.extend(m, tempCol);
        columnsById[m.id] = i;
        if (m.minWidth && m.width < m.minWidth) { m.width = m.minWidth; }
        if (m.maxWidth && m.width > m.maxWidth) { m.width = m.maxWidth; }
      }
    }

    /**
     * Set or re-set the columns in the grid
     * @param {array}     columnDefinitions   columns to set
     * @param {object}    opts                mixed in with the `onColumnsChanged` data sent to event handlers
     *                                        opts.skipResizeCanvas let's you skip that step. Boosts performance if you don't need it because you're planning to to manually call resizeCanvas.
     */
    function setColumns(columnDefinitions, opts) {
      columns = columnDefinitions;
      opts = opts || {};
      enforceWidthLimits(columns);
      updateColumnCaches();
      if (initialized) {
        invalidateAllRows();
        createColumnHeaders();
        removeCssRules();
        createCssRules();
        if (!opts.skipResizeCanvas) {
          resizeCanvas();
        }
        applyColumnWidths();
        handleScroll();
        trigger(self.onColumnsChanged, opts);
      }
    }

    // Given a column definition object, do all the steps required to react to a change in the widths of any of the columns, and nothing more.
    function updateColumnWidths(columnDefinitions) {
      columns = columnDefinitions;
      enforceWidthLimits(columns);
      applyColumnWidths();
      updateColumnCaches();
      updateCanvasWidth(true); // Update the grid-canvas width. The `true` tells it to update the width of all the cells even if the canvas hasn't changed size (eg: if there was plenty of room for the cells both before and after the sizing, the canvas doesn't change)
//      trigger(self.onColumnsResized); // TODO: find why this was needed and solve it without an infinite loop
    }

    function getOptions() {
      return options;
    }

    function setOptions(args) {
      if (!getEditorLock().commitCurrentEdit()) {
        return;
      }
      var pinnedColChanged; // If the pinned column has changed, we need to take some extra steps to render canvii

      makeActiveCellNormal();

      if (options.enableAddRow !== args.enableAddRow) {
        invalidateRow(getDataLength());
      }

      if (args.pinnedColumn !== options.pinnedColumn) {
        pinnedColChanged = true;
        options.pinnedColumn = args.pinnedColumn; // $extend usually works, but not in the case where the new value is undefined. $.extend does not copy over null or undefined values.
      }

      options = $.extend(options, args);
      validateAndEnforceOptions();

      if (options.autoHeight) {
        contentViewport.el.css("overflow-y", "hidden");
      } else {
        contentViewport.el.css("overflow-y", null);
      }

      if (pinnedColChanged) { updatePinnedState(); }

      render();
    }

    function validateAndEnforceOptions() {
      if (options.autoHeight) {
        options.leaveSpaceForNewRows = false;
      }
      if (options.pinnedColumn != undefined) {
        isPinned = true;
      } else {
        isPinned = false;
        options.pinnedColumn = undefined; // map null and undefined both to undefined. null does some odd things in numerical comparisons. eg: 20 > null is true (wat!)
      }
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

    function getDataLengthIncludingAddNew() {
      return getDataLength() + (options.enableAddRow ? 1 : 0);
    }

    function getDataItem(i) {
      if (data.getItem) {
        return data.getItem(i);
      } else {
        return data[i];
      }
    }

//    function getTopPanel() {
//      return $topPanel[0];
//    }

//    function setTopPanelVisibility(visible) {
//      if (options.showTopPanel != visible) {
//        options.showTopPanel = visible;
//        if (visible) {
//          $topPanelScroller.slideDown("fast", resizeCanvas);
//        } else {
//          $topPanelScroller.slideUp("fast", resizeCanvas);
//        }
//      }
//    }

    function setSubHeaderVisibility(visible) {
      if (options.showSubHeader != visible) {
        options.showSubHeader = visible;
        if (visible) {
          subHeader.el.show();
//          subHeader.el.slideDown("fast", resizeCanvas);
        } else {
          subHeader.el.hide();
//          subHeader.el.slideUp("fast", resizeCanvas);
        }
      }
      resizeCanvas();
    }

    function getContainerNode() {
      return $container.get(0);
    }

    //////////////////////////////////////////////////////////////////////////////////////////////
    // Rendering / Scrolling

    function getRowTop(row) {
      return options.rowHeight * row - offset;
    }

    // Given a Y position, get the row index.
    // The Y position must be relative to the row canvas for an accurate answer.
    function getRowFromPosition(y) {
//      console.log("("+y+" + "+offset+") / "+options.rowHeight+" = " + Math.floor((y + offset) / options.rowHeight));
      return Math.floor((y + offset) / options.rowHeight);
    }

    function scrollTo(y) {
      y = Math.max(y, 0);
      y = Math.min(y, th - contentViewport.height + (viewportHasHScroll ? scrollbarDimensions.height : 0));

      var oldOffset = offset;

      page = Math.min(n - 1, Math.floor(y / ph));
      offset = Math.round(page * cj);
      var newScrollTop = y - offset;

      if (offset != oldOffset) {
        var range = getVisibleRange(newScrollTop);
        cleanupRows(range);
        updateRowPositions();
      }

      if (prevScrollTop != newScrollTop) {
        vScrollDir = (prevScrollTop + oldOffset < newScrollTop + offset) ? 1 : -1;
        lastRenderedScrollTop = scrollTop = prevScrollTop = newScrollTop;
        contentViewport.el.scrollTop(newScrollTop); // using jquery's .scrollTop() method handles multiple viewports
        trigger(self.onViewportChanged, {});
      }
    }

    function defaultFormatter(row, cell, value, columnDef, dataContext) {
      if (value == null) {
        return "";
      } else {
        return (value + "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
      }
    }

    function getFormatter(row, column) {
      var rowMetadata = data.getItemMetadata && data.getItemMetadata(row);

      // look up by id, then index
      var columnOverrides = rowMetadata &&
        rowMetadata.columns &&
        (rowMetadata.columns[column.id] || rowMetadata.columns[getColumnIndex(column.id)]);

      return (columnOverrides && columnOverrides.formatter) ||
        (rowMetadata && rowMetadata.formatter) ||
        column.formatter ||
        (options.formatterFactory && options.formatterFactory.getFormatter(column)) ||
        options.defaultFormatter;
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

    function appendRowHtml(markupArrayL, markupArrayR, row, range, dataLength) {
      var d = getDataItem(row);
      var dataLoading = row < dataLength && !d;
      var rowCss = "row" +
        (options.addRowIndexToClassName ? " row_" + row : "") +
        (dataLoading ? " loading" : "") +
        (row === activeRow ? " active" : "") +
        (row % 2 == 1 ? " odd" : " even");

      var metadata = data.getItemMetadata && data.getItemMetadata(row);
      if (metadata && metadata.cssClasses) { rowCss += " " + metadata.cssClasses; }

      var rowHtml = "<div class='" + rowCss + "' style='top:" + (getRowTop(row) ) + "px; height:"+ options.rowHeight +"px;line-height:"+ options.rowHeight +"px;'>";
      markupArrayL.push(rowHtml);
      if (isPinned) { markupArrayR.push(rowHtml); }

      var colspan, m;
      for (var i = 0, ii = columns.length; i < ii; i++) {
        m = columns[i];
        colspan = 1;
        if (metadata && metadata.columns) {
          var columnData = metadata.columns[m.id] || metadata.columns[i];
          colspan = (columnData && columnData.colspan) || 1;
          // Grouping metadata can indicate that columns should autocalculate spanning.
          // In this case, we span whatever pinned region we're in, but not the whole grid.
          if (colspan === "*") {
            if (i > options.pinnedColumn || options.pinnedColumn == null) {
              colspan = ii - i;
            } else {
              colspan = options.pinnedColumn + 1 - i;
            }
          }
        }

        // Do not render cells outside of the viewport.
        if (columnPosRight[Math.min(ii - 1, i + colspan - 1)] > range.leftPx) {
          if (columnPosLeft[i] > range.rightPx) {
            // All columns to the right are outside the range.
            break;
          }
          if (i > options.pinnedColumn) {
            appendCellHtml(markupArrayR, row, i, colspan, d);
          } else {
            appendCellHtml(markupArrayL, row, i, colspan, d);
          }
        } else if (isPinned && ( i <= options.pinnedColumn )) {
//          console.log('['+ i +'] is outside of range.leftPx ('+ range.leftPx +'), but since it\'s pinned we should draw it');
          appendCellHtml(markupArrayL, row, i, colspan, d);
        }

        if (colspan > 1) { i += (colspan - 1); }
      }

      markupArrayL.push("</div>");
      if (isPinned) { markupArrayR.push("</div>"); }
    }

    function appendCellHtml(markupArray, row, cell, colspan, item) {
      var m = columns[cell];
      var cellCss = "cell l" + cell + " r" + Math.min(columns.length - 1, cell + colspan - 1) +
        (m.cssClass ? " " + m.cssClass : "");
      if (row === activeRow && cell === activeCell) {
        cellCss += (" active");
      }

      // TODO:  merge them together in the setter
      for (var key in cellCssClasses) {
        if (cellCssClasses[key][row] && cellCssClasses[key][row][m.id]) {
          cellCss += (" " + cellCssClasses[key][row][m.id]);
        }
      }

      markupArray.push("<div class='" + cellCss + "'>");

      // if there is a corresponding row (if not, this is the Add New row or this data hasn't been loaded yet)
      if (item) {
        var value = getDataItemValueForColumn(item, m);
        markupArray.push(getFormatter(row, m)(row, cell, value, m, item));
      }

      markupArray.push("</div>");

      rowsCache[row].cellRenderQueue.push(cell);
      rowsCache[row].cellColSpans[cell] = colspan;
    }


    function cleanupRows(rangeToKeep) {
      for (var i in rowsCache) {
        if (((i = parseInt(i, 10)) !== activeRow) && (i < rangeToKeep.top || i > rangeToKeep.bottom)) {
          removeRowFromCache(i);
        }
      }
    }

    function invalidate() {
      updateRowCount();
      invalidateAllRows();
      render();
      trigger(self.onInvalidate);
    }

    function invalidateAllRows() {
      if (currentEditor) {
        makeActiveCellNormal();
      }
      for (var row in rowsCache) {
        removeRowFromCache(row);
      }
    }

    // While scrolling, remove rows from cache and dom if they're off screen
    // There's an exception in here for OSX--if you remove the element that triggered a scroll it interrupts inertial scrolling and feels janky.
    function removeRowFromCache(row) {
      var cacheEntry = rowsCache[row];
      if (!cacheEntry) { return; }
      if (row === protectedRowIdx) { return; }
      //contentCanvas.el[0].removeChild(cacheEntry.rowNode);
      cacheEntry.rowNode[0].parentElement.removeChild(cacheEntry.rowNode[0]);
      // If there's one in the right viewport, remove that, too
      if (cacheEntry.rowNode[1]) {
        cacheEntry.rowNode[1].parentElement.removeChild(cacheEntry.rowNode[1]);
      }
      delete rowsCache[row];
      delete postProcessedRows[row];
      renderedRows--;
      counter_rows_removed++;
//      console.log('removeRowFromCache('+row+')', {
//        renderedRows: renderedRows,
//        rowsCache_length: Object.keys(rowsCache).length,
//        rowsCache: rowsCache
//        postProcessedRows_length: Object.keys(postProcessedRows).length
//      });
    }

    function invalidateRows(rows) {
      var i, rl;
      if (!rows || !rows.length) {
        return;
      }
      vScrollDir = 0;
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

      var m = columns[cell], d = getDataItem(row);
      if (currentEditor && activeRow === row && activeCell === cell) {
        currentEditor.loadValue(d);
      } else {
        cellNode.innerHTML = d ? getFormatter(row, m)(row, cell, getDataItemValueForColumn(d, m), m, d) : "";
        invalidatePostProcessingResults(row);
      }
    }

    function updateRow(row) {
      var cacheEntry = rowsCache[row];
      if (!cacheEntry) {
        return;
      }

      ensureCellNodesInRowsCache(row);

      var d = getDataItem(row);

      for (var columnIdx in cacheEntry.cellNodesByColumnIdx) {
        if (!cacheEntry.cellNodesByColumnIdx.hasOwnProperty(columnIdx)) {
          continue;
        }

        columnIdx = columnIdx | 0;
        var m = columns[columnIdx],
          node = cacheEntry.cellNodesByColumnIdx[columnIdx];

        if (row === activeRow && columnIdx === activeCell && currentEditor) {
          currentEditor.loadValue(d);
        } else if (d) {
          node.innerHTML = getFormatter(row, m)(row, columnIdx, getDataItemValueForColumn(d, m), m, d);
        } else {
          node.innerHTML = "";
        }
      }

      invalidatePostProcessingResults(row);
    }

    // TODO: calculate the height of the header and subHeader row based on their css size
    function calculateHeights() {
      if (options.autoHeight) {
        contentViewport.height = options.rowHeight
        * getDataLengthIncludingAddNew()
        + header.el.outerHeight();
      } else {
//        topPanel.height = ( options.showTopPanel )
//          ? options.topPanelHeight + getVBoxDelta($topPanelScroller)
//          ? topPanel.el.outerHeight()
//          : 0;
//        subHeader.height = ( options.showSubHeader )
//          ? subHeader.el.outerHeight()
//          : 0;
        contentViewport.height = parseFloat($.css($container[0], "height", true))
        - parseFloat($.css($container[0], "paddingTop", true))
        - parseFloat($.css($container[0], "paddingBottom", true))
        - parseFloat($.css(topViewport.el[0], "height"))
        - getVBoxDelta(topViewport.el.eq(0));
//          - c.topPanelHeight
//          - subHeader.height;
      }
      numVisibleRows = Math.ceil(contentViewport.height / options.rowHeight);

      // The top pane includes the viewport, top panel, and header row
//      c.paneHeight = contentViewport.height + c.topPanelHeight + subHeader.height;
//      c.paneHeight = contentViewport.height + subHeader.height;
//      if (options.pinnedColumn != undefined && options.autoHeight) { c.paneHeight += scrollbarDimensions.height; }
      // The top viewport does not contain the top panel or header row
      // contentViewport.height = c.paneHeight - c.topPanelHeight - subHeader.height;

//      console.log('calculateHeights', {
//        subHeader_height: subHeader.height,
//        contentViewport_height: contentViewport.height,
//        VBoxDelta_of_subHeader_el: getVBoxDelta(subHeader.el),
//        numVisibleRows: numVisibleRows
//        topViewport_el_css_height: parseFloat($.css(topViewport.el[0], "height"))
//      });
    }

    // If you pass it a width, that width is used as the viewport width. If you do not, it is calculated as normal.
    // This is more performant if the canvas size is changed externally. The width is already known so we can pass it in instead of recalculating.
    function calculateViewportWidth(width) {
      contentViewport.width = width || parseFloat($.css($container[0], "width", true));
      //console.log('calculateViewportWidth', contentViewport.width);
    }

    // If you pass resizeOptions.width, the viewport width calculation can be skipped. This saves 15ms or so.
    function resizeCanvas(resizeOptions) {
      if (!initialized) { return; }
      resizeOptions = resizeOptions || {};

      // Reset
      contentViewport.height = 0;
      calculateHeights();
      calculateViewportWidth();

      // Assign all the sizes we just calculated
      //if (options.autoHeight) {
      //  if (options.pinnedColumn != undefined) {
      //    $container.height( contentViewport.height + parseFloat($.css(tl.viewport[0], "height")) );
      //  }
      //  tl.pane.css('position', 'relative');
      //}

      var topOffset = topViewport.el.height(); // the top boundary of the center row of things
      contentViewport.el.css({ 'top': topOffset, 'height': contentViewport.height });

      //if (!resizeOptions.skipHeight) {
      //  if (options.autoHeight) {
      //    viewportH = options.rowHeight * getDataLengthIncludingAddNew();
      //  } else {
      //    calculateViewportHeight();
      //}
      //numVisibleRows = Math.ceil(viewportH / options.rowHeight);
      //if (!options.autoHeight) {
      //  contentViewport.el.height(viewportH);
      //}
      //}

      //calculateViewportWidth(resizeOptions.width);

      if (options.forceFitColumns) {
        autosizeColumns();
      }

      updateRowCount();
      handleScroll();
      // Since the width has changed, force the render() to reevaluate virtually rendered cells.
      lastRenderedScrollLeft = -1;
      render();
    }

    function updateRowCount() {
      if (!initialized) { return; }

      var dataLengthIncludingAddNew = getDataLengthIncludingAddNew();
      var numberOfRows = dataLengthIncludingAddNew +
        (options.leaveSpaceForNewRows ? numVisibleRows - 1 : 0);

      var oldViewportHasVScroll = viewportHasVScroll;
      // with autoHeight, we do not need to accommodate the vertical scroll bar
      viewportHasVScroll = !options.autoHeight && (numberOfRows * options.rowHeight > contentViewport.height);

      makeActiveCellNormal();

      // remove the rows that are now outside of the data range
      // this helps avoid redundant calls to .removeRow() when the size of the data decreased by thousands of rows
      var l = dataLengthIncludingAddNew - 1;
      for (var i in rowsCache) {
        if (i >= l) {
          removeRowFromCache(i);
        }
      }

      if (activeCellNode && activeRow > l) {
        resetActiveCell();
      }

      var oldH = h;
      th = Math.max(options.rowHeight * numberOfRows, contentViewport.height - scrollbarDimensions.height);
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
        contentCanvas.el.css("height", h);
        scrollTop = contentViewport.el[0].scrollTop;
      }

      var oldScrollTopInRange = (scrollTop + offset <= th - contentViewport.height);

      if (th == 0 || scrollTop == 0) {
        page = offset = 0;
      } else if (oldScrollTopInRange) {
        // maintain virtual position
        scrollTo(scrollTop + offset);
      } else {
        // scroll to bottom
        scrollTo(th - contentViewport.height);
      }

      if (h != oldH && options.autoHeight) {
        resizeCanvas();
      }

      if (options.forceFitColumns && oldViewportHasVScroll != viewportHasVScroll) {
        autosizeColumns();
      }
      updateCanvasWidth(false);
    }

    function getVisibleRange(viewportTop, viewportLeft) {
      if (viewportTop == null) {
        viewportTop = scrollTop;
      }
      if (viewportLeft == null) {
        viewportLeft = scrollLeft;
      }

      return {
        top: getRowFromPosition(viewportTop),
        bottom: getRowFromPosition(viewportTop + contentViewport.height) + 1,
        leftPx: viewportLeft,
        rightPx: viewportLeft + contentViewport.width
      };
    }

    function getRenderedRange(viewportTop, viewportLeft) {
      var range = getVisibleRange(viewportTop, viewportLeft);
      var buffer = Math.round(contentViewport.height / options.rowHeight);
      var minBuffer = 3;

      if (vScrollDir == -1) {
        range.top -= buffer;
        range.bottom += minBuffer;
      } else if (vScrollDir == 1) {
        range.top -= minBuffer;
        range.bottom += buffer;
      } else {
        range.top -= minBuffer;
        range.bottom += minBuffer;
      }

      range.top = Math.max(0, range.top);
      range.bottom = Math.min(getDataLengthIncludingAddNew() - 1, range.bottom);

      range.leftPx  -= contentViewport.width;
      range.rightPx += contentViewport.width;

      range.leftPx = Math.max(0, range.leftPx);
      range.rightPx = Math.min(contentCanvas.width, range.rightPx);

      return range;
    }

    /*
     Fills in cellNodesByColumnIdx with dom node references
     -
     rowsCache[idx].rowNode is a jquery element that wraps two raw dom elements.
     When pinned, there are two containers, one left and one right.
     rowsCache[idx].rowNode.children().length // sum of both
     rowsCache[idx].rowNode[0].childNodes.length // left side
     rowsCache[idx].rowNode[1].childNodes.length // right side
     */
    function ensureCellNodesInRowsCache(row) {
      var cacheEntry = rowsCache[row];
      if (cacheEntry) {
        if (cacheEntry.cellRenderQueue.length) {
          var $lastNode = cacheEntry.rowNode.children().last();           // The last cell in the row
          while (cacheEntry.cellRenderQueue.length) {
            var columnIdx = cacheEntry.cellRenderQueue.pop();
            cacheEntry.cellNodesByColumnIdx[columnIdx] = $lastNode[0];
            $lastNode = $lastNode.prev();
            // cellRenderQueue is not empty but there is no .prev() element.
            // We must need to switch to the other pinned row container.
            if ($lastNode.length === 0) { $lastNode = $(cacheEntry.rowNode[0]).children().last(); }
          }
        }
      }
    }

    function cleanUpCells(range, row) {
      var totalCellsRemoved = 0;
      var cacheEntry = rowsCache[row];

      // Remove cells outside the range.
      var cellsToRemove = [];
      for (var i in cacheEntry.cellNodesByColumnIdx) {
        // I really hate it when people mess with Array.prototype.
        if (!cacheEntry.cellNodesByColumnIdx.hasOwnProperty(i)) {
          continue;
        }
        i = i | 0;                                        // This is a string, so it needs to be cast back to a number.
        if (i <= options.pinnedColumn) { continue; }      // never remove cells in a frozen column

        var colspan = cacheEntry.cellColSpans[i];
        if (columnPosLeft[i] > range.rightPx || columnPosRight[Math.min(columns.length - 1, i + colspan - 1)] < range.leftPx) {
          if (!(row == activeRow && i == activeCell)) {
            cellsToRemove.push(i);
          }
        }
      }

      // Remove every cell that isn't in the range,
      // remove the dom element, cellColSpans, cellNodesByColumnIdx, and postProcessedRows entries.
      var cellToRemove, el;
      while ((cellToRemove = cellsToRemove.pop()) != null) {
        el = cacheEntry.cellNodesByColumnIdx[cellToRemove];
        // We used to know the parent, but now there are two possible parents (left or right), so it's easier to go from element to parent to remove:
        // The parent element won't exist if we removed the whole row. eg: we've stopping pinning columns so the whole viewport was removed.
        if (el && el.parentElement) {
          el.parentElement.removeChild(el);
        }
//        console.log('cleanUpCells() row: '+ row +' col: '+ cellToRemove);
        delete cacheEntry.cellColSpans[cellToRemove];
        delete cacheEntry.cellNodesByColumnIdx[cellToRemove];
        if (postProcessedRows[row]) { delete postProcessedRows[row][cellToRemove]; }
        totalCellsRemoved++;
      }
      return totalCellsRemoved;
    }

    function cleanUpAndRenderCells(range) {
      var cacheEntry;
      var markupArray = [];
      var processedRows = [];
      var cellsAdded, cellsRemoved;
      var totalCellsAdded = 0;
      var colspan;

      for (var row = range.top, btm = range.bottom; row <= btm; row++) {
        cacheEntry = rowsCache[row];
        if (!cacheEntry) {
          continue;
        }

        // cellRenderQueue populated in renderRows() needs to be cleared first
        ensureCellNodesInRowsCache(row);

        cellsRemoved = cleanUpCells(range, row);

        // Render missing cells.
        cellsAdded = 0;

        var metadata = data.getItemMetadata && data.getItemMetadata(row);
        metadata = metadata && metadata.columns;

        var d = getDataItem(row);

        // TODO:  shorten this loop (index? heuristics? binary search?)
        for (var i = 0, ii = columns.length; i < ii; i++) {
          // Cells to the right are outside the range.
          if (columnPosLeft[i] > range.rightPx) {
            break;
          }

          // Already rendered.
          if ((colspan = cacheEntry.cellColSpans[i]) != null) {
            i += (colspan > 1 ? colspan - 1 : 0);
            continue;
          }

          // Adjust the colspan if needed
          colspan = 1;
          if (metadata) {
            var columnData = metadata[columns[i].id] || metadata[i];
            colspan = (columnData && columnData.colspan) || 1;
            if (colspan === "*") {
              colspan = ii - i;
            }
          }

          // Cells whose right edge is inside the left range boundary are visible and should be drawn
          if (columnPosRight[Math.min(ii - 1, i + colspan - 1)] > range.leftPx) {
            appendCellHtml(markupArray, row, i, colspan, d);
            cellsAdded++;
          }

          i += (colspan > 1 ? colspan - 1 : 0);
        }

        if (cellsAdded) {
          totalCellsAdded += cellsAdded;
          processedRows.push(row);
        }
      }

      if (!markupArray.length) {
        return;
      }

      // Create a temporary DOM element to hold the markup for every cell. Can be from different rows.
      var x = document.createElement("div");
      x.innerHTML = markupArray.join("");

      var processedRow, $node, side;
      while ((processedRow = processedRows.pop()) != null) {
        cacheEntry = rowsCache[processedRow];
        var columnIdx;

        // Starting on the rightmost cell,
        while ((columnIdx = cacheEntry.cellRenderQueue.pop()) != null) {
          $node = $(x).children().last();
          side = columnIdx > options.pinnedColumn ? 1 : 0;
          $(cacheEntry.rowNode[side]).append($node);
          cacheEntry.cellNodesByColumnIdx[columnIdx] = $node[0];
        }
//        console.log('cleanUpAndRenderCells', {
//          cellsAdded:  cellsAdded,
//          cellsRemoved: cellsRemoved,
//          leftLength:  cacheEntry.rowNode[0].childNodes.length,
//          rightLength: cacheEntry.rowNode[1].childNodes.length
//        });
      }
    }

    function renderRows(range) {
      var markupArrayL = [],
        markupArrayR = [],
        rows = [],
        needToReselectCell = false,
        dataLength = getDataLength();

      for (var i = range.top, ii = range.bottom; i <= ii; i++) {
        if (rowsCache[i]) {
          continue;
        }
        renderedRows++;
        rows.push(i);

        // Create an entry right away so that appendRowHtml() can
        // start populatating it.
        rowsCache[i] = {
          "rowNode": null,

          // ColSpans of rendered cells (by column idx).
          // Can also be used for checking whether a cell has been rendered.
          "cellColSpans": [],

          // Cell nodes (by column idx).  Lazy-populated by ensureCellNodesInRowsCache().
          "cellNodesByColumnIdx": [],

          // Column indices of cell nodes that have been rendered, but not yet indexed in
          // cellNodesByColumnIdx.  These are in the same order as cell nodes added at the
          // end of the row.
          "cellRenderQueue": []
        };

        appendRowHtml(markupArrayL, markupArrayR, i, range, dataLength);
        if (activeCellNode && activeRow === i) {
          needToReselectCell = true;
        }
        counter_rows_rendered++;
      }

      if (!rows.length) { return; }

      var l = document.createElement("div"),
        r = document.createElement("div");
      l.innerHTML = markupArrayL.join('');
      r.innerHTML = markupArrayR.join('');

      // For each row, add a row node that contains either one or two elements, depending on whether columns are pinned
      for (var i = 0, ii = rows.length; i < ii; i++) {
        if (isPinned) {
          rowsCache[rows[i]].rowNode = $()
            .add($(l.firstChild).appendTo(contentCanvas.el[0]))
            .add($(r.firstChild).appendTo(contentCanvas.el[1]));
        } else {
          rowsCache[rows[i]].rowNode = $()
            .add($(l.firstChild).appendTo(contentCanvas.el[0]));
        }
      }

//      console.log('renderRows()', {
//        counter_rows_rendered: counter_rows_rendered,
//        markupArrayL: markupArrayL,
//        markupArrayR: markupArrayR,
//        rowsCache: rowsCache
//      });

      if (needToReselectCell) {
        activeCellNode = getCellNode(activeRow, activeCell);
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
        rowsCache[row].rowNode.css('top', getRowTop(row) + "px");
        //rowsCache[row].rowNode.style.top = getRowTop(row) + "px";
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

      // If we change the left scroll, we may need to add/remove cells from already drawn rows.
      if (lastRenderedScrollLeft != scrollLeft) {
        cleanUpAndRenderCells(rendered);
      }

      // render missing rows
      renderRows(rendered);

      postProcessFromRow = visible.top;
      postProcessToRow = Math.min(getDataLengthIncludingAddNew() - 1, visible.bottom);
      startPostProcessing();

      lastRenderedScrollTop = scrollTop;
      lastRenderedScrollLeft = scrollLeft;
      h_render = null;
    }

    //function handleSubHeaderScroll() {
    //  var scrollLeft = subHeader.scroller.scrollLeft;
    //  if (scrollLeft != contentViewport.el[0].scrollLeft) {
    //    contentViewport.el[0].scrollLeft = scrollLeft;
    //  }
    //}

    //function handleMouseWheel(event, delta, deltaX, deltaY) {
    //  scrollTop = Math.max(0, $vpScrollContainerY[0].scrollTop - (deltaY * options.rowHeight));
    //  scrollLeft = $vpScrollContainerX[0].scrollLeft + (deltaX * 10);
    //  reallyHandleScroll(true);
    //  event.preventDefault();
    //}

    function handleScroll() {
      scrollTop  = contentViewport.scroller.scrollTop;
      scrollLeft = contentViewport.scroller.scrollLeft;
      reallyHandleScroll(false);
    }

    function reallyHandleScroll(isMouseWheel) {
      var contentScroller = contentViewport.scroller;
      // Ceiling the max scroll values
      var maxScrollDistanceY = contentScroller.scrollHeight - contentScroller.clientHeight;
      var maxScrollDistanceX = contentScroller.scrollWidth  - contentScroller.clientWidth;
      if (scrollTop  > maxScrollDistanceY) { scrollTop  = maxScrollDistanceY; }
      if (scrollLeft > maxScrollDistanceX) { scrollLeft = maxScrollDistanceX; }

      var vScrollDist = Math.abs(scrollTop - prevScrollTop);
      var hScrollDist = Math.abs(scrollLeft - prevScrollLeft);

      if (hScrollDist) {
        prevScrollLeft = scrollLeft;
        contentScroller.scrollLeft = scrollLeft;
        topViewport.scroller.scrollLeft = scrollLeft;
//        $topPanelScroller[0].scrollLeft = scrollLeft;
      }

      if (vScrollDist) {
        vScrollDir = prevScrollTop < scrollTop ? 1 : -1;
        prevScrollTop = scrollTop;

        if (isMouseWheel) { contentScroller.scrollTop = scrollTop; }
        // Set the scroll position of the paired viewport to match this one
        if (isPinned) { contentViewport.el[0].scrollTop = scrollTop; }
        // switch virtual pages if needed
        if (vScrollDist < contentViewport.height) {
          scrollTo(scrollTop + offset);
        } else {
          var oldOffset = offset;
          if (h == contentViewport.height) {
            page = 0;
          } else {
            page = Math.min(n - 1, Math.floor(scrollTop * ((th - contentViewport.height) / (h - contentViewport.height)) * (1 / ph)));
          }
          offset = Math.round(page * cj);
          if (oldOffset != offset) {
            invalidateAllRows();
          }
        }
      }

      if (hScrollDist || vScrollDist) {
        if (h_render) {
          clearTimeout(h_render);
        }

        if (Math.abs(lastRenderedScrollTop - scrollTop) > 20 ||
          Math.abs(lastRenderedScrollLeft - scrollLeft) > 20) {
          if (options.forceSyncScrolling || (
            Math.abs(lastRenderedScrollTop - scrollTop) < contentViewport.height &&
            Math.abs(lastRenderedScrollLeft - scrollLeft) < contentViewport.width)) {
            render();
          } else {
            h_render = setTimeout(render, 50);
          }

          trigger(self.onViewportChanged, {});
        }
      }

      trigger(self.onScroll, {scrollLeft: scrollLeft, scrollTop: scrollTop});
    }

    function asyncPostProcessRows() {
      var dataLength = getDataLength();
      while (postProcessFromRow <= postProcessToRow) {
        var row = (vScrollDir >= 0) ? postProcessFromRow++ : postProcessToRow--;
        var cacheEntry = rowsCache[row];
        if (!cacheEntry || row >= dataLength) {
          continue;
        }

        if (!postProcessedRows[row]) {
          postProcessedRows[row] = {};
        }

        ensureCellNodesInRowsCache(row);
        for (var columnIdx in cacheEntry.cellNodesByColumnIdx) {
          if (!cacheEntry.cellNodesByColumnIdx.hasOwnProperty(columnIdx)) {
            continue;
          }

          columnIdx = columnIdx | 0;

          var m = columns[columnIdx];
          if (m.asyncPostRender && !postProcessedRows[row][columnIdx]) {
            var node = cacheEntry.cellNodesByColumnIdx[columnIdx];
            if (node) {
              m.asyncPostRender(node, row, getDataItem(row), m);
            }
            postProcessedRows[row][columnIdx] = true;
          }
        }

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

      trigger(self.onCellCssStylesChanged, { "key": key, "hash": hash });
    }

    function removeCellCssStyles(key) {
      if (!cellCssClasses[key]) {
        return;
      }

      updateCellCssStylesOnRenderedRows(null, cellCssClasses[key]);
      delete cellCssClasses[key];

      trigger(self.onCellCssStylesChanged, { "key": key, "hash": null });
    }

    function setCellCssStyles(key, hash) {
      var prevHash = cellCssClasses[key];

      cellCssClasses[key] = hash;
      updateCellCssStylesOnRenderedRows(hash, prevHash);

      trigger(self.onCellCssStylesChanged, { "key": key, "hash": hash });
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
          setTimeout(function () {
              $cell.queue(function () {
                $cell.toggleClass(options.cellFlashingCssClass).dequeue();
                toggleCellClass(times - 1);
              });
            },
            speed);
        }

        toggleCellClass(4);
      }
    }

    //////////////////////////////////////////////////////////////////////////////////////////////
    // Interactivity

    function handleDragInit(e, dd) {
      var cell = getCellFromEvent(e);
      if (!cell || !cellExists(cell.row, cell.cell)) {
        return false;
      }

      var retval = trigger(self.onDragInit, dd, e);
      if (e.isImmediatePropagationStopped()) {
        return retval;
      }

      // if nobody claims to be handling drag'n'drop by stopping immediate propagation,
      // cancel out of it
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
      trigger(self.onKeyDown, {row: activeRow, cell: activeCell}, e);
      var handled = e.isImmediatePropagationStopped();

      if (!handled) {
        if (!e.shiftKey && !e.altKey && !e.ctrlKey) {
          if (e.which == 27) {
            if (!getEditorLock().isActive()) {
              return; // no editing mode to cancel, allow bubbling and default processing (exit without cancelling the event)
            }
            cancelEditAndSetFocus();
          } else if (e.which == 34) {
            navigatePageDown();
            handled = true;
          } else if (e.which == 33) {
            navigatePageUp();
            handled = true;
          } else if (e.which == 37) {
            handled = navigateLeft();
          } else if (e.which == 39) {
            handled = navigateRight();
          } else if (e.which == 38) {
            handled = navigateUp();
          } else if (e.which == 40) {
            handled = navigateDown();
          } else if (e.which == 9) {
            handled = navigateNext();
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
            handled = true;
          }
        } else if (e.which == 9 && e.shiftKey && !e.ctrlKey && !e.altKey) {
          handled = navigatePrev();
        }
      }

      if (handled) {
        // the event has been handled so don't let parent element (bubbling/propagation) or browser (default) handle it
        e.stopPropagation();
        e.preventDefault();
        try {
          e.originalEvent.keyCode = 0; // prevent default behaviour for special keys in IE browsers (F3, F5, etc.)
        }
          // ignore exceptions - setting the original event's keycode throws access denied exception for "Ctrl"
          // (hitting control key only, nothing else), "Shift" (maybe others)
        catch (error) {
        }
      }
    }

    function handleClick(e) {
      if (!currentEditor) {
        // if this click resulted in some cell child node getting focus,
        // don't steal it back - keyboard events will still bubble up
        // IE9+ seems to default DIVs to tabIndex=0 instead of -1, so check for cell clicks directly.
        if (e.target != document.activeElement || $(e.target).hasClass("cell")) {
          setFocus();
        }
      }

      var cell = getCellFromEvent(e);
      if (!cell || (currentEditor !== null && activeRow == cell.row && activeCell == cell.cell)) {
        return;
      }

      trigger(self.onClick, {row: cell.row, cell: cell.cell}, e);
      if (e.isImmediatePropagationStopped()) {
        return;
      }

      if ((activeCell != cell.cell || activeRow != cell.row) && canCellBeActive(cell.row, cell.cell)) {
        if (!getEditorLock().isActive() || getEditorLock().commitCurrentEdit()) {
          scrollRowIntoView(cell.row, false);
          setActiveCellInternal(getCellNode(cell.row, cell.cell));
        }
      }
    }

    function handleContextMenu(e) {
      var $cell = $(e.target).closest(".cell", contentCanvas.el);
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

      trigger(self.onDblClick, {row: cell.row, cell: cell.cell}, e);
      if (e.isImmediatePropagationStopped()) {
        return;
      }

      if (options.editable) {
        gotoCell(cell.row, cell.cell, true);
      }
    }

    function handleHeaderMouseEnter(e) {
      trigger(self.onHeaderMouseEnter, {
        "column": $(this).data("column")
      }, e);
    }

    function handleHeaderMouseLeave(e) {
      trigger(self.onHeaderMouseLeave, {
        "column": $(this).data("column")
      }, e);
    }

    function handleHeaderContextMenu(e) {
      var $header = $(e.target).closest(".cell", ".header");
      var column = $header && $header.data("column");
      trigger(self.onHeaderContextMenu, {column: column}, e);
    }

    function handleSubHeaderContextMenu(e) {
      var $subHeader = $(e.target).closest(".cell", ".subHeader");
      var column = $subHeader && $subHeader.data("column");
      trigger(self.onSubHeaderContextMenu, {column: column}, e);
    }

    function handleHeaderClick(e) {
      var $header = $(e.target).closest(".cell", ".header");
      var column = $header && $header.data("column");
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
      var row = getRowFromPosition(y);
      var cell = 0;

      var w = 0;
      for (var i = 0; i < columns.length && w < x; i++) {
        w += columns[i].width;
        cell++;
      }

      if (cell < 0) {
        cell = 0;
      }

      return {row: row, cell: cell - 1};
    }

    // Given a cell element, read column number from .l<columnNumber> CSS class
    function getCellFromNode(cellNode) {
      if (cellNode[0]) { cellNode = cellNode[0]; } // unwrap jquery
      var cls = /l\d+/.exec(cellNode.className);
      if (!cls) {
        throw "getCellFromNode: cannot get cell - " + cellNode.className;
      }
      return parseInt(cls[0].substr(1, cls[0].length - 1), 10);
    }

    // Given a dom element for a row, find out which row index it belongs to
    function getRowFromNode(node) {
      for (var idx in rowsCache) {
        if(
          rowsCache[idx].rowNode[0] === node ||
          rowsCache[idx].rowNode[1] === node
        ){
          return parseInt(idx);
//        if (rowsCache[row].rowNode[0] === rowNode[0]) {
//          return row | 0;
//        }
        }
      }
      return null;
    }

    function getCellFromEvent(e) {
      var $cell = $(e.target).closest(".cell", contentCanvas.el);
      if (!$cell.length) {
        return null;
      }

      var row = getRowFromNode($cell[0].parentNode);
      var cell = getCellFromNode($cell[0]);

      if (row == null || cell == null) {
        return null;
      } else {
        return {
          "row": row,
          "cell": cell
        };
      }
    }

    function getCellNodeBox(row, cell) {
      if (!cellExists(row, cell)) {
        return null;
      }

      var y1 = getRowTop(row);
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

    //////////////////////////////////////////////////////////////////////////////////////////////
    // Cell switching

    function resetActiveCell() {
      setActiveCellInternal(null, false);
    }

    function setFocus() {
      if (tabbingDirection == -1) {
        $focusSink[0].focus();
      } else {
        $focusSink2[0].focus();
      }
    }

    function scrollCellIntoView(row, cell, doPaging) {
      scrollRowIntoView(row, doPaging);

      var colspan = getColspan(row, cell);
      var left = columnPosLeft[cell],
        right = columnPosRight[cell + (colspan > 1 ? colspan - 1 : 0)],
        scrollRight = scrollLeft + contentViewport.width;

      // If there is a pinned column, and we were asked to scroll that cell into view, abort. We assume pinned columns have a fully visible X dimension.
      if(cell <= options.pinnedColumn) {
        console.log('scrollCellIntoView: asked to work on pinned column ['+ cell +'], skipping X scroll');
        return;
      }

      if (left < scrollLeft) {
        contentViewport.el.scrollLeft(left);
        handleScroll();
        render();
      } else if (right > scrollRight) {
        contentViewport.el.scrollLeft(Math.min(left, right - contentViewport.el[0].clientWidth));
        handleScroll();
        render();
      }
    }

    function setActiveCellInternal(newCell, opt_editMode) {
      if (activeCellNode !== null) {
        makeActiveCellNormal();
        $(activeCellNode).removeClass("active");
        if (rowsCache[activeRow]) {
          $(rowsCache[activeRow].rowNode).removeClass("active");
        }
      }

      var activeCellChanged = (activeCellNode !== newCell);
      activeCellNode = newCell;

      if (activeCellNode != null) {
        activeRow = getRowFromNode(activeCellNode.parentNode);
        activeCell = activePosX = getCellFromNode(activeCellNode);

        if (opt_editMode == null) {
          opt_editMode = (activeRow == getDataLength()) || options.autoEdit;
        }

        $(activeCellNode).addClass("active");
        $(rowsCache[activeRow].rowNode).addClass("active");

        if (options.editable && opt_editMode && isCellPotentiallyEditable(activeRow, activeCell)) {
          clearTimeout(h_editorLoader);

          if (options.asyncEditorLoading) {
            h_editorLoader = setTimeout(function () {
              makeActiveCellEditable();
            }, options.asyncEditorLoadDelay);
          } else {
            makeActiveCellEditable();
          }
        }
      } else {
        activeRow = activeCell = null;
      }

      if (activeCellChanged) {
        trigger(self.onActiveCellChanged, getActiveCell());
      }
    }

    function clearTextSelection() {
      if (document.selection && document.selection.empty) {
        try {
          //IE fails here if selected element is not in dom
          document.selection.empty();
        } catch (e) { }
      } else if (window.getSelection) {
        var sel = window.getSelection();
        if (sel && sel.removeAllRanges) {
          sel.removeAllRanges();
        }
      }
    }

    function isCellPotentiallyEditable(row, cell) {
      var dataLength = getDataLength();
      // is the data for this row loaded?
      if (row < dataLength && !getDataItem(row)) {
        return false;
      }

      // are we in the Add New row?  can we create new from this cell?
      if (columns[cell].cannotTriggerInsert && row >= dataLength) {
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
      trigger(self.onBeforeCellEditorDestroy, {editor: currentEditor});
      currentEditor.destroy();
      currentEditor = null;

      if (activeCellNode) {
        var d = getDataItem(activeRow);
        $(activeCellNode).removeClass("editable invalid");
        if (d) {
          var column = columns[activeCell];
          var formatter = getFormatter(activeRow, column);
          activeCellNode.innerHTML = formatter(activeRow, activeCell, getDataItemValueForColumn(d, column), column, d);
          invalidatePostProcessingResults(activeRow);
        }
      }

      // if there previously was text selected on a page (such as selected text in the edit cell just removed),
      // IE can't set focus to anything else correctly
      if (navigator.userAgent.toLowerCase().match(/msie/)) {
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

      if (trigger(self.onBeforeEditCell, {row: activeRow, cell: activeCell, item: item, column: columnDef}) === false) {
        setFocus();
        return;
      }

      getEditorLock().activate(editController);
      $(activeCellNode).addClass("editable");

      // don't clear the cell if a custom editor is passed through
      if (!editor) {
        activeCellNode.innerHTML = "";
      }

      currentEditor = new (editor || getEditor(activeRow, activeCell))({
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
        visible: true};
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
        return {row: activeRow, cell: activeCell};
      }
    }

    function getActiveCellNode() {
      return activeCellNode;
    }

    function scrollRowIntoView(row, doPaging) {
      var rowAtTop = row * options.rowHeight;
      var rowAtBottom = (row + 1) * options.rowHeight - contentViewport.height + (viewportHasHScroll ? scrollbarDimensions.height : 0);

      // need to page down?
      if ((row + 1) * options.rowHeight > scrollTop + contentViewport.height + offset) {
        scrollTo(doPaging ? rowAtTop : rowAtBottom);
        render();
      }
      // or page up?
      else if (row * options.rowHeight < scrollTop + offset) {
        scrollTo(doPaging ? rowAtBottom : rowAtTop);
        render();
      }
    }

    function scrollRowToTop(row) {
      scrollTo(row * options.rowHeight);
      render();
    }

    function scrollPage(dir) {
      var deltaRows = dir * numVisibleRows;
      scrollTo((getRowFromPosition(scrollTop) + deltaRows) * options.rowHeight);
      render();

      if (options.enableCellNavigation && activeRow != null) {
        var row = activeRow + deltaRows;
        var dataLengthIncludingAddNew = getDataLengthIncludingAddNew();
        if (row >= dataLengthIncludingAddNew) {
          row = dataLengthIncludingAddNew - 1;
        }
        if (row < 0) {
          row = 0;
        }

        var cell = 0, prevCell = null;
        var prevActivePosX = activePosX;
        while (cell <= activePosX) {
          if (canCellBeActive(row, cell)) {
            prevCell = cell;
          }
          cell += getColspan(row, cell);
        }

        if (prevCell !== null) {
          setActiveCellInternal(getCellNode(row, prevCell));
          activePosX = prevActivePosX;
        } else {
          resetActiveCell();
        }
      }
    }

    function navigatePageDown() {
      scrollPage(1);
    }

    function navigatePageUp() {
      scrollPage(-1);
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
      } else {
        colspan = colspan || 1;
      }

      return colspan;
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
      }
      while (cell < columns.length && !canCellBeActive(row, cell));

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
      var dataLengthIncludingAddNew = getDataLengthIncludingAddNew();
      while (true) {
        if (++row >= dataLengthIncludingAddNew) {
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
      if (row == null && cell == null) {
        row = cell = posX = 0;
        if (canCellBeActive(row, cell)) {
          return {
            "row": row,
            "cell": cell,
            "posX": cell
          };
        }
      }

      var pos = gotoRight(row, cell, posX);
      if (pos) {
        return pos;
      }

      var firstFocusableCell = null;
      var dataLengthIncludingAddNew = getDataLengthIncludingAddNew();
      while (++row < dataLengthIncludingAddNew) {
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
      if (row == null && cell == null) {
        row = getDataLengthIncludingAddNew() - 1;
        cell = posX = columns.length - 1;
        if (canCellBeActive(row, cell)) {
          return {
            "row": row,
            "cell": cell,
            "posX": cell
          };
        }
      }

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
      return navigate("right");
    }

    function navigateLeft() {
      return navigate("left");
    }

    function navigateDown() {
      return navigate("down");
    }

    function navigateUp() {
      return navigate("up");
    }

    function navigateNext() {
      return navigate("next");
    }

    function navigatePrev() {
      return navigate("prev");
    }

    /**
     * @param {string} dir Navigation direction.
     * @return {boolean} Whether navigation resulted in a change of active cell.
     */
    function navigate(dir) {
      if (!options.enableCellNavigation) {
        return false;
      }

      if (!activeCellNode && dir != "prev" && dir != "next") {
        return false;
      }

      if (!getEditorLock().commitCurrentEdit()) {
        return true;
      }
      setFocus();

      var tabbingDirections = {
        "up": -1,
        "down": 1,
        "left": -1,
        "right": 1,
        "prev": -1,
        "next": 1
      };
      tabbingDirection = tabbingDirections[dir];

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
        scrollCellIntoView(pos.row, pos.cell, !isAddNewRow);
        setActiveCellInternal(getCellNode(pos.row, pos.cell));
        activePosX = pos.posX;
        return true;
      } else {
        setActiveCellInternal(getCellNode(activeRow, activeCell));
        return false;
      }
    }

    function getCellNode(row, cell) {
      if (rowsCache[row]) {
        ensureCellNodesInRowsCache(row);
        return rowsCache[row].cellNodesByColumnIdx[cell];
      }
      return null;
    }

    function setActiveCell(row, cell) {
      if (!initialized) { return; }
      if (row > getDataLength() || row < 0 || cell >= columns.length || cell < 0) {
        return;
      }

      if (!options.enableCellNavigation) {
        return;
      }
      scrollCellIntoView(row, cell, false);
      setActiveCellInternal(getCellNode(row, cell), false);
    }

    function canCellBeActive(row, cell) {
      if (!options.enableCellNavigation || row >= getDataLengthIncludingAddNew() ||
        row < 0 || cell >= columns.length || cell < 0) {
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

      return columns[cell].focusable;
    }

    // Given an array of column indexes, return true if the lowest index and the highest index span across the column that is marked as pinned.
    function crossesPinnedArea(indices) {
      if (options.pinnedColumn == null || !indices || indices.length < 2){
        return false; // can't cross a boundary if there are 0 or 1 indices, or if columns aren't pinned
      }
      var max = Math.max.apply(null, indices),
          min = Math.min.apply(null, indices);
      if (min <= options.pinnedColumn && max > options.pinnedColumn) {
        return true;
      } else {
        return false;
      }
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

      return columns[cell].selectable;
    }

    function gotoCell(row, cell, forceEdit) {
      if (!initialized) { return; }
      if (!canCellBeActive(row, cell)) {
        return;
      }

      if (!getEditorLock().commitCurrentEdit()) {
        return;
      }

      scrollCellIntoView(row, cell, false);

      var newCell = getCellNode(row, cell);

      // if selecting the 'add new' row, start editing right away
      setActiveCellInternal(newCell, forceEdit || (row === getDataLength()) || options.autoEdit);

      // if no editor was created, set the focus back on the grid
      if (!currentEditor) {
        setFocus();
      }
    }


    //////////////////////////////////////////////////////////////////////////////////////////////
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
                execute: function () {
                  this.editor.applyValue(item, this.serializedValue);
                  updateRow(this.row);
                  trigger(self.onCellChange, {
                    row: activeRow,
                    cell: activeCell,
                    item: item
                  });
                },
                undo: function () {
                  this.editor.applyValue(item, this.prevSerializedValue);
                  updateRow(this.row);
                  trigger(self.onCellChange, {
                    row: activeRow,
                    cell: activeCell,
                    item: item
                  });
                }
              };

              if (options.editCommandHandler) {
                makeActiveCellNormal();
                options.editCommandHandler(item, column, editCommand);
              } else {
                editCommand.execute();
                makeActiveCellNormal();
              }

            } else {
              var newItem = {};
              currentEditor.applyValue(newItem, currentEditor.serializeValue());
              makeActiveCellNormal();
              trigger(self.onAddNewRow, {item: newItem, column: column});
            }

            // check whether the lock has been re-acquired by event handlers
            return !getEditorLock().isActive();
          } else {
            // Re-add the CSS class to trigger transitions, if any.
            $(activeCellNode).removeClass("invalid");
            $(activeCellNode).width();  // force layout
            $(activeCellNode).addClass("invalid");

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


    //////////////////////////////////////////////////////////////////////////////////////////////
    // Debug

    this.getStateInfo = function() { return {
      rowsCache: rowsCache, // Super important object, responsible for the present rendered dom of the rows
      uiRegions: {
        topViewport: topViewport,
        topCanvas: topCanvas,
        header: header,
        subHeader: subHeader,
        contentViewport: contentViewport,
        contentCanvas: contentCanvas,
        rows: rows
      },
      colInfo: {
        columnPosLeft:  columnPosLeft,
        columnPosRight: columnPosRight
      },
      scrollInfo: {
        visibleRange:  getVisibleRange(),
        renderedRange: getRenderedRange(),
        offset: offset,
        scrollTop: scrollTop,
        lastRenderedScrollTop: lastRenderedScrollTop,
        lastRenderedScrollLeft: lastRenderedScrollLeft,
        numVisibleRows: numVisibleRows
      }
    } };

    this.debug = function () {
      var s = "";

      s += ("\n" + "counter_rows_rendered:  " + counter_rows_rendered);
      s += ("\n" + "counter_rows_removed:  " + counter_rows_removed);
      s += ("\n" + "renderedRows:  " + renderedRows);
      s += ("\n" + "numVisibleRows:  " + numVisibleRows);
      s += ("\n" + "maxSupportedCssHeight:  " + maxSupportedCssHeight);
      s += ("\n" + "n(umber of pages):  " + n);
      s += ("\n" + "(current) page:  " + page);
      s += ("\n" + "page height (ph):  " + ph);
      s += ("\n" + "vScrollDir:  " + vScrollDir);
      s += ("\n\n" + "(More info in the console)");

      console.log(this.getStateInfo());
      alert(s);
    };

    // a debug helper to be able to access private members
    this.eval = function (expr) {
      return eval(expr);
    };

    //////////////////////////////////////////////////////////////////////////////////////////////
    // Public API

    $.extend(this, {
      "slickGridVersion": "2.1",

      // Events
      "onScroll": new Slick.Event(),
      "onSort": new Slick.Event(),
      "onHeaderMouseEnter": new Slick.Event(),
      "onHeaderMouseLeave": new Slick.Event(),
      "onHeaderContextMenu": new Slick.Event(),
      "onSubHeaderContextMenu": new Slick.Event(),
      "onHeaderClick": new Slick.Event(),
      "onHeaderCellRendered": new Slick.Event(),
      "onHeadersCreated": new Slick.Event(), // Throws once after all headers and subheaders are created (or re-created)
      "onBeforeHeaderCellDestroy": new Slick.Event(),
      "onSubHeaderCellRendered": new Slick.Event(),
      "onBeforeSubHeaderCellDestroy": new Slick.Event(),
      "onMouseEnter": new Slick.Event(),
      "onMouseLeave": new Slick.Event(),
      "onClick": new Slick.Event(),
      "onDblClick": new Slick.Event(),
      "onContextMenu": new Slick.Event(),
      "onKeyDown": new Slick.Event(),
      "onAddNewRow": new Slick.Event(),
      "onValidationError": new Slick.Event(),
      "onViewportChanged": new Slick.Event(),
      "onInvalidate": new Slick.Event(),
      "onColumnsReordered": new Slick.Event(),
      "onColumnsResized": new Slick.Event(),
      "onColumnsChanged": new Slick.Event(),
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
      "getId": getId,
      "getColumns": getColumns,
      "getColumnIndexFromEvent": getColumnIndexFromEvent,
      "getColumnFromEvent": getColumnFromEvent,
      "setColumns": setColumns,
      "updateColumnWidths": updateColumnWidths,
      "getColumnIndex": getColumnIndex,
      "getColumnNodeById": getColumnNodeById,
      "updateColumnHeader": updateColumnHeader,
      "createColumnHeaders": createColumnHeaders,
      "setSortColumn": setSortColumn,
      "setSortColumns": setSortColumns,
      "getSortColumns": getSortColumns,
      "autosizeColumns": autosizeColumns,
      "setupColumnResize": setupColumnResize,
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
      "getContainerNode": getContainerNode,

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
      "scrollRowToTop": scrollRowToTop,
      "scrollCellIntoView": scrollCellIntoView,
      "getCanvasNode": getContentCanvasNode,
      "getContentCanvasNode": getContentCanvasNode,
      "getTopCanvasNode": getTopCanvasNode,
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
      "crossesPinnedArea": crossesPinnedArea,
      "navigatePrev": navigatePrev,
      "navigateNext": navigateNext,
      "navigateUp": navigateUp,
      "navigateDown": navigateDown,
      "navigateLeft": navigateLeft,
      "navigateRight": navigateRight,
      "navigatePageUp": navigatePageUp,
      "navigatePageDown": navigatePageDown,
      "gotoCell": gotoCell,
//      "getTopPanel": getTopPanel,
//      "setTopPanelVisibility": setTopPanelVisibility,
      "getHeaderEl":            getHeaderEl,
      "getHeaderEls":           getHeaderEls,
      "setSubHeaderVisibility": setSubHeaderVisibility,
      "getSubHeader":           getSubHeader,
      "getSubHeaderColumn":     getSubHeaderColumn,
      "setHeaderRowVisibility": setSubHeaderVisibility, // alias for backwards compatibility
      "getHeaderRow":           getSubHeader,
      "getHeaderRowColumn":     getSubHeaderColumn,
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
