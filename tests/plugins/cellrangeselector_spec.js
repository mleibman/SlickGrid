(function ($) {

  var grid,         // The SlickGrid instance
    cols = [      // The column definitions
      {name: "Header", field: "header", width: 100},
      {name: "Another Header", field: "another-header", width: 100},
      {name: "Yet another header", field: "y-a-header", width: 100},
    ],
    data = [], // The grid data
    $container = $("#container");

  var $canvas, cellSelector;

  // Create data
  for (var i = 0; i < 10; i++) {
    data.push({
      "id": "row" + i,
      "header": "some data",
      "another-header": "more data",
      "y-a-header": "data data"
    });
  }

  function setupGrid() {
    var $testgrid = $('<div id="grid" />');
    $testgrid.height(600);

    $("#container").append($testgrid);
    grid = new Slick.Grid("#grid", data, cols);
    cellSelector = new Slick.CellRangeSelector();
    grid.setSelectionModel(new Slick.CellSelectionModel({cellRangeSelector: cellSelector}));
    grid.render();
    $canvas = $(".grid-canvas");
  }

  function teardownGrid() {
    $container.empty();
  }

  function getCell(row, column) {
    return $($("#grid .slick-cell.l" + column)[row]);
  }

  module("plugins - cellrangeselector tracks current range while dragging -", {
    setup: function () {
      setupGrid({});
    },
    teardown: teardownGrid
  });

  function startDragging($cell) {
    dragRangeContainer = {
      startX: $canvas.offset().left + 2,
      startY: $canvas.offset().top + 2
    };
    $canvas.trigger($.Event('draginit'));
    var startEvent = $.Event('dragstart');
    startEvent.target = $cell;
    $canvas.trigger(startEvent, dragRangeContainer);

    var dragEvent = $.Event('drag');
    dragEvent.pageX = dragRangeContainer.startX;
    dragEvent.pageY = dragRangeContainer.startY;
    $canvas.trigger(dragEvent, dragRangeContainer);
  }

  function dragDown() {
    var dragEvent = $.Event('drag');
    dragEvent.pageX = dragRangeContainer.startX;
    dragEvent.pageY = dragRangeContainer.startY + 25;
    $canvas.trigger(dragEvent, dragRangeContainer);
  }

  test("getCurrentRange returns the current range", function () {
    startDragging(getCell(0, 0));
    dragDown();

    var selectedRange = cellSelector.getCurrentRange();

    var expectedRange = {"start": {"row": 0, "cell": 0}, "end": {"row": 1, "cell": 0}};
    deepEqual(selectedRange, expectedRange, "currently mouse-dragged range");
  });

  module("plugins - cellrangeselector when no options are passed");
  test("should be created successfully", function () {
    var $testgrid = $('<div id="grid" />');
    $testgrid.height(600);

    $("#container").append($testgrid);
    grid = new Slick.Grid("#grid", data, cols);
    grid.setSelectionModel(new Slick.CellSelectionModel());
    grid.render();
  });

  module("plugins - cellrangeselector when options are passed, but not cellRangeSelector");
  test("should be created successfully", function () {
    var $testgrid = $('<div id="grid" />');
    $testgrid.height(600);

    $("#container").append($testgrid);
    grid = new Slick.Grid("#grid", data, cols);
    grid.setSelectionModel(new Slick.CellSelectionModel({}));
    grid.render();
  });

  module("plugins - cellrangeselector without options", {
    setup: function () {
      setupGrid();
    },
    teardown: teardownGrid
  });

  test("constructs decorator correctly", function () {
    cellSelector.init(grid);
    notEqual(cellSelector.getCellDecorator(), undefined, "Grid Cell Decorator");
    cellSelector.destroy();
  });
})(jQuery);