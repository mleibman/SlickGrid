(function($) {

  var grid,         // The SlickGrid instance
      cols = [      // The column definitions
        { name: "Short",  field: "short",   width: 100 },
        { name: "Medium", field: "medium",  width: 100 },
        { name: "Long",   field: "long",    width: 100 },
        { name: "Mixed",  field: "mixed",   width: 100 },
        { name: "Long header creates tooltip",         field: "header",        width: 50 },
        { name: "Long header with predefined tooltip", field: "tooltipHeader", width: 50, tooltip: "Already have a tooltip!" }
      ],
      data            = [], // The grid data
      LONG_VALUE      = "looooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooong",
      MEDIUM_VALUE    = "mediummmmmmm",
      SHORT_VALUE     = "short",
      $container      = $("#container"),
      keys = {
        LEFT_ARROW:  37,
        UP_ARROW:    38,
        RIGHT_ARROW: 39,
        DOWN_ARROW:  40
      }
  
  // Create data
  for (var i = 0; i < 10; i++) {
    data.push({
      "id":             "row" + i,
      "short":          SHORT_VALUE,
      "medium":         MEDIUM_VALUE,
      "long":           LONG_VALUE,
      "mixed":          ( i % 2 == 0 ? SHORT_VALUE : LONG_VALUE ),
      "header":         i,
      "tooltipHeader":  i
    });
  }
  
  function setupGrid() {
    $('<div id="grid" />').appendTo($container);
    grid = new Slick.Grid("#grid", data, cols);
    grid.setSelectionModel(new Slick.CellSelectionModel());
    grid.render();
  }
  
  function teardownGrid() {
    $container.empty();
  }

  function getCell(row, column) {
    return $($("#grid .slick-cell.l" + column)[row]);
  }

  function assertColumnRange(range, fromRow, fromCell, toRow, toCell) {
    strictEqual(range.fromRow, fromRow, "start row");
    strictEqual(range.toRow, toRow, "end row");
    strictEqual(range.fromCell, fromCell, "start column");
    strictEqual(range.toCell, toCell, "end column");
  }

  function keyDownOnCell($cell, controlKeyPressed, commandKeyPressed, shiftKeyPressed, keyPressed) {
    var $event = $.Event('keydown');
    $event.ctrlKey = controlKeyPressed;
    $event.metaKey = commandKeyPressed;
    $event.shiftKey = shiftKeyPressed;
    $event.which = keyPressed;
    $cell.trigger($event);
  }

  module("plugins - cellselectionmodel - KeyDownHandler no active cell", {
    setup: function () {
      setupGrid({});
    },
    teardown: teardownGrid
  });

  test("press right arrow do not change selection", function () {
    var $cell = getCell(0, 0);
    var $event = $.Event('keydown');
    $event.which = keys.RIGHT_ARROW;
    $cell.trigger($event);

    var selectedRanges = grid.getSelectionModel().getSelectedRanges();
    strictEqual(selectedRanges.length, 0, "number of ranges is incorrect");
  });

  module("plugins - cellselectionmodel - KeyDownHandler with active cell", {
    setup: function () {
      setupGrid({});
    },
    teardown: teardownGrid
  });

  test("press right arrow do not change selection", function () {
    var $cell = getCell(1, 3);
    $cell.click();

    keyDownOnCell($cell, false, false, false, keys.RIGHT_ARROW);

    var selectedRanges = grid.getSelectionModel().getSelectedRanges();
    strictEqual(selectedRanges.length, 1, "number of ranges is incorrect");
    var range = selectedRanges[0];

    assertColumnRange(range, 1, 4, 1, 4);
  });

  test("press shift plus left arrow add second cell to selection", function () {
    var $cell = getCell(1, 3);

    $cell.click();
    keyDownOnCell($cell, false, false, true, keys.LEFT_ARROW);

    var selectedRanges = grid.getSelectionModel().getSelectedRanges();
    strictEqual(selectedRanges.length, 1, "number of ranges is incorrect");
    var range = selectedRanges[0];

    assertColumnRange(range, 1, 2, 1, 3);
  });

  test("press control plus shift plus up arrow do not change selection", function () {
    var $cell = getCell(1, 3);
    $cell.click();
    keyDownOnCell($cell, true, false, true, keys.UP_ARROW);

    var selectedRanges = grid.getSelectionModel().getSelectedRanges();
    strictEqual(selectedRanges.length, 1, "number of ranges");

    var range = selectedRanges[0];
    assertColumnRange(range, 1, 3, 1, 3);
  });


  test("press command plus shift plus down arrow do not change selection", function () {
    var $cell = getCell(1, 3);
    $cell.click();
    keyDownOnCell($cell, false, true, true, keys.DOWN_ARROW);

    var selectedRanges = grid.getSelectionModel().getSelectedRanges();
    strictEqual(selectedRanges.length, 1, "number of ranges");

    var range = selectedRanges[0];
    assertColumnRange(range, 1, 3, 1, 3);
  });

})(jQuery);