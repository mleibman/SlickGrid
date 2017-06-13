(function ($) {

  var grid,         // The SlickGrid instance
    cols = [      // The column definitions
      {name: "Header", field: "header", width: 100},
      {name: "Another Header", field: "another-header", width: 100},
      {name: "Yet another header", field: "y-a-header", width: 100},
    ],
    data = [], // The grid data
    $container = $("#container");

  var $canvas, cellSelector, cellDecorator;

  // Create data
  for (var i = 0; i < 10; i++) {
    data.push({
      "id": "row" + i,
      "header": "some data",
      "another-header": "more data",
      "y-a-header": "data data"
    });
  }

  function setupGridWithValues() {
    var $testgrid = $('<div id="grid" />');
    $testgrid.height(600);

    $("#container").append($testgrid);
    grid = new Slick.Grid("#grid", data, cols);
    cellDecorator = new Slick.CellRangeDecorator(grid, {
      offset: {
        top: 1,
        left: 1,
        height: 1,
        width: 1
      }
    });
    cellSelector = new Slick.CellRangeSelector({cellDecorator: cellDecorator});
    grid.setSelectionModel(new Slick.CellSelectionModel({cellRangeSelector: cellSelector}));
    grid.render();
    $canvas = $(".grid-canvas");
  }

  function setupGridWithoutValues() {
    var $testgrid = $('<div id="grid" />');
    $testgrid.height(600);

    $("#container").append($testgrid);
    grid = new Slick.Grid("#grid", data, cols);
    cellDecorator = new Slick.CellRangeDecorator(grid);
    cellSelector = new Slick.CellRangeSelector({cellDecorator: cellDecorator});
    grid.setSelectionModel(new Slick.CellSelectionModel({cellRangeSelector: cellSelector}));
    grid.render();
    $canvas = $(".grid-canvas");
  }

  function teardownGrid() {
    $container.empty();
  }

  module("plugins - cellrangemodel receives a prebuilt decorator -", {
    setup: function () {
      setupGridWithValues();
    },
    teardown: teardownGrid
  });

  test("check the values passed on options are used", function () {
    var element = cellDecorator.show(new Slick.Range(1, 1, 2, 2));
    var resultCss = element[0].style;

    deepEqual(resultCss.top, "26px", "CSS Property Top");
    deepEqual(resultCss.left, "101px", "CSS Property Left");
    deepEqual(resultCss.height, "50px", "CSS Property Height");
    deepEqual(resultCss.width, "201px", "CSS Property Width");
  });

  module("plugins - cellrangemodel uses a default decorator -", {
    setup: function () {
      setupGridWithoutValues();
    },
    teardown: teardownGrid
  });

  test("check the values passed on options are used", function () {
    var element = cellDecorator.show(new Slick.Range(1, 1, 2, 2));
    var resultCss = element[0].style;

    deepEqual(resultCss.top, "24px", "CSS Property Top");
    deepEqual(resultCss.left, "99px", "CSS Property Left");
    deepEqual(resultCss.height, "47px", "CSS Property Height");
    deepEqual(resultCss.width, "198px", "CSS Property Width");
  });


})(jQuery);