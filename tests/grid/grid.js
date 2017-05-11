(function ($) {

  const ROWS = 500, COLS = 10;
  var grid, data, cols, $testgrid;
  var el, offsetBefore, offsetAfter, dragged;
  
  var drag = function(handle, dx, dy) {
    offsetBefore = el.offset();
    $(handle).simulate("drag", {
      dx: dx || 0,
      dy: dy || 0
    });
    dragged = { dx: dx, dy: dy };
    offsetAfter = el.offset();
  };

  var setupData = function () {
    data = [];
    var row;
    for (var i = 0; i < ROWS; i++) {
      row = { id: "id_" + i };
      for (var j = 0; j < COLS; j++) {
        row["col_" + j] = i + "." + j;
      }
      data.push(row);
    }

    cols = [];
    var col;
    for (var i = 0; i < COLS; i++) {
      cols.push({
        id: "col" + i,
        field: "col_" + i,
        name: "col_" + i
      });
    }

    cols[0].minWidth = 70;
  };

  var setupGrid = function() {
    setupData();
    $testgrid = $("<div id='testgrid'></div>");
    $testgrid.height(200);
    $testgrid.width(200);

    $("#container").append($testgrid);

    grid = new Slick.Grid("#testgrid", data, cols);

    grid.render();
  };

  var teardownGrid = function() {
    $("body").find($testgrid).remove();
  };

  module("grid - column resizing", {
    setup: setupGrid,
    teardown: teardownGrid
  });

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
  
  test("getData should return data", function () {
    equal(grid.getData(), data);
  });
  
})(jQuery);