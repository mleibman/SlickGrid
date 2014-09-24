(function ($) {

  var grid;
  var $container = $("#container");
  var el, offsetBefore, offsetAfter, dragged;

  var drag = function drag(handle, dx, dy) {
    offsetBefore = el.offset();
    $(handle).simulate("drag", {
      dx: dx || 0,
      dy: dy || 0
    });
    dragged = { dx: dx, dy: dy };
    offsetAfter = el.offset();
  };

  var moved = function moved(dx, dy, msg) {
    msg = msg ? msg + "." : "";
    var actual = { left: offsetAfter.left, top: offsetAfter.top };
    var expected = { left: offsetBefore.left + dx, top: offsetBefore.top + dy };
    same(actual, expected, 'dragged[' + dragged.dx + ', ' + dragged.dy + '] ' + msg);
  };

  var ROWS = 500, COLS = 10;
  var data = [], row;
  for (var i = 0; i < ROWS; i++) {
    row = { id: "id_" + i };
    for (var j = 0; j < COLS; j++) {
      row["col_" + j] = i + "." + j;
    }
    data.push(row);
  }

  var cols = buildColumns(COLS);
  var col;
  var treeColumns;

  function buildColumns(size, current) {
    var columns = [];
    current = current || 0;

    for (var i = 0; i < size; i++) {
      var index = current + i;
      columns.push({
        id: "col" + index,
        field: "col_" + index,
        name: "col_" + index,
        minWidth: 70
      });
    }

    return columns;
  }

  function buildTreeColumns(sizeGroups, sizeColumnsPerGroup) {
    var treeColumns = [];
    for (var i = 0; i < sizeGroups; i++) {
      treeColumns.push({
        id: "group" + i,
        name: "group_" + i,
        columns: buildColumns(sizeColumnsPerGroup, sizeColumnsPerGroup*i)
      });
    }
    return treeColumns;
  }

  function setupGrid() {
    grid = new Slick.Grid($container, data, cols);
    grid.render();
  }

  function setupGridWithTreeColumns() {
    treeColumns = buildTreeColumns(2, 5);

    grid = new Slick.Grid($container, data, treeColumns);
    grid.render();
  }

  function teardownGrid() {
    $container.empty();
  }

  module(
    "grid - column resizing",
    {
      setup: setupGrid,
      teardown: teardownGrid
    }
  );

  test("minWidth is respected", function () {
    var firstCol = $("#container .slick-header-column:first");
    firstCol.find(".slick-resizable-handle:first").simulate("drag", { dx: 100, dy: 0 });
    firstCol.find(".slick-resizable-handle:first").simulate("drag", { dx: -200, dy: 0 });
    equal(firstCol.outerWidth(), 70, "width set to minWidth");
  });

  test("onColumnsResized is fired on column resize", function () {
    expect(2);
    grid.onColumnsResized.subscribe(function () {
      ok(true, "onColumnsResized called");
    });
    var oldWidth = cols[0].width;
    $("#container .slick-resizable-handle:first").simulate("drag", { dx: 100, dy: 0 });
    equal(cols[0].width, oldWidth+100-1, "columns array is updated");
  });

  test("getData should return data", function () {
    equal(grid.getData(), data);
  });


  module(
    "grid - initial render",
    {
      setup: setupGrid,
      teardown: teardownGrid
    }
  );


  test("top-right canvas height equals top-left canvas height", function () {
    var leftHeight = $("#container .grid-canvas.grid-canvas-top.grid-canvas-left").height();
    var rightHeight = $("#container .grid-canvas.grid-canvas-top.grid-canvas-right").height();
    equal(leftHeight, rightHeight);
  });


  module(
    "grid - freeze options changing",
    {
      setup: setupGrid,
      teardown: teardownGrid
    }
  );


  test("setOptions 'frozenColumn' from frozen to unfrozen", function () {
    var currentWidth,
      width = $("#container").width(),
      $paneHeaderL = $(".slick-pane.slick-pane-header.slick-pane-left"),
      $paneTopL = $(".slick-pane.slick-pane-top.slick-pane-left"),
      $viewportTopL = $(".slick-viewport.slick-viewport-top.slick-viewport-left");

    grid.setOptions({ 'frozenColumn': 1 });
    grid.setOptions({ 'frozenColumn': -1 });

    currentWidth = $paneHeaderL.width();
    equal(currentWidth, width);

    currentWidth = $paneTopL.width();
    equal(currentWidth, width);

    currentWidth = $viewportTopL.width();
    equal(currentWidth, width);
  });


  test("setOptions 'frozenColumn' from unfrozen to frozen", function () {
    var i
      , currentWidth
      , width = 0
      , frozenColumns = 1
      , $paneHeaderL = $(".slick-pane.slick-pane-header.slick-pane-left")
      , $paneTopL = $(".slick-pane.slick-pane-top.slick-pane-left")
      , $viewportTopL = $(".slick-viewport.slick-viewport-top.slick-viewport-left");

    for (i = 0; i <= frozenColumns; i++) {
      width += cols[i].width;
    }
    grid.setOptions({ 'frozenColumn': frozenColumns });

    currentWidth = $paneHeaderL.width();
    equal(currentWidth, width);

    currentWidth = $paneTopL.width();
    equal(currentWidth, width);

    currentWidth = $viewportTopL.width();
    equal(currentWidth, width);
  });

  test("setOptions 'frozenRow' from frozen to unfrozen", function () {
    var currentHeight
      , height = $('#container').height()
      , $paneTopL = $('.slick-pane.slick-pane-top.slick-pane-left')
      , $headerScrollerL = $('.slick-header.slick-header-left')
      , $viewportTopL = $('.slick-viewport.slick-viewport-top.slick-viewport-left');

    grid.setOptions({ 'frozenRow': 5 });
    grid.setOptions({ 'frozenRow': -1 });

    // Subtract the columns height from the container because they're not included
    // in the top pane
    height -= $headerScrollerL.height();

    currentHeight = $paneTopL.height();
    equal(currentHeight, height);

    currentHeight = $viewportTopL.height();
    equal(currentHeight, height);
  });

  test("setOptions 'frozenRow' from unfrozen to frozen", function () {
    var i
      , currentHeight
      , height = 0
      , frozenRows = 4
      , rowHeight = grid.getOptions().rowHeight
      , $paneTopL = $('.slick-pane.slick-pane-top.slick-pane-left')
      , $viewportTopL = $('.slick-viewport.slick-viewport-top.slick-viewport-left');

    for (i = 0; i < frozenRows; i++) {
      height += rowHeight;
    }

    grid.setOptions({ 'frozenRow': frozenRows });

    currentHeight = $paneTopL.height();
    equal(currentHeight, height);

    currentHeight = $viewportTopL.height();
    equal(currentHeight, height);
  });

  test("frozen columns should to have class .frozen", function() {
    const FROZEN_COLUMNS = 2;
    grid.setOptions({ frozenColumn: FROZEN_COLUMNS-1 });

    equal($('.slick-row:visible:first .slick-cell.frozen').length, FROZEN_COLUMNS, 'should find '+FROZEN_COLUMNS+' frozen columns');
  });

  test("frozen rows should to have class .frozen", function() {
    const FROZEN_ROWS = 2;
    grid.setOptions({ frozenRow: FROZEN_ROWS-1 });

    equal($('.slick-row.frozen').length, FROZEN_ROWS, 'should find '+FROZEN_ROWS+' frozen rows');
  });

  test("frozen header column should to have class .frozen", function() {
    const FROZEN_COLUMNS = 2;
    grid.setOptions({ frozenColumn: FROZEN_COLUMNS-1 });

    equal($('.slick-header-column.frozen').length, FROZEN_COLUMNS, 'should find '+FROZEN_COLUMNS+' frozen header columns');
  });

  test("frozen footer row column should to have class .frozen", function() {
    const FROZEN_COLUMNS = 2;
    grid.setOptions({ frozenColumn: FROZEN_COLUMNS-1 });

    equal($('.slick-footerrow-column.frozen').length, FROZEN_COLUMNS, 'should find '+FROZEN_COLUMNS+' frozen footer columns');
  });

  module(
    "grid - tree columns",
    {
      setup: setupGridWithTreeColumns,
      teardown: teardownGrid
    }
  );
  test('header columns render correct', function() {
    equal($container.find('.slick-group-header-column').length, 2, 'grid should have 2 columns group header');
    equal($container.find('.slick-header-column').length, 10, 'grid should have 10 columns header');
  });

  test("columns can be reordered in your groups", function() {

    grid.onColumnsReordered.subscribe(function() {
      ok(true, "onColumnsReordered shouldn't be called");
    });

    var $firstCol = $(".slick-header-column:first", $container);
    var currentPosition = $firstCol.offset().left;
    var widthColumn = $firstCol.outerWidth();
    var oneColumn = currentPosition + widthColumn;

    $firstCol.simulate("drag", { dx: oneColumn, dy: 0  });

  });

  test("columns shouldn't be reordered out of your groups", function() {

    grid.onColumnsReordered.subscribe(function() {
      ok(false, "onColumnsReordered shouldn't be called");
    });

    var $firstCol = $(".slick-header-column:first", $container);
    var currentPosition = $firstCol.offset().left;
    var widthColumn = $firstCol.outerWidth();
    var fiveColumns = currentPosition + (5 * widthColumn);

    $firstCol.simulate("drag", { dx: fiveColumns, dy: 0  });

  });

  test("render with frozen columns", function() {
    const FROZEN_COLUMNS = 4;
    var widthColumnsLeft;

    grid.setOptions({ 'frozenColumn': FROZEN_COLUMNS });

    widthColumnsLeft = $('.slick-header-column:first', $container).outerWidth() * (FROZEN_COLUMNS + 1);

    equal($(".slick-pane.slick-pane-header.slick-pane-left").outerWidth(), widthColumnsLeft);

    equal($(".slick-pane.slick-pane-top.slick-pane-left").outerWidth(), widthColumnsLeft);

    equal($(".slick-viewport.slick-viewport-top.slick-viewport-left").outerWidth(), widthColumnsLeft);
  });

  test("all columns of a group should be frozen, otherwise no group will be created", function() {
    const FROZEN_COLUMNS = 3;

    grid.setOptions({ 'frozenColumn': FROZEN_COLUMNS });

    equal($(".slick-group-header-column").length, 0, 'no group will be found');

  });

  test("frozen group header column should to have class .frozen", function() {
    const FROZEN_COLUMNS = 5;
    grid.setOptions({ frozenColumn: FROZEN_COLUMNS-1 });

    equal($('.slick-group-header-column.frozen').length, 1, 'should find '+1+' frozen group header columns');
    equal($('.slick-header-column.frozen').length, FROZEN_COLUMNS, 'should find '+FROZEN_COLUMNS+' frozen header columns');
  });


})(jQuery);
