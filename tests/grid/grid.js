(function ($) {
  
  var grid;
  var el, offsetBefore, offsetAfter, dragged, cols, col, data;
  
  var drag = function(handle, dx, dy) {
    offsetBefore = el.offset();
    $(handle).simulate("drag", {
      dx: dx || 0,
      dy: dy || 0
    });
    dragged = { dx: dx, dy: dy };
    offsetAfter = el.offset();
  }
  
  var moved = function (dx, dy, msg) {
    msg = msg ? msg + "." : "";
    var actual = { left: offsetAfter.left, top: offsetAfter.top };
    var expected = { left: offsetBefore.left + dx, top: offsetBefore.top + dy };
    same(actual, expected, 'dragged[' + dragged.dx + ', ' + dragged.dy + '] ' + msg);
  }
  
  var setUpGrid = function () {
    if (grid) {
      grid.destroy(); // doing the destroy at the start of setup, instead of in teardown, leaves a nice grid to see when you're viewing the test page.
    }
    var ROWS = 500, COLS = 20, row;
    data = [];
    for (var i = 0; i < ROWS; i++) {
      row = { id: "id_" + i };
      for (var j = 0; j < COLS; j++) {
        row["col_" + j] = i + "." + j;
      }
      data.push(row);
    }

    cols = []
    for (var i = 0; i < COLS; i++) {
      cols.push({
        id: "col" + i,
        field: "col_" + i,
        name: "col_" + i
      });
    }

    cols[0].minWidth = 70;

    grid = new Slick.Grid("#container", data, cols);
    grid.render();
  }



  module("grid - data", { setup: setUpGrid });

  test("getData should return data", function () {
    equal(grid.getData(), data);
  });



  module("grid - column resizing", { setup: setUpGrid });

  test("minWidth is respected", function () {
    var firstCol = $("#container .slick-header-column:first");
    firstCol.find(".slick-resizable-handle:first").simulate("drag", { dx: 100,  dy: 0 });
    firstCol.find(".slick-resizable-handle:first").simulate("drag", { dx: -200, dy: 0 });
    equal(firstCol.outerWidth(), 70, "width set to minWidth");
  });

  test("onColumnsResized is fired on column resize", function () {
    expect(2);
    grid.onColumnsResized.subscribe(function() { ok(true,"onColumnsResized called") });
    var oldWidth = cols[0].width;
    $("#container .slick-resizable-handle:first").simulate("drag", { dx: 100, dy: 0 });
    equal(cols[0].width, oldWidth+100-1, "columns array is updated");
  });

  test("width can be set using setColumns", function () {
    cols = grid.getColumns();
    col = cols[1];
    col.width = 200;
    start = Date.now();
    grid.setColumns(cols);
    time = Date.now() - start;
    console.log("grid.setColumns() time:           " + time + "ms"); // Informational output only. Not using console.time because of compatibility.
    $cell = $( grid.getCellNode(0,1) ); // Need to re-query the dom because the whole grid has been redrawn
    equal($cell.outerWidth(), col.width, "after configuring and setColumns, cell width matches the measured width");
    $headerCell = $("#container .slick-header-column").eq(1);
    equal($headerCell.outerWidth(), col.width, "header cell width also matches the measured width");
  });

  test("width can be set using updateColumnWidths", function () {
    cols = grid.getColumns();
    col = cols[1];
    $cell = $( grid.getCellNode(0,1) );
    equal($cell.outerWidth(), col.width, "before adjusting, the measured width matches the set width");
    col.width = 200;
    start = Date.now();
    grid.updateColumnWidths(cols);
    time = Date.now() - start;
    console.log("grid.updateColumnWidths() time:   " + time + "ms"); // Informational output only. Not using console.time because of compatibility.
    $cell = $( grid.getCellNode(0,1) ); // Need to re-query the dom because the whole grid has been redrawn
    equal($cell.outerWidth(), col.width, "after configuring and setColumns, cell width matches the measured width");
    $headerCell = $("#container .slick-header-column").eq(1);
    equal($headerCell.outerWidth(), col.width, "header cell width also matches the measured width");
  });
  
})(jQuery);